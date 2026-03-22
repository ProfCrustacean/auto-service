import { collectUnknownFields, isNonEmptyString, normalizeBooleanLike, normalizePaginationQuery } from "./validatorUtils.js";
import { isKnownWorkOrderStatus, WORK_ORDER_STATUS_CODES } from "../domain/workOrderLifecycle.js";

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

function normalizeOptionalId(value, field, errors) {
  return normalizeOptionalString(value, field, errors);
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
  if (!isKnownWorkOrderStatus(normalized)) {
    errors.push({
      field,
      message: `${field} must be one of: ${WORK_ORDER_STATUS_CODES.join(", ")}`,
    });
    return undefined;
  }

  return normalized;
}

function normalizeNonNegativeInteger(value, field, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value)) {
    errors.push({ field, message: `${field} must be an integer` });
    return undefined;
  }

  if (value < 0) {
    errors.push({ field, message: `${field} must be >= 0` });
    return undefined;
  }

  return value;
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

export function validateListWorkOrdersQuery(query) {
  const errors = [];
  const pagination = normalizePaginationQuery(query, errors);

  const status = normalizeStatus(query.status, "status", errors) ?? null;
  const bayId = normalizeOptionalId(query.bayId, "bayId", errors) ?? null;
  const primaryAssignee = normalizeOptionalString(query.primaryAssignee, "primaryAssignee", errors) ?? null;
  const search = normalizeQueryString(query.q, "q", errors);
  const includeClosedRaw = normalizeBooleanLike(query.includeClosed);
  if (query.includeClosed !== undefined && includeClosedRaw === null) {
    errors.push({ field: "includeClosed", message: "includeClosed must be boolean-like (true/false/1/0)" });
  }

  const unknownFields = collectUnknownFields(query, [
    "status",
    "bayId",
    "primaryAssignee",
    "q",
    "includeClosed",
    "limit",
    "offset",
  ]);
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
      bayId,
      primaryAssignee,
      query: search,
      includeClosed: includeClosedRaw === null ? true : includeClosedRaw,
      limit: pagination.limit,
      offset: pagination.offset,
    },
  };
}

export function validateWorkOrderUpdate(body) {
  const errors = [];
  const value = {};

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

  const complaint = normalizeOptionalString(body.complaint, "complaint", errors);
  if (complaint !== undefined) {
    value.complaint = complaint;
  }

  const findings = normalizeOptionalString(body.findings, "findings", errors);
  if (findings !== undefined) {
    value.findings = findings;
  }

  const internalNotes = normalizeOptionalString(body.internalNotes, "internalNotes", errors);
  if (internalNotes !== undefined) {
    value.internalNotes = internalNotes;
  }

  const customerNotes = normalizeOptionalString(body.customerNotes, "customerNotes", errors);
  if (customerNotes !== undefined) {
    value.customerNotes = customerNotes;
  }

  const balanceDueRub = normalizeNonNegativeInteger(body.balanceDueRub, "balanceDueRub", errors);
  if (balanceDueRub !== undefined) {
    value.balanceDueRub = balanceDueRub;
  }

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  const unknownFields = collectUnknownFields(body, [
    "status",
    "bayId",
    "primaryAssignee",
    "complaint",
    "findings",
    "internalNotes",
    "customerNotes",
    "balanceDueRub",
    "reason",
    "changedBy",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  const hasMutableField = [
    "status",
    "bayId",
    "primaryAssignee",
    "complaint",
    "findings",
    "internalNotes",
    "customerNotes",
    "balanceDueRub",
  ].some((field) => Object.hasOwn(value, field));

  if (!hasMutableField) {
    errors.push({ field: "body", message: "at least one updatable field is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateConvertAppointmentToWorkOrder(body) {
  const errors = [];
  const value = {};

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  const unknownFields = collectUnknownFields(body, ["reason", "changedBy"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}
