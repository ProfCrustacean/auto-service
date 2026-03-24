import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  withTestServer,
  waitForServer,
} from "./helpers/httpHarness.js";

function createCollectingLogger() {
  const infoLogs = [];
  const errorLogs = [];
  const logger = {
    info(event, fields = {}) {
      infoLogs.push({ event, ...fields });
    },
    warn() {},
    error(event, fields = {}) {
      errorLogs.push({ event, ...fields });
    },
  };
  return { logger, infoLogs, errorLogs };
}

test("request logging suppresses health-check noise", async () => {
  const { logger, infoLogs } = createCollectingLogger();
  await withTestServer("auto-service-http-log-noise", async ({ baseUrl }) => {
    const externalRequestId = "req-from-client-123";
    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`, {
      headers: {
        "x-request-id": externalRequestId,
      },
    });
    assert.equal(dashboardRes.status, 200);
    assert.equal(dashboardRes.headers.get("x-request-id"), externalRequestId);

    const requestLogs = infoLogs.filter((entry) => entry.event === "http_request");
    const healthLogs = requestLogs.filter((entry) => entry.path === "/healthz");
    const dashboardLogs = requestLogs.filter((entry) => entry.path === "/api/v1/dashboard/today");

    assert.equal(healthLogs.length, 0);
    assert.equal(dashboardLogs.length, 1);
    assert.equal(dashboardLogs[0].method, "GET");
    assert.equal(dashboardLogs[0].statusCode, 200);
    assert.equal(typeof dashboardLogs[0].durationMs, "number");
    assert.equal(dashboardLogs[0].requestId, externalRequestId);
  }, { logger });
});

test("request logging errors mode logs only failures", async () => {
  const { logger, infoLogs } = createCollectingLogger();
  await withTestServer("auto-service-http-log-errors-only", async ({ baseUrl }) => {
    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);

    const missingRes = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
    assert.equal(missingRes.status, 404);

    const requestLogs = infoLogs.filter((entry) => entry.event === "http_request");
    assert.equal(requestLogs.length, 1);
    assert.equal(requestLogs[0].path, "/api/v1/unknown-endpoint");
    assert.equal(requestLogs[0].statusCode, 404);
  }, { logger, requestLogMode: "errors" });
});

test("request logging mutations mode keeps writes and failures", async () => {
  const { logger, infoLogs } = createCollectingLogger();
  await withTestServer("auto-service-http-log-mutations", async ({ baseUrl }) => {
    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);

    const createCustomer = await fetch(`${baseUrl}/api/v1/customers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer owner-dev-token",
      },
      body: JSON.stringify({
        fullName: "Logging Mode Test",
        phone: "+7 999 000 00 00",
      }),
    });
    assert.equal(createCustomer.status, 201);

    const missingRes = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
    assert.equal(missingRes.status, 404);

    const requestLogs = infoLogs.filter((entry) => entry.event === "http_request");
    const dashboardLog = requestLogs.find((entry) => entry.path === "/api/v1/dashboard/today");
    const createLog = requestLogs.find((entry) => entry.path === "/api/v1/customers" && entry.method === "POST");
    const missingLog = requestLogs.find((entry) => entry.path === "/api/v1/unknown-endpoint");

    assert.equal(dashboardLog, undefined);
    assert.ok(createLog);
    assert.equal(createLog.statusCode, 201);
    assert.ok(missingLog);
    assert.equal(missingLog.statusCode, 404);
  }, { logger, requestLogMode: "mutations" });
});

test("unexpected API failures log request context with requestId", async () => {
  const { logger, infoLogs, errorLogs } = createCollectingLogger();

  const dashboardService = {
    getTodayDashboard() {
      return {
        service: { id: "svc-test" },
      };
    },
    searchLookup() {
      return { performed: false };
    },
    getWorkOrderById() {
      return null;
    },
    getAppointmentById() {
      return null;
    },
  };

  const app = (await import("../src/app.js")).createApp({
    config: { appEnv: "test" },
    logger,
    dashboardService,
    referenceDataService: {
      listEmployees() { return []; },
      listBays() { return []; },
      getEmployeeById() { return null; },
      createEmployee() { throw new Error("not_implemented"); },
      updateEmployeeById() { return null; },
      deactivateEmployeeById() { return null; },
      getBayById() { return null; },
      createBay() { throw new Error("not_implemented"); },
      updateBayById() { return null; },
      deactivateBayById() { return null; },
    },
    customerVehicleService: {
      listCustomers() { return []; },
      listVehicles() { return []; },
      getCustomerById() { return null; },
      createCustomer() { throw new Error("not_implemented"); },
      updateCustomerById() { return null; },
      deactivateCustomerById() { return null; },
      getVehicleById() { return null; },
      listVehicleOwnershipHistory() { return []; },
      createVehicle() { throw new Error("not_implemented"); },
      updateVehicleById() { return null; },
      deactivateVehicleById() { return null; },
    },
    appointmentService: {
      listAppointments() {
        throw new Error("forced_failure");
      },
      getAppointmentById() { return null; },
      ensureCapacityAvailable() {},
      createAppointment() { throw new Error("not_implemented"); },
      updateAppointmentById() { return null; },
    },
    walkInIntakeService: {
      createWalkInIntake() { throw new Error("not_implemented"); },
    },
    workOrderService: {
      listWorkOrders() { return []; },
      getWorkOrderById() { return null; },
      updateWorkOrderById() { return null; },
      convertAppointmentToWorkOrder() { throw new Error("not_implemented"); },
    },
  });

  const server = app.listen(0);
  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const requestId = "req-error-path-777";

    const response = await fetch(`${baseUrl}/api/v1/appointments`, {
      headers: {
        "x-request-id": requestId,
      },
    });

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("x-request-id"), requestId);

    const payload = await response.json();
    assert.equal(payload?.error?.code, "internal_error");

    const failureLog = errorLogs.find((entry) => entry.event === "appointments_list_failed");
    assert.ok(failureLog);
    assert.equal(failureLog.method, "GET");
    assert.equal(failureLog.path, "/api/v1/appointments");
    assert.equal(failureLog.requestId, requestId);
    assert.match(String(failureLog.stack ?? ""), /forced_failure/);

    const requestLog = infoLogs.find((entry) => entry.event === "http_request" && entry.path === "/api/v1/appointments");
    assert.ok(requestLog);
    assert.equal(requestLog.requestId, requestId);
  } finally {
    await closeServer(server);
  }
});
