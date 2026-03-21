import { randomUUID } from "node:crypto";

const APPOINTMENT_STATUSES = new Set(["booked", "confirmed", "arrived", "cancelled", "no-show"]);
const BLOCKING_STATUSES = new Set(["booked", "confirmed", "arrived"]);

const ALLOWED_STATUS_TRANSITIONS = {
  booked: new Set(["confirmed", "arrived", "cancelled", "no-show"]),
  confirmed: new Set(["arrived", "cancelled", "no-show"]),
  arrived: new Set([]),
  cancelled: new Set([]),
  "no-show": new Set([]),
};

function toId(prefix) {
  return `${prefix}-${randomUUID().split("-")[0]}`;
}

function makeDomainError(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function toNextAppointmentCode(appointments) {
  const maxNumericCode = appointments.reduce((maxValue, item) => {
    const match = /^APT-(\d+)$/.exec(item.code ?? "");
    if (!match) {
      return maxValue;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) {
      return maxValue;
    }

    return Math.max(maxValue, parsed);
  }, 0);

  return `APT-${String(maxNumericCode + 1).padStart(3, "0")}`;
}

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

export class AppointmentService {
  constructor(repository) {
    this.repository = repository;
  }

  listAppointments({ status = null, customerId = null, vehicleId = null, bayId = null, query = "" } = {}) {
    return this.repository.listAppointmentRecords({ status, customerId, vehicleId, bayId, query });
  }

  getAppointmentById(id) {
    return this.repository.getAppointmentRecordById(id);
  }

  ensureCapacityAvailable({ plannedStartLocal, bayId, primaryAssignee, status, excludeAppointmentId = null }) {
    if (!isBlockingStatus(status)) {
      return;
    }

    const slotAppointments = this.repository.listSlotBlockingAppointments({ plannedStartLocal, excludeAppointmentId });
    const details = [];

    if (bayId) {
      const bayConflict = slotAppointments.find((item) => item.bayId === bayId);
      if (bayConflict) {
        details.push({
          field: "bayId",
          message: "bay is already reserved for this slot",
          conflictingAppointmentId: bayConflict.id,
          conflictingAppointmentCode: bayConflict.code,
        });
      }
    }

    if (primaryAssignee) {
      const assigneeConflict = slotAppointments.find((item) => item.primaryAssignee === primaryAssignee);
      if (assigneeConflict) {
        details.push({
          field: "primaryAssignee",
          message: "assignee is already reserved for this slot",
          conflictingAppointmentId: assigneeConflict.id,
          conflictingAppointmentCode: assigneeConflict.code,
        });
      }
    }

    if (details.length > 0) {
      throw makeDomainError("appointment_capacity_conflict", "Double-booking conflict for selected slot", details);
    }
  }

  createAppointment(payload) {
    const status = payload.status ?? "booked";
    assertKnownStatus(status);

    const customer = this.repository.getCustomerById(payload.customerId);
    if (!customer) {
      throw makeDomainError("customer_not_found", "Customer not found");
    }

    const vehicle = this.repository.getVehicleById(payload.vehicleId);
    if (!vehicle) {
      throw makeDomainError("vehicle_not_found", "Vehicle not found");
    }

    if (vehicle.customerId !== customer.id) {
      throw makeDomainError("vehicle_customer_mismatch", "Vehicle does not belong to customer", {
        customerId: customer.id,
        vehicleId: vehicle.id,
      });
    }

    let bay = null;
    if (payload.bayId) {
      bay = this.repository.getBayById(payload.bayId);
      if (!bay) {
        throw makeDomainError("bay_not_found", "Bay not found");
      }
    }

    this.ensureCapacityAvailable({
      plannedStartLocal: payload.plannedStartLocal,
      bayId: payload.bayId ?? null,
      primaryAssignee: payload.primaryAssignee ?? null,
      status,
      excludeAppointmentId: null,
    });

    const code = toNextAppointmentCode(this.repository.listAppointmentRecords());

    return this.repository.createAppointment({
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
  }

  updateAppointmentById(id, updates) {
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

    assertKnownStatus(nextStatus);
    if (updates.status !== undefined) {
      assertTransitionAllowed(existing.status, nextStatus);
    }

    const customer = this.repository.getCustomerById(nextCustomerId);
    if (!customer) {
      throw makeDomainError("customer_not_found", "Customer not found");
    }

    const vehicle = this.repository.getVehicleById(nextVehicleId);
    if (!vehicle) {
      throw makeDomainError("vehicle_not_found", "Vehicle not found");
    }

    if (vehicle.customerId !== customer.id) {
      throw makeDomainError("vehicle_customer_mismatch", "Vehicle does not belong to customer", {
        customerId: customer.id,
        vehicleId: vehicle.id,
      });
    }

    let bay = null;
    if (nextBayId) {
      bay = this.repository.getBayById(nextBayId);
      if (!bay) {
        throw makeDomainError("bay_not_found", "Bay not found");
      }
    }

    this.ensureCapacityAvailable({
      plannedStartLocal: nextPlannedStartLocal,
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

    return this.repository.updateAppointmentById(id, repositoryUpdates);
  }
}
