import { conflictError, notFoundError, sendApiError } from "./apiErrors.js";

export function handleSharedCustomerVehicleDomainApiError(res, error) {
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
        { field: "vehicleId", message: "must belong to selected customer" },
      ]),
    );
    return true;
  }

  return false;
}
