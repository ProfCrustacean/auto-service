import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadConfig() {
  const port = Number.parseInt(process.env.PORT ?? "3000", 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}`);
  }

  const authEnabled = process.env.AUTH_ENABLED !== "0";
  const authTokens = [
    { role: "owner", token: process.env.AUTH_OWNER_TOKEN ?? "owner-dev-token" },
    { role: "front_desk", token: process.env.AUTH_FRONT_DESK_TOKEN ?? "frontdesk-dev-token" },
    { role: "technician", token: process.env.AUTH_TECHNICIAN_TOKEN ?? "technician-dev-token" },
  ];

  return {
    appEnv: process.env.NODE_ENV ?? "development",
    port,
    databasePath:
      process.env.DB_PATH ?? path.resolve(dirname, "..", "data", "auto-service.sqlite"),
    seedPath:
      process.env.SEED_PATH ?? path.resolve(dirname, "..", "data", "seed-fixtures.json"),
    auth: {
      enabled: authEnabled,
      tokens: authTokens,
    },
  };
}
