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

test("walk-in intake API creates active flow without prior appointment", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-walkin-test-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

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
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
