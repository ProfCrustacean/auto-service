import { notFoundError, sendApiError } from "./apiErrors.js";
import { mapAppointmentDomainApiError } from "./domainApiErrorMapper.js";
import {
  buildBoardPatchActor,
  buildBoardPatchPayload,
  buildBoardPatchResponseMeta,
  deriveQueueDurationMinutes,
  executeDispatchCommit,
  executeDispatchPreview,
  executeDispatchQueueAppointmentSchedule,
  executeDispatchQueueWalkInSchedule,
  normalizeDispatchDay,
  normalizeDispatchMode,
  validateDispatchEventUpdate,
} from "./dispatchBoardMutationCore.js";
import { respondValidationFailure, withUnexpectedError } from "./routePrimitives.js";
import { renderDispatchBoardPage } from "../ui/dispatchBoardPage.js";

function mapDispatchDomainError(res, error) {
  return mapAppointmentDomainApiError(res, error, {
    vehicleCustomerMessage: "vehicle must belong to selected customer",
  });
}

export function registerDispatchBoardPageRoutes(app, {
  logger,
  dashboardService,
  appointmentService,
  workOrderService,
}) {
  app.get("/api/v1/dispatch/board", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_api_failed", () => {
    const payload = dashboardService.getDispatchBoard({
      day: normalizeDispatchDay(req.query?.day),
      laneMode: normalizeDispatchMode(req.query?.laneMode),
    });
    res.status(200).json(payload);
  }));

  app.get("/dispatch/board", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_page_failed", () => {
    const model = dashboardService.getDispatchBoard({
      day: normalizeDispatchDay(req.query?.day),
      laneMode: normalizeDispatchMode(req.query?.laneMode),
    });
    res.status(200).send(renderDispatchBoardPage(model));
  }));

  app.post("/api/v1/dispatch/board/events/:id/preview", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_preview_failed", () => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      respondValidationFailure(res, boardPayload.errors);
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    try {
      const payload = executeDispatchPreview({
        appointmentService,
        appointmentId: req.params.id,
        updates,
        changedBy,
        reason,
        actor: buildBoardPatchActor(req),
        dayLocal: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      });
      if (!payload) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      res.status(200).json(payload);
    } catch (error) {
      if (mapDispatchDomainError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/dispatch/board/events/:id/commit", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_commit_failed", () => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      respondValidationFailure(res, boardPayload.errors);
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    try {
      const payload = executeDispatchCommit({
        appointmentService,
        appointmentId: req.params.id,
        updates,
        changedBy,
        reason,
        actor: buildBoardPatchActor(req),
        responseMeta: buildBoardPatchResponseMeta(req),
      });
      if (!payload) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      res.status(200).json(payload);
    } catch (error) {
      if (mapDispatchDomainError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/dispatch/board/queue/appointments/:id/schedule", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_queue_appointment_schedule_failed", () => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      respondValidationFailure(res, boardPayload.errors);
      return;
    }

    const validation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!validation.ok) {
      respondValidationFailure(res, validation.errors);
      return;
    }

    const { changedBy, reason, ...updates } = validation.value;
    if (updates.expectedDurationMin === undefined) {
      updates.expectedDurationMin = deriveQueueDurationMinutes(updates, 60);
    }

    try {
      const payload = executeDispatchQueueAppointmentSchedule({
        appointmentService,
        appointmentId: req.params.id,
        updates,
        changedBy,
        reason,
        actor: buildBoardPatchActor(req),
        dayLocal: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      });
      if (!payload) {
        sendApiError(res, notFoundError("Appointment"));
        return;
      }
      res.status(200).json(payload);
    } catch (error) {
      if (mapDispatchDomainError(res, error)) {
        return;
      }
      throw error;
    }
  }));

  app.post("/api/v1/dispatch/board/queue/walk-ins/:id/schedule", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_walkin_schedule_failed", () => {
    const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
    if (!boardPayload.ok) {
      respondValidationFailure(res, boardPayload.errors);
      return;
    }

    const dispatchValidation = validateDispatchEventUpdate(boardPayload, { requireStart: true, requireResource: true });
    if (!dispatchValidation.ok) {
      respondValidationFailure(res, dispatchValidation.errors);
      return;
    }

    const workOrder = workOrderService.getWorkOrderById(req.params.id);
    if (!workOrder) {
      sendApiError(res, notFoundError("Work order"));
      return;
    }

    try {
      const result = executeDispatchQueueWalkInSchedule({
        appointmentService,
        workOrderService,
        workOrder,
        dispatchUpdates: dispatchValidation.value,
        dayLocal: boardPayload.dayLocal,
        laneMode: boardPayload.laneMode,
      });
      if (result.validationErrors) {
        respondValidationFailure(res, result.validationErrors);
        return;
      }
      res.status(201).json(result);
    } catch (error) {
      if (mapDispatchDomainError(res, error)) {
        return;
      }
      throw error;
    }
  }));
}
