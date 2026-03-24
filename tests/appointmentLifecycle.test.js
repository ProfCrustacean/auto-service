import test from "node:test";
import assert from "node:assert/strict";
import {
  requestJson,
  withTestServer,
} from "./helpers/httpHarness.js";

test("appointment lifecycle API enforces transitions and returns non-blocking capacity warnings", async () => {
  await withTestServer("auto-service-appointment-lifecycle-test", async ({ baseUrl }) => {
    const listSeeded = await requestJson("GET", `${baseUrl}/api/v1/appointments`);
    assert.equal(listSeeded.status, 200);
    assert.equal(listSeeded.json.count, 1);

    const created = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 09:00",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Плановая диагностика",
      bayId: "bay-1",
      primaryAssignee: "Иван Петров",
      expectedDurationMin: 90,
    });
    assert.equal(created.status, 201);
    assert.match(created.json.item.id, /^apt-/);
    assert.equal(created.json.item.code, "APT-002");
    assert.equal(created.json.item.status, "booked");
    const createdId = created.json.item.id;

    const confirm = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}`, {
      status: "confirmed",
    });
    assert.equal(confirm.status, 200);
    assert.equal(confirm.json.item.status, "confirmed");

    const arrived = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}`, {
      status: "arrived",
    });
    assert.equal(arrived.status, 200);
    assert.equal(arrived.json.item.status, "arrived");

    const invalidTransition = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}`, {
      status: "no-show",
    });
    assert.equal(invalidTransition.status, 409);
    assert.equal(invalidTransition.json.error.code, "conflict");
    assert.match(JSON.stringify(invalidTransition.json.error.details), /arrived -> no-show/);

    const bayConflict = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 09:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Подвеска",
      bayId: "bay-1",
      primaryAssignee: "Сергей Кузнецов",
    });
    assert.equal(bayConflict.status, 201);
    assert.equal(Array.isArray(bayConflict.json.warnings), true);
    assert.equal(bayConflict.json.warnings[0].field, "bayId");

    const assigneeConflict = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 09:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Электрика",
      bayId: "bay-2",
      primaryAssignee: "Иван Петров",
    });
    assert.equal(assigneeConflict.status, 201);
    assert.equal(Array.isArray(assigneeConflict.json.warnings), true);
    assert.equal(assigneeConflict.json.warnings[0].field, "primaryAssignee");

    const normalizedCreate = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22T13:00",
      customerId: "cust-3",
      vehicleId: "veh-2",
      complaint: "Нормализация слота",
      bayId: "bay-2",
      primaryAssignee: "Алексей Соколов",
    });
    assert.equal(normalizedCreate.status, 201);
    assert.equal(normalizedCreate.json.item.plannedStartLocal, "2026-03-22 13:00");

    const normalizedConflict = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 13:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Конфликт через эквивалентный формат",
      bayId: "bay-2",
      primaryAssignee: "Сергей Кузнецов",
    });
    assert.equal(normalizedConflict.status, 201);
    assert.equal(Array.isArray(normalizedConflict.json.warnings), true);

    const invalidSlot = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "Завтра 09:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Невалидный формат",
    });
    assert.equal(invalidSlot.status, 400);
    assert.equal(invalidSlot.json.error.code, "validation_error");
    assert.equal(
      invalidSlot.json.error.details.some((detail) => detail.field === "plannedStartLocal"),
      true,
    );

    const mismatchVehicle = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 10:00",
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Проверка",
      bayId: "bay-2",
    });
    assert.equal(mismatchVehicle.status, 409);
    assert.equal(mismatchVehicle.json.error.code, "conflict");

    const cancelled = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 11:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Отмененная запись",
      bayId: "bay-2",
      primaryAssignee: "Сергей Кузнецов",
      status: "cancelled",
    });
    assert.equal(cancelled.status, 201);

    const allowedAfterCancelled = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 11:00",
      customerId: "cust-3",
      vehicleId: "veh-2",
      complaint: "Новая запись в тот же слот",
      bayId: "bay-2",
      primaryAssignee: "Сергей Кузнецов",
      status: "booked",
    });
    assert.equal(allowedAfterCancelled.status, 201);

    const movedFromFreeSlot = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-22 12:00",
      customerId: "cust-3",
      vehicleId: "veh-2",
      complaint: "Запись на другое время",
      bayId: "bay-1",
      primaryAssignee: "Алексей Соколов",
      status: "booked",
    });
    assert.equal(movedFromFreeSlot.status, 201);

    const moveToConflict = await requestJson(
      "PATCH",
      `${baseUrl}/api/v1/appointments/${movedFromFreeSlot.json.item.id}`,
      {
        plannedStartLocal: "2026-03-22 09:00",
        bayId: "bay-1",
      },
    );
    assert.equal(moveToConflict.status, 200);
    assert.equal(Array.isArray(moveToConflict.json.warnings), true);
    assert.equal(moveToConflict.json.warnings[0].field, "bayId");

    const filtered = await requestJson("GET", `${baseUrl}/api/v1/appointments?status=arrived`);
    assert.equal(filtered.status, 200);
    assert.equal(filtered.json.items.some((item) => item.id === createdId), true);

    const invalidQuery = await requestJson("GET", `${baseUrl}/api/v1/appointments?unknownParam=1`);
    assert.equal(invalidQuery.status, 400);
    assert.equal(invalidQuery.json.error.code, "validation_error");

    const notFound = await requestJson("GET", `${baseUrl}/api/v1/appointments/apt-missing`);
    assert.equal(notFound.status, 404);
    assert.equal(notFound.json.error.code, "not_found");
  });
});
