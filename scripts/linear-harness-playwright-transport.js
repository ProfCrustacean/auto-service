import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { redactSecretsInText } from "./secret-redaction.js";
import { parsePlaywrightEvalOutput } from "./linear-harness-core.js";

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const LINEAR_ORIGIN_URL = "https://linear.app";

export class LinearGraphQLError extends Error {
  constructor(message, { errors = [], statusCode, transportName } = {}) {
    super(message);
    this.name = "LinearGraphQLError";
    this.errors = errors;
    this.statusCode = statusCode;
    this.transportName = transportName;
  }
}

function decodeErrors(errors) {
  if (!Array.isArray(errors)) {
    return "Unknown GraphQL error";
  }

  return errors
    .map((error) => {
      const code = error?.extensions?.code ? ` [${error.extensions.code}]` : "";
      const message = typeof error?.message === "string" ? error.message : "Unknown GraphQL error";
      return `${message}${code}`;
    })
    .join("; ");
}

function resolvePlaywrightCliPath({ env = process.env } = {}) {
  const configured = env.LINEAR_PLAYWRIGHT_CLI?.trim();
  const resolved = configured
    ? (path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured))
    : path.join(env.CODEX_HOME ?? path.join(os.homedir(), ".codex"), "skills", "playwright", "scripts", "playwright_cli.sh");

  try {
    fs.accessSync(resolved, fs.constants.X_OK);
  } catch {
    const source = configured ? "LINEAR_PLAYWRIGHT_CLI" : "Bundled Playwright CLI wrapper";
    throw new Error(`${source} is not executable or not found at '${resolved}'`);
  }

  return resolved;
}

function makeRequestBody(query, variables) {
  return { query, variables: variables ?? {} };
}

export class PlaywrightLinearTransport {
  constructor(apiKey, { env = process.env } = {}) {
    this.name = "playwright";
    this.apiKey = apiKey;
    this.env = env;
    this.cliPath = resolvePlaywrightCliPath({ env });
    this.sessionName = `lh${`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(-12)}`;
    this.isReady = false;
  }

  runCli(args) {
    const result = spawnSync(this.cliPath, ["-s", this.sessionName, ...args], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...this.env,
        PLAYWRIGHT_CLI_SESSION: this.sessionName,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    if (result.status === 0) {
      return result;
    }

    const detail = [result?.error?.message, result?.stderr, result?.stdout]
      .filter((entry) => typeof entry === "string" && entry.trim().length > 0)
      .map((entry) => redactSecretsInText(entry.trim().replaceAll(this.apiKey, "[REDACTED]")))
      .join(" | ") || "no error output";

    throw new Error(`Playwright CLI command failed (${args.join(" ")}): ${detail.slice(0, 800)}`);
  }

  ensureReady() {
    if (this.isReady) {
      return;
    }

    this.runCli(["open", LINEAR_ORIGIN_URL]);
    this.runCli(["eval", `() => { window.__LINEAR_HARNESS_API_KEY = ${JSON.stringify(this.apiKey)}; return true; }`]);
    this.isReady = true;
  }

  async request(query, variables) {
    this.ensureReady();

    const requestBody = makeRequestBody(query, variables);
    const evaluationFunction = `async () => {
      const response = await fetch(${JSON.stringify(LINEAR_GRAPHQL_URL)}, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: window.__LINEAR_HARNESS_API_KEY,
        },
        body: JSON.stringify(${JSON.stringify(requestBody)}),
      });
      return { statusCode: response.status, body: await response.json() };
    }`;

    const parsed = parsePlaywrightEvalOutput(this.runCli(["eval", evaluationFunction]).stdout);
    const payload = parsed?.body;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Playwright GraphQL request returned an unexpected payload shape");
    }

    if (payload.errors) {
      throw new LinearGraphQLError(`Linear GraphQL request failed: ${decodeErrors(payload.errors)}`, {
        errors: payload.errors,
        statusCode: parsed?.statusCode,
        transportName: this.name,
      });
    }

    return payload.data;
  }

  async close() {
    if (!this.isReady) {
      return;
    }

    try {
      this.runCli(["close"]);
    } catch {
      // Keep close idempotent.
    } finally {
      this.isReady = false;
    }
  }
}
