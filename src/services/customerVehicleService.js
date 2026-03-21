import { randomUUID } from "node:crypto";

function toId(prefix) {
  return `${prefix}-${randomUUID().split("-")[0]}`;
}

export class CustomerVehicleService {
  constructor(repository) {
    this.repository = repository;
  }

  listCustomers({ includeInactive = false, query = "" } = {}) {
    return this.repository.listCustomerRecords({ includeInactive, query });
  }

  getCustomerById(id) {
    return this.repository.getCustomerById(id);
  }

  createCustomer(payload) {
    return this.repository.createCustomer({
      id: toId("cust"),
      ...payload,
    });
  }

  updateCustomerById(id, updates) {
    return this.repository.updateCustomerById(id, updates);
  }

  deactivateCustomerById(id) {
    return this.repository.deactivateCustomerById(id);
  }

  listVehicles({ includeInactive = false, query = "", customerId = null } = {}) {
    return this.repository.listVehicleRecords({ includeInactive, query, customerId });
  }

  getVehicleById(id) {
    return this.repository.getVehicleById(id);
  }

  createVehicle(payload) {
    const owner = this.repository.getCustomerById(payload.customerId);
    if (!owner) {
      const error = new Error("Customer not found for vehicle owner linkage");
      error.code = "customer_not_found";
      throw error;
    }

    return this.repository.createVehicle({
      id: toId("veh"),
      ...payload,
    });
  }

  updateVehicleById(id, updates) {
    if (updates.customerId !== undefined) {
      const owner = this.repository.getCustomerById(updates.customerId);
      if (!owner) {
        const error = new Error("Customer not found for vehicle owner linkage");
        error.code = "customer_not_found";
        throw error;
      }
    }

    return this.repository.updateVehicleById(id, updates);
  }

  deactivateVehicleById(id) {
    return this.repository.deactivateVehicleById(id);
  }

  listVehicleOwnershipHistory(vehicleId) {
    return this.repository.listVehicleOwnershipHistory(vehicleId);
  }
}
