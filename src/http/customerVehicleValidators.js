import { validateIncludeInactiveQuery } from "./referenceValidators.js";
import {
  collectUnknownFields,
  finalizeUnknownQueryFields,
  isNonEmptyString,
  normalizeBooleanField,
  normalizeIntegerRange,
  normalizeOptionalId,
  normalizeOptionalString,
  normalizePaginationQuery,
  normalizeSearchQuery,
} from "./validatorUtils.js";

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

export function validateListCustomersQuery(query) {
  const errors = [];
  const pagination = normalizePaginationQuery(query, errors);
  const includeInactiveResult = validateIncludeInactiveQuery(query);
  if (!includeInactiveResult.ok) {
    errors.push(...includeInactiveResult.errors);
  }

  const search = normalizeSearchQuery(query.q, "q", errors);

  finalizeUnknownQueryFields(query, ["includeInactive", "q", "limit", "offset"], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      includeInactive: includeInactiveResult.value,
      query: search,
      limit: pagination.limit,
      offset: pagination.offset,
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
    const normalized = normalizeBooleanField(body.isActive, "isActive", errors, {
      whenProvidedMessage: "isActive must be boolean when provided",
    });
    if (normalized !== undefined) {
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
    value.messagingHandle = normalizeOptionalString(body.messagingHandle, "messagingHandle", errors, {
      typeMessage: "messagingHandle must be string or null",
      emptyMessage: "messagingHandle must be non-empty string or null",
    });
  }

  if (body.notes !== undefined) {
    value.notes = normalizeOptionalString(body.notes, "notes", errors, {
      typeMessage: "notes must be string or null",
      emptyMessage: "notes must be non-empty string or null",
    });
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanField(body.isActive, "isActive", errors, {
      strict: true,
      strictMessage: "isActive must be boolean",
    });
    if (normalized !== undefined) {
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
  const pagination = normalizePaginationQuery(query, errors);
  const includeInactiveResult = validateIncludeInactiveQuery(query);
  if (!includeInactiveResult.ok) {
    errors.push(...includeInactiveResult.errors);
  }

  const search = normalizeSearchQuery(query.q, "q", errors);

  let customerId = null;
  if (query.customerId !== undefined) {
    const normalizedCustomerId = normalizeOptionalId(query.customerId, "customerId", errors, {
      allowNull: false,
      typeMessage: "customerId must be a non-empty string",
      emptyMessage: "customerId must be a non-empty string",
    });
    if (normalizedCustomerId !== undefined) {
      customerId = normalizedCustomerId;
    }
  }

  finalizeUnknownQueryFields(query, ["includeInactive", "q", "customerId", "limit", "offset"], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      includeInactive: includeInactiveResult.value,
      query: search,
      customerId,
      limit: pagination.limit,
      offset: pagination.offset,
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

  const productionYear = normalizeIntegerRange(body.productionYear, "productionYear", errors, {
    min: 1900,
    max: 2100,
    allowNull: true,
    integerMessage: "productionYear must be integer or null",
    rangeMessage: "productionYear must be between 1900 and 2100",
  });

  const mileageKm = normalizeIntegerRange(body.mileageKm, "mileageKm", errors, {
    min: 0,
    max: 2_000_000,
    allowNull: true,
    integerMessage: "mileageKm must be integer or null",
    rangeMessage: "mileageKm must be between 0 and 2000000",
  });

  let isActive = true;
  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanField(body.isActive, "isActive", errors, {
      whenProvidedMessage: "isActive must be boolean when provided",
    });
    if (normalized !== undefined) {
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
    value.vin = normalizeOptionalString(body.vin, "vin", errors, {
      typeMessage: "vin must be string or null",
      emptyMessage: "vin must be non-empty string or null",
    });
  }

  if (body.plateNumber !== undefined) {
    value.plateNumber = normalizeOptionalString(body.plateNumber, "plateNumber", errors, {
      typeMessage: "plateNumber must be string or null",
      emptyMessage: "plateNumber must be non-empty string or null",
    });
  }

  if (body.make !== undefined) {
    value.make = normalizeOptionalString(body.make, "make", errors, {
      typeMessage: "make must be string or null",
      emptyMessage: "make must be non-empty string or null",
    });
  }

  if (body.model !== undefined) {
    value.model = normalizeOptionalString(body.model, "model", errors, {
      typeMessage: "model must be string or null",
      emptyMessage: "model must be non-empty string or null",
    });
  }

  if (body.engineOrTrim !== undefined) {
    value.engineOrTrim = normalizeOptionalString(body.engineOrTrim, "engineOrTrim", errors, {
      typeMessage: "engineOrTrim must be string or null",
      emptyMessage: "engineOrTrim must be non-empty string or null",
    });
  }

  if (body.productionYear !== undefined) {
    const normalized = normalizeIntegerRange(body.productionYear, "productionYear", errors, {
      min: 1900,
      max: 2100,
      allowNull: true,
      integerMessage: "productionYear must be integer or null",
      rangeMessage: "productionYear must be between 1900 and 2100",
    });
    if (normalized !== undefined) {
      value.productionYear = normalized;
    }
  }

  if (body.mileageKm !== undefined) {
    const normalized = normalizeIntegerRange(body.mileageKm, "mileageKm", errors, {
      min: 0,
      max: 2_000_000,
      allowNull: true,
      integerMessage: "mileageKm must be integer or null",
      rangeMessage: "mileageKm must be between 0 and 2000000",
    });
    if (normalized !== undefined) {
      value.mileageKm = normalized;
    }
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBooleanField(body.isActive, "isActive", errors, {
      strict: true,
      strictMessage: "isActive must be boolean",
    });
    if (normalized !== undefined) {
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
