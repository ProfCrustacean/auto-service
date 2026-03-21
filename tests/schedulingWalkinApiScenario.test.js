import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../src/services/dashboardService.js";
import { ReferenceDataService } from "../src/services/referenceDataService.js";
import { CustomerVehicleService } from "../src/services/customerVehicleService.js";
import { AppointmentService } from "../src/services/appointmentService.js";
import { WalkInIntakeService } from "../src/services/walkInIntakeService.js";
import { createApp } from "../src/app.js";

function makeServer({ port = 0, databasePath }) {
  const logger = {
    info() {},
    warn() {},
    error() {},
  };

  const config = { appEnv: "test", port, seedPath: "./data/seed-fixtures.json", databasePath };
  const { repository, database } = bootstrapPersistence({ config, logger });
  const dashboardService = new DashboardService(repository);
  const referenceDataService = new ReferenceDataService(repository);
  const customerVehicleService = new CustomerVehicleService(repository);
  const appointmentService = new AppointmentService(repository);
  const walkInIntakeService = new WalkInIntakeService(repository);
  const app = createApp({
    config,
    logger,
    dashboardService,
    referenceDataService,
    customerVehicleService,
    appointmentService,
    walkInIntakeService,
  });

  const server = app.listen(port);
  return { server, database };
}

async function requestJson(method, url, body = undefined) {
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await res.json();
  return { status: res.status, json };
}

test("API acceptance scenario covers appointment scheduling and walk-in intake", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-api-scheduling-walkin-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const before = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(before.status, 200);

    const uniqueToken = `${Date.now()}`;

    const createAppointment = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: `API-SCENARIO-${uniqueToken}`,
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
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
