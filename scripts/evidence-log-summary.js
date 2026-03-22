import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { redactSecretsInText } from "./secret-redaction.js";

const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/gu;
const ERROR_TEXT_PATTERN = /\b(error|exception|fatal|failed|panic|traceback|unhandled)\b/iu;
const REPO_ACCESS_WARNING_PATTERN = /don't have access to your repo/iu;
const LOG_SEVERITY_RANK = {
  info: 0,
  warn: 1,
  error: 2,
  fatal: 3,
};

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

function resolveLogLabelValue(entry, labelName) {
  if (!Array.isArray(entry?.labels)) {
    return "";
  }
  const match = entry.labels.find((label) => label?.name === labelName);
  return typeof match?.value === "string" ? match.value.trim() : "";
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
    // Best effort.
  }
  return null;
}

function resolveLogSeverity(entry) {
  const message = String(entry?.message ?? "").replace(ANSI_ESCAPE_PATTERN, "");
  const parsedJsonMessage = parseJsonObject(message);
  const labelLevel = normalizeSeverity(resolveLogLabelValue(entry, "level"));
  const jsonLevel = normalizeSeverity(parsedJsonMessage?.level);

  let severity = highestSeverity(labelLevel, jsonLevel);
  if (severity === "info" && ERROR_TEXT_PATTERN.test(message)) {
    severity = "error";
  }

  return { severity, message };
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    inputPath: "",
    outputPath: "",
    gzipRaw: false,
    gzipPath: "",
    deleteInputAfterGzip: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--input") {
      options.inputPath = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (token === "--output") {
      options.outputPath = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (token === "--gzip-raw") {
      options.gzipRaw = true;
      continue;
    }

    if (token === "--gzip-output") {
      options.gzipPath = args[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (token === "--delete-input-after-gzip") {
      options.deleteInputAfterGzip = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      process.stdout.write(
        "Usage: node scripts/evidence-log-summary.js --input <path> [--output <summary-path>] [--gzip-raw] [--gzip-output <path>] [--delete-input-after-gzip]\n",
      );
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.inputPath) {
    throw new Error("--input is required");
  }

  return options;
}

async function loadEntries(inputPath) {
  const rawText = await fs.readFile(inputPath, "utf8");

  if (inputPath.endsWith(".ndjson")) {
    return rawText
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
  }

  const parsed = JSON.parse(rawText);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed?.logs)) {
    return parsed.logs;
  }

  throw new Error("Unsupported input payload: expected NDJSON lines, JSON array, or object.logs array");
}

function summarizeEntries(entries, sourcePath) {
  const severityTotals = {
    info: 0,
    warn: 0,
    error: 0,
    fatal: 0,
  };

  let repoAccessWarningCount = 0;
  const severeSamples = [];

  for (const entry of entries) {
    const { severity, message } = resolveLogSeverity(entry);
    severityTotals[severity] += 1;

    if (REPO_ACCESS_WARNING_PATTERN.test(message)) {
      repoAccessWarningCount += 1;
    }

    if ((severity === "warn" || severity === "error" || severity === "fatal") && severeSamples.length < 10) {
      severeSamples.push({
        timestamp: entry?.timestamp ?? null,
        severity,
        message: message.slice(0, 240),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    totals: {
      rows: entries.length,
      bySeverity: severityTotals,
      repoAccessWarningCount,
    },
    severeSamples,
  };
}

function defaultSummaryPath(inputPath) {
  const ext = path.extname(inputPath);
  const base = ext.length > 0 ? inputPath.slice(0, -ext.length) : inputPath;
  return `${base}.summary.json`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.inputPath);
  const outputPath = path.resolve(process.cwd(), options.outputPath || defaultSummaryPath(options.inputPath));

  const entries = await loadEntries(inputPath);
  const summary = summarizeEntries(entries, path.relative(process.cwd(), inputPath));

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  let gzipOutputPath = null;
  if (options.gzipRaw) {
    const rawText = await fs.readFile(inputPath, "utf8");
    const resolvedGzipPath = path.resolve(
      process.cwd(),
      options.gzipPath || `${options.inputPath.endsWith(".gz") ? options.inputPath : `${options.inputPath}.gz`}`,
    );
    await fs.mkdir(path.dirname(resolvedGzipPath), { recursive: true });
    await fs.writeFile(resolvedGzipPath, gzipSync(rawText));
    gzipOutputPath = resolvedGzipPath;

    if (options.deleteInputAfterGzip) {
      await fs.unlink(inputPath);
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      status: "evidence_log_summary_ok",
      inputPath: path.relative(process.cwd(), inputPath),
      outputPath: path.relative(process.cwd(), outputPath),
      rows: summary.totals.rows,
      gzipOutputPath: gzipOutputPath ? path.relative(process.cwd(), gzipOutputPath) : null,
      inputDeleted: options.gzipRaw && options.deleteInputAfterGzip,
    })}\n`,
  );
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({
      status: "evidence_log_summary_failed",
      message: redactSecretsInText(error.message),
    })}\n`,
  );
  process.exit(1);
});
