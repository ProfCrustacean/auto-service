import {
  conflictError,
  notFoundError,
  sendApiError,
  validationError,
} from "./apiErrors.js";
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateListAppointmentsQuery,
} from "./appointmentValidators.js";
import { handleSharedCustomerVehicleDomainApiError } from "./customerVehicleDomainApiErrors.js";
import { handleUnexpectedError } from "./routeUtils.js";
import { normalizeBooleanLike } from "./validatorUtils.js";

function parsePreviewFlag(value) {
  if (value === undefined) {
    return false;
  }
  const parsed = normalizeBooleanLike(value);
  if (parsed === null) {
    return null;
  }
  return parsed;
}

function handleDomainError(res, error) {
  if (handleSharedCustomerVehicleDomainApiError(res, error)) {
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
      const payload = { items, count: items.length };
      if (validation.value.limit !== null || validation.value.offset > 0) {
        payload.pagination = {
          limit: validation.value.limit,
          offset: validation.value.offset,
          returned: items.length,
        };
      }
      res.status(200).json(payload);
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "appointments_list_failed");
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
      handleUnexpectedError(logger, req, res, error, "appointments_get_failed");
    }
  });

  app.get("/api/v1/appointments/:id/schedule-history", (req, res) => {
    const limitRaw = req.query?.limit;
    let limit = 25;

    if (limitRaw !== undefined) {
      if (typeof limitRaw !== "string" || !/^\d+$/u.test(limitRaw.trim())) {
        sendApiError(res, validationError([{ field: "limit", message: "limit must be an integer" }]));
        return;
      }
      limit = Number.parseInt(limitRaw.trim(), 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        sendApiError(res, validationError([{ field: "limit", message: "limit must be between 1 and 200" }]));
        return;
      }
    }

    try {
      const item = appointmentService.getAppointmentById(req.params.id);
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      const items = appointmentService.listAppointmentScheduleHistory(req.params.id, { limit });
      res.status(200).json({ items, count: items.length, limit });
    } catch (error) {
      handleUnexpectedError(logger, req, res, error, "appointments_schedule_history_list_failed");
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

      handleUnexpectedError(logger, req, res, error, "appointments_create_failed");
    }
  });

  app.patch("/api/v1/appointments/:id", (req, res) => {
    const preview = parsePreviewFlag(req.query?.preview);
    if (preview === null) {
      sendApiError(res, validationError([{ field: "preview", message: "preview must be boolean-like (true/false/1/0)" }]));
      return;
    }

    const validation = validateAppointmentUpdate(req.body ?? {});
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    const actor = changedBy ?? req.auth?.role ?? "api";

    try {
      if (preview) {
        const item = appointmentService.previewAppointmentUpdate(req.params.id, updates);
        if (!item) {
          sendApiError(res, notFoundError("Appointment"));
          return;
        }

        res.status(200).json({
          preview: true,
          canCommit: true,
          item,
        });
        return;
      }

      const item = appointmentService.updateAppointmentById(req.params.id, updates, {
        changedBy: actor,
        reason: reason ?? null,
        source: "api_patch_appointment",
      });
      if (!item) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }

      res.status(200).json({ item });
    } catch (error) {
      if (handleDomainError(res, error)) {
        return;
      }

      handleUnexpectedError(logger, req, res, error, "appointments_update_failed");
    }
  });
}
