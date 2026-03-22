import {
  conflictError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateConvertAppointmentToWorkOrder,
  validateListWorkOrdersQuery,
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
