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

const LOCAL_SLOT_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/u;

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

function parseLocalDateTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = LOCAL_SLOT_RE.exec(trimmed);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const hours = Number.parseInt(match[4], 10);
    const minutes = Number.parseInt(match[5], 10);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function resolveAssignmentFromResourceId(resourceId, laneMode) {
  if (resourceId === undefined) {
    return { updates: {} };
  }

  const raw = toOptionalStringOrNull(resourceId);
  if (raw === undefined) {
    return { updates: {} };
  }
  if (raw === null) {
    return {
      errors: [{ field: "resourceId", message: "resourceId must be a non-empty string" }],
    };
  }

  if (laneMode === "technician") {
    if (!raw.startsWith("tech:")) {
      return {
        errors: [{ field: "resourceId", message: "resourceId must start with tech: in technician mode" }],
      };
    }
    return {
      updates: {
        primaryAssignee: raw === "tech:none" ? null : raw.slice(5),
      },
    };
  }

  if (!raw.startsWith("bay:")) {
    return {
      errors: [{ field: "resourceId", message: "resourceId must start with bay: in bay mode" }],
    };
  }
  return {
    updates: {
      bayId: raw === "bay:none" ? null : raw.slice(4),
    },
  };
}

function buildBoardPatchPayload(body = {}, query = {}) {
  const errors = [];
  const laneMode = normalizeMode(body.laneMode ?? query.laneMode);
  const updates = {};

  const startRaw = toOptionalStringOrNull(body.start ?? body.plannedStartLocal);
  if (startRaw !== undefined) {
    if (startRaw === null) {
      errors.push({ field: "start", message: "start must be a non-empty date-time string" });
    } else {
      const startDate = parseLocalDateTime(startRaw);
      if (!startDate) {
        errors.push({ field: "start", message: "start must be a valid date-time" });
      } else {
        updates.plannedStartLocal = formatLocalDateTime(startDate);
      }
    }
  }

  const endRaw = toOptionalStringOrNull(body.end);
  if (endRaw !== undefined && endRaw !== null) {
    const startDate = parseLocalDateTime(startRaw ?? updates.plannedStartLocal ?? "");
    const endDate = parseLocalDateTime(endRaw);
    if (!startDate || !endDate) {
      errors.push({ field: "end", message: "end must be a valid date-time and start must be valid" });
    } else {
      const durationMinutes = Math.max(5, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
      if (durationMinutes <= 0) {
        errors.push({ field: "end", message: "end must be later than start" });
      } else {
        updates.expectedDurationMin = durationMinutes;
      }
    }
  } else if (body.expectedDurationMin !== undefined) {
    updates.expectedDurationMin = toOptionalIntegerOrRaw(body.expectedDurationMin);
  }

  const assignmentResolution = resolveAssignmentFromResourceId(body.resourceId, laneMode);
  if (assignmentResolution.errors) {
    errors.push(...assignmentResolution.errors);
  } else {
    Object.assign(updates, assignmentResolution.updates);
  }

  if (body.reason !== undefined) {
    updates.reason = toOptionalStringOrNull(body.reason);
  }
  if (body.changedBy !== undefined) {
    updates.changedBy = toOptionalStringOrNull(body.changedBy);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    laneMode,
    dayLocal: normalizeDay(body.dayLocal ?? body.day ?? query.day),
    updates,
  };
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
    day: normalizeDay(req.body?.dayLocal ?? req.body?.day ?? req.query?.day),
    laneMode: normalizeMode(req.body?.laneMode ?? req.query?.laneMode),
  };
}

function extractItemWarnings(item) {
  if (!item || typeof item !== "object") {
    return { item, warnings: [] };
  }
  const warnings = Array.isArray(item.capacityWarnings) ? item.capacityWarnings : [];
  if (warnings.length === 0) {
    return { item, warnings: [] };
  }
  const { capacityWarnings, ...rest } = item;
  return { item: rest, warnings };
}

function validateDispatchEventUpdate(payload, { requireStart = true, requireResource = true } = {}) {
  const errors = [];
  if (requireStart && payload.updates.plannedStartLocal === undefined) {
    errors.push({ field: "start", message: "start is required" });
  }
  const hasLaneUpdate = payload.updates.bayId !== undefined || payload.updates.primaryAssignee !== undefined;
  if (requireResource && !hasLaneUpdate) {
    errors.push({ field: "resourceId", message: "resourceId is required" });
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return validateAppointmentUpdate(payload.updates);
}

function deriveQueueDurationMinutes(updates, fallback = 60) {
  if (Number.isInteger(updates.expectedDurationMin)) {
    return updates.expectedDurationMin;
  }
  return fallback;
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

  app.post("/api/v1/dispatch/board/events/:id/preview", (req, res) => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      sendApiError(res, validationError(boardPayload.errors));
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;

    try {
      const previewItem = appointmentService.previewAppointmentUpdate(req.params.id, updates);
      if (!previewItem) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      const { item, warnings } = extractItemWarnings(previewItem);
      const payload = {
        preview: true,
        canCommit: true,
        item,
        actor: changedBy ?? buildBoardPatchActor(req),
        reason: reason ?? null,
        day: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      };
      if (warnings.length > 0) {
        payload.warnings = warnings;
      }

      res.status(200).json(payload);
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_preview_failed");
    }
  });

  app.post("/api/v1/dispatch/board/events/:id/commit", (req, res) => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      sendApiError(res, validationError(boardPayload.errors));
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;

    try {
      const updated = appointmentService.updateAppointmentById(req.params.id, updates, {
        changedBy: changedBy ?? buildBoardPatchActor(req),
        reason: reason ?? "Изменено на диспетчерской доске",
        source: "dispatch_board_api_commit",
      });
      if (!updated) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      const { item, warnings } = extractItemWarnings(updated);
      const payload = {
        preview: false,
        committed: true,
        item,
        ...buildBoardPatchResponseMeta(req),
      };
      if (warnings.length > 0) {
        payload.warnings = warnings;
      }

      res.status(200).json(payload);
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_commit_failed");
    }
  });

  app.post("/api/v1/dispatch/board/queue/appointments/:id/schedule", (req, res) => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      sendApiError(res, validationError(boardPayload.errors));
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    if (updates.expectedDurationMin === undefined) {
      updates.expectedDurationMin = deriveQueueDurationMinutes(updates, 60);
    }

    try {
      const previewCandidate = appointmentService.previewAppointmentUpdate(req.params.id, updates);
      if (!previewCandidate) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      const { item: previewItem, warnings: previewWarnings } = extractItemWarnings(previewCandidate);

      const updated = appointmentService.updateAppointmentById(req.params.id, updates, {
        changedBy: changedBy ?? buildBoardPatchActor(req),
        reason: reason ?? "Назначено из очереди на диспетчерской доске",
        source: "dispatch_board_queue_appointment_schedule",
      });
      if (!updated) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      const { item, warnings } = extractItemWarnings(updated);
      const combinedWarnings = [...previewWarnings, ...warnings];
      const payload = {
        preview: false,
        scheduled: true,
        previewItem,
        item,
        day: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      };
      if (combinedWarnings.length > 0) {
        payload.warnings = combinedWarnings;
      }

      res.status(200).json(payload);
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_queue_appointment_schedule_failed");
    }
  });

  app.post("/api/v1/dispatch/board/queue/walk-ins/:id/schedule", (req, res) => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      sendApiError(res, validationError(boardPayload.errors));
      return;
    }

    const dispatchValidation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!dispatchValidation.ok) {
      sendApiError(res, validationError(dispatchValidation.errors));
      return;
    }

    const workOrder = workOrderService.getWorkOrderById(req.params.id);
    if (!workOrder) {
      sendApiError(res, notFoundError("Work order"));
      return;
    }

    const expectedDurationMin = deriveQueueDurationMinutes(dispatchValidation.value, 60);
    const payload = {
      plannedStartLocal: dispatchValidation.value.plannedStartLocal,
      customerId: workOrder.customerId,
      vehicleId: workOrder.vehicleId,
      complaint: workOrder.complaint ?? "Запрос из очереди walk-in",
      bayId: dispatchValidation.value.bayId,
      primaryAssignee: dispatchValidation.value.primaryAssignee,
      expectedDurationMin,
      source: "dispatch_board_queue_walkin_schedule",
    };

    const validation = validateAppointmentCreate(payload);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const created = appointmentService.createAppointment(validation.value);
      const { item, warnings } = extractItemWarnings(created);
      workOrderService.linkAppointment(workOrder.id, item.id);

      const payload = {
        item,
        createdFromWorkOrderId: workOrder.id,
        day: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      };
      if (warnings.length > 0) {
        payload.warnings = warnings;
      }
      res.status(201).json(payload);
    } catch (error) {
      if (mapAppointmentDomainError(res, error)) {
        return;
      }
      handleUnexpectedError(logger, req, res, error, "dispatch_board_walkin_schedule_failed");
    }
  });
}
