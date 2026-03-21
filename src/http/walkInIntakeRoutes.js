import { conflictError, internalError, notFoundError, sendApiError, validationError } from "./apiErrors.js";
import { validateWalkInCreate } from "./walkInIntakeValidators.js";

function handleUnexpectedError(logger, res, error, event) {
  logger.error(event, { message: error.message });
  sendApiError(res, internalError());
}

function handleDomainError(res, error) {
  if (error.code === "customer_not_found") {
    sendApiError(res, notFoundError("Customer"));
    return true;
  }

  if (error.code === "vehicle_not_found") {
    sendApiError(res, notFoundError("Vehicle"));
    return true;
  }

  if (error.code === "bay_not_found") {
    sendApiError(res, notFoundError("Bay"));
    return true;
  }

  if (error.code === "vehicle_customer_mismatch") {
    sendApiError(
      res,
      conflictError("Vehicle does not belong to customer", [
        { field: "vehicleId", message: "must belong to selected customer" },
      ]),
    );
    return true;
  }

  return false;
}

export function registerWalkInIntakeRoutes(app, { logger, walkInIntakeService }) {
  app.post("/api/v1/intake/walk-ins", (req, res) => {
    const validation = validateWalkInCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = walkInIntakeService.createWalkInIntake(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }

      handleUnexpectedError(logger, res, error, "walkin_intake_create_failed");
    }
  });
}
