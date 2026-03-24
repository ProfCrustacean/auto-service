import { validateAppointmentCreate, validateAppointmentUpdate } from "./appointmentValidators.js";

const LOCAL_SLOT_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/u;

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

function withWarnings(payload, warnings) {
  if (warnings.length > 0) {
    payload.warnings = warnings;
  }
  return payload;
}

export function normalizeDispatchMode(rawMode) {
  return rawMode === "technician" ? "technician" : "bay";
}

export function normalizeDispatchDay(rawDay) {
  if (typeof rawDay !== "string") {
    return null;
  }
  const trimmed = rawDay.trim();
  return /^\d{4}-\d{2}-\d{2}$/u.test(trimmed) ? trimmed : null;
}

export function buildBoardPatchPayload(body = {}, query = {}) {
  const errors = [];
  const laneMode = normalizeDispatchMode(body.laneMode ?? query.laneMode);
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
    dayLocal: normalizeDispatchDay(body.dayLocal ?? body.day ?? query.day),
    updates,
  };
}

export function extractItemWarnings(item) {
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

export function validateDispatchEventUpdate(payload, { requireStart = true, requireResource = true } = {}) {
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

export function deriveQueueDurationMinutes(updates, fallback = 60) {
  if (Number.isInteger(updates.expectedDurationMin)) {
    return updates.expectedDurationMin;
  }
  return fallback;
}

export function buildBoardPatchActor(req) {
  const role = req.auth?.role ?? "front_desk";
  return `${role}_ui`;
}

export function buildBoardPatchResponseMeta(req) {
  return {
    day: normalizeDispatchDay(req.body?.dayLocal ?? req.body?.day ?? req.query?.day),
    laneMode: normalizeDispatchMode(req.body?.laneMode ?? req.query?.laneMode),
  };
}

export function executeDispatchPreview({
  appointmentService,
  appointmentId,
  updates,
  changedBy,
  reason,
  actor,
  dayLocal,
  laneMode,
}) {
  const previewItem = appointmentService.previewAppointmentUpdate(appointmentId, updates);
  if (!previewItem) {
    return null;
  }
  const { item, warnings } = extractItemWarnings(previewItem);
  return withWarnings({
    preview: true,
    canCommit: true,
    item,
    actor: changedBy ?? actor,
    reason: reason ?? null,
    day: dayLocal,
    laneMode,
  }, warnings);
}

export function executeDispatchCommit({
  appointmentService,
  appointmentId,
  updates,
  changedBy,
  reason,
  actor,
  responseMeta,
}) {
  const updated = appointmentService.updateAppointmentById(appointmentId, updates, {
    changedBy: changedBy ?? actor,
    reason: reason ?? "Изменено на диспетчерской доске",
    source: "dispatch_board_api_commit",
  });
  if (!updated) {
    return null;
  }
  const { item, warnings } = extractItemWarnings(updated);
  return withWarnings({
    preview: false,
    committed: true,
    item,
    ...responseMeta,
  }, warnings);
}

export function executeDispatchQueueAppointmentSchedule({
  appointmentService,
  appointmentId,
  updates,
  changedBy,
  reason,
  actor,
  dayLocal,
  laneMode,
}) {
  const previewCandidate = appointmentService.previewAppointmentUpdate(appointmentId, updates);
  if (!previewCandidate) {
    return null;
  }
  const { item: previewItem, warnings: previewWarnings } = extractItemWarnings(previewCandidate);

  const updated = appointmentService.updateAppointmentById(appointmentId, updates, {
    changedBy: changedBy ?? actor,
    reason: reason ?? "Назначено из очереди на диспетчерской доске",
    source: "dispatch_board_queue_appointment_schedule",
  });
  if (!updated) {
    return null;
  }
  const { item, warnings } = extractItemWarnings(updated);
  return withWarnings({
    preview: false,
    scheduled: true,
    previewItem,
    item,
    day: dayLocal,
    laneMode,
  }, [...previewWarnings, ...warnings]);
}

export function executeDispatchQueueWalkInSchedule({
  appointmentService,
  workOrderService,
  workOrder,
  dispatchUpdates,
  dayLocal,
  laneMode,
}) {
  const payload = {
    plannedStartLocal: dispatchUpdates.plannedStartLocal,
    customerId: workOrder.customerId,
    vehicleId: workOrder.vehicleId,
    complaint: workOrder.complaint ?? "Запрос из очереди walk-in",
    bayId: dispatchUpdates.bayId,
    primaryAssignee: dispatchUpdates.primaryAssignee,
    expectedDurationMin: deriveQueueDurationMinutes(dispatchUpdates, 60),
    source: "dispatch_board_queue_walkin_schedule",
  };

  const validation = validateAppointmentCreate(payload);
  if (!validation.ok) {
    return {
      validationErrors: validation.errors,
    };
  }

  const created = appointmentService.createAppointment(validation.value);
  const { item, warnings } = extractItemWarnings(created);
  workOrderService.linkAppointment(workOrder.id, item.id);
  return withWarnings({
    item,
    createdFromWorkOrderId: workOrder.id,
    day: dayLocal,
    laneMode,
  }, warnings);
}
