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

function describeResponseBody(payload, fallbackText, { redactSecretsInText, stringifyRedacted }) {
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

export async function renderApiRequest({
  method,
  path,
  body = undefined,
  apiBaseUrl,
  apiKey,
  useResolve,
  resolveIp,
  runCommandCapture,
  redactSecretsInText,
  stringifyRedacted,
  env,
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
    env,
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
    const detail = describeResponseBody(payload, responseBodyText || "no response body", {
      redactSecretsInText,
      stringifyRedacted,
    });
    throw new Error(`Render API ${method} ${path} failed with ${statusCode}: ${detail}`);
  }

  return {
    statusCode,
    payload,
  };
}

function unwrapDeployRecord(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (entry.deploy && typeof entry.deploy === "object") {
    return entry.deploy;
  }

  return entry;
}

export async function resolveLatestDeploy({
  serviceId,
  request,
}) {
  const listResponse = await request({
    method: "GET",
    path: `/services/${serviceId}/deploys?limit=5`,
  });

  if (!Array.isArray(listResponse.payload) || listResponse.payload.length === 0) {
    throw new Error("Render deploy trigger returned empty body and no deploy history entries were available");
  }

  const latestDeploy = unwrapDeployRecord(listResponse.payload[0]);
  const deployId = latestDeploy?.id;
  if (!deployId) {
    throw new Error("Render deploy trigger returned empty body and latest deploy entry did not include id");
  }

  return latestDeploy;
}

function isTerminalFailureStatus(status) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized.includes("failed")
    || normalized.includes("cancel")
    || normalized.includes("error")
    || normalized === "deactivated";
}

export async function waitForDeployLive({
  serviceId,
  deployId,
  request,
  pollIntervalMs,
  timeoutMs,
  wait,
  logJson,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const deployResponse = await request({
      method: "GET",
      path: `/services/${serviceId}/deploys/${deployId}`,
    });

    const deploy = deployResponse.payload ?? {};
    const status = String(deploy.status ?? "unknown");
    const elapsedMs = Date.now() - startedAt;

    logJson({
      status: "render_verify_deploy_poll",
      deployId,
      deployStatus: status,
      elapsedMs,
    }, { verboseOnly: true });

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

export function resolveBaseUrl({ explicitBaseUrl, servicePayload, defaultBaseUrl }) {
  if (explicitBaseUrl && explicitBaseUrl.length > 0) {
    return explicitBaseUrl;
  }

  const serviceUrl = servicePayload?.serviceDetails?.url;
  if (typeof serviceUrl === "string" && serviceUrl.length > 0) {
    return serviceUrl;
  }

  return defaultBaseUrl;
}

export function assertDeployCommitParity({
  expectedCommitId,
  deployPayload,
  normalizeCommitId,
  commitIdsMatch,
}) {
  const actualCommitRaw = deployPayload?.commit?.id;
  if (typeof actualCommitRaw !== "string" || actualCommitRaw.trim().length === 0) {
    throw new Error("Render deploy payload did not include commit.id for parity verification");
  }

  const actualCommitId = normalizeCommitId(actualCommitRaw, "deploy.commit.id");
  if (!commitIdsMatch(expectedCommitId, actualCommitId)) {
    throw new Error(
      `Render deploy commit mismatch: expected ${expectedCommitId}, actual ${actualCommitId}`,
    );
  }

  return actualCommitId;
}
