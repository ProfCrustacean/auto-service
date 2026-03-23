import { conflictError, sendApiError } from "./apiErrors.js";
import { mapSharedCustomerVehicleDomainApiError } from "./domainApiErrorMapper.js";
import {
  respondItemOrNotFound,
  respondList,
  respondValidationFailure,
  withUnexpectedError,
} from "./routePrimitives.js";
import {
  validateBayCreate,
  validateBayUpdate,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateReferenceListQuery,
} from "./referenceValidators.js";

function isBayNameConflict(error) {
  return typeof error?.message === "string" && error.message.includes("UNIQUE constraint failed: bays.name");
}

export function registerReferenceRoutes(app, { logger, referenceDataService }) {
  app.get("/api/v1/employees", (req, res) => withUnexpectedError(logger, req, res, "employees_list_failed", () => {
    const validation = validateReferenceListQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = referenceDataService.listEmployees(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/employees/:id", (req, res) => withUnexpectedError(logger, req, res, "employees_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Employee",
      item: referenceDataService.getEmployeeById(req.params.id),
    });
  }));

  app.post("/api/v1/employees", (req, res) => withUnexpectedError(logger, req, res, "employees_create_failed", () => {
    const validation = validateEmployeeCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    res.status(201).json({
      item: referenceDataService.createEmployee(validation.value),
    });
  }));

  app.patch("/api/v1/employees/:id", (req, res) => withUnexpectedError(logger, req, res, "employees_update_failed", () => {
    const validation = validateEmployeeUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    respondItemOrNotFound(res, {
      entityName: "Employee",
      item: referenceDataService.updateEmployeeById(req.params.id, validation.value),
    });
  }));

  app.delete("/api/v1/employees/:id", (req, res) => withUnexpectedError(logger, req, res, "employees_delete_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Employee",
      item: referenceDataService.deactivateEmployeeById(req.params.id),
    });
  }));

  app.get("/api/v1/bays", (req, res) => withUnexpectedError(logger, req, res, "bays_list_failed", () => {
    const validation = validateReferenceListQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = referenceDataService.listBays(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/bays/:id", (req, res) => withUnexpectedError(logger, req, res, "bays_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Bay",
      item: referenceDataService.getBayById(req.params.id),
    });
  }));

  app.post("/api/v1/bays", (req, res) => withUnexpectedError(logger, req, res, "bays_create_failed", () => {
    const validation = validateBayCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      res.status(201).json({
        item: referenceDataService.createBay(validation.value),
      });
    } catch (error) {
      if (isBayNameConflict(error)) {
        sendApiError(
          res,
          conflictError("Bay with this name already exists", [{ field: "name", message: "must be unique" }]),
        );
        return;
      }
      throw error;
    }
  }));

  app.patch("/api/v1/bays/:id", (req, res) => withUnexpectedError(logger, req, res, "bays_update_failed", () => {
    const validation = validateBayUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      const item = referenceDataService.updateBayById(req.params.id, validation.value);
      respondItemOrNotFound(res, { entityName: "Bay", item });
    } catch (error) {
      if (isBayNameConflict(error)) {
        sendApiError(
          res,
          conflictError("Bay with this name already exists", [{ field: "name", message: "must be unique" }]),
        );
        return;
      }
      if (mapSharedCustomerVehicleDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.delete("/api/v1/bays/:id", (req, res) => withUnexpectedError(logger, req, res, "bays_delete_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Bay",
      item: referenceDataService.deactivateBayById(req.params.id),
    });
  }));
}
