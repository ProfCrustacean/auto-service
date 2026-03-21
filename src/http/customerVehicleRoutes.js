import { internalError, notFoundError, sendApiError, validationError } from "./apiErrors.js";
import {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateListCustomersQuery,
  validateListVehiclesQuery,
  validateVehicleCreate,
  validateVehicleUpdate,
} from "./customerVehicleValidators.js";

function handleUnexpectedError(logger, res, error, event) {
  logger.error(event, { message: error.message });
  sendApiError(res, internalError());
}

function isMissingVehicleCustomer(error) {
  return error?.code === "customer_not_found";
}

export function registerCustomerVehicleRoutes(app, { logger, customerVehicleService }) {
  app.get("/api/v1/customers", (req, res) => {
    const validation = validateListCustomersQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const items = customerVehicleService.listCustomers(validation.value);
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "customers_list_failed");
    }
  });

  app.get("/api/v1/customers/:id", (req, res) => {
    try {
      const item = customerVehicleService.getCustomerById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Customer"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "customers_get_failed");
    }
  });

  app.post("/api/v1/customers", (req, res) => {
    const validation = validateCustomerCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = customerVehicleService.createCustomer(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "customers_create_failed");
    }
  });

  app.patch("/api/v1/customers/:id", (req, res) => {
    const validation = validateCustomerUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = customerVehicleService.updateCustomerById(req.params.id, validation.value);
      if (!item) {
        sendApiError(res, notFoundError("Customer"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "customers_update_failed");
    }
  });

  app.delete("/api/v1/customers/:id", (req, res) => {
    try {
      const item = customerVehicleService.deactivateCustomerById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Customer"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "customers_delete_failed");
    }
  });

  app.get("/api/v1/vehicles", (req, res) => {
    const validation = validateListVehiclesQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const items = customerVehicleService.listVehicles(validation.value);
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "vehicles_list_failed");
    }
  });

  app.get("/api/v1/vehicles/:id", (req, res) => {
    try {
      const item = customerVehicleService.getVehicleById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Vehicle"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "vehicles_get_failed");
    }
  });

  app.get("/api/v1/vehicles/:id/ownership-history", (req, res) => {
    try {
      const vehicle = customerVehicleService.getVehicleById(req.params.id);
      if (!vehicle) {
        sendApiError(res, notFoundError("Vehicle"));
        return;
      }

      const items = customerVehicleService.listVehicleOwnershipHistory(req.params.id);
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "vehicles_ownership_history_failed");
    }
  });

  app.post("/api/v1/vehicles", (req, res) => {
    const validation = validateVehicleCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = customerVehicleService.createVehicle(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      if (isMissingVehicleCustomer(error)) {
        sendApiError(res, notFoundError("Customer"));
        return;
      }

      handleUnexpectedError(logger, res, error, "vehicles_create_failed");
    }
  });

  app.patch("/api/v1/vehicles/:id", (req, res) => {
    const validation = validateVehicleUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = customerVehicleService.updateVehicleById(req.params.id, validation.value);
      if (!item) {
        sendApiError(res, notFoundError("Vehicle"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      if (isMissingVehicleCustomer(error)) {
        sendApiError(res, notFoundError("Customer"));
        return;
      }

      handleUnexpectedError(logger, res, error, "vehicles_update_failed");
    }
  });

  app.delete("/api/v1/vehicles/:id", (req, res) => {
    try {
      const item = customerVehicleService.deactivateVehicleById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Vehicle"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "vehicles_delete_failed");
    }
  });
}
