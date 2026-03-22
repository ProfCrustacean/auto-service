import express from "express";
import { randomUUID } from "node:crypto";
import { renderDashboardPage } from "./ui/dashboardPage.js";
import { renderSimpleDetailPage } from "./ui/detailPage.js";
import { registerReferenceRoutes } from "./http/referenceRoutes.js";
import { registerCustomerVehicleRoutes } from "./http/customerVehicleRoutes.js";
import { registerAppointmentRoutes } from "./http/appointmentRoutes.js";
import { registerWalkInIntakeRoutes } from "./http/walkInIntakeRoutes.js";
import { registerAppointmentPageRoutes } from "./http/appointmentPageRoutes.js";
import { registerWalkInIntakePageRoutes } from "./http/walkInIntakePageRoutes.js";
import { registerWorkOrderRoutes } from "./http/workOrderRoutes.js";
import { registerWorkOrderPageRoutes } from "./http/workOrderPageRoutes.js";
import { internalError, sendApiError, validationError } from "./http/apiErrors.js";
import { createApiAuthMiddleware } from "./http/authz.js";

function shouldSkipHttpRequestLog(path, statusCode) {
  return path === "/healthz" && statusCode < 400;
}

function validateSearchQuery(query) {
  const errors = [];

  let searchQuery = "";
  if (query.q !== undefined) {
    if (typeof query.q !== "string") {
      errors.push({ field: "q", message: "q must be a string" });
    } else {
      searchQuery = query.q.trim();
      if (searchQuery.length > 120) {
        errors.push({ field: "q", message: "q length must be <= 120 characters" });
      }
    }
  }

  for (const field of Object.keys(query)) {
    if (field !== "q") {
      errors.push({ field, message: "unknown query parameter" });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      query: searchQuery,
    },
  };
}

function readDashboardSearchQuery(query) {
  return typeof query.q === "string" ? query.q : "";
}

function isMalformedJsonBodyError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = error.statusCode ?? error.status;
  const type = typeof error.type === "string" ? error.type : "";
  return statusCode === 400 && type === "entity.parse.failed";
}

function resolveRequestId(headerValue) {
  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim().slice(0, 120);
  }

  return `req-${randomUUID().split("-")[0]}`;
}

export function createApp({
  config,
  logger,
  dashboardService,
  referenceDataService,
  customerVehicleService,
  appointmentService,
  walkInIntakeService,
  workOrderService,
}) {
  const app = express();
  const apiAuthMiddleware = createApiAuthMiddleware({
    logger,
    authConfig: config.auth,
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const requestId = resolveRequestId(req.headers["x-request-id"]);
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const startedAt = Date.now();
    res.on("finish", () => {
      if (shouldSkipHttpRequestLog(req.path, res.statusCode)) {
        return;
      }

      logger.info("http_request", {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        requestId,
      });
    });
    next();
  });
  app.use(apiAuthMiddleware);

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", environment: config.appEnv });
  });

  app.get("/readyz", (_req, res) => {
    try {
      const model = dashboardService.getTodayDashboard();
      res.json({ status: "ready", seedLoaded: Boolean(model.service) });
    } catch (error) {
      logger.error("readiness_failed", { message: error.message, requestId: _req.requestId ?? null });
      res.status(500).json({ status: "not_ready" });
    }
  });

  app.get("/api/v1/dashboard/today", (req, res) => {
    const validation = validateSearchQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const payload = dashboardService.getTodayDashboard({
      searchQuery: validation.value.query,
    });
    res.json(payload);
  });

  app.get("/api/v1/search", (req, res) => {
    const validation = validateSearchQuery(req.query);
    if (!validation.ok) {
      sendApiError(res, validationError(validation.errors));
      return;
    }

    const payload = dashboardService.searchLookup({
      query: validation.value.query,
    });
    res.json(payload);
  });

  registerReferenceRoutes(app, { logger, referenceDataService });
  registerCustomerVehicleRoutes(app, { logger, customerVehicleService });
  registerAppointmentRoutes(app, { logger, appointmentService });
  registerWalkInIntakeRoutes(app, { logger, walkInIntakeService });
  registerWorkOrderRoutes(app, { logger, workOrderService });
  registerAppointmentPageRoutes(app, {
    logger,
    appointmentService,
    customerVehicleService,
    referenceDataService,
  });
  registerWorkOrderPageRoutes(app, {
    logger,
    workOrderService,
    referenceDataService,
  });
  registerWalkInIntakePageRoutes(app, {
    logger,
    walkInIntakeService,
    customerVehicleService,
    referenceDataService,
  });

  app.get("/", (req, res) => {
    const model = dashboardService.getTodayDashboard({
      searchQuery: readDashboardSearchQuery(req.query),
    });
    res.status(200).send(renderDashboardPage(model));
  });

  app.get("/appointments/:id", (req, res) => {
    const item = dashboardService.getAppointmentById(req.params.id);
    if (!item) {
      res.status(404).send(
        renderSimpleDetailPage({
          title: "Запись не найдена",
          backHref: "/",
          fields: [{ label: "Идентификатор", value: req.params.id }],
        }),
      );
      return;
    }

    res.status(200).send(
      renderSimpleDetailPage({
        title: `Запись ${item.code}`,
        backHref: "/",
        fields: [
          { label: "Время", value: item.plannedStartLocal },
          { label: "Клиент", value: item.customerName },
          { label: "Авто", value: item.vehicleLabel },
          { label: "Пост", value: item.bayName },
          { label: "Ответственный", value: item.primaryAssignee },
        ],
      }),
    );
  });

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  app.use((error, req, res, next) => {
    if (!isMalformedJsonBodyError(error)) {
      next(error);
      return;
    }

    logger.warn("http_json_parse_failed", {
      method: req.method,
      path: req.path,
      message: error.message,
      requestId: req.requestId ?? null,
    });
    sendApiError(res, validationError([{ field: "body", message: "body must contain valid JSON" }]));
  });

  app.use((error, req, res, _next) => {
    logger.error("http_unexpected_error", {
      method: req.method,
      path: req.path,
      message: error?.message ?? "unknown_error",
      requestId: req.requestId ?? null,
      stack: error?.stack ?? null,
    });
    sendApiError(res, internalError());
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  return app;
}
