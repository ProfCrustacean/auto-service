import test from "node:test";
import assert from "node:assert/strict";
import { FixtureRepository } from "../src/repositories/fixtureRepository.js";
import { DashboardService } from "../src/services/dashboardService.js";

test("DashboardService returns expected queue counts from fixtures", () => {
  const repository = new FixtureRepository("./data/seed-fixtures.json");
  const service = new DashboardService(repository);

  const payload = service.getTodayDashboard();

  assert.equal(payload.summary.appointmentsToday, 1);
  assert.equal(payload.summary.waitingPartsCount, 1);
  assert.equal(payload.summary.readyForPickupCount, 1);
  assert.ok(payload.summary.activeWorkOrders >= 4);
});
