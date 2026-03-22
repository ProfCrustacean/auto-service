import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("evidence-log-summary builds summary and optional gzip output", async () => {
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "auto-service-evidence-summary-"));
  const inputPath = path.join(tmpRoot, "render.raw.ndjson");
  const outputPath = path.join(tmpRoot, "render.summary.json");
  const gzipOutputPath = path.join(tmpRoot, "render.raw.ndjson.gz");

  const ndjson = [
    JSON.stringify({ timestamp: "2026-03-22T00:00:00.000Z", message: "ok", labels: [{ name: "level", value: "info" }] }),
    JSON.stringify({ timestamp: "2026-03-22T00:00:01.000Z", message: "warn sample", labels: [{ name: "level", value: "warn" }] }),
    JSON.stringify({ timestamp: "2026-03-22T00:00:02.000Z", message: "It looks like we don't have access to your repo" }),
  ].join("\n");
  await fsp.writeFile(inputPath, `${ndjson}\n`, "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "scripts/evidence-log-summary.js",
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--gzip-raw",
      "--gzip-output",
      gzipOutputPath,
    ],
    {
      cwd: path.resolve("."),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, `script must exit successfully, stderr=${result.stderr}`);
  assert.ok(fs.existsSync(outputPath), "summary output must exist");
  assert.ok(fs.existsSync(gzipOutputPath), "gzip output must exist");

  const summary = JSON.parse(await fsp.readFile(outputPath, "utf8"));
  assert.equal(summary.totals.rows, 3);
  assert.equal(summary.totals.bySeverity.warn, 1);
  assert.equal(summary.totals.repoAccessWarningCount, 1);
});
