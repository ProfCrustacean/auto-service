import { runCommandCapture as runCommandCaptureBase } from "./harness-process.js";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeCommitId(value, fieldName) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized.length === 0) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
}

function normalizeGitToken(value, fieldName) {
  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  if (/\s/u.test(normalized)) {
    throw new Error(`${fieldName} must not contain whitespace`);
  }
  return normalized;
}

function shortCommit(value) {
  return normalizeText(value).slice(0, 12);
}

function normalizeDeployPolicyToken(value) {
  return normalizeText(value).toLowerCase();
}

export function commitIdsMatch(expectedCommitId, actualCommitId) {
  const expected = normalizeCommitId(expectedCommitId, "expectedCommitId");
  const actual = normalizeCommitId(actualCommitId, "actualCommitId");
  return actual.startsWith(expected) || expected.startsWith(actual);
}

export function parseGitStatusEntries(stdout) {
  return String(stdout ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
}

export function resolveRenderDeployPolicy(servicePayload) {
  const details = servicePayload?.serviceDetails ?? {};
  const autoDeployRaw = servicePayload?.autoDeploy ?? details?.autoDeploy ?? null;
  const autoDeployTriggerRaw = servicePayload?.autoDeployTrigger ?? details?.autoDeployTrigger ?? null;
  const autoDeploy = normalizeDeployPolicyToken(autoDeployRaw);
  const autoDeployTrigger = normalizeDeployPolicyToken(autoDeployTriggerRaw);

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

  if (!requireManualDeploy) {
    return {
      ...policy,
      check: "skipped",
    };
  }

  if (!policy.autoDeployDisabled || !policy.manualTrigger) {
    throw new Error(
      [
        "Render service deploy policy check failed",
        `autoDeploy=${policy.autoDeployRaw ?? "null"}`,
        `autoDeployTrigger=${policy.autoDeployTriggerRaw ?? "null"}`,
        "Expected manual-only deploy policy (autoDeploy disabled + autoDeployTrigger=off).",
        "Run 'npm run render:policy:manual-deploy' to repair environment policy.",
      ].join("; "),
    );
  }

  return {
    ...policy,
    check: "passed",
  };
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
  const expected = normalizeCommitId(expectedCommitId, "expectedCommitId");
  const head = normalizeCommitId(headCommitId, "headCommitId");
  const entries = Array.isArray(dirtyEntries) ? dirtyEntries : [];
  const normalizedRemoteRef = normalizeGitToken(remoteRef, "remoteRef");

  if (!commitIdsMatch(expected, head)) {
    throw new Error(
      `Git preflight failed: expected commit ${shortCommit(expected)} does not match local HEAD ${shortCommit(head)}`,
    );
  }

  if (requireCleanWorktree && entries.length > 0) {
    const sample = entries.slice(0, 5);
    throw new Error(
      `Git preflight failed: working tree is dirty (${entries.length} entries). Sample: ${sample.join(" | ")}`,
    );
  }

  let remote = null;
  if (requireRemoteSync) {
    remote = normalizeCommitId(remoteCommitId, "remoteCommitId");
    if (!commitIdsMatch(expected, remote)) {
      throw new Error(
        [
          "Git preflight failed: expected commit is not synchronized with remote branch",
          `expected=${shortCommit(expected)}`,
          `remoteRef=${normalizedRemoteRef}`,
          `remote=${shortCommit(remote)}`,
          "Push the commit to remote and rerun verify:render.",
        ].join("; "),
      );
    }
  }

  return {
    expectedCommitId: expected,
    headCommitId: head,
    remoteCommitId: remote,
    remoteRef: normalizedRemoteRef,
    dirtyEntriesCount: entries.length,
    dirtyEntriesSample: entries.slice(0, 10),
    requireCleanWorktree,
    requireRemoteSync,
    checks: {
      cleanWorktree: requireCleanWorktree ? "passed" : "skipped",
      remoteSync: requireRemoteSync ? "passed" : "skipped",
    },
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
  const remote = normalizeGitToken(gitRemote, "RENDER_GIT_REMOTE");
  const branch = normalizeGitToken(gitBranch, "RENDER_GIT_BRANCH");
  const remoteRef = `${remote}/${branch}`;

  const headResponse = await runCommandCapture("git", ["rev-parse", "HEAD"], {
    env,
    label: "git rev-parse HEAD",
  });
  const headCommitId = normalizeText(headResponse.stdout);

  let dirtyEntries = [];
  if (requireCleanWorktree) {
    const statusResponse = await runCommandCapture("git", ["status", "--porcelain"], {
      env,
      label: "git status --porcelain",
    });
    dirtyEntries = parseGitStatusEntries(statusResponse.stdout);
  }

  let remoteCommitId = null;
  if (requireRemoteSync) {
    await runCommandCapture("git", ["fetch", "--quiet", remote, branch], {
      env,
      label: `git fetch --quiet ${remote} ${branch}`,
    });
    const remoteResponse = await runCommandCapture("git", ["rev-parse", remoteRef], {
      env,
      label: `git rev-parse ${remoteRef}`,
    });
    remoteCommitId = normalizeText(remoteResponse.stdout);
  }

  return assertGitPreflight({
    expectedCommitId,
    headCommitId,
    remoteCommitId,
    remoteRef,
    requireCleanWorktree,
    requireRemoteSync,
    dirtyEntries,
  });
}
