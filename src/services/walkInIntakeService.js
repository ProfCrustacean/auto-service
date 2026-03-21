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

function toNextWorkOrderCode(workOrders) {
  const maxNumericCode = workOrders.reduce((maxValue, item) => {
    const match = /^WO-(\d+)$/.exec(item.code ?? "");
    if (!match) {
      return maxValue;
    }

    const parsed = Number.parseInt(match[1], 10);
    if (Number.isNaN(parsed)) {
      return maxValue;
    }

    return Math.max(maxValue, parsed);
  }, 0);

  return `WO-${String(maxNumericCode + 1).padStart(4, "0")}`;
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

    const workOrderCode = toNextWorkOrderCode(this.repository.listWorkOrders());

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
}
