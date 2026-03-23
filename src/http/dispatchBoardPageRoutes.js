import {
  conflictError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
} from "./appointmentValidators.js";
import { renderDispatchBoardPage } from "../ui/dispatchBoardPage.js";
import { handleUnexpectedError } from "./routeUtils.js";

function normalizeMode(rawMode) {
  return rawMode === "technician" ? "technician" : "bay";
}

function normalizeDay(rawDay) {
  if (typeof rawDay !== "string") {
    return null;
  }
  const trimmed = rawDay.trim();
  return /^\d{4}-\d{2}-\d{2}$/u.test(trimmed) ? trimmed : null;
}

function toOptionalStringOrNull(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}

function toOptionalIntegerOrRaw(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^\d+$/u.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }
  return trimmed;
}

function normalizeBoardPatchPayload(body) {
  const payload = {};

  if (body.plannedStartLocal !== undefined) {
    payload.plannedStartLocal = toOptionalStringOrNull(body.plannedStartLocal);
  }
  if (body.bayId !== undefined) {
    payload.bayId = toOptionalStringOrNull(body.bayId);
  }
  if (body.primaryAssignee !== undefined) {
    payload.primaryAssignee = toOptionalStringOrNull(body.primaryAssignee);
  }
  if (body.expectedDurationMin !== undefined) {
    payload.expectedDurationMin = toOptionalIntegerOrRaw(body.expectedDurationMin);
  }
  if (body.status !== undefined) {
    payload.status = toOptionalStringOrNull(body.status);
  }
  if (body.notes !== undefined) {
    payload.notes = toOptionalStringOrNull(body.notes);
  }
  if (body.reason !== undefined) {
    payload.reason = toOptionalStringOrNull(body.reason);
  }
  if (body.changedBy !== undefined) {
    payload.changedBy = toOptionalStringOrNull(body.changedBy);
  }

  return payload;
}

function mapAppointmentDomainError(res, error) {
  if (error.code === "appointment_capacity_conflict") {
    sendApiError(res, conflictError(error.message, error.details));
    return true;
  }
  if (error.code === "appointment_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid appointment status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }
  if (error.code === "appointment_status_invalid") {
    sendApiError(
      res,
      validationError([{ field: "status", message: "status must be one of: booked, confirmed, arrived, cancelled, no-show" }]),
    );
    return true;
  }
  if (error.code === "customer_not_found") {
    sendApiError(res, notFoundError("Customer"));
    return true;
  }
  if (error.code === "vehicle_not_found") {
    sendApiError(res, notFoundError("Vehicle"));
    return true;
  }
  if (error.code === "vehicle_customer_mismatch") {
    sendApiError(
      res,
      conflictError("Vehicle does not belong to customer", [
        { field: "vehicleId", message: "vehicle must belong to selected customer" },
      ]),
    );
    return true;
  }
  if (error.code === "bay_not_found") {
    sendApiError(res, notFoundError("Bay"));
    return true;
  }

  return false;
}

function buildBoardPatchActor(req) {
  const role = req.auth?.role ?? "front_desk";
  return `${role}_ui`;
}

function buildBoardPatchResponseMeta(req) {
  return {
    day: normalizeDay(req.body?.day ?? req.query?.day),
    laneMode: normalizeMode(req.body?.laneMode ?? req.query?.laneMode),
  };
}

export function registerDispatchBoardPageRoutes(app, {
  logger,
  dashboardService,
  appointmentService,
  workOrderService,
}) {
  app.get("/api/v1/dispatch/board", (req, res) => {
    const day = normalizeDay(req.query?.day);
    const laneMode = normalizeMode(req.query?.laneMode);

    try {
      const payload = dashboardService.getDispatchBoard({
        day,
        laneMode,
      });
      res.status(200).json(payload);
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "dispatch_board_api_failed");
    }
  });

  app.get("/dispatch/board", (req, res) => {
    const day = normalizeDay(req.query?.day);
    const laneMode = normalizeMode(req.query?.laneMode);

    try {
      const model = dashboardService.getDispatchBoard({
        day,
        laneMode,
      });
      res.status(200).send(renderDispatchBoardPage(model));
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "dispatch_board_page_failed");
    }
  });

  app.post("/dispatch/board/appointments/:id/preview", (req, res) => {
    const validation = validateAppointmentUpdate(normalizeBoardPatchPayload(req.body ?? {}));
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;

    try {
      const item = appointmentService.previewAppointmentUpdate(req.params.id, updates);
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      res.status(200).json({
        preview: true,
        canCommit: true,
        item,
        actor: changedBy ?? buildBoardPatchActor(req),
        reason: reason ?? null,
        ...buildBoardPatchResponseMeta(req),
      });
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_preview_failed");
    }
  });

  app.post("/dispatch/board/appointments/:id/commit", (req, res) => {
    const validation = validateAppointmentUpdate(normalizeBoardPatchPayload(req.body ?? {}));
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;

    try {
      const item = appointmentService.updateAppointmentById(req.params.id, updates, {
        changedBy: changedBy ?? buildBoardPatchActor(req),
        reason: reason ?? "Изменено на диспетчерской доске",
        source: "dispatch_board_ui_commit",
      });
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      res.status(200).json({
        preview: false,
        committed: true,
        item,
        ...buildBoardPatchResponseMeta(req),
      });
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_commit_failed");
    }
  });

  app.post("/dispatch/board/walk-ins/:id/schedule", (req, res) => {
    const workOrder = workOrderService.getWorkOrderById(req.params.id);
    if (!workOrder) {
      sendApiError(res, notFoundError("Work order"));
      return;
    }

    const payload = {
      plannedStartLocal: toOptionalStringOrNull(req.body?.plannedStartLocal),
      customerId: workOrder.customerId,
      vehicleId: workOrder.vehicleId,
      complaint: workOrder.complaint ?? "Запрос из очереди walk-in",
      bayId: toOptionalStringOrNull(req.body?.bayId),
      primaryAssignee: toOptionalStringOrNull(req.body?.primaryAssignee),
      expectedDurationMin: toOptionalIntegerOrRaw(req.body?.expectedDurationMin),
      source: "dispatch_board_walkin_schedule",
    };

    const validation = validateAppointmentCreate(payload);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = appointmentService.createAppointment(validation.value);
      res.status(201).json({
        item,
        createdFromWorkOrderId: workOrder.id,
      });
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_walkin_schedule_failed");
    }
  });
}
