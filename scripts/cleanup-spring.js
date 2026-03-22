import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFileSync, spawnSync } from "node:child_process";
import { redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";

const DEFAULT_CANONICAL_PATH = "data/hygiene/evidence-canonical.json";
const DEFAULT_EVIDENCE_DIR = "evidence";
const GIT_REMOVE_CHUNK_SIZE = 64;

function printHelp() {
  process.stdout.write("Usage: node scripts/cleanup-spring.js [--dry-run|--apply] [--prune-tracked] [--prune-untracked] [--canonical <path>] [--evidence-dir <path>]\n");
}

function normalizeRepoPath(relativeOrAbsolutePath) {
  const absolute = path.resolve(process.cwd(), relativeOrAbsolutePath);
  return path.relative(process.cwd(), absolute).replaceAll(path.sep, "/");
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    apply: false,
    pruneTracked: false,
    pruneUntracked: false,
    canonicalPath: DEFAULT_CANONICAL_PATH,
    evidenceDir: DEFAULT_EVIDENCE_DIR,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token === "--dry-run") {
      options.apply = false;
      continue;
    }
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (token === "--prune-tracked") {
      options.pruneTracked = true;
      continue;
    }
    if (token === "--prune-untracked") {
      options.pruneUntracked = true;
      continue;
    }
    if (token === "--canonical") {
      options.canonicalPath = args[index + 1];
      index += 1;
      continue;
    }
    if (token === "--evidence-dir") {
      options.evidenceDir = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.help && !options.pruneTracked && !options.pruneUntracked) {
    throw new Error("At least one pruning mode must be selected (--prune-tracked and/or --prune-untracked)");
  }

  return options;
}

function runGitCommand(args) {
  const output = execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replaceAll(path.sep, "/"));
}

function listTrackedFiles(evidenceDir) {
  return runGitCommand(["ls-files", "--", evidenceDir]);
}

function listUntrackedFiles(evidenceDir) {
  return runGitCommand(["ls-files", "--others", "--exclude-standard", "--", evidenceDir]);
}

function loadCanonicalTrackedEvidence(canonicalPath) {
  const absoluteCanonicalPath = path.resolve(process.cwd(), canonicalPath);
  const raw = fs.readFileSync(absoluteCanonicalPath, "utf8");
  const parsed = JSON.parse(raw);
  const trackedEvidence = parsed?.trackedEvidence;

  if (!Array.isArray(trackedEvidence) || trackedEvidence.length === 0) {
    throw new Error("Canonical evidence manifest must include non-empty 'trackedEvidence' array");
  }

  return trackedEvidence.map((filePath) => normalizeRepoPath(filePath));
}

function toEntry(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const bytes = fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
  return { path: filePath, bytes };
}

function splitIntoChunks(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function pruneTrackedFiles(files) {
  for (const chunk of splitIntoChunks(files, GIT_REMOVE_CHUNK_SIZE)) {
    const result = spawnSync("git", ["rm", "-f", "--", ...chunk], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    if (result.status !== 0) {
      throw new Error(`Failed to remove tracked files: ${result.stderr || result.stdout}`);
    }
  }
}

async function pruneUntrackedFiles(files) {
  for (const filePath of files) {
    await fsp.rm(path.resolve(process.cwd(), filePath), { force: true });
  }
}

function buildSummary({ apply, options, canonicalPath, evidenceDir, trackedCandidates, untrackedCandidates }) {
  const trackedBytes = trackedCandidates.reduce((total, entry) => total + entry.bytes, 0);
  const untrackedBytes = untrackedCandidates.reduce((total, entry) => total + entry.bytes, 0);

  return {
    status: apply ? "cleanup_spring_complete" : "cleanup_spring_dry_run_complete",
    apply,
    dryRun: !apply,
    options: {
      pruneTracked: options.pruneTracked,
      pruneUntracked: options.pruneUntracked,
    },
    canonicalPath,
    evidenceDir,
    summary: {
      trackedCandidateCount: trackedCandidates.length,
      untrackedCandidateCount: untrackedCandidates.length,
      trackedBytes,
      untrackedBytes,
      totalCandidateCount: trackedCandidates.length + untrackedCandidates.length,
      totalCandidateBytes: trackedBytes + untrackedBytes,
      trackedPrunedCount: apply && options.pruneTracked ? trackedCandidates.length : 0,
      untrackedPrunedCount: apply && options.pruneUntracked ? untrackedCandidates.length : 0,
      totalPrunedCount: apply
        ? (options.pruneTracked ? trackedCandidates.length : 0) + (options.pruneUntracked ? untrackedCandidates.length : 0)
        : 0,
      totalPrunedBytes: apply
        ? (options.pruneTracked ? trackedBytes : 0) + (options.pruneUntracked ? untrackedBytes : 0)
        : 0,
    },
    candidates: {
      tracked: trackedCandidates,
      untracked: untrackedCandidates,
    },
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }

    const canonicalPath = normalizeRepoPath(options.canonicalPath);
    const evidenceDir = normalizeRepoPath(options.evidenceDir);
    const canonicalTracked = loadCanonicalTrackedEvidence(canonicalPath);
    const canonicalSet = new Set(canonicalTracked);

    const trackedCandidates = options.pruneTracked
      ? listTrackedFiles(evidenceDir)
        .filter((filePath) => !canonicalSet.has(filePath))
        .map(toEntry)
      : [];

    const untrackedCandidates = options.pruneUntracked
      ? listUntrackedFiles(evidenceDir).map(toEntry)
      : [];

    trackedCandidates.sort((left, right) => left.path.localeCompare(right.path));
    untrackedCandidates.sort((left, right) => left.path.localeCompare(right.path));

    if (options.apply) {
      if (options.pruneTracked && trackedCandidates.length > 0) {
        pruneTrackedFiles(trackedCandidates.map((entry) => entry.path));
      }
      if (options.pruneUntracked && untrackedCandidates.length > 0) {
        await pruneUntrackedFiles(untrackedCandidates.map((entry) => entry.path));
      }
    }

    const payload = buildSummary({
      apply: options.apply,
      options,
      canonicalPath,
      evidenceDir,
      trackedCandidates,
      untrackedCandidates,
    });
    process.stdout.write(`${stringifyRedacted(payload, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${stringifyRedacted({
      status: "cleanup_spring_failed",
      errorType: error?.name ?? "Error",
      message: redactSecretsInText(error?.message ?? "Unknown error"),
    }, 2)}\n`);
    process.exit(1);
  }
}

main();
