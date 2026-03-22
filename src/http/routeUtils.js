import { internalError, sendApiError } from "./apiErrors.js";

export function handleUnexpectedError(logger, res, error, event) {
  logger.error(event, { message: error.message });
  sendApiError(res, internalError());
}
