import { conflictError, notFoundError, sendApiError, validationError } from "./apiErrors.js";

export function mapSharedCustomerVehicleDomainApiError(
  res,
  error,
  { vehicleCustomerMessage = "must belong to selected customer" } = {},
) {
  if (error.code === "customer_not_found") {
    sendApiError(res, notFoundError("Customer"));
    return true;
  }

  if (error.code === "vehicle_not_found") {
    sendApiError(res, notFoundError("Vehicle"));
    return true;
  }

  if (error.code === "bay_not_found") {
    sendApiError(res, notFoundError("Bay"));
    return true;
  }

  if (error.code === "vehicle_customer_mismatch") {
    sendApiError(
      res,
      conflictError("Vehicle does not belong to customer", [
        { field: "vehicleId", message: vehicleCustomerMessage },
      ]),
    );
    return true;
  }

  return false;
}

export function mapAppointmentDomainApiError(
  res,
  error,
  { vehicleCustomerMessage = "must belong to selected customer" } = {},
) {
  if (mapSharedCustomerVehicleDomainApiError(res, error, { vehicleCustomerMessage })) {
    return true;
  }

  if (error.code === "appointment_capacity_conflict") {
    sendApiError(res, conflictError(error.message, error.details));
    return true;
  }

  if (error.code === "appointment_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid appointment status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }

  if (error.code === "appointment_status_invalid") {
    sendApiError(
      res,
      validationError([{ field: "status", message: "status must be one of: booked, confirmed, arrived, cancelled, no-show" }]),
    );
    return true;
  }

  return false;
}

export function mapWorkOrderDomainApiError(res, error) {
  if (error.code === "appointment_not_found") {
    sendApiError(res, notFoundError("Appointment"));
    return true;
  }

  if (error.code === "bay_not_found") {
    sendApiError(res, notFoundError("Bay"));
    return true;
  }

  if (error.code === "work_order_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: draft, waiting_diagnosis, waiting_approval, waiting_parts, scheduled, in_progress, paused, ready_pickup, completed, cancelled",
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid work-order status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_balance_due_conflict") {
    sendApiError(
      res,
      conflictError("Cannot complete work order with outstanding balance", [
        { field: "balanceDueRub", message: "balance must be zero before completion" },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_parts_blocking_conflict") {
    sendApiError(
      res,
      conflictError("Work order has unresolved blocking parts requests", [
        { field: "status", message: "resolve required parts requests before continuing lifecycle progress" },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_payment_type_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "paymentType",
          message: "paymentType must be one of: deposit, partial, final",
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_payment_method_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "paymentMethod",
          message: "paymentMethod must be one of: cash, card, bank_transfer, other",
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_payment_amount_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "amountRub",
          message: "amountRub must be > 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_payment_balance_conflict") {
    sendApiError(
      res,
      conflictError("Payment amount conflicts with outstanding balance", [
        {
          field: "amountRub",
          message: error.message,
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_payment_final_amount_conflict") {
    sendApiError(
      res,
      conflictError("Final payment must fully close outstanding balance", [
        {
          field: "amountRub",
          message: error.message,
        },
      ]),
    );
    return true;
  }

  if (error.code === "work_order_terminal") {
    sendApiError(
      res,
      conflictError("Cannot mutate parts for terminal work order", [
        { field: "workOrder", message: "work order is completed or cancelled" },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_not_found") {
    sendApiError(res, notFoundError("Parts request"));
    return true;
  }

  if (error.code === "parts_request_replacement_target_not_found") {
    sendApiError(res, notFoundError("Replacement parts request"));
    return true;
  }

  if (error.code === "parts_request_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: requested, ordered, received, substituted, cancelled, returned",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_terminal_locked") {
    sendApiError(
      res,
      conflictError("Terminal parts request can only be adjusted through correction flow", [
        {
          field: "status",
          message: "terminal request is locked for supplier/quantity/cost changes",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_requested_qty_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "requestedQty",
          message: "requestedQty must be > 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_requested_unit_cost_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "requestedUnitCostRub",
          message: "requestedUnitCostRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_sale_price_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "salePriceRub",
          message: "salePriceRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_status_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "status",
          message: "status must be one of: ordered, received, cancelled, returned",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_ordered_qty_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "orderedQty",
          message: "orderedQty must be > 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_purchase_action_unit_cost_invalid") {
    sendApiError(
      res,
      validationError([
        {
          field: "unitCostRub",
          message: "unitCostRub must be >= 0",
        },
      ]),
    );
    return true;
  }

  if (error.code === "parts_request_status_transition_invalid") {
    sendApiError(
      res,
      conflictError("Invalid parts-request status transition", [
        {
          field: "status",
          message: `${error.details?.fromStatus ?? "unknown"} -> ${error.details?.toStatus ?? "unknown"} is not allowed`,
        },
      ]),
    );
    return true;
  }

  if (error.code === "appointment_convert_blocked_status") {
    sendApiError(
      res,
      conflictError("Appointment cannot be converted from current status", [
        { field: "status", message: `appointment status ${error.details?.status ?? "unknown"} cannot be converted` },
      ]),
    );
    return true;
  }

  return false;
}
