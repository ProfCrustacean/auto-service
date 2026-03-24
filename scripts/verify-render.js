import process from "node:process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { redactSecrets, redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";
import {
  assertNonNegativeInteger,
  assertPositiveInteger,
  runCommandCapture as runCommandCaptureBase,
  resolveHarnessLogLevel,
  runProcess as runProcessBase,
  runProcessWithRetries as runProcessWithRetriesBase,
} from "./harness-process.js";
import {
  assertManualDeployPolicy,
  commitIdsMatch,
  runGitPreflight,
} from "./render-verify-preflight.js";
import { parseRenderVerifyCliArgs, resolveSkipDeployFromInputs } from "./verify-render-cli.js";
import {
  resolveRenderVerifyConfig,
} from "./render-verify/config.js";
import {
  assertDeployCommitParity,
  renderApiRequest,
  resolveBaseUrl,
  resolveLatestDeploy,
  waitForDeployLive,
} from "./render-verify/api.js";
import { resolveRawAuditOutputPath, runPostDeployLogAudit } from "./render-verify/logAuditFlow.js";
import { runRenderDeployFlow } from "./render-verify/deployFlow.js";
import { buildNonDestructiveScenarios, runScenarioWithRetries } from "./render-verify/scenarioFlow.js";

loadDotenvIntoProcessSync();
const COMMIT_ID_PATTERN = /^[a-f0-9]{7,40}$/u;

let activeHarnessLogLevel = "summary";

function logJson(payload, { verboseOnly = false } = {}) {
  if (verboseOnly && activeHarnessLogLevel !== "verbose") {
    return;
  }
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

async function runCommandCapture(command, args, { env, label }) {
  try {
    return await runCommandCaptureBase(command, args, { env, label });
  } catch (error) {
    throw new Error(redactSecretsInText(error.message));
  }
}

function runProcess(command, args, { env, label }) {
  return runProcessBase(command, args, { env, label, logLevel: activeHarnessLogLevel });
}

async function runProcessWithRetries({
  command,
  args,
  env,
  label,
  step,
  maxAttempts,
  retryDelayMs,
}) {
  return runProcessWithRetriesBase({
    command,
    args,
    env,
    label,
    step,
    maxAttempts,
    retryDelayMs,
    onRetry: (payload) => {
      if (payload.phase === "retry_started") {
        logJson({
          status: "render_verify_step_retry_started",
          step: payload.step,
          attempt: payload.attempt,
          maxAttempts: payload.maxAttempts,
          retryDelayMs: payload.retryDelayMs,
        }, { verboseOnly: true });
        return;
      }

      logJson({
        status: "render_verify_step_retry_scheduled",
        step: payload.step,
        attempt: payload.attempt,
        maxAttempts: payload.maxAttempts,
        retryDelayMs: payload.retryDelayMs,
        message: payload.message,
      }, { verboseOnly: true });
    },
    onRecovered: (payload) => {
      logJson({
        status: "render_verify_step_retry_recovered",
        step: payload.step,
        attempt: payload.attempt,
        maxAttempts: payload.maxAttempts,
      }, { verboseOnly: true });
    },
  });
}

function normalizeCommitId(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  const normalized = value.trim().toLowerCase();
  if (!COMMIT_ID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be 7-40 lowercase hex characters`);
  }

  return normalized;
}

async function resolveExpectedCommitId(explicitCommitId) {
  if (explicitCommitId.length > 0) {
    return {
      expectedCommitId: normalizeCommitId(explicitCommitId, "RENDER_EXPECT_COMMIT"),
      source: "env",
    };
  }

  const { stdout } = await runCommandCapture("git", ["rev-parse", "HEAD"], {
    env: process.env,
    label: "git rev-parse HEAD",
  });
  const gitCommitId = stdout.trim();
  if (gitCommitId.length === 0) {
    throw new Error("git rev-parse HEAD returned empty output");
  }

  return {
    expectedCommitId: normalizeCommitId(gitCommitId, "git HEAD commit"),
    source: "git",
  };
}

async function main() {
  const cliOptions = parseRenderVerifyCliArgs(process.argv.slice(2));
  const config = resolveRenderVerifyConfig({
    env: process.env,
    cliOptions,
    cwd: process.cwd(),
    resolveHarnessLogLevel,
    resolveSkipDeployFromInputs,
    assertNonNegativeInteger,
    assertPositiveInteger,
  });
  activeHarnessLogLevel = config.harnessLogLevel;
  const {
    apiBaseUrl,
    serviceId,
    explicitBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
    skipDeploy,
    requireCleanWorktree,
    requireRemoteSync,
    requireManualDeploy,
    gitRemote,
    gitBranch,
    includeScenario,
    includeIntakeBookingScenario,
    includeIntakeWalkInScenario,
    includePartsScenario,
    includeDispatchBoardScenario,
    verifyCommitParity,
    enableLogAudit,
    logAuditMode,
    writeRawAuditLogs,
    gzipRawAuditOutput,
    failOnLogTruncation,
    summaryOutputPath,
    rawOutputPath,
    expectedCommitOverride,
    logLimit,
    logInitialLimit,
    maxWarnings,
    maxErrors,
    maxRepoWarnings,
    pollIntervalMs,
    pollTimeoutMs,
    smokeMaxAttempts,
    smokeRetryDelayMs,
    cliDeployMode,
    defaultRenderBaseUrl,
  } = config;

  logJson({
    status: "render_verify_started",
    serviceId,
    apiBaseUrl,
    skipDeploy,
    cliDeployMode,
    harnessLogLevel: activeHarnessLogLevel,
    includeScenario,
    includeIntakeBookingScenario,
    includeIntakeWalkInScenario,
    includePartsScenario,
    includeDispatchBoardScenario,
    requireCleanWorktree,
    requireRemoteSync,
    requireManualDeploy,
    gitRemote,
    gitBranch,
    verifyCommitParity,
    enableLogAudit,
    logAuditMode,
    writeRawAuditLogs,
    gzipRawAuditOutput,
    logAuditSummaryPath: summaryOutputPath,
    logAuditRawPath: writeRawAuditLogs ? resolveRawAuditOutputPath(rawOutputPath, gzipRawAuditOutput) : null,
    logAuditLimit: logLimit,
    logAuditInitialLimit: logInitialLimit,
    maxWarnings,
    maxErrors,
    maxRepoWarnings,
    failOnLogTruncation,
    expectedCommitSource: expectedCommitOverride.length > 0 ? "env" : "git",
    useResolve,
    resolveIp: useResolve ? resolveIp : null,
    smokeMaxAttempts,
    smokeRetryDelayMs,
  });

  const requestRenderApi = (requestInput) => renderApiRequest({
    ...requestInput,
    apiBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
    runCommandCapture,
    redactSecretsInText,
    stringifyRedacted,
    env: process.env,
  });

  const {
    servicePayload,
    deployPayload,
  } = await runRenderDeployFlow({
    skipDeploy,
    verifyCommitParity,
    serviceId,
    expectedCommitOverride,
    requireCleanWorktree,
    requireRemoteSync,
    gitRemote,
    gitBranch,
    requireManualDeploy,
    pollIntervalMs,
    pollTimeoutMs,
    runGitPreflight,
    runCommandCapture,
    resolveExpectedCommitId,
    requestRenderApi,
    assertManualDeployPolicy,
    resolveLatestDeploy,
    waitForDeployLive,
    assertDeployCommitParity,
    normalizeCommitId,
    commitIdsMatch,
    logJson,
    redactSecretsInText,
    env: process.env,
  });

  const baseUrl = resolveBaseUrl({
    explicitBaseUrl,
    servicePayload,
    defaultBaseUrl: defaultRenderBaseUrl,
  });
  logJson({
    status: "render_verify_step_started",
    step: "smoke",
    baseUrl,
    skipDeploy,
    deployId: deployPayload?.id ?? null,
  });

  await runProcessWithRetries({
    command: process.execPath,
    args: ["scripts/smoke.js"],
    env: {
      ...process.env,
      APP_BASE_URL: baseUrl,
    },
    label: "render smoke",
    step: "smoke",
    maxAttempts: smokeMaxAttempts,
    retryDelayMs: smokeRetryDelayMs,
  });

  const nonDestructiveScenarios = buildNonDestructiveScenarios({
    includeScenario,
    includeIntakeBookingScenario,
    includeIntakeWalkInScenario,
    includePartsScenario,
    includeDispatchBoardScenario,
  });
  for (const scenario of nonDestructiveScenarios) {
    if (!scenario.enabled) {
      continue;
    }
    await runScenarioWithRetries({
      ...scenario,
      baseUrl,
      skipDeploy,
      maxAttempts: smokeMaxAttempts,
      retryDelayMs: smokeRetryDelayMs,
      runProcessWithRetries,
      logJson,
    });
  }

  if (!skipDeploy && enableLogAudit) {
    const ownerId = servicePayload?.ownerId;
    if (typeof ownerId !== "string" || ownerId.trim().length === 0) {
      throw new Error("Render service payload did not include ownerId required for log audit");
    }

    logJson({
      status: "render_verify_step_started",
      step: "post_deploy_log_audit",
      serviceId,
      ownerId,
      deployId: deployPayload?.id ?? null,
    });

    await runPostDeployLogAudit({
      serviceId,
      ownerId,
      deployPayload,
      requestRenderApi,
      mode: logAuditMode,
      logLimit,
      initialLogLimit: logInitialLimit,
      maxWarnings,
      maxErrors,
      maxRepoWarnings,
      failOnTruncation: failOnLogTruncation,
      summaryOutputPath,
      writeRawAuditLogs,
      rawOutputPath,
      gzipRawOutput: gzipRawAuditOutput,
      redactSecrets,
      logJson,
    });
  } else if (enableLogAudit) {
    logJson({
      status: "render_verify_step_skipped",
      step: "post_deploy_log_audit",
      reason: "skip_deploy_enabled",
    });
  }

  logJson({
    status: "render_verify_passed",
    serviceId,
    baseUrl,
    skipDeploy,
    includeScenario,
    includeIntakeBookingScenario,
    includeIntakeWalkInScenario,
    includePartsScenario,
    includeDispatchBoardScenario,
    verifyCommitParity,
    enableLogAudit,
    deployId: deployPayload?.id ?? null,
    deployStatus: deployPayload?.status ?? null,
    deployCommitId: deployPayload?.commit?.id ?? null,
  });
}

main().catch((error) => {
  logJson({
    status: "render_verify_failed",
    message: redactSecretsInText(error.message),
    details: redactSecrets(error?.details ?? null),
  });
  process.exit(1);
});
