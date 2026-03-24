export async function runRenderDeployFlow({
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
  env,
}) {
  let servicePayload = null;
  let deployPayload = null;
  let expectedCommitContext = null;

  if (!skipDeploy) {
    expectedCommitContext = await resolveExpectedCommitId(expectedCommitOverride);

    logJson({
      status: "render_verify_step_started",
      step: "git_preflight",
      expectedCommitId: expectedCommitContext.expectedCommitId,
      expectedCommitSource: expectedCommitContext.source,
      requireCleanWorktree,
      requireRemoteSync,
      gitRemote,
      gitBranch,
    });

    try {
      const gitPreflight = await runGitPreflight({
        runCommandCapture,
        env,
        expectedCommitId: expectedCommitContext.expectedCommitId,
        gitRemote,
        gitBranch,
        requireCleanWorktree,
        requireRemoteSync,
      });
      logJson({
        status: "render_verify_preflight_passed",
        step: "git_preflight",
        details: gitPreflight,
      });
    } catch (error) {
      logJson({
        status: "render_verify_preflight_failed",
        step: "git_preflight",
        message: redactSecretsInText(error.message),
      });
      throw error;
    }

    logJson({ status: "render_verify_step_started", step: "service_lookup", serviceId });
    servicePayload = (
      await requestRenderApi({
        method: "GET",
        path: `/services/${serviceId}`,
      })
    ).payload;

    logJson({
      status: "render_verify_step_started",
      step: "render_service_policy_check",
      serviceId,
      requireManualDeploy,
    });

    try {
      const policyDetails = assertManualDeployPolicy({
        servicePayload,
        requireManualDeploy,
      });
      logJson({
        status: "render_verify_preflight_passed",
        step: "render_service_policy_check",
        details: policyDetails,
      });
    } catch (error) {
      logJson({
        status: "render_verify_preflight_failed",
        step: "render_service_policy_check",
        message: redactSecretsInText(error.message),
      });
      throw error;
    }

    logJson({
      status: "render_verify_step_started",
      step: "deploy_trigger",
      serviceId,
      serviceUrl: servicePayload?.serviceDetails?.url ?? null,
    });
    deployPayload = (
      await requestRenderApi({
        method: "POST",
        path: `/services/${serviceId}/deploys`,
      })
    ).payload;

    const deployId = deployPayload?.id;
    if (!deployId) {
      logJson({
        status: "render_verify_deploy_id_fallback",
        reason: "trigger_response_missing_id",
      });

      deployPayload = await resolveLatestDeploy({
        serviceId,
        request: requestRenderApi,
      });
    }

    const resolvedDeployId = deployPayload?.id;
    if (!resolvedDeployId) {
      throw new Error("Unable to resolve Render deploy id after trigger");
    }

    logJson({
      status: "render_verify_step_started",
      step: "deploy_wait_live",
      serviceId,
      deployId: resolvedDeployId,
      initialStatus: deployPayload?.status ?? null,
    });

    deployPayload = await waitForDeployLive({
      serviceId,
      deployId: resolvedDeployId,
      request: requestRenderApi,
      pollIntervalMs,
      timeoutMs: pollTimeoutMs,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      logJson,
    });

    if (verifyCommitParity) {
      logJson({
        status: "render_verify_step_started",
        step: "deploy_commit_parity",
        deployId: deployPayload?.id ?? null,
      });

      const { expectedCommitId, source } = expectedCommitContext;
      const actualCommitId = assertDeployCommitParity({
        expectedCommitId,
        deployPayload,
        normalizeCommitId,
        commitIdsMatch,
      });
      logJson({
        status: "render_verify_commit_parity_passed",
        deployId: deployPayload?.id ?? null,
        expectedCommitId,
        expectedCommitSource: source,
        actualCommitId,
      });
    }
  } else {
    if (verifyCommitParity) {
      logJson({
        status: "render_verify_step_skipped",
        step: "deploy_commit_parity",
        reason: "skip_deploy_enabled",
      });
    }
    logJson({
      status: "render_verify_step_skipped",
      step: "git_preflight",
      reason: "skip_deploy_enabled",
    });
    logJson({
      status: "render_verify_step_skipped",
      step: "render_service_policy_check",
      reason: "skip_deploy_enabled",
    });
  }

  return {
    servicePayload,
    deployPayload,
    expectedCommitContext,
  };
}
