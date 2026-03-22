import test from "node:test";
import assert from "node:assert/strict";
import { parseRenderVerifyCliArgs, resolveSkipDeployFromInputs } from "../scripts/verify-render-cli.js";

test("parseRenderVerifyCliArgs parses deploy mode flags", () => {
  assert.deepEqual(parseRenderVerifyCliArgs([]), {
    deployMode: null,
    skipDeployOverride: null,
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--skip-deploy"]), {
    deployMode: "skip",
    skipDeployOverride: true,
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--deploy"]), {
    deployMode: "deploy",
    skipDeployOverride: false,
  });
});

test("parseRenderVerifyCliArgs rejects conflicting or unknown flags", () => {
  assert.throws(() => parseRenderVerifyCliArgs(["--skip-deploy", "--deploy"]), /Conflicting arguments/u);
  assert.throws(() => parseRenderVerifyCliArgs(["--nope"]), /Unknown argument/u);
});

test("resolveSkipDeployFromInputs enforces CLI precedence over env", () => {
  assert.equal(resolveSkipDeployFromInputs({
    envValue: "1",
    cliOptions: parseRenderVerifyCliArgs([]),
  }), true);

  assert.equal(resolveSkipDeployFromInputs({
    envValue: "1",
    cliOptions: parseRenderVerifyCliArgs(["--deploy"]),
  }), false);

  assert.equal(resolveSkipDeployFromInputs({
    envValue: undefined,
    cliOptions: parseRenderVerifyCliArgs(["--skip-deploy"]),
  }), true);
});
