import {
  makeDomainError,
  resolveCustomerVehicleAndBay,
  resolveInlineCustomerVehicle,
  toId,
} from "./customerVehicleFlow.js";

const APPOINTMENT_STATUSES = new Set(["booked", "confirmed", "arrived", "cancelled", "no-show"]);
const BLOCKING_STATUSES = new Set(["booked", "confirmed", "arrived"]);
const DEFAULT_EXPECTED_DURATION_MIN = 60;

const ALLOWED_STATUS_TRANSITIONS = {
  booked: new Set(["confirmed", "arrived", "cancelled", "no-show"]),
  confirmed: new Set(["arrived", "cancelled", "no-show"]),
  arrived: new Set([]),
  cancelled: new Set([]),
  "no-show": new Set([]),
};

function isBlockingStatus(status) {
  return BLOCKING_STATUSES.has(status);
}

function assertKnownStatus(status) {
  if (!APPOINTMENT_STATUSES.has(status)) {
    throw makeDomainError("appointment_status_invalid", "Unsupported appointment status");
  }
}

function assertTransitionAllowed(fromStatus, toStatus) {
  if (fromStatus === toStatus) {
    return;
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus] ?? new Set();
  if (!allowed.has(toStatus)) {
    throw makeDomainError("appointment_status_transition_invalid", "Invalid appointment status transition", {
      fromStatus,
      toStatus,
    });
  }
}

function parseLocalDateTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/u.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function normalizeDurationMinutes(value) {
  if (!Number.isInteger(value)) {
    return DEFAULT_EXPECTED_DURATION_MIN;
  }

  if (value < 5 || value > 720) {
    return DEFAULT_EXPECTED_DURATION_MIN;
  }

  return value;
}

function buildTimeRange({ plannedStartLocal, expectedDurationMin }) {
  const start = parseLocalDateTime(plannedStartLocal);
  if (!start) {
    return null;
  }
  const durationMin = normalizeDurationMinutes(expectedDurationMin);
  const end = new Date(start.getTime() + (durationMin * 60 * 1000));

  return {
    start,
    end,
    durationMin,
  };
}

function formatLocalDateOnly(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangesOverlap(left, right) {
  return left.start < right.end && right.start < left.end;
}

function isScheduleFieldUpdated(updates) {
  return (
    updates.plannedStartLocal !== undefined
      || updates.expectedDurationMin !== undefined
      || updates.bayId !== undefined
      || updates.primaryAssignee !== undefined
  );
}

function toScheduleHistoryPayload({ id, existing, updated, changedBy, reason, source }) {
  const changedAt = new Date().toISOString();

  return {
    id: toId("ash"),
    appointmentId: id,
    fromPlannedStartLocal: existing.plannedStartLocal,
    toPlannedStartLocal: updated.plannedStartLocal,
    fromExpectedDurationMin: existing.expectedDurationMin ?? null,
    toExpectedDurationMin: updated.expectedDurationMin ?? null,
    fromBayId: existing.bayId ?? null,
    toBayId: updated.bayId ?? null,
    fromPrimaryAssignee: existing.primaryAssignee ?? null,
    toPrimaryAssignee: updated.primaryAssignee ?? null,
    changedAt,
    changedBy,
    reason,
    source,
  };
}

export class AppointmentService {
  constructor(repository) {
    this.repository = repository;
  }

  listAppointments({
    status = null,
    customerId = null,
    vehicleId = null,
    bayId = null,
    dateFromLocal = null,
    dateToLocal = null,
    query = "",
    limit = null,
    offset = 0,
  } = {}) {
    return this.repository.listAppointmentRecords({
      status,
      customerId,
      vehicleId,
      bayId,
      dateFromLocal,
      dateToLocal,
      query,
      limit,
      offset,
    });
  }

  getAppointmentById(id) {
    return this.repository.getAppointmentRecordById(id);
  }

  listAppointmentScheduleHistory(id, { limit = 25 } = {}) {
    return this.repository.listAppointmentScheduleHistory(id, { limit });
  }

  collectCapacityConflicts({
    plannedStartLocal,
    expectedDurationMin = null,
    bayId,
    primaryAssignee,
    status,
    excludeAppointmentId = null,
  }) {
    if (!isBlockingStatus(status)) {
      return [];
    }

    const targetRange = buildTimeRange({ plannedStartLocal, expectedDurationMin });
    if (!targetRange) {
      return [];
    }

    const dateFromLocal = formatLocalDateOnly(targetRange.start);
    const dateToLocal = formatLocalDateOnly(new Date(targetRange.end.getTime() - 1));
    const slotAppointments = this.repository.listIntervalBlockingAppointments({
      dateFromLocal,
      dateToLocal,
      excludeAppointmentId,
    });

    const details = [];

    if (bayId) {
      const bayConflict = slotAppointments.find((item) => {
        if (item.bayId !== bayId) {
          return false;
        }
        const itemRange = buildTimeRange({
          plannedStartLocal: item.plannedStartLocal,
          expectedDurationMin: item.expectedDurationMin,
        });
        if (!itemRange) {
          return false;
        }
        return rangesOverlap(targetRange, itemRange);
      });
      if (bayConflict) {
        const conflictingRange = buildTimeRange({
          plannedStartLocal: bayConflict.plannedStartLocal,
          expectedDurationMin: bayConflict.expectedDurationMin,
        });
        details.push({
          field: "bayId",
          message: "bay is already reserved for this slot",
          conflictingAppointmentId: bayConflict.id,
          conflictingAppointmentCode: bayConflict.code,
          conflictingPlannedStartLocal: bayConflict.plannedStartLocal,
          conflictingExpectedDurationMin: bayConflict.expectedDurationMin ?? DEFAULT_EXPECTED_DURATION_MIN,
          conflictingEndLocal: conflictingRange ? `${formatLocalDateOnly(conflictingRange.end)} ${String(conflictingRange.end.getHours()).padStart(2, "0")}:${String(conflictingRange.end.getMinutes()).padStart(2, "0")}` : null,
        });
      }
    }

    if (primaryAssignee) {
      const assigneeConflict = slotAppointments.find((item) => {
        if (item.primaryAssignee !== primaryAssignee) {
          return false;
        }
        const itemRange = buildTimeRange({
          plannedStartLocal: item.plannedStartLocal,
          expectedDurationMin: item.expectedDurationMin,
        });
        if (!itemRange) {
          return false;
        }
        return rangesOverlap(targetRange, itemRange);
      });
      if (assigneeConflict) {
        const conflictingRange = buildTimeRange({
          plannedStartLocal: assigneeConflict.plannedStartLocal,
          expectedDurationMin: assigneeConflict.expectedDurationMin,
        });
        details.push({
          field: "primaryAssignee",
          message: "assignee is already reserved for this slot",
          conflictingAppointmentId: assigneeConflict.id,
          conflictingAppointmentCode: assigneeConflict.code,
          conflictingPlannedStartLocal: assigneeConflict.plannedStartLocal,
          conflictingExpectedDurationMin: assigneeConflict.expectedDurationMin ?? DEFAULT_EXPECTED_DURATION_MIN,
          conflictingEndLocal: conflictingRange ? `${formatLocalDateOnly(conflictingRange.end)} ${String(conflictingRange.end.getHours()).padStart(2, "0")}:${String(conflictingRange.end.getMinutes()).padStart(2, "0")}` : null,
        });
      }
    }

    return details;
  }

  ensureCapacityAvailable(payload) {
    return this.collectCapacityConflicts(payload);
  }

  createAppointment(payload) {
    const status = payload.status ?? "booked";
    assertKnownStatus(status);

    const { customer, vehicle, bay } = resolveCustomerVehicleAndBay(this.repository, {
      customerId: payload.customerId,
      vehicleId: payload.vehicleId,
      bayId: payload.bayId ?? null,
    });

    const capacityWarnings = this.collectCapacityConflicts({
      plannedStartLocal: payload.plannedStartLocal,
      expectedDurationMin: payload.expectedDurationMin ?? null,
      bayId: payload.bayId ?? null,
      primaryAssignee: payload.primaryAssignee ?? null,
      status,
      excludeAppointmentId: null,
    });

    const code = this.repository.allocateNextAppointmentCode();

    const created = this.repository.createAppointment({
      id: toId("apt"),
      code,
      plannedStartLocal: payload.plannedStartLocal,
      customerId: customer.id,
      vehicleId: vehicle.id,
      customerNameSnapshot: customer.fullName,
      vehicleLabelSnapshot: vehicle.label,
      complaint: payload.complaint,
      status,
      bayId: bay?.id ?? null,
      bayNameSnapshot: bay?.name ?? null,
      primaryAssignee: payload.primaryAssignee ?? null,
      source: payload.source ?? "manual",
      expectedDurationMin: payload.expectedDurationMin ?? null,
      notes: payload.notes ?? null,
    });

    if (capacityWarnings.length === 0) {
      return created;
    }

    return {
      ...created,
      capacityWarnings,
    };
  }

  createAppointmentFromBookingForm({
    appointmentPayload,
    selectedCustomerId = null,
    selectedVehicleId = null,
    inlineCustomerPayload = null,
    inlineVehiclePayload = null,
  }) {
    return this.repository.runInTransaction(() => {
      const {
        customerId,
        vehicleId,
        createdCustomer,
        createdVehicle,
      } = resolveInlineCustomerVehicle({
        repository: this.repository,
        selectedCustomerId,
        selectedVehicleId,
        inlineCustomerPayload,
        inlineVehiclePayload,
      });

      const appointment = this.createAppointment({
        ...appointmentPayload,
        customerId,
        vehicleId,
      });

      return {
        appointment,
        customer: createdCustomer,
        vehicle: createdVehicle,
      };
    });
  }

  buildAppointmentUpdateContext(id, updates) {
    const existing = this.repository.getAppointmentRecordById(id);
    if (!existing) {
      return null;
    }

    const nextCustomerId = updates.customerId ?? existing.customerId;
    const nextVehicleId = updates.vehicleId ?? existing.vehicleId;
    const nextStatus = updates.status ?? existing.status;
    const nextPlannedStartLocal = updates.plannedStartLocal ?? existing.plannedStartLocal;
    const nextBayId = updates.bayId !== undefined ? updates.bayId : existing.bayId;
    const nextPrimaryAssignee = updates.primaryAssignee !== undefined ? updates.primaryAssignee : existing.primaryAssignee;
    const nextExpectedDurationMin = updates.expectedDurationMin !== undefined
      ? updates.expectedDurationMin
      : existing.expectedDurationMin;

    assertKnownStatus(nextStatus);
    if (updates.status !== undefined) {
      assertTransitionAllowed(existing.status, nextStatus);
    }

    const { customer, vehicle, bay } = resolveCustomerVehicleAndBay(this.repository, {
      customerId: nextCustomerId,
      vehicleId: nextVehicleId,
      bayId: nextBayId ?? null,
    });

    const capacityWarnings = this.collectCapacityConflicts({
      plannedStartLocal: nextPlannedStartLocal,
      expectedDurationMin: nextExpectedDurationMin,
      bayId: nextBayId,
      primaryAssignee: nextPrimaryAssignee,
      status: nextStatus,
      excludeAppointmentId: id,
    });

    const repositoryUpdates = {
      ...updates,
    };

    if (updates.customerId !== undefined) {
      repositoryUpdates.customerNameSnapshot = customer.fullName;
    }

    if (updates.vehicleId !== undefined) {
      repositoryUpdates.vehicleLabelSnapshot = vehicle.label;
    }

    if (updates.bayId !== undefined) {
      repositoryUpdates.bayNameSnapshot = bay?.name ?? null;
    }

    return {
      existing,
      repositoryUpdates,
      capacityWarnings,
    };
  }

  previewAppointmentUpdate(id, updates) {
    const context = this.buildAppointmentUpdateContext(id, updates);
    if (!context) {
      return null;
    }

    return {
      ...context.existing,
      ...context.repositoryUpdates,
      capacityWarnings: context.capacityWarnings,
    };
  }

  updateAppointmentById(id, updates, { changedBy = "api", reason = null, source = "api_patch_appointment" } = {}) {
    const context = this.buildAppointmentUpdateContext(id, updates);
    if (!context) {
      return null;
    }

    return this.repository.runInTransaction(() => {
      const updated = this.repository.updateAppointmentById(id, context.repositoryUpdates);
      if (!updated) {
        return null;
      }

      if (isScheduleFieldUpdated(context.repositoryUpdates)) {
        const scheduleChanged = (
          context.existing.plannedStartLocal !== updated.plannedStartLocal
            || (context.existing.expectedDurationMin ?? null) !== (updated.expectedDurationMin ?? null)
            || (context.existing.bayId ?? null) !== (updated.bayId ?? null)
            || (context.existing.primaryAssignee ?? null) !== (updated.primaryAssignee ?? null)
        );

        if (scheduleChanged) {
          this.repository.createAppointmentScheduleHistoryEntry(
            toScheduleHistoryPayload({
              id,
              existing: context.existing,
              updated,
              changedBy,
              reason,
              source,
            }),
          );
        }
      }

      if (context.capacityWarnings.length === 0) {
        return updated;
      }

      return {
        ...updated,
        capacityWarnings: context.capacityWarnings,
      };
    });
  }
}
