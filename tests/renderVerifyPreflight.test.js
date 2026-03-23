import test from "node:test";
import assert from "node:assert/strict";
import {
  assertGitPreflight,
  assertManualDeployPolicy,
  commitIdsMatch,
  parseGitStatusEntries,
  runGitPreflight,
} from "../scripts/render-verify-preflight.js";

test("parseGitStatusEntries keeps non-empty porcelain entries", () => {
  const entries = parseGitStatusEntries(" M STATUS.md\n?? evidence/tmp.txt\n\n");
  assert.deepEqual(entries, [" M STATUS.md", "?? evidence/tmp.txt"]);
});

test("commitIdsMatch accepts short/full SHA prefixes", () => {
  assert.equal(commitIdsMatch("abc1234", "abc1234ffeedd"), true);
  assert.equal(commitIdsMatch("abc1234ffeedd", "abc1234"), true);
  assert.equal(commitIdsMatch("abc1234", "def5678"), false);
});

test("assertGitPreflight fails on dirty worktree when clean check is required", () => {
  assert.throws(
    () => assertGitPreflight({
      expectedCommitId: "abc1234",
      headCommitId: "abc1234",
      remoteCommitId: "abc1234",
      remoteRef: "origin/main",
      requireCleanWorktree: true,
      requireRemoteSync: true,
      dirtyEntries: [" M STATUS.md"],
    }),
    /working tree is dirty/u,
  );
});

test("assertGitPreflight passes for clean synchronized state", () => {
  const result = assertGitPreflight({
    expectedCommitId: "abc1234",
    headCommitId: "abc1234",
    remoteCommitId: "abc1234",
    remoteRef: "origin/main",
    requireCleanWorktree: true,
    requireRemoteSync: true,
    dirtyEntries: [],
  });

  assert.equal(result.checks.cleanWorktree, "passed");
  assert.equal(result.checks.remoteSync, "passed");
  assert.equal(result.remoteRef, "origin/main");
});

test("assertGitPreflight fails when expected commit is not pushed to remote", () => {
  assert.throws(
    () => assertGitPreflight({
      expectedCommitId: "abc1234",
      headCommitId: "abc1234",
      remoteCommitId: "def5678",
      remoteRef: "origin/main",
      requireCleanWorktree: true,
      requireRemoteSync: true,
      dirtyEntries: [],
    }),
    /not synchronized with remote branch/u,
  );
});

test("assertGitPreflight allows bypassing clean and remote checks", () => {
  const result = assertGitPreflight({
    expectedCommitId: "abc1234",
    headCommitId: "abc1234",
    remoteCommitId: null,
    remoteRef: "origin/main",
    requireCleanWorktree: false,
    requireRemoteSync: false,
    dirtyEntries: [" M STATUS.md"],
  });

  assert.equal(result.checks.cleanWorktree, "skipped");
  assert.equal(result.checks.remoteSync, "skipped");
});

test("runGitPreflight executes fetch + remote ref checks when remote sync is required", async () => {
  const calls = [];
  const runCommandCapture = async (command, args) => {
    calls.push([command, ...args]);

    if (command !== "git") {
      throw new Error(`unexpected command: ${command}`);
    }

    if (args[0] === "rev-parse" && args[1] === "HEAD") {
      return { stdout: "abc1234\n", stderr: "" };
    }
    if (args[0] === "status" && args[1] === "--porcelain") {
      return { stdout: "", stderr: "" };
    }
    if (args[0] === "fetch") {
      return { stdout: "", stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "origin/main") {
      return { stdout: "abc1234\n", stderr: "" };
    }

    throw new Error(`unexpected args: ${args.join(" ")}`);
  };

  const result = await runGitPreflight({
    runCommandCapture,
    env: process.env,
    expectedCommitId: "abc1234",
    gitRemote: "origin",
    gitBranch: "main",
    requireCleanWorktree: true,
    requireRemoteSync: true,
  });

  assert.equal(result.remoteRef, "origin/main");
  assert.equal(calls.some((entry) => entry[1] === "fetch"), true);
});

test("assertManualDeployPolicy fails when auto deploy is enabled", () => {
  assert.throws(
    () => assertManualDeployPolicy({
      servicePayload: {
        serviceDetails: {
          autoDeploy: "yes",
          autoDeployTrigger: "commit",
        },
      },
      requireManualDeploy: true,
    }),
    /deploy policy check failed/u,
  );
});

test("assertManualDeployPolicy allows bypass when manual policy enforcement disabled", () => {
  const result = assertManualDeployPolicy({
    servicePayload: {
      serviceDetails: {
        autoDeploy: "yes",
        autoDeployTrigger: "commit",
      },
    },
    requireManualDeploy: false,
  });

  assert.equal(result.check, "skipped");
});
