import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { AppointmentService } from "../src/services/appointmentService.js";
import { WalkInIntakeService } from "../src/services/walkInIntakeService.js";

function makeSilentLogger() {
  return {
    info() {},
    warn() {},
    error() {},
  };
}

test("domain services support scheduling and walk-in acceptance scenario", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-domain-scheduling-walkin-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const logger = makeSilentLogger();
  const config = { appEnv: "test", port: 0, seedPath: "./data/seed-fixtures.json", databasePath };

  const { repository, database } = bootstrapPersistence({ config, logger });
  const appointmentService = new AppointmentService(repository);
  const walkInIntakeService = new WalkInIntakeService(repository);

  try {
    const appointmentsBefore = repository.listAppointmentRecords().length;
    const workOrdersBefore = repository.listWorkOrders().length;

    const uniqueToken = `${Date.now()}`;
    const appointment = appointmentService.createAppointment({
      plannedStartLocal: `DOMAIN-SCENARIO-${uniqueToken}`,
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Domain scenario appointment",
      bayId: "bay-1",
      primaryAssignee: "Иван Петров",
      status: "booked",
    });

    assert.match(appointment.code, /^APT-\d+$/);
    assert.equal(appointment.status, "booked");

    const confirmed = appointmentService.updateAppointmentById(appointment.id, { status: "confirmed" });
    assert.equal(confirmed.status, "confirmed");

    assert.throws(
      () =>
        appointmentService.createAppointment({
          plannedStartLocal: `DOMAIN-SCENARIO-${uniqueToken}`,
          customerId: "cust-4",
          vehicleId: "veh-4",
          complaint: "Domain conflict appointment",
          bayId: "bay-1",
          primaryAssignee: "Сергей Кузнецов",
          status: "booked",
        }),
      (error) => error?.code === "appointment_capacity_conflict",
    );

    const walkIn = walkInIntakeService.createWalkInIntake({
      customerId: "cust-1",
      vehicleId: "veh-1",
      complaint: "Domain scenario walk-in",
      bayId: "bay-2",
      primaryAssignee: "Алексей Соколов",
    });

    assert.equal(walkIn.intakeEvent.source, "walk_in");
    assert.equal(walkIn.intakeEvent.status, "waiting_diagnosis");
    assert.equal(walkIn.workOrder.status, "waiting_diagnosis");
    assert.equal(walkIn.workOrder.statusLabelRu, "Ожидает диагностики");

    const appointmentsAfter = repository.listAppointmentRecords().length;
    const workOrdersAfter = repository.listWorkOrders().length;
    const intakeEvents = repository.listIntakeEvents();

    assert.equal(appointmentsAfter, appointmentsBefore + 1);
    assert.equal(workOrdersAfter, workOrdersBefore + 1);
    assert.equal(intakeEvents.some((item) => item.id === walkIn.intakeEvent.id), true);
  } finally {
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
