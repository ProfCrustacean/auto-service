import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_COMPLETED_IN_PLANS = 4;
const ARCHIVE_BATCH_DATE = new Date().toISOString().slice(0, 10);

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");
const plansPath = path.resolve(repoRoot, "PLANS.md");
const archivePath = path.resolve(repoRoot, "PLANS_ARCHIVE.md");

function getHeadingIndices(content, pattern) {
  const indices = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    indices.push({ index: match.index, heading: match[0] });
  }
  return indices;
}

function ensureArchiveFile() {
  if (fs.existsSync(archivePath)) {
    return;
  }

  const initialContent = `# PLANS_ARCHIVE.md

## Purpose

This file is the append-only archive for completed plans moved out of \`PLANS.md\`.

Use \`PLANS.md\` for active work and a short recent-history window.
Use this archive for full historical plan details.

## Archive batches
`;

  fs.writeFileSync(archivePath, initialContent, "utf8");
}

function parseCompletedPlanSections(plansContent, maintenanceStartIndex) {
  const completedPlanMatches = getHeadingIndices(plansContent, /^## Completed Plan — .+$/gm);
  const completedSections = completedPlanMatches.map((current, index) => {
    const next = completedPlanMatches[index + 1];
    const endIndex = next ? next.index : maintenanceStartIndex;
    return plansContent.slice(current.index, endIndex).trim();
  });

  return {
    completedPlanMatches,
    completedSections,
  };
}

function appendArchiveBatch(archiveSections) {
  if (archiveSections.length === 0) {
    return;
  }

  const archiveCurrent = fs.readFileSync(archivePath, "utf8").trimEnd();
  const movedHeadings = archiveSections
    .map((section) => {
      const heading = /^## Completed Plan — .+$/m.exec(section);
      return heading ? heading[0].replace(/^## /, "") : "Completed Plan — unknown";
    })
    .map((heading) => `- ${heading}`)
    .join("\n");

  const archiveBatch = `

## Archive Batch — ${ARCHIVE_BATCH_DATE}

### Moved from PLANS.md

${movedHeadings}

${archiveSections.join("\n\n")}
`;

  fs.writeFileSync(archivePath, `${archiveCurrent}${archiveBatch}\n`, "utf8");
}

function getArchiveSkeletonEntries() {
  const archiveContent = fs.readFileSync(archivePath, "utf8");
  const entries = [];
  let match;
  const pattern = /^## Completed Plan — (.+) \((\d{4}-\d{2}-\d{2})\)$/gm;
  while ((match = pattern.exec(archiveContent)) !== null) {
    const [, title, date] = match;
    entries.push(`- ${date} — ${title}`);
  }
  return entries;
}

function renderArchivedSkeletonSection(entries) {
  if (entries.length === 0) {
    return `## Archived plan skeleton

No archived plans yet.
`;
  }

  return `## Archived plan skeleton

Quick index of older completed plans moved to \`PLANS_ARCHIVE.md\`.

${entries.join("\n")}
`;
}

function main() {
  ensureArchiveFile();

  const plansContent = fs.readFileSync(plansPath, "utf8");
  const maintenanceMatch = /^## Maintenance rule$/m.exec(plansContent);
  if (!maintenanceMatch) {
    throw new Error("Could not find `## Maintenance rule` section in PLANS.md");
  }

  const maintenanceStartIndex = maintenanceMatch.index;
  const maintenanceSection = plansContent.slice(maintenanceStartIndex).trim();
  const { completedPlanMatches, completedSections } = parseCompletedPlanSections(
    plansContent,
    maintenanceStartIndex,
  );

  const firstCompletedPlanIndex =
    completedPlanMatches.length > 0 ? completedPlanMatches[0].index : maintenanceStartIndex;
  const prefixRaw = plansContent.slice(0, firstCompletedPlanIndex).trimEnd();
  const prefix = prefixRaw.replace(/\n## Archived plan skeleton[\s\S]*$/m, "").trimEnd();

  const keepSections = completedSections.slice(0, MAX_COMPLETED_IN_PLANS);
  const archiveSections = completedSections.slice(MAX_COMPLETED_IN_PLANS);
  appendArchiveBatch(archiveSections);

  const skeletonEntries = getArchiveSkeletonEntries();
  const archivedSkeletonSection = renderArchivedSkeletonSection(skeletonEntries).trim();
  const compactedPlansContent = `${prefix}

${archivedSkeletonSection}

${keepSections.join("\n\n")}

${maintenanceSection}
`;
  fs.writeFileSync(plansPath, compactedPlansContent, "utf8");

  const status = archiveSections.length > 0 ? "compacted" : "no_op";
  const reason =
    archiveSections.length > 0 ? "moved_excess_completed_plans_to_archive" : "completed_plan_count_within_limit";

  process.stdout.write(
    `${JSON.stringify({
      status,
      reason,
      completedPlans: completedSections.length,
      maxCompletedPlans: MAX_COMPLETED_IN_PLANS,
      movedPlans: archiveSections.length,
      remainingInPlans: keepSections.length,
      archivePath: "PLANS_ARCHIVE.md",
      archivedSkeletonEntries: skeletonEntries.length,
    })}\n`,
  );
}

main();
