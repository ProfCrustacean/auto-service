import { openDatabase } from "./database.js";
import { runMigrations } from "./runMigrations.js";
import { seedDatabase } from "./seedDatabase.js";
import { SqliteRepository } from "../repositories/sqliteRepository.js";

export function bootstrapPersistence({ config, logger }) {
  const database = openDatabase(config.databasePath);
  const migrationResult = runMigrations({ database, logger });
  const seedResult = seedDatabase({ database, seedPath: config.seedPath, logger });
  const repository = new SqliteRepository(database);

  logger.info("db_bootstrap_complete", {
    databasePath: config.databasePath,
    currentVersion: migrationResult.currentVersion,
    appliedMigrations: migrationResult.appliedVersions.length,
    seeded: seedResult.seeded,
  });

  return {
    database,
    repository,
    migrationResult,
    seedResult,
  };
}
