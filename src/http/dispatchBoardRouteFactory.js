import { notFoundError, sendApiError } from "./apiErrors.js";
import {
  buildBoardPatchActor,
  buildBoardPatchPayload,
  buildBoardPatchResponseMeta,
  deriveQueueDurationMinutes,
  executeDispatchCommit,
  executeDispatchPreview,
  executeDispatchQueueAppointmentSchedule,
  executeDispatchQueueWalkInSchedule,
  validateDispatchEventUpdate,
} from "./dispatchBoardMutationCore.js";
import { respondValidationFailure } from "./routePrimitives.js";

function parseDispatchMutation(req, res, { requireStart = true, requireResource = true } = {}) {
  const boardPayload = buildBoardPatchPayload(req.body ?? {}, req.query ?? {});
  if (!boardPayload.ok) {
    respondValidationFailure(res, boardPayload.errors);
    return null;
  }

  const validation = validateDispatchEventUpdate(boardPayload, { requireStart, requireResource });
  if (!validation.ok) {
    respondValidationFailure(res, validation.errors);
    return null;
  }

  const { changedBy, reason, ...updates } = validation.value;
  return {
    boardPayload,
    updates,
    changedBy,
    reason,
  };
}

function withMappedDomainError(res, errorMapper, error) {
  if (errorMapper(res, error)) {
    return true;
  }
  throw error;
}

function respondAppointmentNotFound(res, payload) {
  if (payload) {
    return false;
  }
  sendApiError(res, notFoundError("Appointment"));
  return true;
}

export function createDispatchBoardRouteFactory({
  appointmentService,
  workOrderService,
  mapDispatchDomainError,
}) {
  return {
    preview(req, res) {
      const parsed = parseDispatchMutation(req, res, { requireStart: true, requireResource: true });
      if (!parsed) {
        return;
      }

      const { boardPayload, updates, changedBy, reason } = parsed;
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
        if (respondAppointmentNotFound(res, payload)) {
          return;
        }
        res.status(200).json(payload);
      } catch (error) {
        withMappedDomainError(res, mapDispatchDomainError, error);
      }
    },

    commit(req, res) {
      const parsed = parseDispatchMutation(req, res, { requireStart: true, requireResource: true });
      if (!parsed) {
        return;
      }

      const { updates, changedBy, reason } = parsed;
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
        if (respondAppointmentNotFound(res, payload)) {
          return;
        }
        res.status(200).json(payload);
      } catch (error) {
        withMappedDomainError(res, mapDispatchDomainError, error);
      }
    },

    scheduleQueueAppointment(req, res) {
      const parsed = parseDispatchMutation(req, res, { requireStart: true, requireResource: true });
      if (!parsed) {
        return;
      }

      const { boardPayload, updates, changedBy, reason } = parsed;
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
        if (respondAppointmentNotFound(res, payload)) {
          return;
        }
        res.status(200).json(payload);
      } catch (error) {
        withMappedDomainError(res, mapDispatchDomainError, error);
      }
    },

    scheduleQueueWalkIn(req, res) {
      const parsed = parseDispatchMutation(req, res, { requireStart: true, requireResource: true });
      if (!parsed) {
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
          dispatchUpdates: {
            ...parsed.updates,
            changedBy: parsed.changedBy,
            reason: parsed.reason,
          },
          dayLocal: parsed.boardPayload.dayLocal,
          laneMode: parsed.boardPayload.laneMode,
        });
        if (result.validationErrors) {
          respondValidationFailure(res, result.validationErrors);
          return;
        }
        res.status(201).json(result);
      } catch (error) {
        withMappedDomainError(res, mapDispatchDomainError, error);
      }
    },
  };
}
