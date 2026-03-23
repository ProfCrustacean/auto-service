import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { resolveMutationPolicy } from "../src/http/mutationPolicy.js";
import { stringifyRedacted } from "./secret-redaction.js";

const ROUTE_PATTERN = /app\.(post|patch|put|delete)\(\s*["']([^"']+)["']/giu;

function log(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

async function listJavaScriptFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const output = [];

  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".playwright-cli") {
        continue;
      }
      output.push(...await listJavaScriptFiles(absolute));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      output.push(absolute);
    }
  }

  return output;
}

function assertSyntax(files) {
  const failures = [];

  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) {
      failures.push({
        file,
        stderr: result.stderr.trim(),
      });
    }
  }

  return failures;
}

function routePathToSample(pathExpression) {
  return pathExpression.replace(/:[^/]+/gu, "sample");
}

async function collectMutatingRoutes(httpDir) {
  const entries = await fs.readdir(httpDir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }
    const absolute = path.join(httpDir, entry.name);
    const text = await fs.readFile(absolute, "utf8");
    for (const match of text.matchAll(ROUTE_PATTERN)) {
      const method = String(match[1]).toUpperCase();
      const routePath = String(match[2]);
      routes.push({
        file: absolute,
        method,
        routePath,
        samplePath: routePathToSample(routePath),
      });
    }
  }

  return routes;
}

function evaluateRoutePolicyCoverage(routes) {
  const missing = [];

  for (const route of routes) {
    const policy = resolveMutationPolicy({
      method: route.method,
      path: route.samplePath,
    });

    if (!policy && route.samplePath.startsWith("/api/v1/")) {
      missing.push({
        ...route,
        reason: "api mutation route missing explicit policy",
      });
    }
  }

  return missing;
}

async function main() {
  const root = process.cwd();
  const candidates = ["src", "scripts", "tests"].map((segment) => path.join(root, segment));
  const jsFiles = [];
  for (const segment of candidates) {
    jsFiles.push(...await listJavaScriptFiles(segment));
  }

  const syntaxFailures = assertSyntax(jsFiles);
  const routes = await collectMutatingRoutes(path.join(root, "src", "http"));
  const missingPolicies = evaluateRoutePolicyCoverage(routes);

  const summary = {
    status: syntaxFailures.length === 0 && missingPolicies.length === 0
      ? "static_guardrails_ok"
      : "static_guardrails_failed",
    jsFileCount: jsFiles.length,
    mutatingRouteCount: routes.length,
    syntaxFailureCount: syntaxFailures.length,
    missingPolicyCount: missingPolicies.length,
  };
  log(summary);

  if (syntaxFailures.length > 0) {
    log({
      status: "static_guardrails_syntax_failures",
      failures: syntaxFailures.slice(0, 20),
    });
  }

  if (missingPolicies.length > 0) {
    log({
      status: "static_guardrails_policy_coverage_failures",
      failures: missingPolicies,
    });
  }

  if (syntaxFailures.length > 0 || missingPolicies.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  log({
    status: "static_guardrails_failed",
    message: error.message,
  });
  process.exitCode = 1;
});
