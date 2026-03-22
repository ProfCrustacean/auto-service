import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { redactSecretsInText } from "./secret-redaction.js";

const DEFAULT_CONFIG_PATH = "data/bloat/budgets.json";
const DEFAULT_REPORT_PATH = "evidence/bloat-audit-latest.json";

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => fs.existsSync(path.resolve(process.cwd(), line)));
}

function classifyArea(filePath) {
  if (filePath.startsWith("src/")) {
    return "src";
  }
  if (filePath.startsWith("tests/")) {
    return "tests";
  }
  if (filePath.startsWith("scripts/")) {
    return "scripts";
  }
  if (filePath.startsWith("docs/")) {
    return "docs";
  }
  if (filePath.startsWith("evidence/")) {
    return "evidence";
  }
  return "other";
}

function countLines(filePath) {
  const text = fs.readFileSync(path.resolve(process.cwd(), filePath), "utf8");
  return text.split("\n").length;
}

async function runJscpdReport() {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "auto-service-jscpd-"));
  const outputDir = path.join(tempRoot, "report");
  const args = [
    "--yes",
    "jscpd@4.0.5",
    "--min-lines",
    "6",
    "--min-tokens",
    "50",
    "--format",
    "javascript",
    "--reporters",
    "json",
    "--output",
    outputDir,
    "src",
    "tests",
    "scripts",
  ];

  try {
    execFileSync("npx", args, {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf8",
    });
    const reportPath = path.join(outputDir, "jscpd-report.json");
    const report = readJsonFile(reportPath);
    const total = report?.statistics?.total;
    if (!total || typeof total.percentage !== "number") {
      throw new Error("jscpd report did not include statistics.total.percentage");
    }

    return {
      percentage: total.percentage,
      duplicatedLines: total.duplicatedLines,
      clones: total.clones,
      sources: total.sources,
      lines: total.lines,
      reportPath,
    };
  } finally {
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

function buildViolation(code, message, { actual, threshold }) {
  return {
    code,
    message,
    actual,
    threshold,
  };
}

async function main() {
  const configPath = path.resolve(process.cwd(), process.env.BLOAT_BUDGET_CONFIG || DEFAULT_CONFIG_PATH);
  const reportPath = path.resolve(process.cwd(), process.env.BLOAT_REPORT_PATH || DEFAULT_REPORT_PATH);
  const allowRegression = process.env.BLOAT_ALLOW_REGRESSION === "1";

  const config = readJsonFile(configPath);
  const trackedFiles = getTrackedFiles();

  const trackedByArea = {
    src: 0,
    tests: 0,
    scripts: 0,
    docs: 0,
    evidence: 0,
    other: 0,
  };
  const trackedFileSizes = trackedFiles.map((filePath) => {
    const bytes = fs.statSync(path.resolve(process.cwd(), filePath)).size;
    trackedByArea[classifyArea(filePath)] += bytes;
    return { path: filePath, bytes };
  });
  trackedFileSizes.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));

  const trackedTotalBytes = trackedFileSizes.reduce((total, entry) => total + entry.bytes, 0);
  const evidenceFiles = trackedFileSizes.filter((entry) => entry.path.startsWith("evidence/"));
  const largestEvidenceFile = evidenceFiles[0] ?? null;
  const evidenceTotalBytes = evidenceFiles.reduce((total, entry) => total + entry.bytes, 0);
  const evidenceRawLikeTracked = evidenceFiles
    .filter((entry) => (
      entry.path.endsWith(".raw")
      || entry.path.endsWith(".raw.gz")
      || entry.path.endsWith(".ndjson")
    ))
    .map((entry) => entry.path);

  const docsLineCounts = {
    README: countLines("README.md"),
    STATUS: countLines("STATUS.md"),
    PLANS: countLines("PLANS.md"),
  };

  const duplication = await runJscpdReport();
  const thresholds = config?.thresholds ?? {};
  const areaThresholds = thresholds.maxTrackedBytesByArea ?? {};
  const docLineThresholds = thresholds.maxDocLines ?? {};

  const violations = [];

  if (typeof thresholds.maxTrackedBytes === "number" && trackedTotalBytes > thresholds.maxTrackedBytes) {
    violations.push(buildViolation("tracked_bytes_total", "Tracked bytes exceeded budget", {
      actual: trackedTotalBytes,
      threshold: thresholds.maxTrackedBytes,
    }));
  }

  for (const [area, threshold] of Object.entries(areaThresholds)) {
    const actual = trackedByArea[area] ?? 0;
    if (typeof threshold === "number" && actual > threshold) {
      violations.push(buildViolation(`tracked_bytes_area_${area}`, `Tracked bytes exceeded ${area} area budget`, {
        actual,
        threshold,
      }));
    }
  }

  if (
    typeof thresholds.maxTrackedEvidenceFileBytes === "number"
    && largestEvidenceFile
    && largestEvidenceFile.bytes > thresholds.maxTrackedEvidenceFileBytes
  ) {
    violations.push(buildViolation("evidence_max_file", "Largest tracked evidence file exceeded budget", {
      actual: largestEvidenceFile.bytes,
      threshold: thresholds.maxTrackedEvidenceFileBytes,
    }));
  }

  for (const [docName, threshold] of Object.entries(docLineThresholds)) {
    const actual = docsLineCounts[docName];
    if (typeof threshold === "number" && typeof actual === "number" && actual > threshold) {
      violations.push(buildViolation(`doc_lines_${docName.toLowerCase()}`, `${docName}.md line count exceeded budget`, {
        actual,
        threshold,
      }));
    }
  }

  if (typeof thresholds.maxDuplicationPercentage === "number" && duplication.percentage > thresholds.maxDuplicationPercentage) {
    violations.push(buildViolation("duplication_percentage", "JS duplication percentage exceeded budget", {
      actual: duplication.percentage,
      threshold: thresholds.maxDuplicationPercentage,
    }));
  }

  if (evidenceRawLikeTracked.length > 0) {
    violations.push(buildViolation("tracked_raw_evidence", "Raw evidence artifacts must not be tracked", {
      actual: evidenceRawLikeTracked,
      threshold: [],
    }));
  }

  const baseStatus = violations.length === 0 ? "pass" : "fail";
  const finalStatus = baseStatus === "fail" && allowRegression ? "override" : baseStatus;

  const report = {
    status: finalStatus,
    generatedAt: new Date().toISOString(),
    configPath: path.relative(process.cwd(), configPath),
    reportPath: path.relative(process.cwd(), reportPath),
    allowRegression,
    thresholds,
    metrics: {
      tracked: {
        totalBytes: trackedTotalBytes,
        byArea: trackedByArea,
      },
      topTrackedFiles: trackedFileSizes.slice(0, 20),
      evidence: {
        trackedFileCount: evidenceFiles.length,
        totalBytes: evidenceTotalBytes,
        largestFile: largestEvidenceFile,
        rawLikeTracked: evidenceRawLikeTracked,
      },
      docs: {
        lineCounts: docsLineCounts,
      },
      duplication,
    },
    violations,
  };

  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report)}\n`);

  if (finalStatus === "fail") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stdout.write(
    `${JSON.stringify({
      status: "bloat_audit_failed",
      message: redactSecretsInText(error.message),
    })}\n`,
  );
  process.exit(1);
});
