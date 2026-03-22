import { collectUnknownFields, isNonEmptyString, normalizePaginationQuery } from "./validatorUtils.js";
import { normalizePlannedStartLocal } from "./plannedStartLocal.js";

const APPOINTMENT_STATUSES = new Set(["booked", "confirmed", "arrived", "cancelled", "no-show"]);

function normalizeOptionalString(value, field, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string or null` });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push({ field, message: `${field} must be a non-empty string or null` });
    return undefined;
  }

  return trimmed;
}

function normalizeDuration(value, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    errors.push({ field: "expectedDurationMin", message: "expectedDurationMin must be an integer or null" });
    return undefined;
  }

  if (value < 5 || value > 720) {
    errors.push({ field: "expectedDurationMin", message: "expectedDurationMin must be between 5 and 720" });
    return undefined;
  }

  return value;
}

function normalizeStatus(value, field, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return undefined;
  }

  const normalized = value.trim();
  if (!APPOINTMENT_STATUSES.has(normalized)) {
    errors.push({ field, message: `${field} must be one of: booked, confirmed, arrived, cancelled, no-show` });
    return undefined;
  }

  return normalized;
}

function normalizeOptionalId(value, field, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (!isNonEmptyString(value)) {
    errors.push({ field, message: `${field} must be a non-empty string or null` });
    return undefined;
  }

  return value.trim();
}

function normalizeQueryString(value, field, errors) {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length > 120) {
    errors.push({ field, message: `${field} is too long (max 120 characters)` });
  }

  return trimmed;
}

export function validateListAppointmentsQuery(query) {
  const errors = [];
  const pagination = normalizePaginationQuery(query, errors);

  const status = normalizeStatus(query.status, "status", errors) ?? null;
  const customerId = normalizeOptionalId(query.customerId, "customerId", errors) ?? null;
  const vehicleId = normalizeOptionalId(query.vehicleId, "vehicleId", errors) ?? null;
  const bayId = normalizeOptionalId(query.bayId, "bayId", errors) ?? null;
  const search = normalizeQueryString(query.q, "q", errors);

  const unknownFields = collectUnknownFields(query, ["status", "customerId", "vehicleId", "bayId", "q", "limit", "offset"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown query parameter" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      status,
      customerId,
      vehicleId,
      bayId,
      query: search,
      limit: pagination.limit,
      offset: pagination.offset,
    },
  };
}

export function validateAppointmentCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.plannedStartLocal)) {
    errors.push({ field: "plannedStartLocal", message: "plannedStartLocal is required and must be a non-empty string" });
  } else if (!normalizePlannedStartLocal(body.plannedStartLocal)) {
    errors.push({ field: "plannedStartLocal", message: "plannedStartLocal must match YYYY-MM-DD HH:mm" });
  }

  if (!isNonEmptyString(body.customerId)) {
    errors.push({ field: "customerId", message: "customerId is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.vehicleId)) {
    errors.push({ field: "vehicleId", message: "vehicleId is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.complaint)) {
    errors.push({ field: "complaint", message: "complaint is required and must be a non-empty string" });
  }

  const status = normalizeStatus(body.status, "status", errors) ?? "booked";
  const bayId = normalizeOptionalId(body.bayId, "bayId", errors);
  const primaryAssignee = normalizeOptionalString(body.primaryAssignee, "primaryAssignee", errors);
  const source = normalizeOptionalString(body.source, "source", errors);
  const expectedDurationMin = normalizeDuration(body.expectedDurationMin, errors);
  const notes = normalizeOptionalString(body.notes, "notes", errors);

  const unknownFields = collectUnknownFields(body, [
    "plannedStartLocal",
    "customerId",
    "vehicleId",
    "complaint",
    "status",
    "bayId",
    "primaryAssignee",
    "source",
    "expectedDurationMin",
    "notes",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const value = {
    plannedStartLocal: normalizePlannedStartLocal(body.plannedStartLocal),
    customerId: body.customerId.trim(),
    vehicleId: body.vehicleId.trim(),
    complaint: body.complaint.trim(),
    status,
  };

  if (bayId !== undefined) {
    value.bayId = bayId;
  }

  if (primaryAssignee !== undefined) {
    value.primaryAssignee = primaryAssignee;
  }

  if (source !== undefined) {
    value.source = source;
  }

  if (expectedDurationMin !== undefined) {
    value.expectedDurationMin = expectedDurationMin;
  }

  if (notes !== undefined) {
    value.notes = notes;
  }

  return { ok: true, value };
}

export function validateAppointmentUpdate(body) {
  const errors = [];
  const value = {};

  if (body.plannedStartLocal !== undefined) {
    if (!isNonEmptyString(body.plannedStartLocal)) {
      errors.push({ field: "plannedStartLocal", message: "plannedStartLocal must be a non-empty string" });
    } else {
      const normalizedSlot = normalizePlannedStartLocal(body.plannedStartLocal);
      if (!normalizedSlot) {
        errors.push({ field: "plannedStartLocal", message: "plannedStartLocal must match YYYY-MM-DD HH:mm" });
      } else {
        value.plannedStartLocal = normalizedSlot;
      }
    }
  }

  const customerId = normalizeOptionalId(body.customerId, "customerId", errors);
  if (customerId !== undefined) {
    value.customerId = customerId;
  }

  const vehicleId = normalizeOptionalId(body.vehicleId, "vehicleId", errors);
  if (vehicleId !== undefined) {
    value.vehicleId = vehicleId;
  }

  if (body.complaint !== undefined) {
    if (!isNonEmptyString(body.complaint)) {
      errors.push({ field: "complaint", message: "complaint must be a non-empty string" });
    } else {
      value.complaint = body.complaint.trim();
    }
  }

  const status = normalizeStatus(body.status, "status", errors);
  if (status !== undefined) {
    value.status = status;
  }

  const bayId = normalizeOptionalId(body.bayId, "bayId", errors);
  if (bayId !== undefined) {
    value.bayId = bayId;
  }

  const primaryAssignee = normalizeOptionalString(body.primaryAssignee, "primaryAssignee", errors);
  if (primaryAssignee !== undefined) {
    value.primaryAssignee = primaryAssignee;
  }

  const expectedDurationMin = normalizeDuration(body.expectedDurationMin, errors);
  if (expectedDurationMin !== undefined) {
    value.expectedDurationMin = expectedDurationMin;
  }

  const notes = normalizeOptionalString(body.notes, "notes", errors);
  if (notes !== undefined) {
    value.notes = notes;
  }

  const unknownFields = collectUnknownFields(body, [
    "plannedStartLocal",
    "customerId",
    "vehicleId",
    "complaint",
    "status",
    "bayId",
    "primaryAssignee",
    "expectedDurationMin",
    "notes",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (Object.keys(value).length === 0) {
    errors.push({ field: "body", message: "at least one updatable field is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}
