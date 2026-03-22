import express from "express";
import { renderDashboardPage } from "./ui/dashboardPage.js";
import { renderSimpleDetailPage } from "./ui/detailPage.js";
import { registerReferenceRoutes } from "./http/referenceRoutes.js";
import { registerCustomerVehicleRoutes } from "./http/customerVehicleRoutes.js";
import { registerAppointmentRoutes } from "./http/appointmentRoutes.js";
import { registerWalkInIntakeRoutes } from "./http/walkInIntakeRoutes.js";
import { registerAppointmentPageRoutes } from "./http/appointmentPageRoutes.js";
import { sendApiError, validationError } from "./http/apiErrors.js";

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

export function createApp({
  config,
  logger,
  dashboardService,
  referenceDataService,
  customerVehicleService,
  appointmentService,
  walkInIntakeService,
}) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, res, next) => {
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
      });
    });
    next();
  });

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", environment: config.appEnv });
  });

  app.get("/readyz", (_req, res) => {
    try {
      const model = dashboardService.getTodayDashboard();
      res.json({ status: "ready", seedLoaded: Boolean(model.service) });
    } catch (error) {
      logger.error("readiness_failed", { message: error.message });
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
  registerAppointmentPageRoutes(app, {
    logger,
    appointmentService,
    customerVehicleService,
    referenceDataService,
  });

  app.get("/", (req, res) => {
    const model = dashboardService.getTodayDashboard({
      searchQuery: readDashboardSearchQuery(req.query),
    });
    res.status(200).send(renderDashboardPage(model));
  });

  app.get("/intake/walk-in", (_req, res) => {
    res.status(200).send(
      renderSimpleDetailPage({
        title: "Прием walk-in",
        backHref: "/",
        fields: [{ label: "Статус", value: "Экран будет реализован в рамках Phase 1" }],
      }),
    );
  });

  app.get("/work-orders/active", (_req, res) => {
    const model = dashboardService.getTodayDashboard();
    const activeCount = model.summary.activeWorkOrders;
    res.status(200).send(
      renderSimpleDetailPage({
        title: "Активная очередь",
        backHref: "/",
        fields: [{ label: "Активных заказ-нарядов", value: String(activeCount) }],
      }),
    );
  });

  app.get("/work-orders/:id", (req, res) => {
    const item = dashboardService.getWorkOrderById(req.params.id);
    if (!item) {
      res.status(404).send(
        renderSimpleDetailPage({
          title: "Заказ-наряд не найден",
          backHref: "/",
          fields: [{ label: "Идентификатор", value: req.params.id }],
        }),
      );
      return;
    }

    res.status(200).send(
      renderSimpleDetailPage({
        title: `Заказ-наряд ${item.code}`,
        backHref: "/",
        fields: [
          { label: "Клиент", value: item.customerName },
          { label: "Авто", value: item.vehicleLabel },
          { label: "Статус", value: item.statusLabelRu },
          { label: "Ответственный", value: item.primaryAssignee },
          { label: "Долг", value: `${item.balanceDueRub ?? 0} руб.` },
        ],
      }),
    );
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

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  return app;
}
