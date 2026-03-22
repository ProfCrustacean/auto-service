const MAX_RESPONSE_SNIPPET_LENGTH = 2000;

function toSerializableValue(value) {
  if (value === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export class HarnessFailure extends Error {
  constructor(message, details = {}, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = "HarnessFailure";
    this.details = toSerializableValue(details) ?? {};
  }
}

export function failHarness(message, details = {}, cause) {
  throw new HarnessFailure(message, details, cause);
}

export function assertHarness(condition, message, details = {}) {
  if (!condition) {
    failHarness(message, details);
  }
}

export function parseBooleanFlag(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  failHarness(`${fieldName} must be one of: 1/0, true/false, yes/no, on/off`, {
    field: fieldName,
    providedValue: value,
  });
}

export function isLocalBaseUrl(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

function buildRequestUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString();
}

function parseResponseBody(text) {
  if (text.length === 0) {
    return null;
  }

  return JSON.parse(text);
}

function clipText(value) {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= MAX_RESPONSE_SNIPPET_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_RESPONSE_SNIPPET_LENGTH)}…`;
}

export async function requestJson(baseUrl, { step, path, method = "GET", body } = {}) {
  const url = buildRequestUrl(baseUrl, path);
  const headers = {
    "content-type": "application/json",
  };
  const normalizedMethod = String(method).toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(normalizedMethod)) {
    headers.authorization = `Bearer ${process.env.APP_AUTH_TOKEN ?? "owner-dev-token"}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    failHarness(`network request failed for ${method} ${path}`, {
      step,
      method,
      path,
      url,
      errorKind: "network",
      targetUrl: url,
    }, error);
  }

  let rawBody = "";
  try {
    rawBody = await response.text();
  } catch (error) {
    failHarness(`failed to read response body for ${method} ${path}`, {
      step,
      method,
      path,
      url,
      responseStatus: response.status,
      errorKind: "response_read",
    }, error);
  }

  let payload;
  try {
    payload = parseResponseBody(rawBody);
  } catch (error) {
    failHarness(`response was not valid JSON for ${method} ${path}`, {
      step,
      method,
      path,
      url,
      responseStatus: response.status,
      errorKind: "response_parse",
      responseBodySnippet: clipText(rawBody),
    }, error);
  }

  return {
    method,
    path,
    url,
    status: response.status,
    payload,
  };
}

export async function requestText(baseUrl, { step, path, method = "GET" } = {}) {
  const url = buildRequestUrl(baseUrl, path);
  let response;
  try {
    response = await fetch(url, { method });
  } catch (error) {
    failHarness(`network request failed for ${method} ${path}`, {
      step,
      method,
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
    failHarness(`failed to read response text for ${method} ${path}`, {
      step,
      method,
      path,
      url,
      responseStatus: response.status,
      errorKind: "response_read",
    }, error);
  }

  return {
    method,
    path,
    url,
    status: response.status,
    text,
  };
}

export function expectStatus(response, expectedStatus, step) {
  if (response.status !== expectedStatus) {
    failHarness(
      `unexpected response status for ${response.method} ${response.path}: expected ${expectedStatus}, got ${response.status}`,
      {
        step,
        method: response.method,
        path: response.path,
        url: response.url,
        responseStatus: response.status,
        responsePayload: response.payload,
      },
    );
  }
}

export function buildFailurePayload(status, error) {
  const payload = {
    status,
    errorType: error?.name ?? "Error",
    message: error?.message ?? "Unknown error",
  };

  if (error?.details && typeof error.details === "object") {
    Object.assign(payload, error.details);
  }

  if (typeof error?.stack === "string") {
    payload.stack = error.stack;
  }

  return payload;
}
