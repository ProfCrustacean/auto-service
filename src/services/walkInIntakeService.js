import { getWorkOrderStatusLabel } from "../domain/workOrderLifecycle.js";
import {
  resolveCustomerVehicleAndBay,
  resolveInlineCustomerVehicle,
  toId,
} from "./customerVehicleFlow.js";

const WALK_IN_STATUS = "waiting_diagnosis";
const WALK_IN_STATUS_LABEL_RU = getWorkOrderStatusLabel(WALK_IN_STATUS);

export class WalkInIntakeService {
  constructor(repository) {
    this.repository = repository;
  }

  createWalkInIntake({ customerId, vehicleId, complaint, bayId = null, primaryAssignee = null }) {
    const { customer, vehicle, bay } = resolveCustomerVehicleAndBay(this.repository, {
      customerId,
      vehicleId,
      bayId,
    });

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
      const {
        customerId,
        vehicleId,
        createdCustomer,
        createdVehicle,
      } = resolveInlineCustomerVehicle({
        repository: this.repository,
        selectedCustomerId,
        selectedVehicleId,
        inlineCustomerPayload,
        inlineVehiclePayload,
      });

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
