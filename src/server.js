import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { DashboardService } from "./services/dashboardService.js";
import { ReferenceDataService } from "./services/referenceDataService.js";
import { CustomerVehicleService } from "./services/customerVehicleService.js";
import { AppointmentService } from "./services/appointmentService.js";
import { WalkInIntakeService } from "./services/walkInIntakeService.js";
import { createApp } from "./app.js";
import { bootstrapPersistence } from "./persistence/bootstrapPersistence.js";

const config = loadConfig();
const logger = createLogger({ app: "auto-service" });
const { repository, database } = bootstrapPersistence({ config, logger });
const dashboardService = new DashboardService(repository);
const referenceDataService = new ReferenceDataService(repository);
const customerVehicleService = new CustomerVehicleService(repository);
const appointmentService = new AppointmentService(repository);
const walkInIntakeService = new WalkInIntakeService(repository);
const app = createApp({
  config,
  logger,
  dashboardService,
  referenceDataService,
  customerVehicleService,
  appointmentService,
  walkInIntakeService,
});

const server = app.listen(config.port, "0.0.0.0", () => {
  logger.info("server_started", { port: config.port, appEnv: config.appEnv });
});

function shutdown(signal) {
  logger.info("server_stopping", { signal });
  server.close(() => {
    database.close();
    logger.info("server_stopped", {});
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
