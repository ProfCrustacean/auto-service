import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_COMPLETED_PLANS_IN_MAIN_FILE = 4;
const MAX_PLANS_LINES = 350;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

test("plans hygiene policy keeps PLANS.md compact and archive-backed", () => {
  const plansPath = path.resolve(repoRoot, "PLANS.md");
  const archivePath = path.resolve(repoRoot, "PLANS_ARCHIVE.md");

  const plans = fs.readFileSync(plansPath, "utf8");
  const archive = fs.readFileSync(archivePath, "utf8");
  const completedCount = (plans.match(/^## Completed Plan — /gm) ?? []).length;
  const linesCount = plans.split("\n").length;
  const archivedHeadingMatches = [...archive.matchAll(/^## Completed Plan — (.+) \((\d{4}-\d{2}-\d{2})\)$/gm)];

  assert.ok(fs.existsSync(archivePath), "PLANS_ARCHIVE.md must exist");
  assert.ok(plans.includes("PLANS_ARCHIVE.md"), "PLANS.md must reference PLANS_ARCHIVE.md");
  assert.ok(plans.includes("## Archived plan skeleton"), "PLANS.md must contain archived plan skeleton");
  assert.ok(
    completedCount <= MAX_COMPLETED_PLANS_IN_MAIN_FILE,
    `PLANS.md should keep at most ${MAX_COMPLETED_PLANS_IN_MAIN_FILE} completed plans (found ${completedCount})`,
  );
  assert.ok(linesCount <= MAX_PLANS_LINES, `PLANS.md should stay at most ${MAX_PLANS_LINES} lines (found ${linesCount})`);

  for (const match of archivedHeadingMatches) {
    const [, title, date] = match;
    const expectedSkeletonLine = `- ${date} — ${title}`;
    assert.ok(
      plans.includes(expectedSkeletonLine),
      `PLANS.md archived skeleton must include: ${expectedSkeletonLine}`,
    );
  }
});
