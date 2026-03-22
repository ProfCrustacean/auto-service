import process from "node:process";
import { spawn } from "node:child_process";

const DEFAULT_RENDER_API_BASE_URL = "https://api.render.com/v1";
const DEFAULT_RENDER_SERVICE_ID = "srv-d6vcmt7diees73d0j04g";
const DEFAULT_RENDER_BASE_URL = "https://auto-service-foundation.onrender.com";
const DEFAULT_RENDER_RESOLVE_IP = "216.24.57.7";
const DEFAULT_POLL_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 10 * 1000;

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

function logJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runCommandCapture(command, args, { env, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const stdoutChunks = [];
    const stderrChunks = [];

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk.toString());
    });

    child.once("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${label} failed with ${detail}; stderr: ${stderr.trim() || "n/a"}; stdout: ${stdout.trim() || "n/a"}`));
    });
  });
}

function runProcess(command, args, { env, label }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
    });

    child.once("error", (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`${label} failed with ${detail}`));
    });
  });
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
      return payload.message;
    }
    if (typeof payload.error === "string") {
      return payload.error;
    }
    return JSON.stringify(payload);
  }

  return fallbackText;
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

function isTerminalFailureStatus(status) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized.includes("failed")
    || normalized.includes("cancel")
    || normalized.includes("error")
    || normalized === "deactivated";
}

async function waitForDeployLive({
  serviceId,
  deployId,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
  pollIntervalMs,
  timeoutMs,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const deployResponse = await renderApiRequest({
      method: "GET",
      path: `/services/${serviceId}/deploys/${deployId}`,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
    });

    const deploy = deployResponse.payload ?? {};
    const status = String(deploy.status ?? "unknown");
    const elapsedMs = Date.now() - startedAt;

    logJson({
      status: "render_verify_deploy_poll",
      deployId,
      deployStatus: status,
      elapsedMs,
    });

    if (status === "live") {
      return deploy;
    }

    if (isTerminalFailureStatus(status)) {
      throw new Error(`Render deploy ${deployId} entered terminal failure status '${status}'`);
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`Render deploy ${deployId} did not become live within ${timeoutMs}ms`);
}

function resolveBaseUrl({ explicitBaseUrl, servicePayload }) {
  if (explicitBaseUrl && explicitBaseUrl.length > 0) {
    return explicitBaseUrl;
  }

  const serviceUrl = servicePayload?.serviceDetails?.url;
  if (typeof serviceUrl === "string" && serviceUrl.length > 0) {
    return serviceUrl;
  }

  return DEFAULT_RENDER_BASE_URL;
}

async function main() {
  const apiBaseUrl = process.env.RENDER_API_BASE_URL ?? DEFAULT_RENDER_API_BASE_URL;
  const serviceId = process.env.RENDER_SERVICE_ID ?? DEFAULT_RENDER_SERVICE_ID;
  const explicitBaseUrl = process.env.APP_BASE_URL?.trim() ?? "";
  const apiKey = process.env.RENDER_API_KEY?.trim() ?? "";
  const useResolve = process.env.RENDER_USE_RESOLVE !== "0";
  const resolveIp = process.env.RENDER_RESOLVE_IP ?? DEFAULT_RENDER_RESOLVE_IP;
  const skipDeploy = process.env.RENDER_SKIP_DEPLOY === "1";

  const pollIntervalMs = Number.parseInt(
    process.env.RENDER_DEPLOY_POLL_INTERVAL_MS ?? String(DEFAULT_POLL_INTERVAL_MS),
    10,
  );
  const pollTimeoutMs = Number.parseInt(
    process.env.RENDER_DEPLOY_TIMEOUT_MS ?? String(DEFAULT_POLL_TIMEOUT_MS),
    10,
  );

  assertPositiveInteger(pollIntervalMs, "RENDER_DEPLOY_POLL_INTERVAL_MS");
  assertPositiveInteger(pollTimeoutMs, "RENDER_DEPLOY_TIMEOUT_MS");

  if (!skipDeploy && apiKey.length === 0) {
    throw new Error("RENDER_API_KEY is required unless RENDER_SKIP_DEPLOY=1");
  }

  logJson({
    status: "render_verify_started",
    serviceId,
    apiBaseUrl,
    skipDeploy,
    useResolve,
    resolveIp: useResolve ? resolveIp : null,
  });

  let servicePayload = null;
  let deployPayload = null;

  if (!skipDeploy) {
    logJson({ status: "render_verify_step_started", step: "service_lookup", serviceId });
    servicePayload = (
      await renderApiRequest({
        method: "GET",
        path: `/services/${serviceId}`,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      })
    ).payload;

    logJson({
      status: "render_verify_step_started",
      step: "deploy_trigger",
      serviceId,
      serviceUrl: servicePayload?.serviceDetails?.url ?? null,
    });
    deployPayload = (
      await renderApiRequest({
        method: "POST",
        path: `/services/${serviceId}/deploys`,
        apiBaseUrl,
        apiKey,
        useResolve,
        resolveIp,
      })
    ).payload;

    const deployId = deployPayload?.id;
    if (!deployId) {
      throw new Error("Render deploy trigger response did not include deploy id");
    }

    logJson({
      status: "render_verify_step_started",
      step: "deploy_wait_live",
      serviceId,
      deployId,
      initialStatus: deployPayload?.status ?? null,
    });

    deployPayload = await waitForDeployLive({
      serviceId,
      deployId,
      apiBaseUrl,
      apiKey,
      useResolve,
      resolveIp,
      pollIntervalMs,
      timeoutMs: pollTimeoutMs,
    });
  }

  const baseUrl = resolveBaseUrl({ explicitBaseUrl, servicePayload });
  logJson({
    status: "render_verify_step_started",
    step: "smoke",
    baseUrl,
    skipDeploy,
    deployId: deployPayload?.id ?? null,
  });

  await runProcess(process.execPath, ["scripts/smoke.js"], {
    env: {
      ...process.env,
      APP_BASE_URL: baseUrl,
    },
    label: "render smoke",
  });

  logJson({
    status: "render_verify_passed",
    serviceId,
    baseUrl,
    skipDeploy,
    deployId: deployPayload?.id ?? null,
    deployStatus: deployPayload?.status ?? null,
  });
}

main().catch((error) => {
  logJson({
    status: "render_verify_failed",
    message: error.message,
  });
  process.exit(1);
});
