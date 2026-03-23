import { notFoundError, sendApiError, validationError } from "./apiErrors.js";
import { handleUnexpectedError } from "./routeUtils.js";

export function respondValidationFailure(res, errors) {
  sendApiError(res, validationError(errors));
}

export function respondList(res, { items, limit = null, offset = 0, status = 200 }) {
  const payload = {
    items,
    count: items.length,
  };
  if (limit !== null || offset > 0) {
    payload.pagination = {
      limit,
      offset,
      returned: items.length,
    };
  }
  res.status(status).json(payload);
}

export function respondItemOrNotFound(res, { entityName, item, status = 200 }) {
  if (!item) {
    sendApiError(res, notFoundError(entityName));
    return false;
  }
  res.status(status).json({ item });
  return true;
}

export function withUnexpectedError(logger, req, res, event, handler) {
  try {
    return handler();
  } catch (error) {
    handleUnexpectedError(logger, req, res, error, event);
    return undefined;
  }
}
