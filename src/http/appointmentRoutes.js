import { notFoundError, sendApiError, validationError } from "./apiErrors.js";
import { mapAppointmentDomainApiError } from "./domainApiErrorMapper.js";
import {
  respondItemOrNotFound,
  respondList,
  respondValidationFailure,
  withUnexpectedError,
} from "./routePrimitives.js";
import {
  validateAppointmentCreate,
  validateAppointmentUpdate,
  validateListAppointmentsQuery,
} from "./appointmentValidators.js";
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

function extractItemWarnings(item) {
  if (!item || typeof item !== "object") {
    return { item, warnings: [] };
  }
  const warnings = Array.isArray(item.capacityWarnings) ? item.capacityWarnings : [];
  if (warnings.length === 0) {
    return { item, warnings: [] };
  }
  const { capacityWarnings, ...rest } = item;
  return {
    item: rest,
    warnings,
  };
}

export function registerAppointmentRoutes(app, { logger, appointmentService }) {
  app.get("/api/v1/appointments", (req, res) => withUnexpectedError(logger, req, res, "appointments_list_failed", () => {
    const validation = validateListAppointmentsQuery(req.query);
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const items = appointmentService.listAppointments(validation.value);
    respondList(res, {
      items,
      limit: validation.value.limit,
      offset: validation.value.offset,
    });
  }));

  app.get("/api/v1/appointments/:id", (req, res) => withUnexpectedError(logger, req, res, "appointments_get_failed", () => {
    respondItemOrNotFound(res, {
      entityName: "Appointment",
      item: appointmentService.getAppointmentById(req.params.id),
    });
  }));

  app.get("/api/v1/appointments/:id/schedule-history", (req, res) => withUnexpectedError(logger, req, res, "appointments_schedule_history_list_failed", () => {
    const limitRaw = req.query?.limit;
    let limit = 25;

    if (limitRaw !== undefined) {
      if (typeof limitRaw !== "string" || !/^\d+$/u.test(limitRaw.trim())) {
        respondValidationFailure(res, [{ field: "limit", message: "limit must be an integer" }]);
        return;
      }
      limit = Number.parseInt(limitRaw.trim(), 10);
      if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        respondValidationFailure(res, [{ field: "limit", message: "limit must be between 1 and 200" }]);
        return;
      }
    }

    const item = appointmentService.getAppointmentById(req.params.id);
    if (!item) {
      sendApiError(res, notFoundError("Appointment"));
      return;
    }

    const items = appointmentService.listAppointmentScheduleHistory(req.params.id, { limit });
    res.status(200).json({ items, count: items.length, limit });
  }));

  app.post("/api/v1/appointments", (req, res) => withUnexpectedError(logger, req, res, "appointments_create_failed", () => {
    const validation = validateAppointmentCreate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    try {
      const created = appointmentService.createAppointment(validation.value);
      const { item, warnings } = extractItemWarnings(created);
      const payload = { item };
      if (warnings.length > 0) {
        payload.warnings = warnings;
      }
      res.status(201).json(payload);
    } catch (error) {
      if (mapAppointmentDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.patch("/api/v1/appointments/:id", (req, res) => withUnexpectedError(logger, req, res, "appointments_update_failed", () => {
    const preview = parsePreviewFlag(req.query?.preview);
    if (preview === null) {
      respondValidationFailure(res, [{ field: "preview", message: "preview must be boolean-like (true/false/1/0)" }]);
      return;
    }

    const validation = validateAppointmentUpdate(req.body ?? {});
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    const actor = changedBy ?? req.auth?.role ?? "api";

    try {
      if (preview) {
        const previewItem = appointmentService.previewAppointmentUpdate(req.params.id, updates);
        if (!previewItem) {
          sendApiError(res, notFoundError("Appointment"));
          return;
        }
        const { item, warnings } = extractItemWarnings(previewItem);
        const payload = {
          preview: true,
          canCommit: true,
          item,
        };
        if (warnings.length > 0) {
          payload.warnings = warnings;
        }

        res.status(200).json(payload);
        return;
      }

      const updated = appointmentService.updateAppointmentById(req.params.id, updates, {
        changedBy: actor,
        reason: reason ?? null,
        source: "api_patch_appointment",
      });
      if (!updated) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      const { item, warnings } = extractItemWarnings(updated);
      const payload = { item };
      if (warnings.length > 0) {
        payload.warnings = warnings;
      }
      res.status(200).json(payload);
    } catch (error) {
      if (mapAppointmentDomainApiError(res, error)) {
        return;
      }
      throw error;
    }
  }));
}
