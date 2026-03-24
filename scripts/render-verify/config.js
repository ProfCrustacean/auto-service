import path from "node:path";

export const DEFAULT_RENDER_API_BASE_URL = "https://api.render.com/v1";
export const DEFAULT_RENDER_SERVICE_ID = "srv-d6vcmt7diees73d0j04g";
export const DEFAULT_RENDER_BASE_URL = "https://auto-service-foundation.onrender.com";
export const DEFAULT_RENDER_RESOLVE_IP = "216.24.57.7";
export const DEFAULT_GIT_REMOTE = "origin";
export const DEFAULT_GIT_BRANCH = "main";
export const DEFAULT_POLL_TIMEOUT_MS = 15 * 60 * 1000;
export const DEFAULT_POLL_INTERVAL_MS = 10 * 1000;
export const DEFAULT_SMOKE_MAX_ATTEMPTS = 3;
export const DEFAULT_SMOKE_RETRY_DELAY_MS = 10 * 1000;
export const DEFAULT_LOG_AUDIT_LIMIT = 1000;
export const DEFAULT_LOG_AUDIT_INITIAL_LIMIT = 200;
export const DEFAULT_LOG_AUDIT_MODE = "balanced";
export const DEFAULT_LOG_AUDIT_MAX_WARNINGS = 0;
export const DEFAULT_LOG_AUDIT_MAX_ERRORS = 0;
export const DEFAULT_LOG_AUDIT_MAX_REPO_WARNINGS = 0;
export const DEFAULT_LOG_AUDIT_SUMMARY_PATH = "evidence/render-log-audit-summary.json";
export const DEFAULT_LOG_AUDIT_RAW_PATH = "evidence/render-log-audit.raw.ndjson";

const VALID_LOG_AUDIT_MODES = new Set(["balanced", "minimal", "full"]);

function normalizeFlag(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }

  throw new Error(`${fieldName} must be a boolean flag (1/0, true/false, yes/no, on/off)`);
}

function normalizeLogAuditMode(value, fieldName, defaultValue) {
  const candidate = String(value ?? defaultValue).trim().toLowerCase();
  if (!VALID_LOG_AUDIT_MODES.has(candidate)) {
    throw new Error(`${fieldName} must be one of: balanced, minimal, full`);
  }
  return candidate;
}

function parseNonNegativeInteger(value, fieldName, assertNonNegativeInteger) {
  const parsed = Number.parseInt(value, 10);
  assertNonNegativeInteger(parsed, fieldName);
  return parsed;
}

function parsePositiveInteger(value, fieldName, assertPositiveInteger) {
  const parsed = Number.parseInt(value, 10);
  assertPositiveInteger(parsed, fieldName);
  return parsed;
}

export function resolveRenderVerifyConfig({
  env,
  cliOptions,
  cwd,
  resolveHarnessLogLevel,
  resolveSkipDeployFromInputs,
  assertNonNegativeInteger,
  assertPositiveInteger,
}) {
  const harnessLogLevel = resolveHarnessLogLevel({ override: cliOptions.logLevel });
  const apiBaseUrl = env.RENDER_API_BASE_URL ?? DEFAULT_RENDER_API_BASE_URL;
  const serviceId = env.RENDER_SERVICE_ID ?? DEFAULT_RENDER_SERVICE_ID;
  const explicitBaseUrl = env.APP_BASE_URL?.trim() ?? "";
  const apiKey = env.RENDER_API_KEY?.trim() ?? "";
  const useResolve = env.RENDER_USE_RESOLVE !== "0";
  const resolveIp = env.RENDER_RESOLVE_IP ?? DEFAULT_RENDER_RESOLVE_IP;
  const skipDeploy = resolveSkipDeployFromInputs({
    envValue: env.RENDER_SKIP_DEPLOY,
    cliOptions,
  });
  const requireCleanWorktree = normalizeFlag(
    env.RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE,
    "RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE",
    true,
  );
  const requireRemoteSync = normalizeFlag(
    env.RENDER_VERIFY_REQUIRE_REMOTE_SYNC,
    "RENDER_VERIFY_REQUIRE_REMOTE_SYNC",
    true,
  );
  const requireManualDeploy = normalizeFlag(
    env.RENDER_VERIFY_REQUIRE_MANUAL_DEPLOY,
    "RENDER_VERIFY_REQUIRE_MANUAL_DEPLOY",
    true,
  );
  const gitRemote = env.RENDER_GIT_REMOTE?.trim() || DEFAULT_GIT_REMOTE;
  const gitBranch = env.RENDER_GIT_BRANCH?.trim() || DEFAULT_GIT_BRANCH;
  const includeScenario = normalizeFlag(env.RENDER_VERIFY_INCLUDE_SCENARIO, "RENDER_VERIFY_INCLUDE_SCENARIO", true);
  const includeIntakeBookingScenario = normalizeFlag(
    env.RENDER_VERIFY_INCLUDE_INTAKE_BOOKING_SCENARIO ?? env.RENDER_VERIFY_INCLUDE_BOOKING_SCENARIO,
    "RENDER_VERIFY_INCLUDE_INTAKE_BOOKING_SCENARIO",
    true,
  );
  const includeIntakeWalkInScenario = normalizeFlag(
    env.RENDER_VERIFY_INCLUDE_INTAKE_WALKIN_SCENARIO ?? env.RENDER_VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO,
    "RENDER_VERIFY_INCLUDE_INTAKE_WALKIN_SCENARIO",
    true,
  );
  const includePartsScenario = normalizeFlag(
    env.RENDER_VERIFY_INCLUDE_PARTS_SCENARIO,
    "RENDER_VERIFY_INCLUDE_PARTS_SCENARIO",
    true,
  );
  const includeDispatchBoardScenario = normalizeFlag(
    env.RENDER_VERIFY_INCLUDE_DISPATCH_BOARD_SCENARIO,
    "RENDER_VERIFY_INCLUDE_DISPATCH_BOARD_SCENARIO",
    true,
  );
  const verifyCommitParity = normalizeFlag(env.RENDER_VERIFY_COMMIT_PARITY, "RENDER_VERIFY_COMMIT_PARITY", true);
  const enableLogAudit = normalizeFlag(env.RENDER_VERIFY_LOG_AUDIT, "RENDER_VERIFY_LOG_AUDIT", true);
  const logAuditMode = normalizeLogAuditMode(
    env.RENDER_LOG_AUDIT_MODE,
    "RENDER_LOG_AUDIT_MODE",
    DEFAULT_LOG_AUDIT_MODE,
  );
  const writeRawAuditLogs = normalizeFlag(
    env.RENDER_LOG_AUDIT_WRITE_RAW,
    "RENDER_LOG_AUDIT_WRITE_RAW",
    false,
  );
  const gzipRawAuditOutput = normalizeFlag(
    env.RENDER_LOG_AUDIT_GZIP_RAW,
    "RENDER_LOG_AUDIT_GZIP_RAW",
    true,
  );
  const failOnLogTruncation = normalizeFlag(
    env.RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION,
    "RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION",
    true,
  );
  const summaryOutputPath = path.resolve(
    cwd,
    env.RENDER_LOG_AUDIT_SUMMARY_PATH?.trim() || DEFAULT_LOG_AUDIT_SUMMARY_PATH,
  );
  const rawOutputPath = path.resolve(
    cwd,
    env.RENDER_LOG_AUDIT_RAW_PATH?.trim() || DEFAULT_LOG_AUDIT_RAW_PATH,
  );
  const expectedCommitOverride = env.RENDER_EXPECT_COMMIT?.trim() ?? "";
  const defaultLogLimit = logAuditMode === "full"
    ? DEFAULT_LOG_AUDIT_LIMIT
    : DEFAULT_LOG_AUDIT_INITIAL_LIMIT;
  const logLimit = parsePositiveInteger(
    env.RENDER_LOG_AUDIT_LIMIT ?? String(defaultLogLimit),
    "RENDER_LOG_AUDIT_LIMIT",
    assertPositiveInteger,
  );
  const logInitialLimit = parsePositiveInteger(
    env.RENDER_LOG_AUDIT_INITIAL_LIMIT ?? String(DEFAULT_LOG_AUDIT_INITIAL_LIMIT),
    "RENDER_LOG_AUDIT_INITIAL_LIMIT",
    assertPositiveInteger,
  );
  const maxWarnings = parseNonNegativeInteger(
    env.RENDER_LOG_AUDIT_MAX_WARNINGS ?? String(DEFAULT_LOG_AUDIT_MAX_WARNINGS),
    "RENDER_LOG_AUDIT_MAX_WARNINGS",
    assertNonNegativeInteger,
  );
  const maxErrors = parseNonNegativeInteger(
    env.RENDER_LOG_AUDIT_MAX_ERRORS ?? String(DEFAULT_LOG_AUDIT_MAX_ERRORS),
    "RENDER_LOG_AUDIT_MAX_ERRORS",
    assertNonNegativeInteger,
  );
  const maxRepoWarnings = parseNonNegativeInteger(
    env.RENDER_LOG_AUDIT_MAX_REPO_WARNINGS ?? String(DEFAULT_LOG_AUDIT_MAX_REPO_WARNINGS),
    "RENDER_LOG_AUDIT_MAX_REPO_WARNINGS",
    assertNonNegativeInteger,
  );
  const pollIntervalMs = Number.parseInt(
    env.RENDER_DEPLOY_POLL_INTERVAL_MS ?? String(DEFAULT_POLL_INTERVAL_MS),
    10,
  );
  const pollTimeoutMs = Number.parseInt(
    env.RENDER_DEPLOY_TIMEOUT_MS ?? String(DEFAULT_POLL_TIMEOUT_MS),
    10,
  );
  const smokeMaxAttempts = parsePositiveInteger(
    env.RENDER_SMOKE_MAX_ATTEMPTS ?? String(DEFAULT_SMOKE_MAX_ATTEMPTS),
    "RENDER_SMOKE_MAX_ATTEMPTS",
    assertPositiveInteger,
  );
  const smokeRetryDelayMs = parsePositiveInteger(
    env.RENDER_SMOKE_RETRY_DELAY_MS ?? String(DEFAULT_SMOKE_RETRY_DELAY_MS),
    "RENDER_SMOKE_RETRY_DELAY_MS",
    assertPositiveInteger,
  );

  assertPositiveInteger(pollIntervalMs, "RENDER_DEPLOY_POLL_INTERVAL_MS");
  assertPositiveInteger(pollTimeoutMs, "RENDER_DEPLOY_TIMEOUT_MS");

  if (!skipDeploy && apiKey.length === 0) {
    throw new Error("RENDER_API_KEY is required unless RENDER_SKIP_DEPLOY=1");
  }

  return {
    harnessLogLevel,
    apiBaseUrl,
    serviceId,
    explicitBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
    skipDeploy,
    requireCleanWorktree,
    requireRemoteSync,
    requireManualDeploy,
    gitRemote,
    gitBranch,
    includeScenario,
    includeIntakeBookingScenario,
    includeIntakeWalkInScenario,
    includePartsScenario,
    includeDispatchBoardScenario,
    verifyCommitParity,
    enableLogAudit,
    logAuditMode,
    writeRawAuditLogs,
    gzipRawAuditOutput,
    failOnLogTruncation,
    summaryOutputPath,
    rawOutputPath,
    expectedCommitOverride,
    logLimit,
    logInitialLimit,
    maxWarnings,
    maxErrors,
    maxRepoWarnings,
    pollIntervalMs,
    pollTimeoutMs,
    smokeMaxAttempts,
    smokeRetryDelayMs,
    cliDeployMode: cliOptions.deployMode,
    defaultRenderBaseUrl: DEFAULT_RENDER_BASE_URL,
  };
}
