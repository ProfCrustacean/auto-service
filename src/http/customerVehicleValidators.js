import { validateIncludeInactiveQuery } from "./referenceValidators.js";
import { collectUnknownFields, isNonEmptyString, normalizeBooleanLike } from "./validatorUtils.js";

function normalizeOptionalStringForCreate(value, field, errors) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be string or null` });
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeOptionalStringForUpdate(value, field, errors) {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be string or null` });
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push({ field, message: `${field} must be non-empty string or null` });
    return null;
  }

  return trimmed;
}

function normalizeNullableInteger(value, { field, min, max, errors, allowNull = true }) {
  if (value === undefined) {
    return undefined;
  }

  if (allowNull && value === null) {
    return null;
  }

  if (!Number.isInteger(value)) {
    errors.push({ field, message: `${field} must be integer${allowNull ? " or null" : ""}` });
    return undefined;
  }

  if (value < min || value > max) {
    errors.push({ field, message: `${field} must be between ${min} and ${max}` });
    return undefined;
  }

  return value;
}

function normalizeQueryString(queryValue, field, errors) {
  if (queryValue === undefined) {
    return "";
  }

  if (typeof queryValue !== "string") {
    errors.push({ field, message: `${field} must be a string when provided` });
    return "";
  }

  const trimmed = queryValue.trim();
  if (trimmed.length > 120) {
    errors.push({ field, message: `${field} is too long (max 120 characters)` });
  }

  return trimmed;
}

export function validateListCustomersQuery(query) {
  const errors = [];
  const includeInactiveResult = validateIncludeInactiveQuery(query);
  if (!includeInactiveResult.ok) {
    errors.push(...includeInactiveResult.errors);
  }

  const search = normalizeQueryString(query.q, "q", errors);

  const unknownFields = collectUnknownFields(query, ["includeInactive", "q"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown query parameter" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      includeInactive: includeInactiveResult.value,
      query: search,
    },
  };
}

export function validateCustomerCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.fullName)) {
    errors.push({ field: "fullName", message: "fullName is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.phone)) {
    errors.push({ field: "phone", message: "phone is required and must be a non-empty string" });
  }

  const messagingHandle = normalizeOptionalStringForCreate(body.messagingHandle, "messagingHandle", errors);
  const notes = normalizeOptionalStringForCreate(body.notes, "notes", errors);

  let isActive = true;
  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanLike(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean when provided" });
    } else {
      isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["fullName", "phone", "messagingHandle", "notes", "isActive"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      messagingHandle,
      notes,
      isActive,
    },
  };
}

export function validateCustomerUpdate(body) {
  const errors = [];
  const value = {};

  if (body.fullName !== undefined) {
    if (!isNonEmptyString(body.fullName)) {
      errors.push({ field: "fullName", message: "fullName must be a non-empty string" });
    } else {
      value.fullName = body.fullName.trim();
    }
  }

  if (body.phone !== undefined) {
    if (!isNonEmptyString(body.phone)) {
      errors.push({ field: "phone", message: "phone must be a non-empty string" });
    } else {
      value.phone = body.phone.trim();
    }
  }

  if (body.messagingHandle !== undefined) {
    value.messagingHandle = normalizeOptionalStringForUpdate(body.messagingHandle, "messagingHandle", errors);
  }

  if (body.notes !== undefined) {
    value.notes = normalizeOptionalStringForUpdate(body.notes, "notes", errors);
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanLike(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean" });
    } else {
      value.isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["fullName", "phone", "messagingHandle", "notes", "isActive"]);
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

export function validateListVehiclesQuery(query) {
  const errors = [];
  const includeInactiveResult = validateIncludeInactiveQuery(query);
  if (!includeInactiveResult.ok) {
    errors.push(...includeInactiveResult.errors);
  }

  const search = normalizeQueryString(query.q, "q", errors);

  let customerId = null;
  if (query.customerId !== undefined) {
    if (!isNonEmptyString(query.customerId)) {
      errors.push({ field: "customerId", message: "customerId must be a non-empty string" });
    } else {
      customerId = query.customerId.trim();
    }
  }

  const unknownFields = collectUnknownFields(query, ["includeInactive", "q", "customerId"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown query parameter" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      includeInactive: includeInactiveResult.value,
      query: search,
      customerId,
    },
  };
}

export function validateVehicleCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.customerId)) {
    errors.push({ field: "customerId", message: "customerId is required and must be a non-empty string" });
  }

  if (!isNonEmptyString(body.label)) {
    errors.push({ field: "label", message: "label is required and must be a non-empty string" });
  }

  const vin = normalizeOptionalStringForCreate(body.vin, "vin", errors);
  const plateNumber = normalizeOptionalStringForCreate(body.plateNumber, "plateNumber", errors);
  const make = normalizeOptionalStringForCreate(body.make, "make", errors);
  const model = normalizeOptionalStringForCreate(body.model, "model", errors);
  const engineOrTrim = normalizeOptionalStringForCreate(body.engineOrTrim, "engineOrTrim", errors);

  const productionYear = normalizeNullableInteger(body.productionYear, {
    field: "productionYear",
    min: 1900,
    max: 2100,
    errors,
  });

  const mileageKm = normalizeNullableInteger(body.mileageKm, {
    field: "mileageKm",
    min: 0,
    max: 2_000_000,
    errors,
  });

  let isActive = true;
  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanLike(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean when provided" });
    } else {
      isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, [
    "customerId",
    "label",
    "vin",
    "plateNumber",
    "make",
    "model",
    "productionYear",
    "engineOrTrim",
    "mileageKm",
    "isActive",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      customerId: body.customerId.trim(),
      label: body.label.trim(),
      vin,
      plateNumber,
      make,
      model,
      productionYear: productionYear === undefined ? null : productionYear,
      engineOrTrim,
      mileageKm: mileageKm === undefined ? null : mileageKm,
      isActive,
    },
  };
}

export function validateVehicleUpdate(body) {
  const errors = [];
  const value = {};

  if (body.customerId !== undefined) {
    if (!isNonEmptyString(body.customerId)) {
      errors.push({ field: "customerId", message: "customerId must be a non-empty string" });
    } else {
      value.customerId = body.customerId.trim();
    }
  }

  if (body.label !== undefined) {
    if (!isNonEmptyString(body.label)) {
      errors.push({ field: "label", message: "label must be a non-empty string" });
    } else {
      value.label = body.label.trim();
    }
  }

  if (body.vin !== undefined) {
    value.vin = normalizeOptionalStringForUpdate(body.vin, "vin", errors);
  }

  if (body.plateNumber !== undefined) {
    value.plateNumber = normalizeOptionalStringForUpdate(body.plateNumber, "plateNumber", errors);
  }

  if (body.make !== undefined) {
    value.make = normalizeOptionalStringForUpdate(body.make, "make", errors);
  }

  if (body.model !== undefined) {
    value.model = normalizeOptionalStringForUpdate(body.model, "model", errors);
  }

  if (body.engineOrTrim !== undefined) {
    value.engineOrTrim = normalizeOptionalStringForUpdate(body.engineOrTrim, "engineOrTrim", errors);
  }

  if (body.productionYear !== undefined) {
    const normalized = normalizeNullableInteger(body.productionYear, {
      field: "productionYear",
      min: 1900,
      max: 2100,
      errors,
    });
    if (normalized !== undefined) {
      value.productionYear = normalized;
    }
  }

  if (body.mileageKm !== undefined) {
    const normalized = normalizeNullableInteger(body.mileageKm, {
      field: "mileageKm",
      min: 0,
      max: 2_000_000,
      errors,
    });
    if (normalized !== undefined) {
      value.mileageKm = normalized;
    }
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanLike(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean" });
    } else {
      value.isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, [
    "customerId",
    "label",
    "vin",
    "plateNumber",
    "make",
    "model",
    "productionYear",
    "engineOrTrim",
    "mileageKm",
    "isActive",
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
