import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../../src/services/dashboardService.js";
import { ReferenceDataService } from "../../src/services/referenceDataService.js";
import { CustomerVehicleService } from "../../src/services/customerVehicleService.js";
import { AppointmentService } from "../../src/services/appointmentService.js";
import { WalkInIntakeService } from "../../src/services/walkInIntakeService.js";
import { WorkOrderService } from "../../src/services/workOrderService.js";
import { createApp } from "../../src/app.js";

export function createSilentLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

export function createTempDatabase(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const databasePath = path.join(tempDir, "test.sqlite");
  return {
    databasePath,
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function makeServer({ databasePath, port = 0, logger = createSilentLogger() }) {
  const config = {
    appEnv: "test",
    port,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
    auth: {
      enabled: process.env.TEST_AUTH_ENABLED !== "0",
      tokens: [
        { role: "owner", token: process.env.TEST_OWNER_TOKEN ?? "owner-dev-token" },
        { role: "front_desk", token: process.env.TEST_FRONT_DESK_TOKEN ?? "frontdesk-dev-token" },
        { role: "technician", token: process.env.TEST_TECHNICIAN_TOKEN ?? "technician-dev-token" },
      ],
    },
  };
  const { repository, database } = bootstrapPersistence({ config, logger });
  const dashboardService = new DashboardService(repository);
  const referenceDataService = new ReferenceDataService(repository);
  const customerVehicleService = new CustomerVehicleService(repository);
  const appointmentService = new AppointmentService(repository);
  const walkInIntakeService = new WalkInIntakeService(repository);
  const workOrderService = new WorkOrderService(repository);

  const app = createApp({
    config,
    logger,
    dashboardService,
    referenceDataService,
    customerVehicleService,
    appointmentService,
    walkInIntakeService,
    workOrderService,
  });

  return {
    server: app.listen(port),
    database,
  };
}

export async function waitForServer(server) {
  if (server.listening) {
    return;
  }

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });
}

export async function closeServer(server) {
  await new Promise((resolve) => {
    server.close(resolve);
  });
}

export async function requestJson(method, url, body = undefined) {
  const headers = {
    "content-type": "application/json",
  };
  const normalizedMethod = String(method).toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(normalizedMethod)) {
    headers.authorization = `Bearer ${process.env.TEST_AUTH_TOKEN ?? "owner-dev-token"}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await res.json();
  return { status: res.status, json };
}
