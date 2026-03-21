import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadConfig() {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  return {
    appEnv: process.env.NODE_ENV ?? "development",
    port,
    databasePath:
      process.env.DB_PATH ?? path.resolve(dirname, "..", "data", "auto-service.sqlite"),
    seedPath:
      process.env.SEED_PATH ?? path.resolve(dirname, "..", "data", "seed-fixtures.json"),
  };
}
