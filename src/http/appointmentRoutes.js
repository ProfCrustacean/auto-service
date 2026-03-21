import {
  conflictError,
  internalError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateListAppointmentsQuery,
} from "./appointmentValidators.js";

function handleUnexpectedError(logger, res, error, event) {
  logger.error(event, { message: error.message });
  sendApiError(res, internalError());
}

function handleDomainError(res, error) {
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

export function registerAppointmentRoutes(app, { logger, appointmentService }) {
  app.get("/api/v1/appointments", (req, res) => {
    const validation = validateListAppointmentsQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const items = appointmentService.listAppointments(validation.value);
      res.status(200).json({ items, count: items.length });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "appointments_list_failed");
    }
  });

  app.get("/api/v1/appointments/:id", (req, res) => {
    try {
      const item = appointmentService.getAppointmentById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      handleUnexpectedError(logger, res, error, "appointments_get_failed");
    }
  });

  app.post("/api/v1/appointments", (req, res) => {
    const validation = validateAppointmentCreate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = appointmentService.createAppointment(validation.value);
      res.status(201).json({ item });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }

      handleUnexpectedError(logger, res, error, "appointments_create_failed");
    }
  });

  app.patch("/api/v1/appointments/:id", (req, res) => {
    const validation = validateAppointmentUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    try {
      const item = appointmentService.updateAppointmentById(req.params.id, validation.value);
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }

      handleUnexpectedError(logger, res, error, "appointments_update_failed");
    }
  });
}
