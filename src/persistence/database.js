import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DEFAULT_BUSY_TIMEOUT_MS = 1000;

export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  const busyTimeoutMs = Number.parseInt(process.env.SQLITE_BUSY_TIMEOUT_MS ?? String(DEFAULT_BUSY_TIMEOUT_MS), 10);

  database.exec("PRAGMA foreign_keys = ON;");
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA synchronous = NORMAL;");
  database.exec(`PRAGMA busy_timeout = ${Number.isInteger(busyTimeoutMs) && busyTimeoutMs > 0 ? busyTimeoutMs : DEFAULT_BUSY_TIMEOUT_MS};`);

  return database;
}
