import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUniqueSlot,
  requestJson,
  withTestServer,
} from "./helpers/httpHarness.js";

test("work-order lifecycle API supports list/detail/update with transition invariants", async () => {
  await withTestServer("auto-service-work-order-api", async ({ baseUrl }) => {
    const list = await requestJson("GET", `${baseUrl}/api/v1/work-orders`);
    assert.equal(list.status, 200);
    assert.equal(Array.isArray(list.json.items), true);
    assert.ok(list.json.count >= 8);

    const listActive = await requestJson("GET", `${baseUrl}/api/v1/work-orders?includeClosed=false`);
    assert.equal(listActive.status, 200);
    assert.equal(listActive.json.items.some((item) => item.status === "completed"), false);
    assert.equal(listActive.json.items.some((item) => item.status === "cancelled"), false);

    const detail = await requestJson("GET", `${baseUrl}/api/v1/work-orders/wo-1002`);
    assert.equal(detail.status, 200);
    assert.equal(detail.json.item.code, "WO-1002");
    assert.equal(Array.isArray(detail.json.item.statusHistory), true);
    assert.ok(detail.json.item.statusHistory.length >= 1);

    const transition = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1002`, {
      status: "waiting_approval",
      reason: "Ожидание подтверждения стоимости",
    });
    assert.equal(transition.status, 200);
    assert.equal(transition.json.item.status, "waiting_approval");
    assert.equal(transition.json.item.statusLabelRu, "Ожидает согласования");
    assert.equal(transition.json.item.statusHistory[0].toStatus, "waiting_approval");
    assert.equal(transition.json.item.statusHistory[0].reason, "Ожидание подтверждения стоимости");

    const invalidTransition = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-0091`, {
      status: "in_progress",
    });
    assert.equal(invalidTransition.status, 409);
    assert.equal(invalidTransition.json.error.code, "conflict");

    const balanceGuard = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1005`, {
      status: "completed",
    });
    assert.equal(balanceGuard.status, 409);
    assert.equal(balanceGuard.json.error.code, "conflict");

    const missingBay = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1004`, {
      bayId: "bay-missing",
    });
    assert.equal(missingBay.status, 404);
    assert.equal(missingBay.json.error.code, "not_found");
  });
});

test("appointment to work-order conversion is idempotent and enforces appointment status guardrails", async () => {
  await withTestServer("auto-service-work-order-convert-api", async ({ baseUrl }) => {
    const token = `${Date.now()}`;

    const createAppointment = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: buildUniqueSlot(token, 17),
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Конвертация в заказ-наряд",
      bayId: "bay-2",
      primaryAssignee: "Иван Петров",
      status: "booked",
    });
    assert.equal(createAppointment.status, 201);
    const appointmentId = createAppointment.json.item.id;

    const convertFirst = await requestJson("POST", `${baseUrl}/api/v1/appointments/${appointmentId}/convert-to-work-order`, {
      reason: "Перевод записи в активную работу",
    });
    assert.equal(convertFirst.status, 201);
    assert.equal(convertFirst.json.conversion.created, true);
    assert.equal(convertFirst.json.item.status, "scheduled");

    const convertSecond = await requestJson("POST", `${baseUrl}/api/v1/appointments/${appointmentId}/convert-to-work-order`, {
      reason: "Повторный запрос не должен создавать дубликат",
    });
    assert.equal(convertSecond.status, 200);
    assert.equal(convertSecond.json.conversion.created, false);
    assert.equal(convertSecond.json.item.id, convertFirst.json.item.id);

    const convertedDetail = await requestJson("GET", `${baseUrl}/api/v1/work-orders/${convertFirst.json.item.id}`);
    assert.equal(convertedDetail.status, 200);
    assert.equal(convertedDetail.json.item.code, convertFirst.json.item.code);
    assert.equal(convertedDetail.json.item.statusHistory[0].toStatus, "scheduled");

    const createCancelledAppointment = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: buildUniqueSlot(`${Date.now()}`, 18),
      customerId: "cust-1",
      vehicleId: "veh-1",
      complaint: "Не должен конвертироваться после отмены",
      status: "booked",
    });
    assert.equal(createCancelledAppointment.status, 201);
    const blockedAppointmentId = createCancelledAppointment.json.item.id;

    const cancelAppointment = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${blockedAppointmentId}`, {
      status: "cancelled",
    });
    assert.equal(cancelAppointment.status, 200);

    const blockedConvert = await requestJson("POST", `${baseUrl}/api/v1/appointments/${blockedAppointmentId}/convert-to-work-order`);
    assert.equal(blockedConvert.status, 409);
    assert.equal(blockedConvert.json.error.code, "conflict");
  });
});

test("work-order parts APIs enforce blocking lifecycle rules and supplier action sync", async () => {
  await withTestServer("auto-service-work-order-parts-api", async ({ baseUrl }) => {
    const createRequest = await requestJson("POST", `${baseUrl}/api/v1/work-orders/wo-1004/parts-requests`, {
      partName: "Катушка зажигания",
      requestedQty: 1,
      requestedUnitCostRub: 1900,
      salePriceRub: 2900,
      status: "requested",
      isBlocking: true,
      reason: "Деталь отсутствует на складе",
    });
    assert.equal(createRequest.status, 201);
    assert.equal(createRequest.json.item.status, "requested");
    assert.equal(createRequest.json.workOrder.status, "waiting_parts");
    assert.ok(createRequest.json.workOrder.parts.openBlockingRequestsCount >= 1);
    const createdRequestId = createRequest.json.item.id;

    const blockedStatusChange = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1004`, {
      status: "in_progress",
      reason: "Пробуем продолжить без запчастей",
    });
    assert.equal(blockedStatusChange.status, 409);
    assert.equal(blockedStatusChange.json.error.code, "conflict");

    const receivePurchase = await requestJson("POST", `${baseUrl}/api/v1/work-orders/wo-1004/parts-requests/${createdRequestId}/purchase-actions`, {
      supplierName: "АвтоПоставка",
      supplierReference: "PO-test-1002",
      orderedQty: 1,
      unitCostRub: 1900,
      status: "received",
      reason: "Поставка принята на склад",
    });
    assert.equal(receivePurchase.status, 201);
    assert.equal(receivePurchase.json.request.status, "received");
    assert.equal(receivePurchase.json.workOrder.status, "scheduled");

    const terminalLock = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1004/parts-requests/${createdRequestId}`, {
      requestedQty: 2,
      reason: "Недопустимое исправление закрытой позиции",
    });
    assert.equal(terminalLock.status, 409);
    assert.equal(terminalLock.json.error.code, "conflict");

    const createSubstitute = await requestJson("POST", `${baseUrl}/api/v1/work-orders/wo-1004/parts-requests`, {
      partName: "Свеча зажигания",
      requestedQty: 4,
      requestedUnitCostRub: 500,
      salePriceRub: 800,
      status: "requested",
      isBlocking: true,
    });
    assert.equal(createSubstitute.status, 201);
    const substituteSourceRequestId = createSubstitute.json.item.id;

    const substituteUpdate = await requestJson("PATCH", `${baseUrl}/api/v1/work-orders/wo-1004/parts-requests/${substituteSourceRequestId}`, {
      status: "substituted",
      replacementPartName: "Свеча зажигания иридиевая",
      replacementRequestedQty: 4,
      replacementSupplierName: "Деталь-Плюс",
      reason: "Базовая позиция снята с поставки",
    });
    assert.equal(substituteUpdate.status, 200);
    const replacementRequest = substituteUpdate.json.workOrder.partsRequests.find((item) => item.replacementForRequestId === substituteSourceRequestId);
    assert.ok(replacementRequest);
    assert.equal(replacementRequest.partName, "Свеча зажигания иридиевая");

    const completedOrderPartsList = await requestJson("GET", `${baseUrl}/api/v1/work-orders/wo-0091/parts-requests`);
    assert.equal(completedOrderPartsList.status, 200);
    assert.equal(Array.isArray(completedOrderPartsList.json.items), true);
  });
});
