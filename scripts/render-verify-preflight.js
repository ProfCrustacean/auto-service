import { runCommandCapture as runCommandCaptureBase } from "./harness-process.js";

const txt = (v) => String(v ?? "").trim();
const commit = (v, n) => {
  const s = txt(v).toLowerCase();
  if (!s) throw new Error(`${n} is required`);
  return s;
};
const token = (v, n) => {
  const s = txt(v);
  if (!s) throw new Error(`${n} must be a non-empty string`);
  if (/\s/u.test(s)) throw new Error(`${n} must not contain whitespace`);
  return s;
};

export function commitIdsMatch(expectedCommitId, actualCommitId) {
  const expected = commit(expectedCommitId, "expectedCommitId");
  const actual = commit(actualCommitId, "actualCommitId");
  return actual.startsWith(expected) || expected.startsWith(actual);
}

export function parseGitStatusEntries(stdout) {
  return String(stdout ?? "").split("\n").map((line) => line.trimEnd()).filter((line) => line.trim().length > 0);
}

export function resolveRenderDeployPolicy(servicePayload) {
  const details = servicePayload?.serviceDetails ?? {};
  const autoDeployRaw = servicePayload?.autoDeploy ?? details?.autoDeploy ?? null;
  const autoDeployTriggerRaw = servicePayload?.autoDeployTrigger ?? details?.autoDeployTrigger ?? null;
  const autoDeploy = txt(autoDeployRaw).toLowerCase();
  const autoDeployTrigger = txt(autoDeployTriggerRaw).toLowerCase();
  return {
    autoDeployRaw,
    autoDeployTriggerRaw,
    autoDeploy,
    autoDeployTrigger,
    autoDeployDisabled: autoDeploy === "no" || autoDeploy === "off" || autoDeploy === "false",
    manualTrigger: autoDeployTrigger === "off" || autoDeployTrigger === "manual",
  };
}

export function assertManualDeployPolicy({ servicePayload, requireManualDeploy }) {
  const policy = resolveRenderDeployPolicy(servicePayload);
  if (!requireManualDeploy) return { ...policy, check: "skipped" };
  if (!policy.autoDeployDisabled || !policy.manualTrigger) {
    throw new Error(`Render service deploy policy check failed; a=${policy.autoDeployRaw ?? "null"}; t=${policy.autoDeployTriggerRaw ?? "null"}`);
  }
  return { ...policy, check: "passed" };
}

export function assertGitPreflight({
  expectedCommitId,
  headCommitId,
  remoteCommitId,
  remoteRef,
  requireCleanWorktree,
  requireRemoteSync,
  dirtyEntries,
}) {
  const expected = commit(expectedCommitId, "expectedCommitId");
  const head = commit(headCommitId, "headCommitId");
  const ref = token(remoteRef, "remoteRef");
  const entries = Array.isArray(dirtyEntries) ? dirtyEntries : [];
  if (!commitIdsMatch(expected, head)) {
    throw new Error(`Git preflight failed: expected ${expected.slice(0, 12)} does not match HEAD ${head.slice(0, 12)}`);
  }
  if (requireCleanWorktree && entries.length > 0) {
    throw new Error(`Git preflight failed: working tree is dirty (${entries.length} entries). Sample: ${entries.slice(0, 5).join(" | ")}`);
  }
  let remote = null;
  if (requireRemoteSync) {
    remote = commit(remoteCommitId, "remoteCommitId");
    if (!commitIdsMatch(expected, remote)) {
      throw new Error(`Git preflight failed: expected commit is not synchronized with remote branch; expected=${expected.slice(0, 12)}; r=${remote.slice(0, 12)}; rf=${ref}`);
    }
  }
  return {
    expectedCommitId: expected,
    headCommitId: head,
    remoteCommitId: remote,
    remoteRef: ref,
    dirtyEntriesCount: entries.length,
    checks: { cleanWorktree: requireCleanWorktree ? "passed" : "skipped", remoteSync: requireRemoteSync ? "passed" : "skipped" },
  };
}

export async function runGitPreflight({
  runCommandCapture = runCommandCaptureBase,
  env,
  expectedCommitId,
  gitRemote,
  gitBranch,
  requireCleanWorktree,
  requireRemoteSync,
}) {
  const remote = token(gitRemote, "RENDER_GIT_REMOTE");
  const branch = token(gitBranch, "RENDER_GIT_BRANCH");
  const remoteRef = `${remote}/${branch}`;
  const headCommitId = txt((await runCommandCapture("git", ["rev-parse", "HEAD"], { env, label: "git head" })).stdout);
  const dirtyEntries = requireCleanWorktree
    ? parseGitStatusEntries((await runCommandCapture("git", ["status", "--porcelain"], { env, label: "git status" })).stdout)
    : [];
  let remoteCommitId = null;
  if (requireRemoteSync) {
    await runCommandCapture("git", ["fetch", "--quiet", remote, branch], { env, label: "git fetch remote" });
    remoteCommitId = txt((await runCommandCapture("git", ["rev-parse", remoteRef], { env, label: "git remote ref" })).stdout);
  }
  return assertGitPreflight({ expectedCommitId, headCommitId, remoteCommitId, remoteRef, requireCleanWorktree, requireRemoteSync, dirtyEntries });
}
