import express from "express";
import { renderDashboardPage } from "./ui/dashboardPage.js";
import { renderSimpleDetailPage } from "./ui/detailPage.js";
import { registerReferenceRoutes } from "./http/referenceRoutes.js";

export function createApp({ config, logger, dashboardService, referenceDataService }) {
  const app = express();

  app.use(express.json());
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
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

  app.get("/api/v1/dashboard/today", (_req, res) => {
    const payload = dashboardService.getTodayDashboard();
    res.json(payload);
  });

  registerReferenceRoutes(app, { logger, referenceDataService });

  app.get("/", (_req, res) => {
    const model = dashboardService.getTodayDashboard();
    res.status(200).send(renderDashboardPage(model));
  });

  app.get("/appointments/new", (_req, res) => {
    res.status(200).send(
      renderSimpleDetailPage({
        title: "Создание записи",
        backHref: "/",
        fields: [{ label: "Статус", value: "Экран будет реализован в рамках Phase 1" }],
      }),
    );
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
