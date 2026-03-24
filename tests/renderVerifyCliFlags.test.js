import test from "node:test";
import assert from "node:assert/strict";
import { parseRenderVerifyCliArgs, resolveSkipDeployFromInputs } from "../scripts/verify-render-cli.js";

test("parseRenderVerifyCliArgs parses deploy mode flags", () => {
  assert.deepEqual(parseRenderVerifyCliArgs([]), {
    deployMode: null,
    skipDeployOverride: null,
    logLevel: null,
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--skip-deploy"]), {
    deployMode: "skip",
    skipDeployOverride: true,
    logLevel: null,
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--deploy"]), {
    deployMode: "deploy",
    skipDeployOverride: false,
    logLevel: null,
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--verbose"]), {
    deployMode: null,
    skipDeployOverride: null,
    logLevel: "verbose",
  });

  assert.deepEqual(parseRenderVerifyCliArgs(["--summary"]), {
    deployMode: null,
    skipDeployOverride: null,
    logLevel: "summary",
  });
});

test("parseRenderVerifyCliArgs rejects conflicting or unknown flags", () => {
  assert.throws(() => parseRenderVerifyCliArgs(["--skip-deploy", "--deploy"]), /Conflicting arguments/u);
  assert.throws(() => parseRenderVerifyCliArgs(["--summary", "--verbose"]), /Conflicting arguments/u);
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
