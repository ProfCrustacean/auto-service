import process from "node:process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { runCommandCapture as runCommandCaptureBase } from "./harness-process.js";
import { redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";
import { resolveRenderDeployPolicy } from "./render-verify-preflight.js";

loadDotenvIntoProcessSync();

const DEFAULT_RENDER_API_BASE_URL = "https://api.render.com/v1";
const DEFAULT_RENDER_SERVICE_ID = "srv-d6vcmt7diees73d0j04g";
const DEFAULT_RENDER_RESOLVE_IP = "216.24.57.7";

function logJson(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

async function runCommandCapture(command, args, { env, label }) {
  try {
    return await runCommandCaptureBase(command, args, { env, label });
  } catch (error) {
    throw new Error(redactSecretsInText(error.message));
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/u, "");
}

function toRenderApiUrl(baseUrl, pathOrUrl) {
  if (/^https?:\/\//u.test(pathOrUrl)) {
    return pathOrUrl;
  }
  if (!pathOrUrl.startsWith("/")) {
    throw new Error(`Render API path must start with '/': ${pathOrUrl}`);
  }
  return `${trimTrailingSlash(baseUrl)}${pathOrUrl}`;
}

function describeResponseBody(payload, fallbackText) {
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string") {
      return redactSecretsInText(payload.message);
    }
    if (typeof payload.error === "string") {
      return redactSecretsInText(payload.error);
    }
    return stringifyRedacted(payload);
  }
  return redactSecretsInText(fallbackText);
}

async function renderApiRequest({
  method,
  path,
  body = undefined,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
}) {
  const url = toRenderApiUrl(apiBaseUrl, path);
  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--request",
    method,
    "--url",
    url,
    "--header",
    "Accept: application/json",
    "--header",
    `Authorization: Bearer ${apiKey}`,
  ];

  if (useResolve) {
    args.push("--resolve", `api.render.com:443:${resolveIp}`);
  }

  if (body !== undefined) {
    args.push("--header", "Content-Type: application/json", "--data", JSON.stringify(body));
  }

  args.push("--write-out", "\n__HTTP_STATUS__%{http_code}");

  const { stdout } = await runCommandCapture("curl", args, {
    env: process.env,
    label: `curl ${method} ${url}`,
  });

  const marker = "\n__HTTP_STATUS__";
  const markerIndex = stdout.lastIndexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Render API response missing HTTP status marker for ${method} ${path}`);
  }

  const responseBodyText = stdout.slice(0, markerIndex).trim();
  const statusCodeText = stdout.slice(markerIndex + marker.length).trim();
  const statusCode = Number.parseInt(statusCodeText, 10);
  if (!Number.isInteger(statusCode)) {
    throw new Error(`Render API returned invalid HTTP status '${statusCodeText}' for ${method} ${path}`);
  }

  let payload = null;
  if (responseBodyText.length > 0) {
    try {
      payload = JSON.parse(responseBodyText);
    } catch {
      payload = responseBodyText;
    }
  }

  if (statusCode >= 400) {
    const detail = describeResponseBody(payload, responseBodyText || "no response body");
    throw new Error(`Render API ${method} ${path} failed with ${statusCode}: ${detail}`);
  }

  return {
    statusCode,
    payload,
  };
}

function parseCommand(argv) {
  const [command] = argv;
  if (command === "status" || command === "manual-deploy") {
    return command;
  }
  throw new Error("Usage: node scripts/render-service-policy.js <status|manual-deploy>");
}

function formatPolicySummary(servicePayload) {
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
}

async function getService({
  serviceId,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
}) {
  return (
    await renderApiRequest({
      method: "GET",
      path: `/services/${serviceId}`,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
    })
  ).payload;
}

async function setManualDeployPolicy({
  serviceId,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
}) {
  const patchAttempts = [
    { autoDeploy: "no" },
    { autoDeployTrigger: "off" },
    { autoDeploy: false },
  ];

  let lastError = null;
  for (const body of patchAttempts) {
    try {
      await renderApiRequest({
        method: "PATCH",
        path: `/services/${serviceId}`,
        body,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      });
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

  if (apiKey.length === 0) {
    throw new Error("RENDER_API_KEY is required");
  }

  if (command === "status") {
    const servicePayload = await getService({
      serviceId,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
    });
    logJson({
      status: "render_service_policy_status",
      command,
      serviceId,
      policy: formatPolicySummary(servicePayload),
    });
    return;
  }

  logJson({
    status: "render_service_policy_update_started",
    command,
    serviceId,
  });

  const requestBody = await setManualDeployPolicy({
    serviceId,
    apiBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
  });

  const servicePayload = await getService({
    serviceId,
    apiBaseUrl,
    apiKey,
    useResolve,
    resolveIp,
  });

  logJson({
    status: "render_service_policy_update_passed",
    command,
    serviceId,
    requestBody,
    policy: formatPolicySummary(servicePayload),
  });
}

main().catch((error) => {
  logJson({
    status: "render_service_policy_failed",
    message: redactSecretsInText(error.message),
  });
  process.exit(1);
});
