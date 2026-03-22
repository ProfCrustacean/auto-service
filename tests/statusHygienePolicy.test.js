import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_STATUS_LINES = 320;
const MAX_STATUS_H2_SECTIONS = 12;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

test("status hygiene policy keeps STATUS.md compact and archive-backed", () => {
  const statusPath = path.resolve(repoRoot, "STATUS.md");
  const archivePath = path.resolve(repoRoot, "STATUS_ARCHIVE.md");

  const status = fs.readFileSync(statusPath, "utf8");
  const linesCount = status.split("\n").length;
  const h2SectionsCount = (status.match(/^## /gm) ?? []).length;

  assert.ok(fs.existsSync(archivePath), "STATUS_ARCHIVE.md must exist");
  assert.ok(status.includes("STATUS_ARCHIVE.md"), "STATUS.md must point to STATUS_ARCHIVE.md");
  assert.ok(
    linesCount <= MAX_STATUS_LINES,
    `STATUS.md should stay at most ${MAX_STATUS_LINES} lines (found ${linesCount})`,
  );
  assert.ok(
    h2SectionsCount <= MAX_STATUS_H2_SECTIONS,
    `STATUS.md should stay concise (<= ${MAX_STATUS_H2_SECTIONS} H2 sections, found ${h2SectionsCount})`,
  );

  const requiredSections = [
    "## Current objective",
    "## Current state",
    "## Verification snapshot",
    "## Environments",
    "## Active work focus",
  ];

  for (const requiredSection of requiredSections) {
    assert.ok(
      status.includes(requiredSection),
      `STATUS.md must include required section '${requiredSection}'`,
    );
  }
});
