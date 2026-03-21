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
  const infoLogs = [];
  const logger = {
    info(event, fields = {}) {
      infoLogs.push({ event, ...fields });
    },
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
  return { server, database, infoLogs };
}

test("request logging suppresses successful health checks and keeps business-path logs", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-http-log-noise-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database, infoLogs } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);

    const requestLogs = infoLogs.filter((entry) => entry.event === "http_request");
    const healthLogs = requestLogs.filter((entry) => entry.path === "/healthz");
    const dashboardLogs = requestLogs.filter((entry) => entry.path === "/api/v1/dashboard/today");

    assert.equal(healthLogs.length, 0);
    assert.equal(dashboardLogs.length, 1);
    assert.equal(dashboardLogs[0].method, "GET");
    assert.equal(dashboardLogs[0].statusCode, 200);
    assert.equal(typeof dashboardLogs[0].durationMs, "number");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
