import { randomUUID } from "node:crypto";

const WALK_IN_STATUS = "waiting_diagnosis";
const WALK_IN_STATUS_LABEL_RU = "Ожидает диагностики";

function toId(prefix) {
  return `${prefix}-${randomUUID().split("-")[0]}`;
}

function makeDomainError(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

export class WalkInIntakeService {
  constructor(repository) {
    this.repository = repository;
  }

  createWalkInIntake({ customerId, vehicleId, complaint, bayId = null, primaryAssignee = null }) {
    const customer = this.repository.getCustomerById(customerId);
    if (!customer) {
      throw makeDomainError("customer_not_found", "Customer not found");
    }

    const vehicle = this.repository.getVehicleById(vehicleId);
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
      bay = this.repository.getBayById(bayId);
      if (!bay) {
        throw makeDomainError("bay_not_found", "Bay not found");
      }
    }

    const workOrderCode = this.repository.allocateNextWorkOrderCode();

    return this.repository.createWalkInIntakeBundle({
      intakeEventId: toId("intake"),
      workOrderId: toId("wo"),
      workOrderCode,
      customerId: customer.id,
      customerNameSnapshot: customer.fullName,
      vehicleId: vehicle.id,
      vehicleLabelSnapshot: vehicle.label,
      complaint,
      status: WALK_IN_STATUS,
      statusLabelRu: WALK_IN_STATUS_LABEL_RU,
      bayId: bay?.id ?? null,
      bayNameSnapshot: bay?.name ?? null,
      primaryAssignee,
    });
  }

  createWalkInFromIntakeForm({
    intakePayload,
    selectedCustomerId = null,
    selectedVehicleId = null,
    inlineCustomerPayload = null,
    inlineVehiclePayload = null,
  }) {
    return this.repository.runInTransaction(() => {
      let customerId = selectedCustomerId;
      let createdCustomer = null;

      if (!customerId && inlineCustomerPayload) {
        createdCustomer = this.repository.createCustomer({
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

        createdVehicle = this.repository.createVehicle({
          id: toId("veh"),
          ...inlineVehiclePayload,
          customerId,
          isActive: true,
        });
        vehicleId = createdVehicle.id;
      }

      const bundle = this.createWalkInIntake({
        ...intakePayload,
        customerId,
        vehicleId,
      });

      return {
        bundle,
        customer: createdCustomer,
        vehicle: createdVehicle,
      };
    });
  }
}
