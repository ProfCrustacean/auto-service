import { mapSharedCustomerVehicleDomainApiError } from "./domainApiErrorMapper.js";
import { respondValidationFailure, withUnexpectedError } from "./routePrimitives.js";
import { validateWalkInCreate } from "./walkInIntakeValidators.js";

export function registerWalkInIntakeRoutes(app, { logger, walkInIntakeService }) {
  app.post("/api/v1/intake/walk-ins", (req, res) => withUnexpectedError(logger, req, res, "walkin_intake_create_failed", () => {
    const validation = validateWalkInCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      const item = walkInIntakeService.createWalkInIntake(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      if (mapSharedCustomerVehicleDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));
}
