import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import { buildExcerpt, positionFromIndex, scanTextForSecrets } from "./secrets-scan-core.js";

function isProbablyText(content) {
  const probe = content.subarray(0, Math.min(content.length, 2048));
  return !probe.includes(0);
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
  return output
    .split("\0")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

async function listFilesRecursive(rootDir) {
  const results = [];

  async function visit(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (entry.isFile()) {
        results.push(path.relative(process.cwd(), absolute));
      }
    }
  }

  try {
    await visit(rootDir);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return results;
}

async function collectScanTargets() {
  const tracked = listTrackedFiles();
  const evidence = await listFilesRecursive(path.resolve(process.cwd(), "evidence"));
  return [...new Set([...tracked, ...evidence])].sort((left, right) => left.localeCompare(right));
}

async function scanFile(relativePath) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  let content;
  try {
    content = await fs.readFile(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  if (!isProbablyText(content)) {
    return [];
  }

  const text = content.toString("utf8");
  const findings = scanTextForSecrets(text);

  return findings.map((finding) => {
    const { line, column } = positionFromIndex(text, finding.index);
    return {
      file: relativePath,
      line,
      column,
      pattern: finding.pattern,
      excerpt: buildExcerpt(text, finding.index),
    };
  });
}

async function main() {
  const targets = await collectScanTargets();
  const findings = [];

  for (const target of targets) {
    const fileFindings = await scanFile(target);
    findings.push(...fileFindings);
  }

  if (findings.length > 0) {
    process.stdout.write(`${JSON.stringify({
      status: "secrets_scan_failed",
      scannedFiles: targets.length,
      findingsCount: findings.length,
      findings,
    }, null, 2)}\n`);
    process.exit(1);
    return;
  }

  process.stdout.write(`${JSON.stringify({
    status: "secrets_scan_passed",
    scannedFiles: targets.length,
  })}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: "secrets_scan_failed",
    errorType: error?.name ?? "Error",
    message: error?.message ?? "Unknown error",
  })}\n`);
  process.exit(1);
});
