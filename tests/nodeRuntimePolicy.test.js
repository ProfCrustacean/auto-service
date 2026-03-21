import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(dirname, "..");

test("runtime policy pins Node.js to 22 LTS for deterministic deploys", () => {
  const packageJsonPath = path.resolve(repoRoot, "package.json");
  const nodeVersionPath = path.resolve(repoRoot, ".node-version");

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const enginesNode = packageJson?.engines?.node;
  const nodeVersion = fs.readFileSync(nodeVersionPath, "utf8").trim();

  assert.equal(enginesNode, "22.x");
  assert.equal(nodeVersion, "22");
});
