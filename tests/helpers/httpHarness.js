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

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export const createSilentLogger = () => ({ info() {}, warn() {}, error() {} });

export function createTempDatabase(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const databasePath = path.join(tempDir, "test.sqlite");
  return { databasePath, cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }) };
}

export function makeServer({ databasePath, port = 0, logger = createSilentLogger(), authConfig = {}, requestLogMode = "all" }) {
  const defaultTokens = [
    { role: "owner", token: process.env.TEST_OWNER_TOKEN ?? "owner-dev-token" },
    { role: "front_desk", token: process.env.TEST_FRONT_DESK_TOKEN ?? "frontdesk-dev-token" },
    { role: "technician", token: process.env.TEST_TECHNICIAN_TOKEN ?? "technician-dev-token" },
  ];
  const config = {
    appEnv: "test",
    port,
    requestLogMode,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
    auth: {
      enabled: process.env.TEST_AUTH_ENABLED !== "0",
      implicitUiRole: process.env.TEST_AUTH_UI_IMPLICIT_ROLE ?? "front_desk",
      tokens: authConfig.tokens ?? defaultTokens,
      ...authConfig,
    },
  };

  const { repository, database } = bootstrapPersistence({ config, logger });
  const app = createApp({
    config,
    logger,
    dashboardService: new DashboardService(repository),
    referenceDataService: new ReferenceDataService(repository),
    customerVehicleService: new CustomerVehicleService(repository),
    appointmentService: new AppointmentService(repository),
    walkInIntakeService: new WalkInIntakeService(repository),
    workOrderService: new WorkOrderService(repository),
  });

  return { server: app.listen(port), database };
}

export async function waitForServer(server) {
  if (!server.listening) {
    await new Promise((resolve) => server.once("listening", resolve));
  }
}

export async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

export async function withTestServer(prefix, run, options = {}) {
  const tempDb = createTempDatabase(prefix);
  const { server, database } = makeServer({ databasePath: tempDb.databasePath, ...options });
  await waitForServer(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    return await run({ baseUrl, server, database, databasePath: tempDb.databasePath });
  } finally {
    await closeServer(server);
    database.close();
    tempDb.cleanup();
  }
}

function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export async function submitUrlEncodedForm(url, payload, { redirect = "follow", headers = {} } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: toFormBody(payload),
    redirect,
  });
  return { status: response.status, text: await response.text(), location: response.headers.get("location") };
}

export function extractRedirectId(locationHeader, prefix) {
  const match = new RegExp(`^/${prefix}/([^?]+)`, "u").exec(locationHeader ?? "");
  return match?.[1] ?? null;
}

export function buildUniqueSlot(token, hour = 12) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function requestJson(method, url, body = undefined, { token } = {}) {
  const normalizedMethod = String(method).toUpperCase();
  const headers = { "content-type": "application/json" };
  if (MUTATING_METHODS.has(normalizedMethod)) {
    headers.authorization = `Bearer ${token ?? process.env.TEST_AUTH_TOKEN ?? "owner-dev-token"}`;
  }
  const response = await fetch(url, {
    method: normalizedMethod,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}
