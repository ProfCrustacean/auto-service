import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  requestJson,
  waitForServer,
} from "./helpers/httpHarness.js";

function buildUniqueSlot(token, hour = 14) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

test("API acceptance scenario covers appointment scheduling and walk-in intake", async () => {
  const tempDb = createTempDatabase("auto-service-api-scheduling-walkin");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const before = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(before.status, 200);

    const uniqueToken = `${Date.now()}`;

    const createAppointment = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: buildUniqueSlot(uniqueToken, 14),
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "API scenario scheduling",
      bayId: "bay-1",
      primaryAssignee: "Иван Петров",
      status: "booked",
    });
    assert.equal(createAppointment.status, 201);

    const appointmentId = createAppointment.json.item.id;

    const confirmAppointment = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${appointmentId}`, {
      status: "confirmed",
    });
    assert.equal(confirmAppointment.status, 200);
    assert.equal(confirmAppointment.json.item.status, "confirmed");

    const createWalkIn = await requestJson("POST", `${baseUrl}/api/v1/intake/walk-ins`, {
      customerId: "cust-1",
      vehicleId: "veh-1",
      complaint: "API scenario walk-in",
      bayId: "bay-2",
      primaryAssignee: "Алексей Соколов",
    });
    assert.equal(createWalkIn.status, 201);

    const workOrderId = createWalkIn.json.item.workOrder.id;

    const after = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(after.status, 200);
    assert.equal(after.json.summary.appointmentsToday, before.json.summary.appointmentsToday + 1);
    assert.equal(after.json.summary.activeWorkOrders, before.json.summary.activeWorkOrders + 1);
    assert.equal(after.json.appointments.some((item) => item.id === appointmentId), true);
    assert.equal(after.json.queues.active.some((item) => item.id === workOrderId), true);

    const appointmentDetailRes = await fetch(`${baseUrl}/appointments/${appointmentId}`);
    assert.equal(appointmentDetailRes.status, 200);
    const appointmentDetailHtml = await appointmentDetailRes.text();
    assert.match(appointmentDetailHtml, /Запись APT-/);

    const workOrderDetailRes = await fetch(`${baseUrl}/work-orders/${workOrderId}`);
    assert.equal(workOrderDetailRes.status, 200);
    const workOrderDetailHtml = await workOrderDetailRes.text();
    assert.match(workOrderDetailHtml, /Заказ-наряд WO-/);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});
