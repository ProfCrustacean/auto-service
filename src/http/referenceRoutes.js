import {
  conflictError,
  internalError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateBayCreate,
  validateBayUpdate,
  validateEmployeeCreate,
  validateEmployeeUpdate,
  validateIncludeInactiveQuery,
} from "./referenceValidators.js";

function isBayNameConflict(error) {
  return typeof error?.message === "string" && error.message.includes("UNIQUE constraint failed: bays.name");
}

function handleUnexpectedError(logger, res, error, event) {
  logger.error(event, { message: error.message });
  sendApiError(res, internalError());
}

export function registerReferenceRoutes(app, { logger, referenceDataService }) {
  app.get("/api/v1/employees", (req, res) => {
    const includeInactiveValidation = validateIncludeInactiveQuery(req.query);
    if (!includeInactiveValidation.ok) {
      sendApiError(res, validationError(includeInactiveValidation.errors));
      return;
    }

    try {
      const items = referenceDataService.listEmployees({ includeInactive: includeInactiveValidation.value });
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "employees_list_failed");
    }
  });

  app.get("/api/v1/employees/:id", (req, res) => {
    try {
      const item = referenceDataService.getEmployeeById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Employee"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "employees_get_failed");
    }
  });

  app.post("/api/v1/employees", (req, res) => {
    const validation = validateEmployeeCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = referenceDataService.createEmployee(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "employees_create_failed");
    }
  });

  app.patch("/api/v1/employees/:id", (req, res) => {
    const validation = validateEmployeeUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = referenceDataService.updateEmployeeById(req.params.id, validation.value);
      if (!item) {
        sendApiError(res, notFoundError("Employee"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "employees_update_failed");
    }
  });

  app.delete("/api/v1/employees/:id", (req, res) => {
    try {
      const item = referenceDataService.deactivateEmployeeById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Employee"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "employees_delete_failed");
    }
  });

  app.get("/api/v1/bays", (req, res) => {
    const includeInactiveValidation = validateIncludeInactiveQuery(req.query);
    if (!includeInactiveValidation.ok) {
      sendApiError(res, validationError(includeInactiveValidation.errors));
      return;
    }

    try {
      const items = referenceDataService.listBays({ includeInactive: includeInactiveValidation.value });
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "bays_list_failed");
    }
  });

  app.get("/api/v1/bays/:id", (req, res) => {
    try {
      const item = referenceDataService.getBayById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Bay"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "bays_get_failed");
    }
  });

  app.post("/api/v1/bays", (req, res) => {
    const validation = validateBayCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = referenceDataService.createBay(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      if (isBayNameConflict(error)) {
        sendApiError(
          res,
          conflictError("Bay with this name already exists", [{ field: "name", message: "must be unique" }]),
        );
        return;
      }

      handleUnexpectedError(logger, res, error, "bays_create_failed");
    }
  });

  app.patch("/api/v1/bays/:id", (req, res) => {
    const validation = validateBayUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = referenceDataService.updateBayById(req.params.id, validation.value);
      if (!item) {
        sendApiError(res, notFoundError("Bay"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      if (isBayNameConflict(error)) {
        sendApiError(
          res,
          conflictError("Bay with this name already exists", [{ field: "name", message: "must be unique" }]),
        );
        return;
      }

      handleUnexpectedError(logger, res, error, "bays_update_failed");
    }
  });

  app.delete("/api/v1/bays/:id", (req, res) => {
    try {
      const item = referenceDataService.deactivateBayById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Bay"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "bays_delete_failed");
    }
  });
}
