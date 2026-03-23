import {
  buildFailurePayload,
  failHarness,
  isLocalBaseUrl,
  parseBooleanFlag,
  requestJson,
  requestText,
} from "./harness-diagnostics.js";

export function resolveScenarioMode({ baseUrl, argv = process.argv.slice(2) }) {
  const hasNonDestructiveArg = argv.includes("--non-destructive");
  const hasDestructiveArg = argv.includes("--destructive");

  if (hasNonDestructiveArg && hasDestructiveArg) {
    throw new Error("cannot use --non-destructive and --destructive together");
  }

  const envMode = parseBooleanFlag(process.env.SCENARIO_NON_DESTRUCTIVE, "SCENARIO_NON_DESTRUCTIVE");

  if (hasNonDestructiveArg || envMode === true) {
    return {
      name: "non_destructive",
      source: hasNonDestructiveArg ? "arg" : "env",
      reason: "explicit_non_destructive",
    };
  }

  if (hasDestructiveArg || envMode === false) {
    return {
      name: "default",
      source: hasDestructiveArg ? "arg" : "env",
      reason: "explicit_destructive",
    };
  }

  if (!isLocalBaseUrl(baseUrl)) {
    return {
      name: "non_destructive",
      source: "auto",
      reason: "non_local_default",
    };
  }

  return {
    name: "default",
    source: "auto",
    reason: "local_default",
  };
}

export function buildScenarioIsolation(mode, writesPerformed) {
  if (mode.name === "non_destructive") {
    return {
      strategy: "read_only",
      writesPerformed,
      cleanupStatus: "not_required",
    };
  }

  return {
    strategy: "write",
    writesPerformed,
    cleanupStatus: "not_performed",
  };
}

export function buildUniqueSlot(token, hour = 12) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export async function requestScenarioJson(baseUrl, path, { step, method = "GET", body } = {}) {
  return requestJson(baseUrl, { step, path, method, body });
}

export async function requestScenarioText(baseUrl, path, step) {
  return requestText(baseUrl, { step, path });
}

function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

export async function submitScenarioForm(baseUrl, path, { step, payload, redirect = "manual" }) {
  const url = new URL(path, baseUrl).toString();
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: toFormBody(payload),
      redirect,
    });
  } catch (error) {
    failHarness(`network request failed for POST ${path}`, {
      step,
      method: "POST",
      path,
      url,
      errorKind: "network",
      targetUrl: url,
    }, error);
  }

  let text;
  try {
    text = await response.text();
  } catch (error) {
    failHarness(`failed to read response text for POST ${path}`, {
      step,
      method: "POST",
      path,
      url,
      responseStatus: response.status,
      errorKind: "response_read",
    }, error);
  }

  return {
    method: "POST",
    path,
    url,
    status: response.status,
    text,
    location: response.headers.get("location"),
  };
}

export async function runScenario({ baseUrl, runNonDestructive, runDefault }) {
  const mode = resolveScenarioMode({ baseUrl });
  if (mode.name === "non_destructive") {
    await runNonDestructive(mode);
    return;
  }
  await runDefault(mode);
}

export function renderScenarioFailure(status, error) {
  process.stderr.write(`${JSON.stringify(buildFailurePayload(status, error))}\n`);
}
