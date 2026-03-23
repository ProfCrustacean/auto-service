import { mapSharedCustomerVehicleDomainApiError } from "./domainApiErrorMapper.js";
import {
  respondItemOrNotFound,
  respondList,
  respondValidationFailure,
  withUnexpectedError,
} from "./routePrimitives.js";
import {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateListCustomersQuery,
  validateListVehiclesQuery,
  validateVehicleCreate,
  validateVehicleUpdate,
} from "./customerVehicleValidators.js";

export function registerCustomerVehicleRoutes(app, { logger, customerVehicleService }) {
  app.get("/api/v1/customers", (req, res) => withUnexpectedError(logger, req, res, "customers_list_failed", () => {
    const validation = validateListCustomersQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = customerVehicleService.listCustomers(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/customers/:id", (req, res) => withUnexpectedError(logger, req, res, "customers_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Customer",
      item: customerVehicleService.getCustomerById(req.params.id),
    });
  }));

  app.post("/api/v1/customers", (req, res) => withUnexpectedError(logger, req, res, "customers_create_failed", () => {
    const validation = validateCustomerCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    res.status(201).json({
      item: customerVehicleService.createCustomer(validation.value),
    });
  }));

  app.patch("/api/v1/customers/:id", (req, res) => withUnexpectedError(logger, req, res, "customers_update_failed", () => {
    const validation = validateCustomerUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    respondItemOrNotFound(res, {
      entityName: "Customer",
      item: customerVehicleService.updateCustomerById(req.params.id, validation.value),
    });
  }));

  app.delete("/api/v1/customers/:id", (req, res) => withUnexpectedError(logger, req, res, "customers_delete_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Customer",
      item: customerVehicleService.deactivateCustomerById(req.params.id),
    });
  }));

  app.get("/api/v1/vehicles", (req, res) => withUnexpectedError(logger, req, res, "vehicles_list_failed", () => {
    const validation = validateListVehiclesQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = customerVehicleService.listVehicles(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/vehicles/:id", (req, res) => withUnexpectedError(logger, req, res, "vehicles_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Vehicle",
      item: customerVehicleService.getVehicleById(req.params.id),
    });
  }));

  app.get("/api/v1/vehicles/:id/ownership-history", (req, res) => withUnexpectedError(logger, req, res, "vehicles_ownership_history_failed", () => {
    const vehicle = customerVehicleService.getVehicleById(req.params.id);
    if (!vehicle) {
      respondItemOrNotFound(res, { entityName: "Vehicle", item: vehicle });
      return;
    }

    const items = customerVehicleService.listVehicleOwnershipHistory(req.params.id);
    res.status(200).json({ items, count: items.length });
  }));

  app.post("/api/v1/vehicles", (req, res) => withUnexpectedError(logger, req, res, "vehicles_create_failed", () => {
    const validation = validateVehicleCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      res.status(201).json({
        item: customerVehicleService.createVehicle(validation.value),
      });
    } catch (error) {
      if (mapSharedCustomerVehicleDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.patch("/api/v1/vehicles/:id", (req, res) => withUnexpectedError(logger, req, res, "vehicles_update_failed", () => {
    const validation = validateVehicleUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      const item = customerVehicleService.updateVehicleById(req.params.id, validation.value);
      respondItemOrNotFound(res, { entityName: "Vehicle", item });
    } catch (error) {
      if (mapSharedCustomerVehicleDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.delete("/api/v1/vehicles/:id", (req, res) => withUnexpectedError(logger, req, res, "vehicles_delete_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Vehicle",
      item: customerVehicleService.deactivateVehicleById(req.params.id),
    });
  }));
}
