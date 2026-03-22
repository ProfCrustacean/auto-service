import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_MASTER_PACKET_LINES = 220;
const MIN_SNIPPET_LENGTH = 240;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function pickMirrorProbe(sourceText) {
  const lines = sourceText.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length < 24) {
    return "";
  }

  const probe = lines.slice(10, 26).join("\n");
  return probe.length >= MIN_SNIPPET_LENGTH ? probe : "";
}

test("MASTER_CONTEXT_PACKET stays compact index and does not mirror packet docs", () => {
  const masterPath = path.resolve(repoRoot, "MASTER_CONTEXT_PACKET.md");
  const master = read(masterPath);
  const masterLines = master.split("\n").length;

  assert.ok(master.includes("index only"), "MASTER_CONTEXT_PACKET.md must declare index-only purpose");
  assert.ok(
    masterLines <= MAX_MASTER_PACKET_LINES,
    `MASTER_CONTEXT_PACKET.md must stay compact (<= ${MAX_MASTER_PACKET_LINES} lines, found ${masterLines})`,
  );
  assert.equal(
    master.includes("Product implementation not started yet"),
    false,
    "stale packet snapshots must not remain in MASTER_CONTEXT_PACKET.md",
  );

  const docsDir = path.resolve(repoRoot, "docs");
  const packetDocPaths = fs.readdirSync(docsDir)
    .filter((name) => /^\d{2}_.+\.md$/u.test(name))
    .map((name) => path.resolve(docsDir, name))
    .sort((left, right) => left.localeCompare(right));

  const canonicalSources = [
    path.resolve(repoRoot, "README.md"),
    ...packetDocPaths,
  ];

  for (const sourcePath of canonicalSources) {
    const source = read(sourcePath);
    const probe = pickMirrorProbe(source);
    if (probe.length === 0) {
      continue;
    }

    assert.equal(
      master.includes(probe),
      false,
      `MASTER_CONTEXT_PACKET.md appears to embed canonical content from ${path.basename(sourcePath)}`,
    );
  }
});
