import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("hygiene-check passes branch and tracked-artifact policy", () => {
  const result = spawnSync(process.execPath, ["scripts/hygiene-check.js"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stdout || result.stderr);
  const lines = result.stdout.trim().split("\n");
  const payload = JSON.parse(lines.at(0));
  assert.equal(payload.status, "hygiene_check_ok");
  assert.equal(payload.trackedGeneratedCount, 0);
});
