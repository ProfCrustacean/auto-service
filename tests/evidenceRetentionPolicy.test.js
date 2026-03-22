import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAX_TRACKED_EVIDENCE_FILE_BYTES = 200 * 1024;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

test("evidence retention policy keeps raw artifacts out of tracked files", () => {
  const gitignorePath = path.resolve(repoRoot, ".gitignore");
  const gitignore = fs.readFileSync(gitignorePath, "utf8");

  assert.ok(
    gitignore.includes("evidence/**/*.raw"),
    ".gitignore must ignore evidence raw artifacts",
  );
  assert.ok(
    gitignore.includes("evidence/**/*.ndjson"),
    ".gitignore must ignore evidence ndjson artifacts",
  );

  const trackedEvidence = execFileSync("git", ["ls-files", "evidence"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => fs.existsSync(path.resolve(repoRoot, line)));

  const disallowedTracked = trackedEvidence.filter((filePath) => (
    filePath.endsWith(".raw")
    || filePath.endsWith(".ndjson")
    || filePath.endsWith(".raw.gz")
  ));
  assert.equal(
    disallowedTracked.length,
    0,
    `tracked evidence must not include raw artifacts: ${disallowedTracked.join(", ")}`,
  );

  const oversizedTracked = trackedEvidence
    .map((filePath) => {
      const bytes = fs.statSync(path.resolve(repoRoot, filePath)).size;
      return { filePath, bytes };
    })
    .filter((entry) => entry.bytes > MAX_TRACKED_EVIDENCE_FILE_BYTES);

  assert.equal(
    oversizedTracked.length,
    0,
    `tracked evidence files must stay <= ${MAX_TRACKED_EVIDENCE_FILE_BYTES} bytes: ${oversizedTracked.map((entry) => `${entry.filePath} (${entry.bytes})`).join(", ")}`,
  );
});
