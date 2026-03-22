import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  requestJson,
  waitForServer,
} from "./helpers/httpHarness.js";

test("walk-in intake API creates active flow without prior appointment", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-test");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const dashboardBefore = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardBefore.status, 200);
    const activeBefore = dashboardBefore.json.summary.activeWorkOrders;
    const appointmentsBefore = dashboardBefore.json.summary.appointmentsToday;

    const createWalkIn = await requestJson("POST", `${baseUrl}/api/v1/intake/walk-ins`, {
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Walk-in: загорелся чек и нестабильный холостой ход",
      bayId: "bay-2",
      primaryAssignee: "Дмитрий Орлов",
    });

    assert.equal(createWalkIn.status, 201);
    assert.match(createWalkIn.json.item.intakeEvent.id, /^intake-/);
    assert.equal(createWalkIn.json.item.intakeEvent.source, "walk_in");
    assert.equal(createWalkIn.json.item.intakeEvent.sourceAppointmentId, null);
    assert.equal(createWalkIn.json.item.intakeEvent.status, "waiting_diagnosis");

    assert.match(createWalkIn.json.item.workOrder.id, /^wo-/);
    assert.match(createWalkIn.json.item.workOrder.code, /^WO-\d+$/);
    assert.equal(createWalkIn.json.item.workOrder.status, "waiting_diagnosis");
    assert.equal(createWalkIn.json.item.workOrder.statusLabelRu, "Ожидает диагностики");
    assert.equal(createWalkIn.json.item.workOrder.customerName, "Павел Иванов");
    assert.equal(createWalkIn.json.item.workOrder.vehicleLabel, "Lada Vesta C789CC13");

    const dashboardAfter = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardAfter.status, 200);
    assert.equal(dashboardAfter.json.summary.activeWorkOrders, activeBefore + 1);
    assert.equal(dashboardAfter.json.summary.appointmentsToday, appointmentsBefore);
    assert.equal(
      dashboardAfter.json.queues.active.some((item) => item.id === createWalkIn.json.item.workOrder.id),
      true,
    );

    const mismatch = await requestJson("POST", `${baseUrl}/api/v1/intake/walk-ins`, {
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Проверка несоответствия",
    });
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.json.error.code, "conflict");

    const missingCustomer = await requestJson("POST", `${baseUrl}/api/v1/intake/walk-ins`, {
      customerId: "cust-missing",
      vehicleId: "veh-3",
      complaint: "Проверка отсутствующего клиента",
    });
    assert.equal(missingCustomer.status, 404);
    assert.equal(missingCustomer.json.error.code, "not_found");

    const invalidBody = await requestJson("POST", `${baseUrl}/api/v1/intake/walk-ins`, {
      customerId: "cust-2",
    });
    assert.equal(invalidBody.status, 400);
    assert.equal(invalidBody.json.error.code, "validation_error");
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});
