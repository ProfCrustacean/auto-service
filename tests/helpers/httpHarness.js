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

export function makeServer({
  databasePath,
  port = 0,
  logger = createSilentLogger(),
  authConfig = {},
}) {
  const defaultAuthConfig = {
    enabled: process.env.TEST_AUTH_ENABLED !== "0",
    implicitUiRole: process.env.TEST_AUTH_UI_IMPLICIT_ROLE ?? "front_desk",
    tokens: [
      { role: "owner", token: process.env.TEST_OWNER_TOKEN ?? "owner-dev-token" },
      { role: "front_desk", token: process.env.TEST_FRONT_DESK_TOKEN ?? "frontdesk-dev-token" },
      { role: "technician", token: process.env.TEST_TECHNICIAN_TOKEN ?? "technician-dev-token" },
    ],
  };

  const config = {
    appEnv: "test",
    port,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
    auth: {
      ...defaultAuthConfig,
      ...authConfig,
      tokens: authConfig.tokens ?? defaultAuthConfig.tokens,
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

export async function withTestServer(prefix, run, options = {}) {
  const tempDb = createTempDatabase(prefix);
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath, ...options });

  await waitForServer(server);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await run({ baseUrl, server, database, databasePath });
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
}

export function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

export async function submitUrlEncodedForm(url, payload, {
  redirect = "follow",
  headers = {},
} = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: toFormBody(payload),
    redirect,
  });

  const text = await response.text();
  return {
    status: response.status,
    text,
    location: response.headers.get("location"),
  };
}

export function extractRedirectId(locationHeader, prefix) {
  const match = new RegExp(`^/${prefix}/([^?]+)`, "u").exec(locationHeader ?? "");
  return match ? match[1] : null;
}

export function buildUniqueSlot(token, hour = 12) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function requestJson(method, url, body = undefined, { token } = {}) {
  const headers = {
    "content-type": "application/json",
  };
  const normalizedMethod = String(method).toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(normalizedMethod)) {
    headers.authorization = `Bearer ${token ?? process.env.TEST_AUTH_TOKEN ?? "owner-dev-token"}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await res.json();
  return { status: res.status, json };
}
