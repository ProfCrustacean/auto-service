import process from "node:process";

export const DEFAULT_STATE_NAME = "Backlog";
export const DEFAULT_ISSUES_LIMIT = 250;

const LEGACY_COMMANDS = new Set(["probe", "create", "sync"]);
const LEGACY_ENV_KEYS = [
  "LINEAR_TEAM_KEY",
  "LINEAR_STATE_NAME",
  "LINEAR_OUTPUT_PATH",
  "LINEAR_ISSUES_LIMIT",
  "LINEAR_TRANSPORT",
];

const HELP_TEXT = `Usage:
  node scripts/linear-harness.js apply --spec <path> [--dry-run] [--team-key <key>] [--state <name>] [--output <path>] [--issues-limit <n>]

Environment variables:
  LINEAR_API_KEY (required)
  LINEAR_PLAYWRIGHT_CLI (optional explicit path to playwright_cli.sh)
`;

const MIGRATION_HINT = "Use `node scripts/linear-harness.js apply --spec <path>` or `npm run linear:apply -- --spec <path>`.";

export class LinearHarnessCliError extends Error {
  constructor(message, { hint } = {}) {
    super(message);
    this.name = "LinearHarnessCliError";
    this.hint = hint;
  }
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new LinearHarnessCliError(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function takeValue(args, index, flagName) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new LinearHarnessCliError(`${flagName} requires a value`);
  }
  return value;
}

function assertNoLegacyEnv(env) {
  for (const key of LEGACY_ENV_KEYS) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      throw new LinearHarnessCliError(`Legacy environment variable '${key}' is no longer supported.`, {
        hint: MIGRATION_HINT,
      });
    }
  }
}

function parseCommand(args) {
  if (args.length === 0) {
    throw new LinearHarnessCliError("Missing command. Use 'apply'.", { hint: MIGRATION_HINT });
  }

  const command = args.shift();
  if (LEGACY_COMMANDS.has(command)) {
    throw new LinearHarnessCliError(`Legacy command '${command}' is no longer supported.`, { hint: MIGRATION_HINT });
  }

  if (command !== "apply") {
    throw new LinearHarnessCliError(`Unsupported command '${command}'. Use 'apply'.`, { hint: MIGRATION_HINT });
  }

  return command;
}

export function formatLinearHarnessHelp() {
  return HELP_TEXT;
}

export function parseLinearHarnessArgs(argv, { env = process.env } = {}) {
  const args = [...argv];

  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const command = parseCommand(args);
  assertNoLegacyEnv(env);

  const options = {
    help: false,
    command,
    specPath: undefined,
    dryRun: false,
    teamKey: undefined,
    stateName: undefined,
    outputPath: undefined,
    issuesLimit: DEFAULT_ISSUES_LIMIT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--spec") {
      options.specPath = takeValue(args, index, "--spec");
      index += 1;
      continue;
    }

    if (token === "--team-key") {
      options.teamKey = takeValue(args, index, "--team-key");
      index += 1;
      continue;
    }

    if (token === "--state") {
      options.stateName = takeValue(args, index, "--state");
      index += 1;
      continue;
    }

    if (token === "--output") {
      options.outputPath = takeValue(args, index, "--output");
      index += 1;
      continue;
    }

    if (token === "--issues-limit") {
      options.issuesLimit = parsePositiveInteger(takeValue(args, index, "--issues-limit"), "--issues-limit");
      index += 1;
      continue;
    }

    if (token === "--transport") {
      throw new LinearHarnessCliError("Legacy flag '--transport' is no longer supported.", { hint: MIGRATION_HINT });
    }

    throw new LinearHarnessCliError(`Unknown argument: ${token}`);
  }

  if (!options.specPath) {
    throw new LinearHarnessCliError("--spec is required for apply command");
  }

  return options;
}
