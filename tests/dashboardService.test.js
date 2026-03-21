import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../src/services/dashboardService.js";

test("DashboardService returns expected queue counts from fixtures", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-dashboard-test-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = {
    info() {},
    warn() {},
    error() {},
  };
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new DashboardService(repository);

  try {
    const payload = service.getTodayDashboard();

    assert.equal(payload.summary.appointmentsToday, 1);
    assert.equal(payload.summary.waitingPartsCount, 1);
    assert.equal(payload.summary.readyForPickupCount, 1);
    assert.ok(payload.summary.activeWorkOrders >= 4);
    assert.equal(payload.summary.unpaidReadyForPickupCount, 1);
    assert.equal(payload.summary.unpaidReadyForPickupAmountRub, 6500);
    assert.equal(payload.summary.totalOutstandingActiveRub, 27000);
    assert.ok(payload.load.byBay.length >= 2);
    assert.ok(payload.load.byAssignee.length >= 3);
    assert.equal(payload.queues.waitingParts[0].nextActionLabel, "Уточнить поставку");
  } finally {
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
