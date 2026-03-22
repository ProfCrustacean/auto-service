import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  requestJson,
  waitForServer,
} from "./helpers/httpHarness.js";

function buildUniqueSlot(token, hour = 16) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

test("work-order lifecycle API supports list/detail/update with transition invariants", async () => {
  const tempDb = createTempDatabase("auto-service-work-order-api");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

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
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("appointment to work-order conversion is idempotent and enforces appointment status guardrails", async () => {
  const tempDb = createTempDatabase("auto-service-work-order-convert-api");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
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
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});
