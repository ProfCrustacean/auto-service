import { notFoundError, sendApiError } from "./apiErrors.js";
import { mapWorkOrderDomainApiError } from "./domainApiErrorMapper.js";
import {
  respondItemOrNotFound,
  respondList,
  respondValidationFailure,
  withUnexpectedError,
} from "./routePrimitives.js";
import {
  validateConvertAppointmentToWorkOrder,
  validateCreateWorkOrderPayment,
  validateCreatePartsPurchaseAction,
  validateCreatePartsRequest,
  validateListPartsRequestsQuery,
  validateListWorkOrdersQuery,
  validateUpdatePartsRequest,
  validateWorkOrderUpdate,
} from "./workOrderValidators.js";

export function registerWorkOrderRoutes(app, { logger, workOrderService }) {
  app.get("/api/v1/work-orders", (req, res) => withUnexpectedError(logger, req, res, "work_orders_list_failed", () => {
    const validation = validateListWorkOrdersQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = workOrderService.listWorkOrders(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/work-orders/:id", (req, res) => withUnexpectedError(logger, req, res, "work_orders_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Work order",
      item: workOrderService.getWorkOrderById(req.params.id),
    });
  }));

  app.patch("/api/v1/work-orders/:id", (req, res) => withUnexpectedError(logger, req, res, "work_orders_update_failed", () => {
    const validation = validateWorkOrderUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, ...updates } = validation.value;
    try {
      const item = workOrderService.updateWorkOrderById(req.params.id, updates, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_patch_work_order",
      });
      respondItemOrNotFound(res, { entityName: "Work order", item });
    } catch (error) {
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.get("/api/v1/work-orders/:id/parts-requests", (req, res) => withUnexpectedError(logger, req, res, "work_order_parts_requests_list_failed", () => {
    const validation = validateListPartsRequestsQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
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
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.get("/api/v1/work-orders/:id/payments", (req, res) => withUnexpectedError(logger, req, res, "work_order_payments_list_failed", () => {
    try {
      const items = workOrderService.listWorkOrderPayments(req.params.id);
      if (!items) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(200).json({
        items,
        count: items.length,
      });
    } catch (error) {
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/work-orders/:id/payments", (req, res) => withUnexpectedError(logger, req, res, "work_order_payment_create_failed", () => {
    const validation = validateCreateWorkOrderPayment(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, ...input } = validation.value;
    try {
      const result = workOrderService.createWorkOrderPayment(req.params.id, input, {
        changedBy: changedBy ?? req.auth?.role ?? "api",
        source: "api_work_order_payment_create",
      });
      if (!result) {
        sendApiError(res, notFoundError("Work order"));
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/work-orders/:id/parts-requests", (req, res) => withUnexpectedError(logger, req, res, "work_order_parts_request_create_failed", () => {
    const validation = validateCreatePartsRequest(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
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
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.patch("/api/v1/work-orders/:id/parts-requests/:requestId", (req, res) => withUnexpectedError(logger, req, res, "work_order_parts_request_update_failed", () => {
    const validation = validateUpdatePartsRequest(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
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
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/work-orders/:id/parts-requests/:requestId/purchase-actions", (req, res) => withUnexpectedError(logger, req, res, "work_order_parts_purchase_action_create_failed", () => {
    const validation = validateCreatePartsPurchaseAction(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
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
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/appointments/:id/convert-to-work-order", (req, res) => withUnexpectedError(logger, req, res, "appointment_convert_to_work_order_failed", () => {
    const validation = validateConvertAppointmentToWorkOrder(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
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
      if (mapWorkOrderDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));
}
