import { sendApiError, validationError } from "./apiErrors.js";
import { handleSharedCustomerVehicleDomainApiError } from "./customerVehicleDomainApiErrors.js";
import { validateWalkInCreate } from "./walkInIntakeValidators.js";
import { handleUnexpectedError } from "./routeUtils.js";

function handleDomainError(res, error) {
  return handleSharedCustomerVehicleDomainApiError(res, error);
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

      handleUnexpectedError(logger, req, res, error, "walkin_intake_create_failed");
    }
  });
}
