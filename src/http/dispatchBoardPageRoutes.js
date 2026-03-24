import { mapAppointmentDomainApiError } from "./domainApiErrorMapper.js";
import {
  normalizeDispatchDay,
  normalizeDispatchMode,
} from "./dispatchBoardMutationCore.js";
import { createDispatchBoardRouteFactory } from "./dispatchBoardRouteFactory.js";
import { withUnexpectedError } from "./routePrimitives.js";
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
  const routeFactory = createDispatchBoardRouteFactory({
    appointmentService,
    workOrderService,
    mapDispatchDomainError: mapDispatchDomainError,
  });

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
    routeFactory.preview(req, res);
  }));

  app.post("/api/v1/dispatch/board/events/:id/commit", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_commit_failed", () => {
    routeFactory.commit(req, res);
  }));

  app.post("/api/v1/dispatch/board/queue/appointments/:id/schedule", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_queue_appointment_schedule_failed", () => {
    routeFactory.scheduleQueueAppointment(req, res);
  }));

  app.post("/api/v1/dispatch/board/queue/walk-ins/:id/schedule", (req, res) => withUnexpectedError(logger, req, res, "dispatch_board_walkin_schedule_failed", () => {
    routeFactory.scheduleQueueWalkIn(req, res);
  }));
}
