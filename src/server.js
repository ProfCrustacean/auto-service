import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { FixtureRepository } from "./repositories/fixtureRepository.js";
import { DashboardService } from "./services/dashboardService.js";
import { createApp } from "./app.js";

const config = loadConfig();
const logger = createLogger({ app: "auto-service" });
const repository = new FixtureRepository(config.seedPath);
const dashboardService = new DashboardService(repository);
const app = createApp({ config, logger, dashboardService });

const server = app.listen(config.port, "0.0.0.0", () => {
  logger.info("server_started", { port: config.port, appEnv: config.appEnv });
});

function shutdown(signal) {
  logger.info("server_stopping", { signal });
  server.close(() => {
    logger.info("server_stopped", {});
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
