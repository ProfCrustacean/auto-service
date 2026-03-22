import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  waitForServer,
} from "./helpers/httpHarness.js";

test("request logging suppresses successful health checks and keeps business-path logs", async () => {
  const tempDb = createTempDatabase("auto-service-http-log-noise");
  const { databasePath, cleanup } = tempDb;
  const infoLogs = [];
  const logger = {
    info(event, fields = {}) {
      infoLogs.push({ event, ...fields });
    },
    warn() {},
    error() {},
  };
  const { server, database } = makeServer({ databasePath, logger });

  await waitForServer(server);

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
    await closeServer(server);
    database.close();
    cleanup();
  }
});
