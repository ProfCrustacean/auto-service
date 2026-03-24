export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeOptionalString(
  value,
  field,
  errors,
  {
    allowNull = true,
    typeMessage = `${field} must be a string${allowNull ? " or null" : ""}`,
    emptyMessage = `${field} must be a non-empty string${allowNull ? " or null" : ""}`,
  } = {},
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    if (allowNull) {
      return null;
    }
    errors.push({ field, message: typeMessage });
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: typeMessage });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push({ field, message: emptyMessage });
    return undefined;
  }

  return trimmed;
}

export function normalizeOptionalId(value, field, errors, options = {}) {
  return normalizeOptionalString(value, field, errors, options);
}

export function normalizeEnum(
  value,
  field,
  errors,
  {
    allowedValues,
    typeMessage = `${field} must be a string`,
    enumMessage = `${field} must be one of: ${allowedValues.join(", ")}`,
  },
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: typeMessage });
    return undefined;
  }

  const normalized = value.trim();
  if (!allowedValues.includes(normalized)) {
    errors.push({ field, message: enumMessage });
    return undefined;
  }

  return normalized;
}

export function normalizeIntegerRange(
  value,
  field,
  errors,
  {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    allowNull = false,
    integerMessage = `${field} must be an integer${allowNull ? " or null" : ""}`,
    rangeMessage = `${field} must be between ${min} and ${max}`,
  } = {},
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    if (allowNull) {
      return null;
    }
    errors.push({ field, message: integerMessage });
    return undefined;
  }

  if (!Number.isInteger(value)) {
    errors.push({ field, message: integerMessage });
    return undefined;
  }

  if (value < min || value > max) {
    errors.push({ field, message: rangeMessage });
    return undefined;
  }

  return value;
}

export function normalizeBooleanField(
  value,
  field,
  errors,
  {
    whenProvidedMessage = `${field} must be boolean when provided`,
    strictMessage = `${field} must be boolean`,
    strict = false,
  } = {},
) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeBooleanLike(value);
  if (normalized === null) {
    errors.push({ field, message: strict ? strictMessage : whenProvidedMessage });
    return undefined;
  }

  return normalized;
}

export function normalizeBooleanLike(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return null;
}

export function collectUnknownFields(body, knownFields) {
  const fieldSet = new Set(knownFields);
  return Object.keys(body).filter((field) => !fieldSet.has(field));
}

export function finalizeUnknownQueryFields(query, allowedFields, errors) {
  const unknownFields = collectUnknownFields(query, allowedFields);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown query parameter" });
  }
}

export function normalizeSearchQuery(value, field, errors, { maxLen = 120 } = {}) {
  if (value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return "";
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    errors.push({ field, message: `${field} is too long (max ${maxLen} characters)` });
  }

  return trimmed;
}

export const MAX_PAGE_LIMIT = 100;
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

function parseIntegerQuery(value, field, errors, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !/^\d+$/u.test(value.trim())) {
    errors.push({ field, message: `${field} must be an integer` });
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push({ field, message: `${field} must be between ${min} and ${max}` });
    return undefined;
  }

  return parsed;
}

export function normalizePaginationQuery(query, errors) {
  const limitValue = parseIntegerQuery(query.limit, "limit", errors, { min: 1, max: MAX_PAGE_LIMIT });
  const offsetValue = parseIntegerQuery(query.offset, "offset", errors, { min: 0, max: Number.MAX_SAFE_INTEGER });

  return {
    limit: limitValue ?? null,
    offset: offsetValue ?? 0,
  };
}

export function normalizeLocalDateQuery(value, field, errors) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push({ field, message: `${field} must be a string` });
    return undefined;
  }

  const normalized = value.trim();
  if (!LOCAL_DATE_RE.test(normalized)) {
    errors.push({ field, message: `${field} must match YYYY-MM-DD` });
    return undefined;
  }

  return normalized;
}
