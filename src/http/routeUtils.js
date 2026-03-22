import { internalError, sendApiError } from "./apiErrors.js";

function isSqliteBusyError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  return code.includes("SQLITE_BUSY") || message.includes("SQLITE_BUSY") || message.includes("database is locked");
}

export function handleUnexpectedError(logger, req, res, error, event) {
  if (isSqliteBusyError(error)) {
    logger.warn(`${event}_database_busy`, {
      message: error.message,
      method: req.method,
      path: req.path,
      requestId: req.requestId ?? null,
    });
    sendApiError(res, {
      status: 503,
      code: "database_busy",
      message: "Database is busy. Retry the request.",
    });
    return;
  }

  logger.error(event, {
    message: error.message,
    method: req.method,
    path: req.path,
    requestId: req.requestId ?? null,
    stack: error.stack ?? null,
  });
  sendApiError(res, internalError());
}
