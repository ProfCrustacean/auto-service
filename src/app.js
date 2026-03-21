import express from "express";
import { renderDashboardPage } from "./ui/dashboardPage.js";

export function createApp({ config, logger, dashboardService }) {
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

  app.get("/", (_req, res) => {
    const model = dashboardService.getTodayDashboard();
    res.status(200).send(renderDashboardPage(model));
  });

  app.get("/favicon.ico", (_req, res) => {
    res.status(204).end();
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  return app;
}
