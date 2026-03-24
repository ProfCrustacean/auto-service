import process from "node:process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { runCommandCapture as runCommandCaptureBase } from "./harness-process.js";
import { redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";
import { resolveRenderDeployPolicy } from "./render-verify-preflight.js";
import { renderApiRequest } from "./render-verify/api.js";

loadDotenvIntoProcessSync();

const DEFAULT_RENDER_API_BASE_URL = "https://api.render.com/v1";
const DEFAULT_RENDER_SERVICE_ID = "srv-d6vcmt7diees73d0j04g";
const DEFAULT_RENDER_RESOLVE_IP = "216.24.57.7";
const logJson = (payload) => process.stdout.write(`${stringifyRedacted(payload)}\n`);

async function runCommandCapture(command, args, { env, label }) {
  try {
    return await runCommandCaptureBase(command, args, { env, label });
  } catch (error) {
    throw new Error(redactSecretsInText(error.message));
  }
}

function parseCommand(argv) {
  const [command] = argv;
  if (command === "status" || command === "manual-deploy") return command;
  throw new Error("Usage: render-policy <status|manual-deploy>");
}

const formatPolicySummary = (servicePayload) => {
  const policy = resolveRenderDeployPolicy(servicePayload);
  return {
    serviceId: servicePayload?.id ?? null,
    name: servicePayload?.name ?? null,
    url: servicePayload?.serviceDetails?.url ?? null,
    autoDeploy: policy.autoDeployRaw,
    autoDeployTrigger: policy.autoDeployTriggerRaw,
    autoDeployDisabled: policy.autoDeployDisabled,
    manualTrigger: policy.manualTrigger,
  };
};

const getService = async (serviceId, requestRenderApi) => (
  await requestRenderApi({ method: "GET", path: `/services/${serviceId}` })
).payload;

async function setManualDeployPolicy(serviceId, requestRenderApi) {
  const attempts = [{ autoDeploy: "no" }, { autoDeployTrigger: "off" }, { autoDeploy: false }];
  let lastError = null;
  for (const body of attempts) {
    try {
      await requestRenderApi({ method: "PATCH", path: `/services/${serviceId}`, body });
      return body;
    } catch (error) {
      lastError = error;
      logJson({
        status: "render_service_policy_patch_attempt_failed",
        serviceId,
        body,
        message: redactSecretsInText(error.message),
      });
    }
  }
  throw lastError;
}

async function main() {
  const command = parseCommand(process.argv.slice(2));
  const serviceId = process.env.RENDER_SERVICE_ID ?? DEFAULT_RENDER_SERVICE_ID;
  const apiBaseUrl = process.env.RENDER_API_BASE_URL ?? DEFAULT_RENDER_API_BASE_URL;
  const apiKey = process.env.RENDER_API_KEY?.trim() ?? "";
  const useResolve = process.env.RENDER_USE_RESOLVE !== "0";
  const resolveIp = process.env.RENDER_RESOLVE_IP ?? DEFAULT_RENDER_RESOLVE_IP;
  if (!apiKey) throw new Error("RENDER_API_KEY is required");

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

  if (command === "status") {
    const servicePayload = await getService(serviceId, requestRenderApi);
    logJson({
      status: "render_service_policy_status",
      command,
      serviceId,
      policy: formatPolicySummary(servicePayload),
    });
    return;
  }

  logJson({ status: "render_service_policy_update_started", command, serviceId });
  const requestBody = await setManualDeployPolicy(serviceId, requestRenderApi);
  const servicePayload = await getService(serviceId, requestRenderApi);
  logJson({
    status: "render_service_policy_update_passed",
    command,
    serviceId,
    requestBody,
    policy: formatPolicySummary(servicePayload),
  });
}

main().catch((error) => {
  logJson({ status: "render_service_policy_failed", message: redactSecretsInText(error.message) });
  process.exit(1);
});
