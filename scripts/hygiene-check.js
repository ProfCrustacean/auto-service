import process from "node:process";
import { runCommandCapture } from "./harness-process.js";
import { stringifyRedacted } from "./secret-redaction.js";

function log(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

function normalizeLines(text) {
  return String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isAllowedBranch(branchName) {
  return branchName === "main" || branchName === "master" || branchName.startsWith("codex/");
}

async function getCurrentBranch() {
  const { stdout } = await runCommandCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    env: process.env,
    label: "git rev-parse --abbrev-ref HEAD",
  });
  return stdout.trim();
}

async function listTrackedGeneratedArtifacts() {
  const checks = [
    ".playwright-cli",
    "output/playwright",
    "evidence/*.png",
    "evidence/*.jpg",
    "evidence/*.jpeg",
    "evidence/*.raw",
    "evidence/*.raw.ndjson",
  ];

  const matches = [];
  for (const pattern of checks) {
    const { stdout } = await runCommandCapture(
      "git",
      ["ls-files", pattern],
      { env: process.env, label: `git ls-files ${pattern}` },
    );
    matches.push(...normalizeLines(stdout));
  }
  return [...new Set(matches)];
}

async function maybeCheckCleanWorktree() {
  if (process.env.HYGIENE_REQUIRE_CLEAN !== "1") {
    return [];
  }

  const { stdout } = await runCommandCapture("git", ["status", "--porcelain"], {
    env: process.env,
    label: "git status --porcelain",
  });
  return normalizeLines(stdout);
}

async function main() {
  const branch = await getCurrentBranch();
  const trackedGenerated = await listTrackedGeneratedArtifacts();
  const dirtyEntries = await maybeCheckCleanWorktree();

  const branchFailure = !isAllowedBranch(branch);
  const failures = [];
  if (branchFailure) {
    failures.push(`branch '${branch}' does not follow allowed policy (main/master/codex/*)`);
  }
  if (trackedGenerated.length > 0) {
    failures.push(`tracked generated artifacts detected (${trackedGenerated.length})`);
  }
  if (dirtyEntries.length > 0) {
    failures.push(`working tree is dirty (${dirtyEntries.length} entries) while HYGIENE_REQUIRE_CLEAN=1`);
  }

  log({
    status: failures.length === 0 ? "hygiene_check_ok" : "hygiene_check_failed",
    branch,
    trackedGeneratedCount: trackedGenerated.length,
    dirtyEntryCount: dirtyEntries.length,
  });

  if (trackedGenerated.length > 0) {
    log({
      status: "hygiene_check_tracked_generated_files",
      files: trackedGenerated,
    });
  }

  if (dirtyEntries.length > 0) {
    log({
      status: "hygiene_check_dirty_entries",
      entries: dirtyEntries.slice(0, 100),
    });
  }

  if (failures.length > 0) {
    log({
      status: "hygiene_check_failures",
      failures,
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  log({
    status: "hygiene_check_failed",
    message: error.message,
  });
  process.exitCode = 1;
});
