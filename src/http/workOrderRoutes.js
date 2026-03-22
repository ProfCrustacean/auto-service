import {
  conflictError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateConvertAppointmentToWorkOrder,
  validateCreatePartsPurchaseAction,
  validateCreatePartsRequest,
  validateListPartsRequestsQuery,
  validateListWorkOrdersQuery,
  validateUpdatePartsRequest,
  validateWorkOrderUpdate,
} from "./workOrderValidators.js";
import { handleUnexpectedError } from "./routeUtils.js";

function handleDomainError(res, error) {
  if (error.code === "appointment_not_found") {
    sendApiError(res, notFoundError("Appointment"));
    return true;
  }

  if (error.code === "bay_not_found") {
    sendApiError(res, notFoundError("Bay"));
    return true;
  }

  if (error.code === "work_order_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: draft, waiting_diagnosis, waiting_approval, waiting_parts, scheduled, in_progress, paused, ready_pickup, completed, cancelled",
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid work-order status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_balance_due_conflict") {
    sendApiError(
      res,
      conflictError("Cannot complete work order with outstanding balance", [
        { field: "balanceDueRub", message: "balance must be zero before completion" },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_parts_blocking_conflict") {
    sendApiError(
      res,
      conflictError("Work order has unresolved blocking parts requests", [
        { field: "status", message: "resolve required parts requests before continuing lifecycle progress" },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_terminal") {
    sendApiError(
      res,
      conflictError("Cannot mutate parts for terminal work order", [
        { field: "workOrder", message: "work order is completed or cancelled" },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_not_found") {
    sendApiError(res, notFoundError("Parts request"));
    return true;
  }

  if (error.code === "parts_request_replacement_target_not_found") {
    sendApiError(res, notFoundError("Replacement parts request"));
    return true;
  }

  if (error.code === "parts_request_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: requested, ordered, received, substituted, cancelled, returned",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_terminal_locked") {
    sendApiError(
      res,
      conflictError("Terminal parts request can only be adjusted through correction flow", [
        {
          field: "status",
          message: "terminal request is locked for supplier/quantity/cost changes",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_requested_qty_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "requestedQty",
          message: "requestedQty must be > 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_requested_unit_cost_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "requestedUnitCostRub",
          message: "requestedUnitCostRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_sale_price_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "salePriceRub",
          message: "salePriceRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: ordered, received, cancelled, returned",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_ordered_qty_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "orderedQty",
          message: "orderedQty must be > 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_unit_cost_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "unitCostRub",
          message: "unitCostRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid parts-request status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }

  if (error.code === "appointment_convert_blocked_status") {
    sendApiError(
      res,
      conflictError("Appointment cannot be converted from current status", [
        { field: "status", message: `appointment status ${error.details?.status ?? "unknown"} cannot be converted` },
      ]),
    );
    return true;
  }

  return false;
}

export function registerWorkOrderRoutes(app, { logger, workOrderService }) {
  app.get("/api/v1/work-orders", (req, res) => {
    const validation = validateListWorkOrdersQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const items = workOrderService.listWorkOrders(validation.value);
      const payload = { items, count: items.length };
      if (validation.value.limit !== null || validation.value.offset > 0) {
        payload.pagination = {
          limit: validation.value.limit,
          offset: validation.value.offset,
          returned: items.length,
        };
      }
      res.status(200).json(payload);
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "work_orders_list_failed");
    }
  });

  app.get("/api/v1/work-orders/:id", (req, res) => {
    try {
      const item = workOrderService.getWorkOrderById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "work_orders_get_failed");
    }
  });

  app.patch("/api/v1/work-orders/:id", (req, res) => {
    const validation = validateWorkOrderUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, ...updates } = validation.value;
    try {
      const item = workOrderService.updateWorkOrderById(req.params.id, updates, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_patch_work_order",
      });
      if (!item) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "work_orders_update_failed");
    }
  });

  app.get("/api/v1/work-orders/:id/parts-requests", (req, res) => {
    const validation = validateListPartsRequestsQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const items = workOrderService.listWorkOrderPartsRequests(req.params.id, validation.value);
      if (!items) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(200).json({
        items,
        count: items.length,
      });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "work_order_parts_requests_list_failed");
    }
  });

  app.post("/api/v1/work-orders/:id/parts-requests", (req, res) => {
    const validation = validateCreatePartsRequest(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, ...input } = validation.value;
    try {
      const result = workOrderService.createWorkOrderPartsRequest(req.params.id, input, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_parts_request_create",
      });
      if (!result) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(201).json({
        item: result.request,
        workOrder: result.workOrder,
      });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "work_order_parts_request_create_failed");
    }
  });

  app.patch("/api/v1/work-orders/:id/parts-requests/:requestId", (req, res) => {
    const validation = validateUpdatePartsRequest(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, ...input } = validation.value;
    try {
      const result = workOrderService.updateWorkOrderPartsRequest(req.params.id, req.params.requestId, input, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_parts_request_update",
      });
      if (!result) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(200).json({
        item: result.request,
        workOrder: result.workOrder,
      });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "work_order_parts_request_update_failed");
    }
  });

  app.post("/api/v1/work-orders/:id/parts-requests/:requestId/purchase-actions", (req, res) => {
    const validation = validateCreatePartsPurchaseAction(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, ...input } = validation.value;
    try {
      const result = workOrderService.createWorkOrderPartsPurchaseAction(req.params.id, req.params.requestId, input, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_parts_purchase_action_create",
      });
      if (!result) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(201).json({
        item: result.action,
        request: result.request,
        workOrder: result.workOrder,
      });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "work_order_parts_purchase_action_create_failed");
    }
  });

  app.post("/api/v1/appointments/:id/convert-to-work-order", (req, res) => {
    const validation = validateConvertAppointmentToWorkOrder(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const result = workOrderService.convertAppointmentToWorkOrder(req.params.id, {
        changedBy: validation.value.changedBy ?? req.auth?.role ?? "api",
        reason: validation.value.reason ?? null,
        source: "api_appointment_convert",
      });

      const payload = {
        item: result.workOrder,
        conversion: {
          created: result.created,
          appointmentId: result.appointmentId,
        },
      };
      if (result.intakeEvent) {
        payload.intakeEvent = result.intakeEvent;
      }

      res.status(result.created ? 201 : 200).json(payload);
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "appointment_convert_to_work_order_failed");
    }
  });
}
