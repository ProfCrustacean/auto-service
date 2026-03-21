import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";

const config = loadConfig();
const logger = createLogger({ app: "auto-service", script: "db-init" });

const { database, migrationResult, seedResult } = bootstrapPersistence({ config, logger });
database.close();

process.stdout.write(
  `${JSON.stringify({
    status: "db_init_complete",
    databasePath: config.databasePath,
    currentVersion: migrationResult.currentVersion,
    appliedMigrations: migrationResult.appliedVersions,
    seeded: seedResult.seeded,
  })}\n`,
);
