import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../src/services/dashboardService.js";
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
  const app = createApp({ config, logger, dashboardService });
  const server = app.listen(port);
  return { server, database };
}

test("health and dashboard endpoints return successful responses", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-http-test-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, "ok");

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);
    const dashboard = await dashboardRes.json();
    assert.equal(dashboard.summary.appointmentsToday, 1);
    assert.equal(dashboard.summary.waitingPartsCount, 1);

    const uiRes = await fetch(baseUrl);
    assert.equal(uiRes.status, 200);
    const html = await uiRes.text();
    assert.match(html, /Диспетчер действий/);
    assert.match(html, /Готово к выдаче, но не оплачено/);

    const woRes = await fetch(`${baseUrl}/work-orders/wo-1005`);
    assert.equal(woRes.status, 200);
    const woHtml = await woRes.text();
    assert.match(woHtml, /Заказ-наряд WO-1005/);

    const intakeRes = await fetch(`${baseUrl}/intake/walk-in`);
    assert.equal(intakeRes.status, 200);
    const intakeHtml = await intakeRes.text();
    assert.match(intakeHtml, /Прием walk-in/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
