import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const cleanupScriptPath = path.resolve(repoRoot, "scripts/cleanup-spring.js");

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `command failed: ${command} ${args.join(" ")}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return result;
}

function runCleanup(cwd, args) {
  const result = spawnSync(process.execPath, [cleanupScriptPath, ...args], {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `cleanup script failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  return JSON.parse(result.stdout);
}

test("cleanup-spring dry-run and apply modes prune tracked and untracked evidence deterministically", async () => {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "auto-service-cleanup-spring-"));
  const evidenceDir = path.join(tmpRoot, "evidence");
  const dataDir = path.join(tmpRoot, "data", "hygiene");
  await fsp.mkdir(evidenceDir, { recursive: true });
  await fsp.mkdir(dataDir, { recursive: true });

  const keepTrackedPath = path.join(evidenceDir, "keep.json");
  const removeTrackedPath = path.join(evidenceDir, "legacy-tracked.json");
  const removeUntrackedPath = path.join(evidenceDir, "legacy-untracked.json");
  const canonicalPath = path.join(dataDir, "evidence-canonical.json");

  await fsp.writeFile(keepTrackedPath, "{\"keep\":true}\n", "utf8");
  await fsp.writeFile(removeTrackedPath, "{\"legacy\":true}\n", "utf8");
  await fsp.writeFile(canonicalPath, `${JSON.stringify({
    trackedEvidence: ["evidence/keep.json"],
  }, null, 2)}\n`, "utf8");

  runCommand("git", ["init"], tmpRoot);
  runCommand("git", ["config", "user.email", "test@example.com"], tmpRoot);
  runCommand("git", ["config", "user.name", "Test User"], tmpRoot);
  runCommand("git", ["add", "."], tmpRoot);
  runCommand("git", ["commit", "-m", "seed"], tmpRoot);

  await fsp.writeFile(removeUntrackedPath, "{\"untracked\":true}\n", "utf8");

  const dryRun = runCleanup(tmpRoot, ["--dry-run", "--prune-tracked", "--prune-untracked"]);
  assert.equal(dryRun.status, "cleanup_spring_dry_run_complete");
  assert.equal(dryRun.summary.trackedCandidateCount, 1);
  assert.equal(dryRun.summary.untrackedCandidateCount, 1);
  assert.equal(fs.existsSync(removeTrackedPath), true, "dry-run must not delete tracked candidate");
  assert.equal(fs.existsSync(removeUntrackedPath), true, "dry-run must not delete untracked candidate");

  const apply = runCleanup(tmpRoot, ["--apply", "--prune-tracked", "--prune-untracked"]);
  assert.equal(apply.status, "cleanup_spring_complete");
  assert.equal(apply.summary.trackedPrunedCount, 1);
  assert.equal(apply.summary.untrackedPrunedCount, 1);

  assert.equal(fs.existsSync(keepTrackedPath), true, "canonical tracked evidence must remain");
  assert.equal(fs.existsSync(removeTrackedPath), false, "tracked candidate must be removed");
  assert.equal(fs.existsSync(removeUntrackedPath), false, "untracked candidate must be removed");

  const trackedEvidenceResult = runCommand("git", ["ls-files", "evidence"], tmpRoot);
  const trackedEvidence = trackedEvidenceResult.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  assert.deepEqual(trackedEvidence, ["evidence/keep.json"]);
});
