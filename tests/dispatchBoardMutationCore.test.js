import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBoardPatchPayload,
  deriveQueueDurationMinutes,
  executeDispatchPreview,
  executeDispatchQueueAppointmentSchedule,
  executeDispatchQueueWalkInSchedule,
  extractItemWarnings,
  normalizeDispatchDay,
  normalizeDispatchMode,
  validateDispatchEventUpdate,
} from "../src/http/dispatchBoardMutationCore.js";

test("mode/day normalization is deterministic", () => {
  assert.equal(normalizeDispatchMode("technician"), "technician");
  assert.equal(normalizeDispatchMode("bay"), "bay");
  assert.equal(normalizeDispatchMode("unexpected"), "bay");

  assert.equal(normalizeDispatchDay("2026-03-23"), "2026-03-23");
  assert.equal(normalizeDispatchDay("2026/03/23"), null);
  assert.equal(normalizeDispatchDay(undefined), null);
});

test("buildBoardPatchPayload parses slot and resource assignment", () => {
  const payload = buildBoardPatchPayload(
    {
      start: "2026-03-23 09:00",
      end: "2026-03-23 10:15",
      resourceId: "tech:emp-1",
      laneMode: "technician",
      reason: "  moved manually  ",
    },
    { day: "2026-03-23" },
  );

  assert.equal(payload.ok, true);
  assert.equal(payload.laneMode, "technician");
  assert.equal(payload.dayLocal, "2026-03-23");
  assert.equal(payload.updates.plannedStartLocal, "2026-03-23 09:00");
  assert.equal(payload.updates.expectedDurationMin, 75);
  assert.equal(payload.updates.primaryAssignee, "emp-1");
  assert.equal(payload.updates.reason, "moved manually");

  const invalidResource = buildBoardPatchPayload(
    {
      start: "2026-03-23 09:00",
      resourceId: "bay:bay-1",
      laneMode: "technician",
    },
    {},
  );
  assert.equal(invalidResource.ok, false);
  assert.match(invalidResource.errors[0].message, /tech:/u);
});

test("validateDispatchEventUpdate enforces required start/resource before update validation", () => {
  const payload = {
    updates: {
      plannedStartLocal: "2026-03-23 09:00",
      bayId: "bay-1",
      expectedDurationMin: 60,
    },
  };

  const ok = validateDispatchEventUpdate(payload, { requireStart: true, requireResource: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.bayId, "bay-1");

  const missing = validateDispatchEventUpdate({ updates: {} }, { requireStart: true, requireResource: true });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.length, 2);
});

test("extractItemWarnings strips capacityWarnings from payload", () => {
  const source = {
    id: "apt-1",
    code: "APT-001",
    capacityWarnings: [{ field: "bayId", message: "overlap" }],
  };
  const { item, warnings } = extractItemWarnings(source);
  assert.deepEqual(warnings, [{ field: "bayId", message: "overlap" }]);
  assert.equal(item.id, "apt-1");
  assert.equal("capacityWarnings" in item, false);
});

test("dispatch preview and queue scheduling return warnings without blocking", () => {
  const appointmentService = {
    previewAppointmentUpdate() {
      return {
        id: "apt-1",
        code: "APT-001",
        capacityWarnings: [{ field: "bayId", message: "overlap preview" }],
      };
    },
    updateAppointmentById() {
      return {
        id: "apt-1",
        code: "APT-001",
        capacityWarnings: [{ field: "bayId", message: "overlap commit" }],
      };
    },
  };

  const preview = executeDispatchPreview({
    appointmentService,
    appointmentId: "apt-1",
    updates: {
      plannedStartLocal: "2026-03-23 09:00",
      bayId: "bay-1",
      expectedDurationMin: 60,
    },
    changedBy: null,
    reason: null,
    actor: "front_desk_ui",
    dayLocal: "2026-03-23",
    laneMode: "bay",
  });
  assert.equal(preview.preview, true);
  assert.equal(preview.actor, "front_desk_ui");
  assert.equal(preview.warnings.length, 1);

  const scheduled = executeDispatchQueueAppointmentSchedule({
    appointmentService,
    appointmentId: "apt-1",
    updates: {
      plannedStartLocal: "2026-03-23 10:00",
      bayId: "bay-1",
      expectedDurationMin: 60,
    },
    changedBy: null,
    reason: null,
    actor: "front_desk_ui",
    dayLocal: "2026-03-23",
    laneMode: "bay",
  });
  assert.equal(scheduled.scheduled, true);
  assert.equal(scheduled.warnings.length, 2);
});

test("walk-in scheduling validates payload and links appointment on success", () => {
  const workOrder = {
    id: "wo-1",
    customerId: "cust-1",
    vehicleId: "veh-1",
    complaint: "No power",
  };

  const validationFailure = executeDispatchQueueWalkInSchedule({
    appointmentService: { createAppointment() { throw new Error("must not run"); } },
    workOrderService: { linkAppointment() { throw new Error("must not run"); } },
    workOrder,
    dispatchUpdates: {
      plannedStartLocal: null,
      bayId: "bay-1",
      expectedDurationMin: 60,
    },
    dayLocal: "2026-03-23",
    laneMode: "bay",
  });
  assert.ok(Array.isArray(validationFailure.validationErrors));
  assert.match(validationFailure.validationErrors[0].field, /plannedStartLocal/u);

  const calls = [];
  const success = executeDispatchQueueWalkInSchedule({
    appointmentService: {
      createAppointment(payload) {
        calls.push({ kind: "create", payload });
        return {
          id: "apt-7",
          code: "APT-007",
          capacityWarnings: [{ field: "bayId", message: "overlap" }],
        };
      },
    },
    workOrderService: {
      linkAppointment(workOrderId, appointmentId) {
        calls.push({ kind: "link", workOrderId, appointmentId });
      },
    },
    workOrder,
    dispatchUpdates: {
      plannedStartLocal: "2026-03-23 11:00",
      bayId: "bay-1",
      expectedDurationMin: 60,
    },
    dayLocal: "2026-03-23",
    laneMode: "bay",
  });

  assert.equal(success.createdFromWorkOrderId, "wo-1");
  assert.equal(success.item.id, "apt-7");
  assert.equal(success.warnings.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].kind, "link");
});

test("deriveQueueDurationMinutes uses fallback when duration is missing", () => {
  assert.equal(deriveQueueDurationMinutes({ expectedDurationMin: 45 }, 60), 45);
  assert.equal(deriveQueueDurationMinutes({}, 60), 60);
});
