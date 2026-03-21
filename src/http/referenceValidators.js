function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeBoolean(value) {
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

function parseRoles(value) {
  if (!Array.isArray(value)) {
    return null;
  }

  const roles = value
    .map((role) => (typeof role === "string" ? role.trim() : ""))
    .filter((role) => role.length > 0);

  if (roles.length === 0) {
    return null;
  }

  return [...new Set(roles)];
}

function collectUnknownFields(body, knownFields) {
  const fieldSet = new Set(knownFields);
  return Object.keys(body).filter((field) => !fieldSet.has(field));
}

export function validateIncludeInactiveQuery(query) {
  if (query.includeInactive === undefined) {
    return { ok: true, value: false };
  }

  const normalized = normalizeBoolean(query.includeInactive);
  if (normalized === null) {
    return {
      ok: false,
      errors: [{ field: "includeInactive", message: "includeInactive must be boolean-like: true|false|1|0" }],
    };
  }

  return { ok: true, value: normalized };
}

export function validateEmployeeCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.name)) {
    errors.push({ field: "name", message: "name is required and must be a non-empty string" });
  }

  const roles = parseRoles(body.roles);
  if (!roles) {
    errors.push({ field: "roles", message: "roles is required and must be a non-empty string array" });
  }

  let isActive = true;
  if (body.isActive !== undefined) {
    const normalized = normalizeBoolean(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean when provided" });
    } else {
      isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["name", "roles", "isActive"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name: body.name.trim(),
      roles,
      isActive,
    },
  };
}

export function validateEmployeeUpdate(body) {
  const errors = [];
  const value = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      errors.push({ field: "name", message: "name must be a non-empty string" });
    } else {
      value.name = body.name.trim();
    }
  }

  if (body.roles !== undefined) {
    const roles = parseRoles(body.roles);
    if (!roles) {
      errors.push({ field: "roles", message: "roles must be a non-empty string array" });
    } else {
      value.roles = roles;
    }
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBoolean(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean" });
    } else {
      value.isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["name", "roles", "isActive"]);
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

export function validateBayCreate(body) {
  const errors = [];

  if (!isNonEmptyString(body.name)) {
    errors.push({ field: "name", message: "name is required and must be a non-empty string" });
  }

  let isActive = true;
  if (body.isActive !== undefined) {
    const normalized = normalizeBoolean(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean when provided" });
    } else {
      isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["name", "isActive"]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name: body.name.trim(),
      isActive,
    },
  };
}

export function validateBayUpdate(body) {
  const errors = [];
  const value = {};

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) {
      errors.push({ field: "name", message: "name must be a non-empty string" });
    } else {
      value.name = body.name.trim();
    }
  }

  if (body.isActive !== undefined) {
    const normalized = normalizeBoolean(body.isActive);
    if (normalized === null) {
      errors.push({ field: "isActive", message: "isActive must be boolean" });
    } else {
      value.isActive = normalized;
    }
  }

  const unknownFields = collectUnknownFields(body, ["name", "isActive"]);
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
