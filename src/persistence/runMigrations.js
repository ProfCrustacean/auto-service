import { MIGRATIONS } from "./migrations.js";

function ensureMigrationTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function listAppliedVersions(database) {
  const rows = database
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
    .all();

  return new Set(rows.map((row) => row.version));
}

export function runMigrations({ database, logger }) {
  ensureMigrationTable(database);

  const appliedVersions = listAppliedVersions(database);
  const newlyApplied = [];

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    const appliedAt = new Date().toISOString();

    try {
      database.exec("BEGIN TRANSACTION;");
      database.exec(migration.up);
      database
        .prepare("INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)")
        .run(migration.version, migration.name, appliedAt);
      database.exec("COMMIT;");
    } catch (error) {
      database.exec("ROLLBACK;");
      throw new Error(`Migration ${migration.version} failed: ${error.message}`);
    }

    newlyApplied.push(migration.version);
    logger.info("db_migration_applied", {
      version: migration.version,
      name: migration.name,
      appliedAt,
    });
  }

  return {
    appliedVersions: newlyApplied,
    currentVersion: MIGRATIONS.at(-1)?.version ?? null,
  };
}
