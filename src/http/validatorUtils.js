export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
