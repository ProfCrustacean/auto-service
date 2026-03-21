export function sendApiError(res, { status, code, message, details = undefined }) {
  const payload = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    payload.error.details = details;
  }

  res.status(status).json(payload);
}

export function validationError(details) {
  return {
    status: 400,
    code: "validation_error",
    message: "Request validation failed",
    details,
  };
}

export function notFoundError(entityName) {
  return {
    status: 404,
    code: "not_found",
    message: `${entityName} not found`,
  };
}

export function conflictError(message, details = undefined) {
  return {
    status: 409,
    code: "conflict",
    message,
    details,
  };
}

export function internalError() {
  return {
    status: 500,
    code: "internal_error",
    message: "Internal server error",
  };
}
