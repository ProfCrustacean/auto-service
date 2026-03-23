import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { stringifyRedacted } from "./secret-redaction.js";
import { openDatabase } from "../src/persistence/database.js";
import { assertPositiveInteger } from "./harness-process.js";

loadDotenvIntoProcessSync();

const DEFAULT_TABLES = [
  "schema_migrations",
  "service_meta",
  "employees",
  "bays",
  "customers",
  "vehicles",
  "vehicle_ownership_history",
  "appointments",
  "intake_events",
  "work_orders",
  "work_order_status_history",
  "work_order_parts_requests",
  "parts_purchase_actions",
  "work_order_parts_history",
  "appointment_work_order_links",
];

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    dbPath: process.env.DB_PATH ?? path.resolve(process.cwd(), "data", "auto-service.sqlite"),
    backupPath: process.env.DB_BACKUP_PATH
      ?? path.resolve(process.cwd(), "evidence", "db-backup-drill.sqlite"),
    maxAllowedRowDrift: 0,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--db") {
      options.dbPath = path.resolve(process.cwd(), args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--backup") {
      options.backupPath = path.resolve(process.cwd(), args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--max-row-drift") {
      options.maxAllowedRowDrift = Number.parseInt(args[index + 1], 10);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!Number.isInteger(options.maxAllowedRowDrift) || options.maxAllowedRowDrift < 0) {
    throw new Error("--max-row-drift must be a non-negative integer");
  }

  return options;
}

function getTableCounts(database, tables) {
  const counts = {};
  for (const table of tables) {
    const row = database.prepare(`SELECT COUNT(1) AS count FROM ${table}`).get();
    counts[table] = row.count;
  }
  return counts;
}

function diffCounts(primary, restored) {
  const deltas = {};
  for (const [table, primaryCount] of Object.entries(primary)) {
    const restoredCount = restored[table];
    deltas[table] = {
      primary: primaryCount,
      restored: restoredCount,
      delta: restoredCount - primaryCount,
    };
  }
  return deltas;
}

function maxAbsoluteDrift(deltas) {
  return Math.max(...Object.values(deltas).map((entry) => Math.abs(entry.delta)), 0);
}

function resolveCurrentSchemaVersion(database) {
  const row = database.prepare(
    `SELECT version
     FROM schema_migrations
     ORDER BY version DESC
     LIMIT 1`,
  ).get();
  return row?.version ?? null;
}

function log(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await fs.mkdir(path.dirname(options.backupPath), { recursive: true });

  const sourceExists = await fs.stat(options.dbPath).then((stat) => stat.isFile()).catch(() => false);
  if (!sourceExists) {
    throw new Error(`Database file does not exist: ${options.dbPath}`);
  }

  await fs.copyFile(options.dbPath, options.backupPath);
  const sourceSize = (await fs.stat(options.dbPath)).size;
  const backupSize = (await fs.stat(options.backupPath)).size;
  assertPositiveInteger(Math.max(sourceSize, 1), "source_database_size");
  assertPositiveInteger(Math.max(backupSize, 1), "backup_database_size");

  const sourceDb = openDatabase(options.dbPath);
  const backupDb = openDatabase(options.backupPath);

  try {
    const sourceCounts = getTableCounts(sourceDb, DEFAULT_TABLES);
    const backupCounts = getTableCounts(backupDb, DEFAULT_TABLES);
    const sourceVersion = resolveCurrentSchemaVersion(sourceDb);
    const backupVersion = resolveCurrentSchemaVersion(backupDb);
    const deltas = diffCounts(sourceCounts, backupCounts);
    const drift = maxAbsoluteDrift(deltas);

    if (sourceVersion !== backupVersion) {
      throw new Error(`Schema version mismatch after backup drill: source=${sourceVersion}, backup=${backupVersion}`);
    }

    if (drift > options.maxAllowedRowDrift) {
      throw new Error(
        `Backup drill row drift exceeded threshold: drift=${drift}, allowed=${options.maxAllowedRowDrift}`,
      );
    }

    log({
      status: "db_backup_restore_drill_ok",
      sourcePath: options.dbPath,
      backupPath: options.backupPath,
      sourceSize,
      backupSize,
      schemaVersion: sourceVersion,
      maxAllowedRowDrift: options.maxAllowedRowDrift,
      counts: sourceCounts,
      deltas,
    });
  } finally {
    sourceDb.close();
    backupDb.close();
  }
}

main().catch((error) => {
  log({
    status: "db_backup_restore_drill_failed",
    message: error.message,
  });
  process.exitCode = 1;
});
