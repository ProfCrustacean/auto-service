import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

test("tracked evidence set matches canonical manifest", () => {
  const manifestPath = path.resolve(repoRoot, "data/hygiene/evidence-canonical.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const canonical = (manifest?.trackedEvidence ?? [])
    .map((filePath) => filePath.replaceAll(path.sep, "/"))
    .sort((left, right) => left.localeCompare(right));

  assert.ok(canonical.length > 0, "canonical manifest must include at least one tracked evidence file");
  assert.equal(new Set(canonical).size, canonical.length, "canonical tracked evidence list must be unique");

  for (const filePath of canonical) {
    assert.ok(filePath.startsWith("evidence/"), `canonical evidence path must be under evidence/: ${filePath}`);
    assert.ok(fs.existsSync(path.resolve(repoRoot, filePath)), `canonical evidence file must exist: ${filePath}`);
  }

  const tracked = execFileSync("git", ["ls-files", "evidence"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .sort((left, right) => left.localeCompare(right));

  assert.deepEqual(tracked, canonical, "tracked evidence files must match canonical manifest exactly");
});
