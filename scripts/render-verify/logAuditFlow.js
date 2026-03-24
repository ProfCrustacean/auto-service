import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const ERROR_TEXT_PATTERN = /\b(error|exception|fatal|failed|panic|traceback|unhandled)\b/iu;
const REPO_ACCESS_WARNING_PATTERN = /don't have access to your repo/iu;
const LOG_SEVERITY_RANK = {
  info: 0,
  warn: 1,
  error: 2,
  fatal: 3,
};
const DEFAULT_LOG_AUDIT_WINDOW_PAD_MS = 30 * 1000;

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

function getLogAuditWindowStart(deployPayload, windowPadMs = DEFAULT_LOG_AUDIT_WINDOW_PAD_MS) {
  const candidate = safeIsoDateOrNull(deployPayload?.startedAt)
    ?? safeIsoDateOrNull(deployPayload?.createdAt)
    ?? new Date(Date.now() - (15 * 60 * 1000)).toISOString();
  const shifted = new Date(new Date(candidate).getTime() - windowPadMs);
  return shifted.toISOString();
}

export function resolveRawAuditOutputPath(basePath, gzipRawOutput) {
  if (!gzipRawOutput) {
    return basePath;
  }

  return basePath.endsWith(".gz") ? basePath : `${basePath}.gz`;
}

export async function runPostDeployLogAudit({
  serviceId,
  ownerId,
  deployPayload,
  requestRenderApi,
  mode,
  logLimit,
  initialLogLimit,
  maxWarnings,
  maxErrors,
  maxRepoWarnings,
  failOnTruncation,
  summaryOutputPath,
  writeRawAuditLogs,
  rawOutputPath,
  gzipRawOutput,
  redactSecrets,
  logJson,
}) {
  const startTime = getLogAuditWindowStart(deployPayload);
  const endTime = new Date().toISOString();

  const logTypes = ["build", "app"];
  const fetchTypedResponses = async (limit) => Promise.all(
    logTypes.map(async (type) => {
      const endpoint = makeRenderLogsPath({
        ownerId,
        serviceId,
        type,
        startTime,
        endTime,
        limit,
      });

      const response = await requestRenderApi({
        method: "GET",
        path: endpoint,
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

  const summarizeTypedResponses = (typedResponses) => {
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
    const rowsFetched = typedResponses.reduce((sum, item) => sum + item.logs.length, 0);
    const warningCount = severityCounts.warn;
    const errorCount = severityCounts.error + severityCounts.fatal;

    return {
      dedupedLogs,
      severityCounts,
      severeSamples,
      repoAccessWarningCount,
      typeSummary,
      truncatedTypes,
      rowsFetched,
      warningCount,
      errorCount,
    };
  };

  const normalizedInitialLimit = Math.min(initialLogLimit, logLimit);
  let typedResponses = await fetchTypedResponses(normalizedInitialLimit);
  let analysis = summarizeTypedResponses(typedResponses);
  const shouldEscalate = (
    mode === "balanced"
    && normalizedInitialLimit < logLimit
    && (
      analysis.warningCount > 0
      || analysis.errorCount > 0
      || analysis.repoAccessWarningCount > 0
      || analysis.truncatedTypes.length > 0
    )
  );

  let escalated = false;
  const rowsFetchedInitial = analysis.rowsFetched;
  let rowsFetchedExpanded = 0;
  if (shouldEscalate) {
    typedResponses = await fetchTypedResponses(logLimit);
    analysis = summarizeTypedResponses(typedResponses);
    escalated = true;
    rowsFetchedExpanded = analysis.rowsFetched;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    startTime,
    endTime,
    deployId: deployPayload?.id ?? null,
    mode,
    escalated,
    fetch: {
      initialLimit: normalizedInitialLimit,
      fullLimit: logLimit,
      rowsFetchedInitial,
      rowsFetchedExpanded,
    },
    totals: {
      rows: analysis.dedupedLogs.length,
      bySeverity: analysis.severityCounts,
      repoAccessWarningCount: analysis.repoAccessWarningCount,
      truncatedTypes: analysis.truncatedTypes,
    },
    thresholds: {
      maxWarnings,
      maxErrors,
      maxRepoWarnings,
      failOnTruncation,
    },
    types: analysis.typeSummary,
    severeSamples: analysis.severeSamples,
  };

  await fs.mkdir(path.dirname(summaryOutputPath), { recursive: true });
  await fs.writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  let resolvedRawOutputPath = null;
  if (writeRawAuditLogs) {
    const outputPath = resolveRawAuditOutputPath(rawOutputPath, gzipRawOutput);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const rawPayload = analysis.dedupedLogs.map((entry) => JSON.stringify(redactSecrets(entry))).join("\n");
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

  const warningCount = analysis.warningCount;
  const errorCount = analysis.errorCount;
  const failures = [];

  if (warningCount > maxWarnings) {
    failures.push(`warnings=${warningCount} exceeded threshold=${maxWarnings}`);
  }
  if (errorCount > maxErrors) {
    failures.push(`errors=${errorCount} exceeded threshold=${maxErrors}`);
  }
  if (analysis.repoAccessWarningCount > maxRepoWarnings) {
    failures.push(`repoAccessWarnings=${analysis.repoAccessWarningCount} exceeded threshold=${maxRepoWarnings}`);
  }
  if (failOnTruncation && analysis.truncatedTypes.length > 0) {
    failures.push(`log response truncated for types: ${analysis.truncatedTypes.join(", ")}`);
  }

  if (failures.length > 0) {
    throw new Error(`Render post-deploy log audit failed: ${failures.join("; ")}`);
  }
}
