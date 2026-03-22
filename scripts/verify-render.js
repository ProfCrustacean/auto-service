import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { redactSecrets, redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";

loadDotenvIntoProcessSync();
const DEFAULT_RENDER_API_BASE_URL = "https://api.render.com/v1";
const DEFAULT_RENDER_SERVICE_ID = "srv-d6vcmt7diees73d0j04g";
const DEFAULT_RENDER_BASE_URL = "https://auto-service-foundation.onrender.com";
const DEFAULT_RENDER_RESOLVE_IP = "216.24.57.7";
const DEFAULT_POLL_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 10 * 1000;
const DEFAULT_SMOKE_MAX_ATTEMPTS = 3;
const DEFAULT_SMOKE_RETRY_DELAY_MS = 10 * 1000;
const DEFAULT_LOG_AUDIT_LIMIT = 1000;
const DEFAULT_LOG_AUDIT_MAX_WARNINGS = 0;
const DEFAULT_LOG_AUDIT_MAX_ERRORS = 0;
const DEFAULT_LOG_AUDIT_MAX_REPO_WARNINGS = 0;
const DEFAULT_LOG_AUDIT_WINDOW_PAD_MS = 30 * 1000;
const DEFAULT_LOG_AUDIT_SUMMARY_PATH = "evidence/render-log-audit-summary.json";
const DEFAULT_LOG_AUDIT_RAW_PATH = "evidence/render-log-audit.raw.ndjson";
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const COMMIT_ID_PATTERN = /^[a-f0-9]{7,40}$/u;
const ERROR_TEXT_PATTERN = /\b(error|exception|fatal|failed|panic|traceback|unhandled)\b/iu;
const REPO_ACCESS_WARNING_PATTERN = /don't have access to your repo/iu;
const LOG_SEVERITY_RANK = {
  info: 0,
  warn: 1,
  error: 2,
  fatal: 3,
};

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

function logJson(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runCommandCapture(command, args, { env, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk.toString());
    });

    child.once("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(redactSecretsInText(
        `${label} failed with ${detail}; stderr: ${stderr.trim() || "n/a"}; stdout: ${stdout.trim() || "n/a"}`,
      )));
    });
  });
}

function runProcess(command, args, { env, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${label} failed with ${detail}`));
    });
  });
}

async function runProcessWithRetries({
  command,
  args,
  env,
  label,
  step,
  maxAttempts,
  retryDelayMs,
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        logJson({
          status: "render_verify_step_retry_started",
          step,
          attempt,
          maxAttempts,
          retryDelayMs,
        });
      }

      await runProcess(command, args, { env, label });

      if (attempt > 1) {
        logJson({
          status: "render_verify_step_retry_recovered",
          step,
          attempt,
          maxAttempts,
        });
      }
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      logJson({
        status: "render_verify_step_retry_scheduled",
        step,
        attempt,
        maxAttempts,
        retryDelayMs,
        message: error.message,
      });
      await wait(retryDelayMs);
    }
  }

  throw lastError;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/u, "");
}

function toRenderApiUrl(baseUrl, pathOrUrl) {
  if (/^https?:\/\//u.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (!pathOrUrl.startsWith("/")) {
    throw new Error(`Render API path must start with '/': ${pathOrUrl}`);
  }

  return `${trimTrailingSlash(baseUrl)}${pathOrUrl}`;
}

function describeResponseBody(payload, fallbackText) {
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string") {
      return redactSecretsInText(payload.message);
    }
    if (typeof payload.error === "string") {
      return redactSecretsInText(payload.error);
    }
    return stringifyRedacted(payload);
  }

  return redactSecretsInText(fallbackText);
}

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

function parseNonNegativeInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  assertNonNegativeInteger(parsed, fieldName);
  return parsed;
}

function parsePositiveInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  assertPositiveInteger(parsed, fieldName);
  return parsed;
}

function normalizeCommitId(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  const normalized = value.trim().toLowerCase();
  if (!COMMIT_ID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be 7-40 lowercase hex characters`);
  }

  return normalized;
}

function commitIdsMatch(expectedCommitId, actualCommitId) {
  return actualCommitId.startsWith(expectedCommitId) || expectedCommitId.startsWith(actualCommitId);
}

async function resolveExpectedCommitId(explicitCommitId) {
  if (explicitCommitId.length > 0) {
    return {
      expectedCommitId: normalizeCommitId(explicitCommitId, "RENDER_EXPECT_COMMIT"),
      source: "env",
    };
  }

  const { stdout } = await runCommandCapture("git", ["rev-parse", "HEAD"], {
    env: process.env,
    label: "git rev-parse HEAD",
  });
  const gitCommitId = stdout.trim();
  if (gitCommitId.length === 0) {
    throw new Error("git rev-parse HEAD returned empty output");
  }

  return {
    expectedCommitId: normalizeCommitId(gitCommitId, "git HEAD commit"),
    source: "git",
  };
}

function assertDeployCommitParity({ expectedCommitId, deployPayload }) {
  const actualCommitRaw = deployPayload?.commit?.id;
  if (typeof actualCommitRaw !== "string" || actualCommitRaw.trim().length === 0) {
    throw new Error("Render deploy payload did not include commit.id for parity verification");
  }

  const actualCommitId = normalizeCommitId(actualCommitRaw, "deploy.commit.id");
  if (!commitIdsMatch(expectedCommitId, actualCommitId)) {
    throw new Error(
      `Render deploy commit mismatch: expected ${expectedCommitId}, actual ${actualCommitId}`,
    );
  }

  return actualCommitId;
}

function stripAnsi(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

function parseJsonObject(text) {
  if (typeof text !== "string") {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Best-effort parser for log lines.
  }

  return null;
}

function resolveLogLabelValue(entry, labelName) {
  if (!Array.isArray(entry?.labels)) {
    return "";
  }

  const match = entry.labels.find((label) => label?.name === labelName);
  return typeof match?.value === "string" ? match.value.trim() : "";
}

function normalizeSeverity(value) {
  if (typeof value !== "string") {
    return "info";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.includes("fatal")) {
    return "fatal";
  }
  if (normalized.includes("error")) {
    return "error";
  }
  if (normalized.includes("warn")) {
    return "warn";
  }
  return "info";
}

function highestSeverity(current, incoming) {
  if (LOG_SEVERITY_RANK[incoming] > LOG_SEVERITY_RANK[current]) {
    return incoming;
  }
  return current;
}

function resolveLogSeverity(entry) {
  const message = stripAnsi(entry?.message ?? "");
  const parsedJsonMessage = parseJsonObject(message);
  const labelLevel = normalizeSeverity(resolveLogLabelValue(entry, "level"));
  const jsonLevel = normalizeSeverity(parsedJsonMessage?.level);

  let severity = highestSeverity(labelLevel, jsonLevel);
  if (severity === "info" && ERROR_TEXT_PATTERN.test(message)) {
    severity = "error";
  }

  return {
    severity,
    message,
  };
}

function makeRenderLogsPath({
  ownerId,
  serviceId,
  type,
  startTime,
  endTime,
  limit,
}) {
  const params = new URLSearchParams();
  params.set("ownerId", ownerId);
  params.set("resource", serviceId);
  params.set("type", type);
  params.set("startTime", startTime);
  params.set("endTime", endTime);
  params.set("limit", String(limit));
  return `/logs?${params.toString()}`;
}

function safeIsoDateOrNull(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function getLogAuditWindowStart(deployPayload) {
  const candidate = safeIsoDateOrNull(deployPayload?.startedAt)
    ?? safeIsoDateOrNull(deployPayload?.createdAt)
    ?? new Date(Date.now() - (15 * 60 * 1000)).toISOString();
  const shifted = new Date(new Date(candidate).getTime() - DEFAULT_LOG_AUDIT_WINDOW_PAD_MS);
  return shifted.toISOString();
}

function resolveRawAuditOutputPath(basePath, gzipRawOutput) {
  if (!gzipRawOutput) {
    return basePath;
  }

  return basePath.endsWith(".gz") ? basePath : `${basePath}.gz`;
}

async function renderApiRequest({
  method,
  path,
  body = undefined,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
}) {
  const url = toRenderApiUrl(apiBaseUrl, path);
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--request",
    method,
    "--url",
    url,
    "--header",
    "Accept: application/json",
    "--header",
    `Authorization: Bearer ${apiKey}`,
  ];

  if (useResolve) {
    args.push("--resolve", `api.render.com:443:${resolveIp}`);
  }

  if (body !== undefined) {
    args.push("--header", "Content-Type: application/json", "--data", JSON.stringify(body));
  }

  args.push("--write-out", "\n__HTTP_STATUS__%{http_code}");

  const { stdout } = await runCommandCapture("curl", args, {
    env: process.env,
    label: `curl ${method} ${url}`,
  });

  const marker = "\n__HTTP_STATUS__";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Render API response missing HTTP status marker for ${method} ${path}`);
  }

  const responseBodyText = stdout.slice(0, markerIndex).trim();
  const statusCodeText = stdout.slice(markerIndex + marker.length).trim();
  const statusCode = Number.parseInt(statusCodeText, 10);
  if (!Number.isInteger(statusCode)) {
    throw new Error(`Render API returned invalid HTTP status '${statusCodeText}' for ${method} ${path}`);
  }

  let payload = null;
  if (responseBodyText.length > 0) {
    try {
      payload = JSON.parse(responseBodyText);
    } catch {
      payload = responseBodyText;
    }
  }

  if (statusCode >= 400) {
    const detail = describeResponseBody(payload, responseBodyText || "no response body");
    throw new Error(`Render API ${method} ${path} failed with ${statusCode}: ${detail}`);
  }

  return {
    statusCode,
    payload,
  };
}

function unwrapDeployRecord(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (entry.deploy && typeof entry.deploy === "object") {
    return entry.deploy;
  }

  return entry;
}

async function resolveLatestDeployId({
  serviceId,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
}) {
  const listResponse = await renderApiRequest({
    method: "GET",
    path: `/services/${serviceId}/deploys?limit=5`,
    apiBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
  });

  if (!Array.isArray(listResponse.payload) || listResponse.payload.length === 0) {
    throw new Error("Render deploy trigger returned empty body and no deploy history entries were available");
  }

  const latestDeploy = unwrapDeployRecord(listResponse.payload[0]);
  const deployId = latestDeploy?.id;
  if (!deployId) {
    throw new Error("Render deploy trigger returned empty body and latest deploy entry did not include id");
  }

  return latestDeploy;
}

function isTerminalFailureStatus(status) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized.includes("failed")
    || normalized.includes("cancel")
    || normalized.includes("error")
    || normalized === "deactivated";
}

async function waitForDeployLive({
  serviceId,
  deployId,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
  pollIntervalMs,
  timeoutMs,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const deployResponse = await renderApiRequest({
      method: "GET",
      path: `/services/${serviceId}/deploys/${deployId}`,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
    });

    const deploy = deployResponse.payload ?? {};
    const status = String(deploy.status ?? "unknown");
    const elapsedMs = Date.now() - startedAt;

    logJson({
      status: "render_verify_deploy_poll",
      deployId,
      deployStatus: status,
      elapsedMs,
    });

    if (status === "live") {
      return deploy;
    }

    if (isTerminalFailureStatus(status)) {
      throw new Error(`Render deploy ${deployId} entered terminal failure status '${status}'`);
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`Render deploy ${deployId} did not become live within ${timeoutMs}ms`);
}

function resolveBaseUrl({ explicitBaseUrl, servicePayload }) {
  if (explicitBaseUrl && explicitBaseUrl.length > 0) {
    return explicitBaseUrl;
  }

  const serviceUrl = servicePayload?.serviceDetails?.url;
  if (typeof serviceUrl === "string" && serviceUrl.length > 0) {
    return serviceUrl;
  }

  return DEFAULT_RENDER_BASE_URL;
}

async function runPostDeployLogAudit({
  serviceId,
  ownerId,
  deployPayload,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
  logLimit,
  maxWarnings,
  maxErrors,
  maxRepoWarnings,
  failOnTruncation,
  summaryOutputPath,
  writeRawAuditLogs,
  rawOutputPath,
  gzipRawOutput,
}) {
  const startTime = getLogAuditWindowStart(deployPayload);
  const endTime = new Date().toISOString();

  const logTypes = ["build", "app"];
  const typedResponses = await Promise.all(
    logTypes.map(async (type) => {
      const path = makeRenderLogsPath({
        ownerId,
        serviceId,
        type,
        startTime,
        endTime,
        limit: logLimit,
      });

      const response = await renderApiRequest({
        method: "GET",
        path,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      });

      const payload = response.payload ?? {};
      const logs = Array.isArray(payload.logs) ? payload.logs : [];
      return {
        type,
        hasMore: payload?.hasMore === true,
        logs,
      };
    }),
  );

  const dedupedLogs = [];
  const seen = new Set();
  for (const response of typedResponses) {
    for (const logEntry of response.logs) {
      const key = typeof logEntry?.id === "string"
        ? logEntry.id
        : `${logEntry?.timestamp ?? ""}|${logEntry?.message ?? ""}|${response.type}`;

      if (!seen.has(key)) {
        seen.add(key);
        dedupedLogs.push(logEntry);
      }
    }
  }

  dedupedLogs.sort((left, right) => {
    const leftTime = new Date(left?.timestamp ?? "").getTime();
    const rightTime = new Date(right?.timestamp ?? "").getTime();
    return leftTime - rightTime;
  });

  const severityCounts = {
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };
  const severeSamples = [];
  let repoAccessWarningCount = 0;
  for (const logEntry of dedupedLogs) {
    const { severity, message } = resolveLogSeverity(logEntry);
    severityCounts[severity] += 1;

    if (REPO_ACCESS_WARNING_PATTERN.test(message)) {
      repoAccessWarningCount += 1;
    }

    if ((severity === "warn" || severity === "error" || severity === "fatal") && severeSamples.length < 10) {
      severeSamples.push({
        id: logEntry?.id ?? null,
        timestamp: logEntry?.timestamp ?? null,
        severity,
        message: message.slice(0, 240),
      });
    }
  }

  const typeSummary = Object.fromEntries(
    typedResponses.map((item) => [
      item.type,
      {
        rows: item.logs.length,
        hasMore: item.hasMore,
      },
    ]),
  );
  const truncatedTypes = typedResponses.filter((item) => item.hasMore).map((item) => item.type);

  const summary = {
    generatedAt: new Date().toISOString(),
    startTime,
    endTime,
    deployId: deployPayload?.id ?? null,
    totals: {
      rows: dedupedLogs.length,
      bySeverity: severityCounts,
      repoAccessWarningCount,
      truncatedTypes,
    },
    thresholds: {
      maxWarnings,
      maxErrors,
      maxRepoWarnings,
      failOnTruncation,
    },
    types: typeSummary,
    severeSamples,
  };

  await fs.mkdir(path.dirname(summaryOutputPath), { recursive: true });
  await fs.writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  let resolvedRawOutputPath = null;
  if (writeRawAuditLogs) {
    const outputPath = resolveRawAuditOutputPath(rawOutputPath, gzipRawOutput);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const rawPayload = dedupedLogs.map((entry) => JSON.stringify(redactSecrets(entry))).join("\n");
    const payloadText = rawPayload.length > 0 ? `${rawPayload}\n` : "";
    if (gzipRawOutput) {
      await fs.writeFile(outputPath, gzipSync(payloadText));
    } else {
      await fs.writeFile(outputPath, payloadText, "utf8");
    }
    resolvedRawOutputPath = outputPath;
  }

  logJson({
    status: "render_verify_log_audit_summary",
    serviceId,
    deployId: deployPayload?.id ?? null,
    summaryPath: summaryOutputPath,
    rawPath: resolvedRawOutputPath,
    summary,
  });

  const warningCount = severityCounts.warn;
  const errorCount = severityCounts.error + severityCounts.fatal;
  const failures = [];

  if (warningCount > maxWarnings) {
    failures.push(`warnings=${warningCount} exceeded threshold=${maxWarnings}`);
  }
  if (errorCount > maxErrors) {
    failures.push(`errors=${errorCount} exceeded threshold=${maxErrors}`);
  }
  if (repoAccessWarningCount > maxRepoWarnings) {
    failures.push(`repoAccessWarnings=${repoAccessWarningCount} exceeded threshold=${maxRepoWarnings}`);
  }
  if (failOnTruncation && truncatedTypes.length > 0) {
    failures.push(`log response truncated for types: ${truncatedTypes.join(", ")}`);
  }

  if (failures.length > 0) {
    throw new Error(`Render post-deploy log audit failed: ${failures.join("; ")}`);
  }
}

async function main() {
  const apiBaseUrl = process.env.RENDER_API_BASE_URL ?? DEFAULT_RENDER_API_BASE_URL;
  const serviceId = process.env.RENDER_SERVICE_ID ?? DEFAULT_RENDER_SERVICE_ID;
  const explicitBaseUrl = process.env.APP_BASE_URL?.trim() ?? "";
  const apiKey = process.env.RENDER_API_KEY?.trim() ?? "";
  const useResolve = process.env.RENDER_USE_RESOLVE !== "0";
  const resolveIp = process.env.RENDER_RESOLVE_IP ?? DEFAULT_RENDER_RESOLVE_IP;
  const skipDeploy = process.env.RENDER_SKIP_DEPLOY === "1";
  const includeScenario = normalizeFlag(process.env.RENDER_VERIFY_INCLUDE_SCENARIO, "RENDER_VERIFY_INCLUDE_SCENARIO", true);
  const includeBookingScenario = normalizeFlag(
    process.env.RENDER_VERIFY_INCLUDE_BOOKING_SCENARIO,
    "RENDER_VERIFY_INCLUDE_BOOKING_SCENARIO",
    true,
  );
  const includeWalkInPageScenario = normalizeFlag(
    process.env.RENDER_VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO,
    "RENDER_VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO",
    true,
  );
  const verifyCommitParity = normalizeFlag(process.env.RENDER_VERIFY_COMMIT_PARITY, "RENDER_VERIFY_COMMIT_PARITY", true);
  const enableLogAudit = normalizeFlag(process.env.RENDER_VERIFY_LOG_AUDIT, "RENDER_VERIFY_LOG_AUDIT", true);
  const writeRawAuditLogs = normalizeFlag(
    process.env.RENDER_LOG_AUDIT_WRITE_RAW,
    "RENDER_LOG_AUDIT_WRITE_RAW",
    false,
  );
  const gzipRawAuditOutput = normalizeFlag(
    process.env.RENDER_LOG_AUDIT_GZIP_RAW,
    "RENDER_LOG_AUDIT_GZIP_RAW",
    true,
  );
  const failOnLogTruncation = normalizeFlag(
    process.env.RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION,
    "RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION",
    true,
  );
  const summaryOutputPath = path.resolve(
    process.cwd(),
    process.env.RENDER_LOG_AUDIT_SUMMARY_PATH?.trim() || DEFAULT_LOG_AUDIT_SUMMARY_PATH,
  );
  const rawOutputPath = path.resolve(
    process.cwd(),
    process.env.RENDER_LOG_AUDIT_RAW_PATH?.trim() || DEFAULT_LOG_AUDIT_RAW_PATH,
  );
  const expectedCommitOverride = process.env.RENDER_EXPECT_COMMIT?.trim() ?? "";
  const logLimit = parsePositiveInteger(
    process.env.RENDER_LOG_AUDIT_LIMIT ?? String(DEFAULT_LOG_AUDIT_LIMIT),
    "RENDER_LOG_AUDIT_LIMIT",
  );
  const maxWarnings = parseNonNegativeInteger(
    process.env.RENDER_LOG_AUDIT_MAX_WARNINGS ?? String(DEFAULT_LOG_AUDIT_MAX_WARNINGS),
    "RENDER_LOG_AUDIT_MAX_WARNINGS",
  );
  const maxErrors = parseNonNegativeInteger(
    process.env.RENDER_LOG_AUDIT_MAX_ERRORS ?? String(DEFAULT_LOG_AUDIT_MAX_ERRORS),
    "RENDER_LOG_AUDIT_MAX_ERRORS",
  );
  const maxRepoWarnings = parseNonNegativeInteger(
    process.env.RENDER_LOG_AUDIT_MAX_REPO_WARNINGS ?? String(DEFAULT_LOG_AUDIT_MAX_REPO_WARNINGS),
    "RENDER_LOG_AUDIT_MAX_REPO_WARNINGS",
  );

  const pollIntervalMs = Number.parseInt(
    process.env.RENDER_DEPLOY_POLL_INTERVAL_MS ?? String(DEFAULT_POLL_INTERVAL_MS),
    10,
  );
  const pollTimeoutMs = Number.parseInt(
    process.env.RENDER_DEPLOY_TIMEOUT_MS ?? String(DEFAULT_POLL_TIMEOUT_MS),
    10,
  );
  const smokeMaxAttempts = parsePositiveInteger(
    process.env.RENDER_SMOKE_MAX_ATTEMPTS ?? String(DEFAULT_SMOKE_MAX_ATTEMPTS),
    "RENDER_SMOKE_MAX_ATTEMPTS",
  );
  const smokeRetryDelayMs = parsePositiveInteger(
    process.env.RENDER_SMOKE_RETRY_DELAY_MS ?? String(DEFAULT_SMOKE_RETRY_DELAY_MS),
    "RENDER_SMOKE_RETRY_DELAY_MS",
  );

  assertPositiveInteger(pollIntervalMs, "RENDER_DEPLOY_POLL_INTERVAL_MS");
  assertPositiveInteger(pollTimeoutMs, "RENDER_DEPLOY_TIMEOUT_MS");

  if (!skipDeploy && apiKey.length === 0) {
    throw new Error("RENDER_API_KEY is required unless RENDER_SKIP_DEPLOY=1");
  }

  logJson({
    status: "render_verify_started",
    serviceId,
    apiBaseUrl,
    skipDeploy,
    includeScenario,
    includeBookingScenario,
    includeWalkInPageScenario,
    verifyCommitParity,
    enableLogAudit,
    writeRawAuditLogs,
    gzipRawAuditOutput,
    logAuditSummaryPath: summaryOutputPath,
    logAuditRawPath: writeRawAuditLogs ? resolveRawAuditOutputPath(rawOutputPath, gzipRawAuditOutput) : null,
    logAuditLimit: logLimit,
    maxWarnings,
    maxErrors,
    maxRepoWarnings,
    failOnLogTruncation,
    expectedCommitSource: expectedCommitOverride.length > 0 ? "env" : "git",
    useResolve,
    resolveIp: useResolve ? resolveIp : null,
    smokeMaxAttempts,
    smokeRetryDelayMs,
  });

  let servicePayload = null;
  let deployPayload = null;

  if (!skipDeploy) {
    logJson({ status: "render_verify_step_started", step: "service_lookup", serviceId });
    servicePayload = (
      await renderApiRequest({
        method: "GET",
        path: `/services/${serviceId}`,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      })
    ).payload;

    logJson({
      status: "render_verify_step_started",
      step: "deploy_trigger",
      serviceId,
      serviceUrl: servicePayload?.serviceDetails?.url ?? null,
    });
    deployPayload = (
      await renderApiRequest({
        method: "POST",
        path: `/services/${serviceId}/deploys`,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      })
    ).payload;

    const deployId = deployPayload?.id;
    if (!deployId) {
      logJson({
        status: "render_verify_deploy_id_fallback",
        reason: "trigger_response_missing_id",
      });

      deployPayload = await resolveLatestDeployId({
        serviceId,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      });
    }

    const resolvedDeployId = deployPayload?.id;
    if (!resolvedDeployId) {
      throw new Error("Unable to resolve Render deploy id after trigger");
    }

    logJson({
      status: "render_verify_step_started",
      step: "deploy_wait_live",
      serviceId,
      deployId: resolvedDeployId,
      initialStatus: deployPayload?.status ?? null,
    });

    deployPayload = await waitForDeployLive({
      serviceId,
      deployId: resolvedDeployId,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
      pollIntervalMs,
      timeoutMs: pollTimeoutMs,
    });

    if (verifyCommitParity) {
      logJson({
        status: "render_verify_step_started",
        step: "deploy_commit_parity",
        deployId: deployPayload?.id ?? null,
      });

      const { expectedCommitId, source } = await resolveExpectedCommitId(expectedCommitOverride);
      const actualCommitId = assertDeployCommitParity({
        expectedCommitId,
        deployPayload,
      });
      logJson({
        status: "render_verify_commit_parity_passed",
        deployId: deployPayload?.id ?? null,
        expectedCommitId,
        expectedCommitSource: source,
        actualCommitId,
      });
    }
  } else if (verifyCommitParity) {
    logJson({
      status: "render_verify_step_skipped",
      step: "deploy_commit_parity",
      reason: "skip_deploy_enabled",
    });
  }

  const baseUrl = resolveBaseUrl({ explicitBaseUrl, servicePayload });
  logJson({
    status: "render_verify_step_started",
    step: "smoke",
    baseUrl,
    skipDeploy,
    deployId: deployPayload?.id ?? null,
  });

  await runProcessWithRetries({
    command: process.execPath,
    args: ["scripts/smoke.js"],
    env: {
      ...process.env,
      APP_BASE_URL: baseUrl,
    },
    label: "render smoke",
    step: "smoke",
    maxAttempts: smokeMaxAttempts,
    retryDelayMs: smokeRetryDelayMs,
  });

  if (includeBookingScenario) {
    logJson({
      status: "render_verify_step_started",
      step: "scenario_booking_page_non_destructive",
      baseUrl,
      skipDeploy,
    });

    await runProcess(process.execPath, ["scripts/booking-page-scenario.js", "--non-destructive"], {
      env: {
        ...process.env,
        APP_BASE_URL: baseUrl,
        SCENARIO_NON_DESTRUCTIVE: "1",
      },
      label: "render scenario:booking-page",
    });
  }

  if (includeWalkInPageScenario) {
    logJson({
      status: "render_verify_step_started",
      step: "scenario_walkin_page_non_destructive",
      baseUrl,
      skipDeploy,
    });

    await runProcess(process.execPath, ["scripts/walkin-page-scenario.js", "--non-destructive"], {
      env: {
        ...process.env,
        APP_BASE_URL: baseUrl,
        SCENARIO_NON_DESTRUCTIVE: "1",
      },
      label: "render scenario:walkin-page",
    });
  }

  if (includeScenario) {
    logJson({
      status: "render_verify_step_started",
      step: "scenario_scheduling_walkin_non_destructive",
      baseUrl,
      skipDeploy,
    });

    await runProcess(process.execPath, ["scripts/scheduling-walkin-scenario.js", "--non-destructive"], {
      env: {
        ...process.env,
        APP_BASE_URL: baseUrl,
        SCENARIO_NON_DESTRUCTIVE: "1",
      },
      label: "render scenario:scheduling-walkin",
    });
  }

  if (!skipDeploy && enableLogAudit) {
    const ownerId = servicePayload?.ownerId;
    if (typeof ownerId !== "string" || ownerId.trim().length === 0) {
      throw new Error("Render service payload did not include ownerId required for log audit");
    }

    logJson({
      status: "render_verify_step_started",
      step: "post_deploy_log_audit",
      serviceId,
      ownerId,
      deployId: deployPayload?.id ?? null,
    });

    await runPostDeployLogAudit({
      serviceId,
      ownerId,
      deployPayload,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
      logLimit,
      maxWarnings,
      maxErrors,
      maxRepoWarnings,
      failOnTruncation: failOnLogTruncation,
      summaryOutputPath,
      writeRawAuditLogs,
      rawOutputPath,
      gzipRawOutput: gzipRawAuditOutput,
    });
  } else if (enableLogAudit) {
    logJson({
      status: "render_verify_step_skipped",
      step: "post_deploy_log_audit",
      reason: "skip_deploy_enabled",
    });
  }

  logJson({
    status: "render_verify_passed",
    serviceId,
    baseUrl,
    skipDeploy,
    includeScenario,
    includeBookingScenario,
    includeWalkInPageScenario,
    verifyCommitParity,
    enableLogAudit,
    deployId: deployPayload?.id ?? null,
    deployStatus: deployPayload?.status ?? null,
    deployCommitId: deployPayload?.commit?.id ?? null,
  });
}

main().catch((error) => {
  logJson({
    status: "render_verify_failed",
    message: redactSecretsInText(error.message),
    details: redactSecrets(error?.details ?? null),
  });
  process.exit(1);
});
