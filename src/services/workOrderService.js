import { randomUUID } from "node:crypto";
import {
  getWorkOrderStatusLabel,
  isBlockedWorkOrderStatus,
  isKnownWorkOrderStatus,
  isWorkOrderTransitionAllowed,
  listAllowedWorkOrderTransitions,
} from "../domain/workOrderLifecycle.js";

const APPOINTMENT_BLOCKED_STATUSES = new Set(["cancelled", "no-show"]);

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

function normalizeNullableString(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return String(value).trim();
}

function normalizeChangedBy(value) {
  const normalized = normalizeNullableString(value);
  if (normalized === undefined || normalized === null || normalized.length === 0) {
    return "system";
  }
  return normalized;
}

export class WorkOrderService {
  constructor(repository) {
    this.repository = repository;
  }

  listWorkOrders({ status = null, bayId = null, primaryAssignee = null, query = "", includeClosed = true, limit = null, offset = 0 } = {}) {
    return this.repository.listWorkOrderRecords({
      status,
      bayId,
      primaryAssignee,
      query,
      includeClosed,
      limit,
      offset,
    });
  }

  getWorkOrderById(id) {
    const item = this.repository.getWorkOrderRecordById(id);
    if (!item) {
      return null;
    }

    const statusHistory = this.repository.listWorkOrderStatusHistory(id);
    return {
      ...item,
      statusHistory,
      lifecycle: {
        allowedTransitions: listAllowedWorkOrderTransitions(item.status),
      },
    };
  }

  updateWorkOrderById(id, updates, { changedBy = "api", source = "api_update" } = {}) {
    const existing = this.repository.getWorkOrderRecordById(id);
    if (!existing) {
      return null;
    }

    const patch = {};
    const changedByValue = normalizeChangedBy(changedBy);
    const reason = normalizeNullableString(updates.reason) ?? null;

    let nextStatus = existing.status;
    if (updates.status !== undefined) {
      if (!isKnownWorkOrderStatus(updates.status)) {
        throw makeDomainError("work_order_status_invalid", "Unsupported work-order status");
      }
      nextStatus = updates.status;
    }

    if (nextStatus !== existing.status && !isWorkOrderTransitionAllowed(existing.status, nextStatus)) {
      throw makeDomainError("work_order_status_transition_invalid", "Invalid work-order status transition", {
        fromStatus: existing.status,
        toStatus: nextStatus,
      });
    }

    if (updates.bayId !== undefined) {
      if (updates.bayId === null) {
        patch.bayId = null;
        patch.bayNameSnapshot = null;
      } else {
        const bay = this.repository.getBayById(updates.bayId);
        if (!bay) {
          throw makeDomainError("bay_not_found", "Bay not found");
        }
        patch.bayId = bay.id;
        patch.bayNameSnapshot = bay.name;
      }
    }

    if (updates.primaryAssignee !== undefined) {
      patch.primaryAssignee = updates.primaryAssignee;
    }

    if (updates.complaint !== undefined) {
      patch.complaint = updates.complaint;
    }

    if (updates.findings !== undefined) {
      patch.findings = updates.findings;
    }

    if (updates.internalNotes !== undefined) {
      patch.internalNotes = updates.internalNotes;
    }

    if (updates.customerNotes !== undefined) {
      patch.customerNotes = updates.customerNotes;
    }

    if (updates.balanceDueRub !== undefined) {
      patch.balanceDueRub = updates.balanceDueRub;
    }

    const statusChanged = nextStatus !== existing.status;
    const nowIso = new Date().toISOString();
    if (statusChanged) {
      if (nextStatus === "completed" && ((patch.balanceDueRub ?? existing.balanceDueRub) ?? 0) > 0) {
        throw makeDomainError("work_order_balance_due_conflict", "Work order cannot be completed while balance is outstanding", {
          balanceDueRub: patch.balanceDueRub ?? existing.balanceDueRub,
        });
      }

      patch.status = nextStatus;
      patch.statusLabelRu = getWorkOrderStatusLabel(nextStatus);
      patch.blockedSinceIso = isBlockedWorkOrderStatus(nextStatus)
        ? (isBlockedWorkOrderStatus(existing.status) ? (existing.blockedSinceIso ?? nowIso) : nowIso)
        : null;
      patch.closedAt = nextStatus === "completed" || nextStatus === "cancelled"
        ? existing.closedAt ?? nowIso
        : null;
    }

    const transitionEntry = statusChanged
      ? {
          fromStatus: existing.status,
          fromStatusLabelRu: existing.statusLabelRu,
          toStatus: nextStatus,
          toStatusLabelRu: getWorkOrderStatusLabel(nextStatus),
          changedBy: changedByValue,
          reason,
          source,
        }
      : null;

    this.repository.updateWorkOrderRecord({
      id,
      updates: patch,
      transitionEntry,
    });

    return this.getWorkOrderById(id);
  }

  convertAppointmentToWorkOrder(appointmentId, { changedBy = "api", reason = null, source = "appointment_conversion" } = {}) {
    const appointment = this.repository.getAppointmentRecordById(appointmentId);
    if (!appointment) {
      throw makeDomainError("appointment_not_found", "Appointment not found");
    }

    const existingLink = this.repository.getWorkOrderLinkByAppointmentId(appointment.id);
    if (existingLink?.workOrderId) {
      return {
        created: false,
        appointmentId: appointment.id,
        intakeEvent: null,
        workOrder: this.getWorkOrderById(existingLink.workOrderId),
      };
    }

    if (APPOINTMENT_BLOCKED_STATUSES.has(appointment.status)) {
      throw makeDomainError("appointment_convert_blocked_status", "Appointment status cannot be converted to work order", {
        status: appointment.status,
      });
    }

    const workOrderCode = this.repository.allocateNextWorkOrderCode();
    const result = this.repository.createWorkOrderFromAppointment({
      appointmentId: appointment.id,
      intakeEventId: toId("intake"),
      workOrderId: toId("wo"),
      workOrderCode,
      customerId: appointment.customerId,
      customerNameSnapshot: appointment.customerName,
      vehicleId: appointment.vehicleId,
      vehicleLabelSnapshot: appointment.vehicleLabel,
      complaint: appointment.complaint,
      status: "scheduled",
      statusLabelRu: getWorkOrderStatusLabel("scheduled"),
      bayId: appointment.bayId ?? null,
      bayNameSnapshot: appointment.bayName ?? null,
      primaryAssignee: appointment.primaryAssignee ?? null,
      changedBy: normalizeChangedBy(changedBy),
      reason: normalizeNullableString(reason) ?? "Конвертация из записи",
      source,
    });

    return {
      ...result,
      workOrder: this.getWorkOrderById(result.workOrder.id),
    };
  }
}
