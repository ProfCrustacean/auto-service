import test from "node:test";
import assert from "node:assert/strict";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { AppointmentService } from "../src/services/appointmentService.js";
import { WalkInIntakeService } from "../src/services/walkInIntakeService.js";
import { createSilentLogger, createTempDatabase } from "./helpers/httpHarness.js";

function buildUniqueSlot(token, hour = 15) {
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  const day = (Number.parseInt(token.slice(-4, -2), 10) % 20) + 10;
  return `2026-05-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

test("domain services support scheduling and walk-in acceptance scenario", () => {
  const tempDb = createTempDatabase("auto-service-domain-scheduling-walkin");
  const { databasePath, cleanup } = tempDb;
  const logger = createSilentLogger();
  const config = { appEnv: "test", port: 0, seedPath: "./data/seed-fixtures.json", databasePath };

  const { repository, database } = bootstrapPersistence({ config, logger });
  const appointmentService = new AppointmentService(repository);
  const walkInIntakeService = new WalkInIntakeService(repository);

  try {
    const appointmentsBefore = repository.listAppointmentRecords().length;
    const workOrdersBefore = repository.listWorkOrders().length;

    const uniqueToken = `${Date.now()}`;
    const slot = buildUniqueSlot(uniqueToken, 15);
    const appointment = appointmentService.createAppointment({
      plannedStartLocal: slot,
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

    const overlapping = appointmentService.createAppointment({
      plannedStartLocal: slot,
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Domain conflict appointment",
      bayId: "bay-1",
      primaryAssignee: "Сергей Кузнецов",
      status: "booked",
    });
    assert.equal(Array.isArray(overlapping.capacityWarnings), true);
    assert.equal(overlapping.capacityWarnings[0].field, "bayId");

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

    assert.equal(appointmentsAfter, appointmentsBefore + 2);
    assert.equal(workOrdersAfter, workOrdersBefore + 1);
    assert.equal(intakeEvents.some((item) => item.id === walkIn.intakeEvent.id), true);
  } finally {
    database.close();
    cleanup();
  }
});
