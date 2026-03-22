import { randomUUID } from "node:crypto";
import {
  getWorkOrderStatusLabel,
  isBlockedWorkOrderStatus,
  isKnownWorkOrderStatus,
  isWorkOrderTransitionAllowed,
  isTerminalWorkOrderStatus,
  listAllowedWorkOrderTransitions,
} from "../domain/workOrderLifecycle.js";
import {
  getPartsPurchaseActionStatusLabel,
  getPartsRequestStatusLabel,
  isBlockingPartsRequestStatus,
  isTerminalPartsRequestStatus,
  isKnownPartsPurchaseActionStatus,
  isKnownPartsRequestStatus,
  isPartsRequestTransitionAllowed,
  listAllowedPartsRequestTransitions,
} from "../domain/partsRequestLifecycle.js";

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

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function buildWorkOrderStatusPatch(existing, nextStatus, nowIso) {
  return {
    status: nextStatus,
    statusLabelRu: getWorkOrderStatusLabel(nextStatus),
    blockedSinceIso: isBlockedWorkOrderStatus(nextStatus)
      ? (isBlockedWorkOrderStatus(existing.status) ? (existing.blockedSinceIso ?? nowIso) : nowIso)
      : null,
    closedAt: nextStatus === "completed" || nextStatus === "cancelled"
      ? existing.closedAt ?? nowIso
      : null,
  };
}

export class WorkOrderService {
  constructor(repository) {
    this.repository = repository;
  }

  hydratePartsRequests(workOrderId, { includeResolved = true } = {}) {
    const requests = this.repository.listWorkOrderPartsRequests(workOrderId, { includeResolved });
    return requests.map((request) => ({
      ...request,
      purchaseActions: this.repository.listPartsPurchaseActions(request.id),
      lifecycle: {
        allowedTransitions: listAllowedPartsRequestTransitions(request.status),
      },
    }));
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
    const partsRequests = this.hydratePartsRequests(id, { includeResolved: true });
    const partsHistory = this.repository.listWorkOrderPartsHistory(id);
    const openBlockingRequestsCount = partsRequests.filter(
      (request) => request.isBlocking && isBlockingPartsRequestStatus(request.status),
    ).length;

    return {
      ...item,
      statusHistory,
      partsRequests,
      partsHistory,
      parts: {
        totalRequests: partsRequests.length,
        openBlockingRequestsCount,
      },
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

    if (nextStatus !== "waiting_parts" && !isTerminalWorkOrderStatus(nextStatus)) {
      const hasBlockingParts = this.repository.hasOpenBlockingPartsRequests(id);
      if (hasBlockingParts) {
        throw makeDomainError(
          "work_order_parts_blocking_conflict",
          "Work order has unresolved blocking parts requests",
          { status: nextStatus },
        );
      }
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

      Object.assign(patch, buildWorkOrderStatusPatch(existing, nextStatus, nowIso));
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

  listWorkOrderPartsRequests(workOrderId, { includeResolved = true } = {}) {
    const workOrder = this.repository.getWorkOrderRecordById(workOrderId);
    if (!workOrder) {
      return null;
    }

    return this.hydratePartsRequests(workOrderId, { includeResolved });
  }

  createWorkOrderPartsRequest(
    workOrderId,
    {
      partName,
      supplierName = null,
      expectedArrivalDateLocal = null,
      requestedQty,
      requestedUnitCostRub = 0,
      salePriceRub = 0,
      status = "requested",
      isBlocking = true,
      notes = null,
      replacementForRequestId = null,
      reason = null,
    },
    { changedBy = "api", source = "api_parts_request_create" } = {},
  ) {
    const workOrder = this.repository.getWorkOrderRecordById(workOrderId);
    if (!workOrder) {
      return null;
    }
    if (isTerminalWorkOrderStatus(workOrder.status)) {
      throw makeDomainError("work_order_terminal", "Cannot mutate parts for terminal work order", {
        status: workOrder.status,
      });
    }

    if (!isKnownPartsRequestStatus(status)) {
      throw makeDomainError("parts_request_status_invalid", "Unsupported parts-request status");
    }
    if (!isPositiveInteger(requestedQty)) {
      throw makeDomainError("parts_request_requested_qty_invalid", "requestedQty must be > 0");
    }
    if (!isNonNegativeInteger(requestedUnitCostRub)) {
      throw makeDomainError("parts_request_requested_unit_cost_invalid", "requestedUnitCostRub must be >= 0");
    }
    if (!isNonNegativeInteger(salePriceRub)) {
      throw makeDomainError("parts_request_sale_price_invalid", "salePriceRub must be >= 0");
    }

    if (replacementForRequestId) {
      const replacementTarget = this.repository.getWorkOrderPartsRequestById(workOrderId, replacementForRequestId);
      if (!replacementTarget) {
        throw makeDomainError("parts_request_replacement_target_not_found", "Replacement target parts request was not found");
      }
    }

    const createdRequest = this.repository.createWorkOrderPartsRequest({
      id: toId("wopr"),
      workOrderId,
      replacementForRequestId: replacementForRequestId ?? null,
      partName,
      supplierName,
      expectedArrivalDateLocal,
      requestedQty,
      requestedUnitCostRub,
      salePriceRub,
      status,
      statusLabelRu: getPartsRequestStatusLabel(status),
      isBlocking,
      notes,
      changedBy: normalizeChangedBy(changedBy),
      reason: normalizeNullableString(reason) ?? "Создан запрос запчасти",
      source,
    });

    this.reconcileWorkOrderPartsBlocking(workOrderId, {
      changedBy: normalizeChangedBy(changedBy),
      source,
    });

    return {
      request: createdRequest,
      workOrder: this.getWorkOrderById(workOrderId),
    };
  }

  updateWorkOrderPartsRequest(
    workOrderId,
    requestId,
    {
      status,
      supplierName,
      expectedArrivalDateLocal,
      requestedQty,
      requestedUnitCostRub,
      salePriceRub,
      isBlocking,
      notes,
      reason = null,
      replacementPartName = null,
      replacementRequestedQty = null,
      replacementSupplierName = null,
    },
    { changedBy = "api", source = "api_parts_request_update" } = {},
  ) {
    const workOrder = this.repository.getWorkOrderRecordById(workOrderId);
    if (!workOrder) {
      return null;
    }
    if (isTerminalWorkOrderStatus(workOrder.status)) {
      throw makeDomainError("work_order_terminal", "Cannot mutate parts for terminal work order", {
        status: workOrder.status,
      });
    }

    const existing = this.repository.getWorkOrderPartsRequestById(workOrderId, requestId);
    if (!existing) {
      throw makeDomainError("parts_request_not_found", "Parts request not found");
    }

    const nextStatus = status ?? existing.status;
    if (!isKnownPartsRequestStatus(nextStatus)) {
      throw makeDomainError("parts_request_status_invalid", "Unsupported parts-request status");
    }

    if (nextStatus !== existing.status && !isPartsRequestTransitionAllowed(existing.status, nextStatus)) {
      throw makeDomainError("parts_request_status_transition_invalid", "Invalid parts-request status transition", {
        fromStatus: existing.status,
        toStatus: nextStatus,
      });
    }
    if (
      isTerminalPartsRequestStatus(existing.status)
      && (
        supplierName !== undefined
        || expectedArrivalDateLocal !== undefined
        || requestedQty !== undefined
        || requestedUnitCostRub !== undefined
        || salePriceRub !== undefined
        || isBlocking !== undefined
        || replacementPartName !== null
        || replacementRequestedQty !== null
        || replacementSupplierName !== null
      )
    ) {
      throw makeDomainError("parts_request_terminal_locked", "Terminal parts request allows notes-only corrections by default", {
        status: existing.status,
      });
    }
    if (requestedQty !== undefined && !isPositiveInteger(requestedQty)) {
      throw makeDomainError("parts_request_requested_qty_invalid", "requestedQty must be > 0");
    }
    if (requestedUnitCostRub !== undefined && !isNonNegativeInteger(requestedUnitCostRub)) {
      throw makeDomainError("parts_request_requested_unit_cost_invalid", "requestedUnitCostRub must be >= 0");
    }
    if (salePriceRub !== undefined && !isNonNegativeInteger(salePriceRub)) {
      throw makeDomainError("parts_request_sale_price_invalid", "salePriceRub must be >= 0");
    }

    const nextIsBlocking = isBlocking ?? existing.isBlocking;
    const isOpenBlocking = Boolean(nextIsBlocking) && isBlockingPartsRequestStatus(nextStatus);
    const resolvedAt = isOpenBlocking ? null : new Date().toISOString();
    const patch = {};
    if (status !== undefined) {
      patch.status = nextStatus;
      patch.statusLabelRu = getPartsRequestStatusLabel(nextStatus);
    }
    if (supplierName !== undefined) {
      patch.supplierName = supplierName;
    }
    if (expectedArrivalDateLocal !== undefined) {
      patch.expectedArrivalDateLocal = expectedArrivalDateLocal;
    }
    if (requestedQty !== undefined) {
      patch.requestedQty = requestedQty;
    }
    if (requestedUnitCostRub !== undefined) {
      patch.requestedUnitCostRub = requestedUnitCostRub;
    }
    if (salePriceRub !== undefined) {
      patch.salePriceRub = salePriceRub;
    }
    if (isBlocking !== undefined) {
      patch.isBlocking = isBlocking;
    }
    if (notes !== undefined) {
      patch.notes = notes;
    }

    if (
      status !== undefined
      || isBlocking !== undefined
      || existing.resolvedAt !== resolvedAt
    ) {
      patch.resolvedAt = resolvedAt;
    }

    const historyEntry = status !== undefined && nextStatus !== existing.status
      ? {
          fromStatus: existing.status,
          fromStatusLabelRu: existing.statusLabelRu,
          toStatus: nextStatus,
          toStatusLabelRu: getPartsRequestStatusLabel(nextStatus),
          changedBy: normalizeChangedBy(changedBy),
          reason: normalizeNullableString(reason) ?? null,
          source,
          details: {
            replacementPartName: normalizeNullableString(replacementPartName) ?? null,
          },
        }
      : null;

    const updatedRequest = this.repository.updateWorkOrderPartsRequest({
      workOrderId,
      requestId,
      updates: patch,
      historyEntry,
    });

    const normalizedReplacementPartName = normalizeNullableString(replacementPartName);
    if (nextStatus === "substituted" && normalizedReplacementPartName) {
      this.repository.createWorkOrderPartsRequest({
        id: toId("wopr"),
        workOrderId,
        replacementForRequestId: requestId,
        partName: normalizedReplacementPartName,
        supplierName: normalizeNullableString(replacementSupplierName) ?? supplierName ?? existing.supplierName ?? null,
        expectedArrivalDateLocal: null,
        requestedQty: Number.isInteger(replacementRequestedQty) && replacementRequestedQty > 0
          ? replacementRequestedQty
          : existing.requestedQty,
        requestedUnitCostRub: existing.requestedUnitCostRub ?? 0,
        salePriceRub: existing.salePriceRub ?? 0,
        status: "requested",
        statusLabelRu: getPartsRequestStatusLabel("requested"),
        isBlocking: existing.isBlocking,
        notes: "Создано как замена по предыдущей позиции",
        changedBy: normalizeChangedBy(changedBy),
        reason: "Создана заменяющая позиция",
        source: "parts_request_substitution",
      });
    }

    this.reconcileWorkOrderPartsBlocking(workOrderId, {
      changedBy: normalizeChangedBy(changedBy),
      source,
    });

    return {
      request: this.repository.getWorkOrderPartsRequestById(workOrderId, updatedRequest.id),
      workOrder: this.getWorkOrderById(workOrderId),
    };
  }

  createWorkOrderPartsPurchaseAction(
    workOrderId,
    requestId,
    {
      supplierName = null,
      supplierReference = null,
      orderedQty,
      unitCostRub,
      status = "ordered",
      notes = null,
      reason = null,
    },
    { changedBy = "api", source = "api_parts_purchase_action_create" } = {},
  ) {
    const workOrder = this.repository.getWorkOrderRecordById(workOrderId);
    if (!workOrder) {
      return null;
    }
    if (isTerminalWorkOrderStatus(workOrder.status)) {
      throw makeDomainError("work_order_terminal", "Cannot mutate parts for terminal work order", {
        status: workOrder.status,
      });
    }

    const partsRequest = this.repository.getWorkOrderPartsRequestById(workOrderId, requestId);
    if (!partsRequest) {
      throw makeDomainError("parts_request_not_found", "Parts request not found");
    }

    if (!isKnownPartsPurchaseActionStatus(status)) {
      throw makeDomainError("parts_purchase_action_status_invalid", "Unsupported parts purchase-action status");
    }
    if (!isPositiveInteger(orderedQty)) {
      throw makeDomainError("parts_purchase_action_ordered_qty_invalid", "orderedQty must be > 0");
    }
    if (!isNonNegativeInteger(unitCostRub)) {
      throw makeDomainError("parts_purchase_action_unit_cost_invalid", "unitCostRub must be >= 0");
    }

    const normalizedChangedBy = normalizeChangedBy(changedBy);
    const action = this.repository.createPartsPurchaseAction({
      id: toId("ppa"),
      workOrderId,
      partsRequestId: requestId,
      supplierName: normalizeNullableString(supplierName) ?? partsRequest.supplierName ?? null,
      supplierReference: normalizeNullableString(supplierReference) ?? null,
      orderedQty,
      unitCostRub,
      status,
      orderedAt: new Date().toISOString(),
      receivedAt: status === "received" ? new Date().toISOString() : null,
      notes: normalizeNullableString(notes) ?? null,
      historyEntry: {
        toStatus: `purchase_${status}`,
        toStatusLabelRu: getPartsPurchaseActionStatusLabel(status),
        changedBy: normalizedChangedBy,
        reason: normalizeNullableString(reason) ?? null,
        source,
        details: {
          supplierName: normalizeNullableString(supplierName) ?? partsRequest.supplierName ?? null,
          supplierReference: normalizeNullableString(supplierReference) ?? null,
          orderedQty,
          unitCostRub,
        },
      },
    });

    const requestStatusByActionStatus = {
      ordered: "ordered",
      received: "received",
      cancelled: "cancelled",
      returned: "returned",
    };
    const nextRequestStatus = requestStatusByActionStatus[status];
    let effectiveRequest = partsRequest;
    if (nextRequestStatus && nextRequestStatus !== partsRequest.status) {
      this.updateWorkOrderPartsRequest(
        workOrderId,
        requestId,
        {
          status: nextRequestStatus,
          reason: normalizeNullableString(reason) ?? `Статус поставки: ${getPartsPurchaseActionStatusLabel(status)}`,
        },
        {
          changedBy: normalizedChangedBy,
          source: "parts_purchase_action_sync",
        },
      );
      effectiveRequest = this.repository.getWorkOrderPartsRequestById(workOrderId, requestId) ?? partsRequest;
    } else {
      this.reconcileWorkOrderPartsBlocking(workOrderId, {
        changedBy: normalizedChangedBy,
        source,
      });
      effectiveRequest = this.repository.getWorkOrderPartsRequestById(workOrderId, requestId) ?? partsRequest;
    }

    return {
      action,
      request: effectiveRequest,
      workOrder: this.getWorkOrderById(workOrderId),
    };
  }

  reconcileWorkOrderPartsBlocking(workOrderId, { changedBy = "system", source = "parts_reconcile" } = {}) {
    const workOrder = this.repository.getWorkOrderRecordById(workOrderId);
    if (!workOrder || isTerminalWorkOrderStatus(workOrder.status)) {
      return;
    }

    const hasBlockingParts = this.repository.hasOpenBlockingPartsRequests(workOrderId);
    const nowIso = new Date().toISOString();
    const normalizedChangedBy = normalizeChangedBy(changedBy);

    if (hasBlockingParts && workOrder.status !== "waiting_parts" && isWorkOrderTransitionAllowed(workOrder.status, "waiting_parts")) {
      this.repository.updateWorkOrderRecord({
        id: workOrderId,
        updates: buildWorkOrderStatusPatch(workOrder, "waiting_parts", nowIso),
        transitionEntry: {
          fromStatus: workOrder.status,
          fromStatusLabelRu: workOrder.statusLabelRu,
          toStatus: "waiting_parts",
          toStatusLabelRu: getWorkOrderStatusLabel("waiting_parts"),
          changedBy: normalizedChangedBy,
          reason: "Есть блокирующие запросы запчастей",
          source,
        },
      });
      return;
    }

    if (!hasBlockingParts && workOrder.status === "waiting_parts" && isWorkOrderTransitionAllowed("waiting_parts", "scheduled")) {
      this.repository.updateWorkOrderRecord({
        id: workOrderId,
        updates: buildWorkOrderStatusPatch(workOrder, "scheduled", nowIso),
        transitionEntry: {
          fromStatus: workOrder.status,
          fromStatusLabelRu: workOrder.statusLabelRu,
          toStatus: "scheduled",
          toStatusLabelRu: getWorkOrderStatusLabel("scheduled"),
          changedBy: normalizedChangedBy,
          reason: "Блокирующие запчасти закрыты, можно продолжать",
          source,
        },
      });
    }
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
