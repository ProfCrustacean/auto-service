import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_AUTH_ROLES = new Set(["owner", "front_desk", "technician"]);

function parseImplicitUiRole(rawValue) {
  if (rawValue === undefined) {
    return "front_desk";
  }

  const normalized = String(rawValue).trim().toLowerCase();
  if (
    normalized.length === 0
    || normalized === "none"
    || normalized === "off"
    || normalized === "false"
    || normalized === "0"
  ) {
    return null;
  }

  if (!VALID_AUTH_ROLES.has(normalized)) {
    throw new Error(
      `Invalid AUTH_UI_IMPLICIT_ROLE: ${rawValue}. Expected one of owner, front_desk, technician, none.`,
    );
  }

  return normalized;
}

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
  const implicitUiRole = parseImplicitUiRole(process.env.AUTH_UI_IMPLICIT_ROLE);

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
      implicitUiRole,
    },
  };
}
