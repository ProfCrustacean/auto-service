import { randomUUID } from "node:crypto";

export function toId(prefix) {
  return `${prefix}-${randomUUID().split("-")[0]}`;
}

export function makeDomainError(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

export function resolveCustomerVehicleAndBay(repository, { customerId, vehicleId, bayId = null }) {
  const customer = repository.getCustomerById(customerId);
  if (!customer) {
    throw makeDomainError("customer_not_found", "Customer not found");
  }

  const vehicle = repository.getVehicleById(vehicleId);
  if (!vehicle) {
    throw makeDomainError("vehicle_not_found", "Vehicle not found");
  }

  if (vehicle.customerId !== customer.id) {
    throw makeDomainError("vehicle_customer_mismatch", "Vehicle does not belong to customer", {
      customerId: customer.id,
      vehicleId: vehicle.id,
    });
  }

  let bay = null;
  if (bayId) {
    bay = repository.getBayById(bayId);
    if (!bay) {
      throw makeDomainError("bay_not_found", "Bay not found");
    }
  }

  return {
    customer,
    vehicle,
    bay,
  };
}

export function resolveInlineCustomerVehicle({
  repository,
  selectedCustomerId = null,
  selectedVehicleId = null,
  inlineCustomerPayload = null,
  inlineVehiclePayload = null,
}) {
  let customerId = selectedCustomerId;
  let createdCustomer = null;

  if (!customerId && inlineCustomerPayload) {
    createdCustomer = repository.createCustomer({
      id: toId("cust"),
      ...inlineCustomerPayload,
      isActive: true,
    });
    customerId = createdCustomer.id;
  }

  let vehicleId = selectedVehicleId;
  let createdVehicle = null;

  if (!vehicleId && inlineVehiclePayload) {
    if (!customerId) {
      throw makeDomainError("customer_not_found", "Customer not found");
    }

    createdVehicle = repository.createVehicle({
      id: toId("veh"),
      ...inlineVehiclePayload,
      customerId,
      isActive: true,
    });
    vehicleId = createdVehicle.id;
  }

  return {
    customerId,
    vehicleId,
    createdCustomer,
    createdVehicle,
  };
}
