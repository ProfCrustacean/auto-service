import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../src/persistence/database.js";
import { runMigrations } from "../src/persistence/runMigrations.js";
import { seedDatabase } from "../src/persistence/seedDatabase.js";
import { createSilentLogger, createTempDatabase } from "./helpers/httpHarness.js";

test("migrations are idempotent and seed runs only once by default", () => {
  const tempDb = createTempDatabase("auto-service-persistence-test");
  const { databasePath, cleanup } = tempDb;
  const database = openDatabase(databasePath);
  const logger = createSilentLogger();

  try {
    const firstMigration = runMigrations({ database, logger });
    assert.equal(firstMigration.appliedVersions.length, 6);
    assert.deepEqual(firstMigration.appliedVersions, ["001", "002", "003", "004", "005", "006"]);
    assert.equal(firstMigration.currentVersion, "006");

    const secondMigration = runMigrations({ database, logger });
    assert.equal(secondMigration.appliedVersions.length, 0);

    const firstSeed = seedDatabase({ database, seedPath: "./data/seed-fixtures.json", logger });
    assert.equal(firstSeed.seeded, true);
    assert.equal(firstSeed.counts.customers, 4);
    assert.equal(firstSeed.counts.vehicles, 4);
    assert.equal(firstSeed.counts.vehicleOwnershipHistory, 4);
    assert.equal(firstSeed.counts.appointments, 1);
    assert.equal(firstSeed.counts.workOrders, 8);
    assert.equal(firstSeed.counts.intakeEvents, 2);

    const secondSeed = seedDatabase({ database, seedPath: "./data/seed-fixtures.json", logger });
    assert.equal(secondSeed.seeded, false);
    assert.equal(secondSeed.reason, "database_not_empty");
    assert.equal(secondSeed.counts.customers, 4);

    const appointmentCount = database.prepare("SELECT COUNT(1) AS count FROM appointments").get().count;
    const workOrderCount = database.prepare("SELECT COUNT(1) AS count FROM work_orders").get().count;
    const nextAppointmentCode = database
      .prepare("SELECT next_value AS nextValue FROM code_sequences WHERE entity = 'appointment'")
      .get().nextValue;
    const nextWorkOrderCode = database
      .prepare("SELECT next_value AS nextValue FROM code_sequences WHERE entity = 'work_order'")
      .get().nextValue;

    assert.equal(appointmentCount, 1);
    assert.equal(workOrderCount, 8);
    assert.equal(nextAppointmentCode, 2);
    assert.equal(nextWorkOrderCode, 1006);
  } finally {
    database.close();
    cleanup();
  }
});
