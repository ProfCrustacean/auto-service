import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  hasCountryRestriction,
  mergeLabelNames,
  normalizeIssueSpec,
  normalizeIssueTitle,
  parsePlaywrightEvalOutput,
  selectState,
  selectTeam,
} from "./linear-harness-core.js";

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";
const LINEAR_ORIGIN_URL = "https://linear.app";
const DEFAULT_STATE_NAME = "Backlog";
const DEFAULT_ISSUES_LIMIT = 250;
const VIEWER_QUERY = `
  query ViewerQuery {
    viewer {
      id
      name
      email
    }
  }
`;

class LinearGraphQLError extends Error {
  constructor(message, { errors = [], statusCode, transportName } = {}) {
    super(message);
    this.name = "LinearGraphQLError";
    this.errors = errors;
    this.statusCode = statusCode;
    this.transportName = transportName;
  }
}

function printHelp() {
  process.stdout.write(`Usage:\n`);
  process.stdout.write(`  node scripts/linear-harness.js probe [--team-key <key>] [--state <name>] [--transport <playwright|direct|auto>] [--output <path>]\n`);
  process.stdout.write(`  node scripts/linear-harness.js create --spec <path> [--dry-run] [--team-key <key>] [--state <name>] [--transport <playwright|direct|auto>] [--output <path>]\n\n`);
  process.stdout.write(`Environment variables:\n`);
  process.stdout.write(`  LINEAR_API_KEY (required)\n`);
  process.stdout.write(`  LINEAR_TEAM_KEY (optional)\n`);
  process.stdout.write(`  LINEAR_STATE_NAME (optional; default Backlog)\n`);
  process.stdout.write(`  LINEAR_TRANSPORT (optional; default playwright)\n`);
  process.stdout.write(`  LINEAR_OUTPUT_PATH (optional)\n`);
  process.stdout.write(`  LINEAR_ISSUES_LIMIT (optional; default 250)\n`);
  process.stdout.write(`  LINEAR_PLAYWRIGHT_CLI (optional explicit path to playwright_cli.sh)\n`);
}

function parseInteger(value, fieldName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = [...argv];
  let command = "probe";

  if (args[0] && !args[0].startsWith("--")) {
    command = args.shift();
  }

  const options = {
    command,
    specPath: undefined,
    dryRun: false,
    teamKey: process.env.LINEAR_TEAM_KEY,
    stateName: process.env.LINEAR_STATE_NAME,
    transport: (process.env.LINEAR_TRANSPORT ?? "playwright").toLowerCase(),
    outputPath: process.env.LINEAR_OUTPUT_PATH,
    issuesLimit: process.env.LINEAR_ISSUES_LIMIT
      ? parseInteger(process.env.LINEAR_ISSUES_LIMIT, "LINEAR_ISSUES_LIMIT")
      : DEFAULT_ISSUES_LIMIT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token === "--spec") {
      options.specPath = args[index + 1];
      index += 1;
      continue;
    }

    if (token === "--team-key") {
      options.teamKey = args[index + 1];
      index += 1;
      continue;
    }

    if (token === "--state") {
      options.stateName = args[index + 1];
      index += 1;
      continue;
    }

    if (token === "--transport") {
      options.transport = (args[index + 1] ?? "").toLowerCase();
      index += 1;
      continue;
    }

    if (token === "--output") {
      options.outputPath = args[index + 1];
      index += 1;
      continue;
    }

    if (token === "--issues-limit") {
      options.issuesLimit = parseInteger(args[index + 1], "--issues-limit");
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  const validCommands = new Set(["probe", "create"]);
  if (!validCommands.has(options.command)) {
    throw new Error(`Unsupported command '${options.command}'. Use 'probe' or 'create'.`);
  }

  const validTransports = new Set(["playwright", "direct", "auto"]);
  if (!validTransports.has(options.transport)) {
    throw new Error(`Unsupported transport '${options.transport}'. Use playwright, direct, or auto.`);
  }

  if (options.command === "create" && !options.specPath) {
    throw new Error("--spec is required for create command");
  }

  return options;
}

function resolveOutputPath(outputPath) {
  if (!outputPath) {
    return undefined;
  }

  return path.resolve(process.cwd(), outputPath);
}

function resolvePlaywrightCli() {
  if (process.env.LINEAR_PLAYWRIGHT_CLI) {
    return {
      command: process.env.LINEAR_PLAYWRIGHT_CLI,
      prefixArgs: [],
      label: "explicit-cli",
    };
  }

  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex");
  const bundled = path.join(codexHome, "skills", "playwright", "scripts", "playwright_cli.sh");

  return {
    command: bundled,
    prefixArgs: [],
    label: "codex-skill-wrapper",
    fallback: {
      command: "npx",
      prefixArgs: ["--yes", "--package", "@playwright/cli", "playwright-cli"],
      label: "npx-playwright-cli",
    },
  };
}

function decodeGraphqlErrors(errors) {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors
    .map((error) => {
      const code = error?.extensions?.code ? ` [${error.extensions.code}]` : "";
      const message = typeof error?.message === "string" ? error.message : "Unknown GraphQL error";
      return `${message}${code}`;
    })
    .join("; ");
}

function makeRequestBody(query, variables) {
  return {
    query,
    variables: variables ?? {},
  };
}

class DirectTransport {
  constructor(apiKey) {
    this.name = "direct";
    this.apiKey = apiKey;
  }

  async request(query, variables) {
    let response;
    try {
      response = await fetch(LINEAR_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: this.apiKey,
        },
        body: JSON.stringify(makeRequestBody(query, variables)),
      });
    } catch (error) {
      throw new Error(`Direct Linear request failed: ${error.message}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Linear API returned non-JSON response (${response.status}): ${error.message}`);
    }

    if (!response.ok || payload.errors) {
      const decodedErrors = payload.errors ? decodeGraphqlErrors(payload.errors) : "";
      const errorMessage = decodedErrors || `HTTP ${response.status}`;
      throw new LinearGraphQLError(`Linear GraphQL request failed: ${errorMessage}`, {
        errors: payload.errors,
        statusCode: response.status,
        transportName: this.name,
      });
    }

    return payload.data;
  }

  async close() {
    // no-op
  }
}

class PlaywrightTransport {
  constructor(apiKey) {
    this.name = "playwright";
    this.apiKey = apiKey;
    const entropy = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-10);
    this.sessionName = `lh${entropy}`;
    this.runner = resolvePlaywrightCli();
    this.isReady = false;
  }

  runCli(args, { allowFallbackToNpx = true, silent = false } = {}) {
    const primary = this.execute(this.runner.command, [...this.runner.prefixArgs, "-s", this.sessionName, ...args], {
      silent,
    });

    if (primary.status === 0) {
      return primary;
    }

    if (allowFallbackToNpx && this.runner.fallback) {
      const fallback = this.execute(
        this.runner.fallback.command,
        [...this.runner.fallback.prefixArgs, "-s", this.sessionName, ...args],
        { silent },
      );

      if (fallback.status === 0) {
        this.runner = {
          command: this.runner.fallback.command,
          prefixArgs: this.runner.fallback.prefixArgs,
          label: this.runner.fallback.label,
        };
        return fallback;
      }

      throw new Error(
        `Playwright CLI command failed (${args.join(" ")}): ${this.extractError(fallback, primary)}`,
      );
    }

    throw new Error(`Playwright CLI command failed (${args.join(" ")}): ${this.extractError(primary)}`);
  }

  execute(command, args, { silent }) {
    return spawnSync(command, args, {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        PLAYWRIGHT_CLI_SESSION: this.sessionName,
      },
      stdio: silent ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    });
  }

  extractError(current, previous) {
    const outputs = [current?.error?.message, current?.stderr, current?.stdout, previous?.error?.message, previous?.stderr, previous?.stdout]
      .filter((item) => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim().replaceAll(this.apiKey, "[REDACTED]"));

    if (outputs.length === 0) {
      return "no error output";
    }

    return outputs.join(" | ").slice(0, 800);
  }

  ensureSuccess(result, commandLabel) {
    if (result.status !== 0) {
      throw new Error(`Playwright command '${commandLabel}' failed: ${this.extractError(result)}`);
    }
  }

  ensureReady() {
    if (this.isReady) {
      return;
    }

    const openResult = this.runCli(["open", LINEAR_ORIGIN_URL], { silent: true });
    this.ensureSuccess(openResult, "open");

    const setKeyFunction = `() => { window.__LINEAR_HARNESS_API_KEY = ${JSON.stringify(this.apiKey)}; return true; }`;
    const seedResult = this.runCli(["eval", setKeyFunction], { allowFallbackToNpx: false, silent: true });
    this.ensureSuccess(seedResult, "eval:set-key");

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
      return await response.json();
    }`;

    const evalResult = this.runCli(["eval", evaluationFunction], { allowFallbackToNpx: false, silent: true });
    this.ensureSuccess(evalResult, "eval:graphql");

    const parsed = parsePlaywrightEvalOutput(evalResult.stdout);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Playwright GraphQL request returned an unexpected payload shape");
    }

    if (parsed.errors) {
      throw new LinearGraphQLError(`Linear GraphQL request failed: ${decodeGraphqlErrors(parsed.errors)}`, {
        errors: parsed.errors,
        transportName: this.name,
      });
    }

    return parsed.data;
  }

  async close() {
    if (!this.isReady) {
      return;
    }

    try {
      this.runCli(["close"], { allowFallbackToNpx: false, silent: true });
    } catch {
      // Ignore close errors to keep shutdown idempotent.
    } finally {
      this.isReady = false;
    }
  }
}

function shouldFallbackToPlaywright(error) {
  if (error instanceof LinearGraphQLError) {
    if (hasCountryRestriction(error.errors)) {
      return true;
    }

    return error.statusCode === 403 || error.statusCode === 451;
  }

  const message = typeof error?.message === "string" ? error.message : "";
  return /fetch failed|network|timed out/i.test(message);
}

async function resolveTransport(apiKey, transportPreference) {
  if (transportPreference === "direct") {
    return new DirectTransport(apiKey);
  }

  if (transportPreference === "playwright") {
    return new PlaywrightTransport(apiKey);
  }

  const direct = new DirectTransport(apiKey);
  try {
    await direct.request(VIEWER_QUERY, {});
    return direct;
  } catch (error) {
    if (!shouldFallbackToPlaywright(error)) {
      throw error;
    }

    return new PlaywrightTransport(apiKey);
  }
}

async function fetchWorkspaceContext(transport, { teamSelector, stateName, issuesLimit }) {
  const discoveryQuery = `
    query Discovery {
      viewer {
        id
        name
        email
      }
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `;

  const discoveryData = await transport.request(discoveryQuery, {});
  const viewer = discoveryData?.viewer;
  const teams = discoveryData?.teams?.nodes ?? [];

  if (!viewer?.id) {
    throw new Error("Linear API key is valid but viewer context is missing");
  }

  const selectedTeam = selectTeam(teams, teamSelector);

  const teamContextQuery = `
    query TeamContext($teamId: String!) {
      team(id: $teamId) {
        id
        key
        name
        states {
          nodes {
            id
            name
            type
          }
        }
        labels(first: 250) {
          nodes {
            id
            name
          }
        }
        issues(first: ${issuesLimit}) {
          nodes {
            id
            identifier
            title
            url
            state {
              id
              name
              type
            }
          }
        }
      }
    }
  `;

  const teamData = await transport.request(teamContextQuery, { teamId: selectedTeam.id });
  const team = teamData?.team;
  if (!team?.id) {
    throw new Error("Failed to load selected Linear team context");
  }

  const state = selectState(team.states?.nodes ?? [], stateName ?? DEFAULT_STATE_NAME);

  return {
    viewer,
    team,
    state,
  };
}

function buildLabelMap(labels) {
  const map = new Map();
  for (const label of labels) {
    map.set(label.name.toLowerCase(), label);
  }
  return map;
}

async function ensureLabel(transport, teamId, labelName, dryRun) {
  if (dryRun) {
    return {
      id: `dry-run-label-${labelName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: labelName,
      isDryRun: true,
    };
  }

  const mutation = `
    mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
      issueLabelCreate(input: $input) {
        success
        issueLabel {
          id
          name
        }
      }
    }
  `;

  const data = await transport.request(mutation, {
    input: {
      teamId,
      name: labelName,
    },
  });

  const issueLabel = data?.issueLabelCreate?.issueLabel;
  if (!issueLabel?.id) {
    throw new Error(`Failed to create Linear label '${labelName}'`);
  }

  return issueLabel;
}

async function createIssue(transport, input, dryRun) {
  if (dryRun) {
    return {
      id: `dry-run-issue-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      identifier: "DRY-RUN",
      title: input.title,
      url: undefined,
      isDryRun: true,
    };
  }

  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          url
        }
      }
    }
  `;

  const data = await transport.request(mutation, { input });
  const issue = data?.issueCreate?.issue;
  if (!issue?.id) {
    throw new Error(`Failed to create Linear issue '${input.title}'`);
  }

  return issue;
}

async function runProbe(transport, options) {
  const context = await fetchWorkspaceContext(transport, {
    teamSelector: options.teamKey,
    stateName: options.stateName ?? DEFAULT_STATE_NAME,
    issuesLimit: options.issuesLimit,
  });

  return {
    status: "linear_probe_ok",
    transport: transport.name,
    viewer: context.viewer,
    team: {
      id: context.team.id,
      key: context.team.key,
      name: context.team.name,
      stateCount: context.team.states?.nodes?.length ?? 0,
      labelCount: context.team.labels?.nodes?.length ?? 0,
      sampledIssueCount: context.team.issues?.nodes?.length ?? 0,
    },
    targetState: {
      id: context.state.id,
      name: context.state.name,
      type: context.state.type,
    },
  };
}

async function loadSpec(specPath) {
  const absolutePath = path.resolve(process.cwd(), specPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = normalizeIssueSpec(parsed);

  return {
    absolutePath,
    spec: normalized,
  };
}

async function runCreate(transport, options) {
  const { absolutePath, spec } = await loadSpec(options.specPath);

  const teamSelector = options.teamKey ?? spec.teamKey;
  const stateName = options.stateName ?? spec.stateName ?? DEFAULT_STATE_NAME;

  const context = await fetchWorkspaceContext(transport, {
    teamSelector,
    stateName,
    issuesLimit: options.issuesLimit,
  });

  const labelMap = buildLabelMap(context.team.labels?.nodes ?? []);
  const existingByTitle = new Map();

  for (const existing of context.team.issues?.nodes ?? []) {
    existingByTitle.set(normalizeIssueTitle(existing.title), existing);
  }

  const resultItems = [];
  const createdLabelNames = [];

  for (const issueSpec of spec.issues) {
    const issueTitleKey = normalizeIssueTitle(issueSpec.title);
    const existing = existingByTitle.get(issueTitleKey);

    if (existing) {
      resultItems.push({
        title: issueSpec.title,
        action: "skipped_existing",
        identifier: existing.identifier,
        url: existing.url,
      });
      continue;
    }

    const labelNames = mergeLabelNames(spec.defaultLabels, issueSpec.labels);
    const labelIds = [];

    for (const labelName of labelNames) {
      const mapKey = labelName.toLowerCase();
      let label = labelMap.get(mapKey);
      if (!label) {
        label = await ensureLabel(transport, context.team.id, labelName, options.dryRun);
        labelMap.set(mapKey, label);
        createdLabelNames.push(labelName);
      }

      labelIds.push(label.id);
    }

    const issueInput = {
      teamId: context.team.id,
      stateId: context.state.id,
      title: issueSpec.title,
      labelIds,
    };

    if (issueSpec.description !== undefined) {
      issueInput.description = issueSpec.description;
    }

    if (issueSpec.priority !== undefined) {
      issueInput.priority = issueSpec.priority;
    }

    const created = await createIssue(transport, issueInput, options.dryRun);

    existingByTitle.set(issueTitleKey, {
      id: created.id,
      identifier: created.identifier,
      title: created.title,
      url: created.url,
    });

    resultItems.push({
      title: issueSpec.title,
      action: options.dryRun ? "would_create" : "created",
      identifier: created.identifier,
      url: created.url,
      labels: labelNames,
    });
  }

  const createdCount = resultItems.filter((item) => item.action === "created").length;
  const skippedCount = resultItems.filter((item) => item.action === "skipped_existing").length;
  const wouldCreateCount = resultItems.filter((item) => item.action === "would_create").length;

  return {
    status: options.dryRun ? "linear_create_dry_run_complete" : "linear_create_complete",
    transport: transport.name,
    dryRun: options.dryRun,
    specPath: absolutePath,
    viewer: context.viewer,
    team: {
      id: context.team.id,
      key: context.team.key,
      name: context.team.name,
    },
    targetState: {
      id: context.state.id,
      name: context.state.name,
      type: context.state.type,
    },
    summary: {
      requested: spec.issues.length,
      created: createdCount,
      wouldCreate: wouldCreateCount,
      skippedExisting: skippedCount,
      labelsCreated: [...new Set(createdLabelNames)].length,
    },
    issues: resultItems,
  };
}

async function writeOutput(outputPath, payload) {
  const resolved = resolveOutputPath(outputPath);
  if (!resolved) {
    return;
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function renderError(error) {
  if (error instanceof LinearGraphQLError) {
    return {
      status: "linear_harness_failed",
      errorType: error.name,
      message: error.message,
      transport: error.transportName,
      statusCode: error.statusCode,
      errors: error.errors,
    };
  }

  return {
    status: "linear_harness_failed",
    errorType: error?.name ?? "Error",
    message: error?.message ?? "Unknown error",
  };
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${JSON.stringify(renderError(error))}\n`);
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    return;
  }

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    process.stderr.write(`${JSON.stringify(renderError(new Error("LINEAR_API_KEY is required")))}\n`);
    process.exit(1);
  }

  let transport;

  try {
    transport = await resolveTransport(apiKey.trim(), options.transport);

    const result = options.command === "probe"
      ? await runProbe(transport, options)
      : await runCreate(transport, options);

    await writeOutput(options.outputPath, result);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    const payload = renderError(error);
    if (options?.outputPath) {
      await writeOutput(options.outputPath, payload);
    }
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exitCode = 1;
  } finally {
    if (transport) {
      await transport.close();
    }
  }
}

main();
