function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function collectUnknownFields(body, knownFields) {
  const fieldSet = new Set(knownFields);
  return Object.keys(body).filter((field) => !fieldSet.has(field));
}

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

export function validateWalkInCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.customerId)) {
    errors.push({ field: "customerId", message: "customerId is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.vehicleId)) {
    errors.push({ field: "vehicleId", message: "vehicleId is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.complaint)) {
    errors.push({ field: "complaint", message: "complaint is required and must be a non-empty string" });
  }

  const bayId = normalizeOptionalString(body.bayId, "bayId", errors);
  const primaryAssignee = normalizeOptionalString(body.primaryAssignee, "primaryAssignee", errors);

  const unknownFields = collectUnknownFields(body, ["customerId", "vehicleId", "complaint", "bayId", "primaryAssignee"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const value = {
    customerId: body.customerId.trim(),
    vehicleId: body.vehicleId.trim(),
    complaint: body.complaint.trim(),
  };

  if (bayId !== undefined) {
    value.bayId = bayId;
  }

  if (primaryAssignee !== undefined) {
    value.primaryAssignee = primaryAssignee;
  }

  return { ok: true, value };
}
