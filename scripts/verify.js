import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import net from "node:net";
import { spawn } from "node:child_process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";
import {
  assertPositiveInteger,
  runProcess as runProcessBase,
  resolveHarnessLogLevel,
  wait,
  withTimeout,
} from "./harness-process.js";

loadDotenvIntoProcessSync();
const READY_TIMEOUT_MS = Number.parseInt(process.env.VERIFY_READY_TIMEOUT_MS ?? "30000", 10);
const READY_POLL_MS = 500;
const SERVER_STOP_TIMEOUT_MS = 10000;

function logJson(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

function getLastLogLines(chunks, maxBytes = 4000) {
  const text = chunks.join("");
  if (text.length <= maxBytes) {
    return text;
  }
  return text.slice(-maxBytes);
}

function runProcess(command, args, { env, label }) {
  return runProcessBase(command, args, { env, label });
}

async function runStep({ step, baseUrl, args, label, env = process.env, logLevel }) {
  logJson({ status: "verify_step_started", step, ...(baseUrl ? { baseUrl } : {}) });
  await runProcess(process.execPath, args, { env, label, logLevel });
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      reject(new Error(`failed to find available port: ${error.message}`));
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("failed to resolve ephemeral port")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(new Error(`failed to close ephemeral port probe: ${closeError.message}`));
          return;
        }

        resolve(port);
      });
    });
  });
}

async function waitForReady(baseUrl, serverChild, logChunks) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (serverChild.exitCode !== null) {
      throw new Error(
        `server exited before readiness check completed; recent logs:\n${getLastLogLines(logChunks)}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/readyz`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === "ready") {
          return;
        }
      }
    } catch {
      // Server may still be starting.
    }

    await wait(READY_POLL_MS);
  }

  throw new Error(`server did not become ready within ${READY_TIMEOUT_MS}ms; recent logs:\n${getLastLogLines(logChunks)}`);
}

async function stopServer(serverChild) {
  if (serverChild.exitCode !== null) {
    return;
  }

  serverChild.kill("SIGTERM");

  try {
    await withTimeout(
      waitForExit(serverChild),
      SERVER_STOP_TIMEOUT_MS,
      `server did not stop within ${SERVER_STOP_TIMEOUT_MS}ms after SIGTERM`,
    );
  } catch {
    serverChild.kill("SIGKILL");
    await waitForExit(serverChild);
  }
}

async function main() {
  assertPositiveInteger(READY_TIMEOUT_MS, "VERIFY_READY_TIMEOUT_MS");
  const harnessLogLevel = resolveHarnessLogLevel();

  const includeScenario = process.env.VERIFY_INCLUDE_SCENARIO !== "0";
  const includeIntakeBookingScenario = (
    process.env.VERIFY_INCLUDE_INTAKE_BOOKING_SCENARIO
    ?? process.env.VERIFY_INCLUDE_BOOKING_SCENARIO
    ?? "1"
  ) !== "0";
  const includeIntakeWalkInScenario = (
    process.env.VERIFY_INCLUDE_INTAKE_WALKIN_SCENARIO
    ?? process.env.VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO
    ?? "1"
  ) !== "0";
  const includePartsScenario = process.env.VERIFY_INCLUDE_PARTS_SCENARIO !== "0";
  const includeDispatchBoardScenario = process.env.VERIFY_INCLUDE_DISPATCH_BOARD_SCENARIO !== "0";
  const includeRender = process.env.VERIFY_RENDER === "1";
  const artifactMode = String(process.env.HARNESS_ARTIFACTS ?? "minimal").trim().toLowerCase();
  const writeFullArtifacts = artifactMode === "full";
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "auto-service-verify-"));
  const dbPath = path.join(tmpRoot, "verify.sqlite");

  const serverLogPath = writeFullArtifacts
    ? path.resolve("evidence", "verify-server.log")
    : path.join(tmpRoot, "verify-server.log");
  if (writeFullArtifacts) {
    await fsp.mkdir(path.resolve("evidence"), { recursive: true });
  }
  const logStream = fs.createWriteStream(serverLogPath, { flags: "w" });
  const logChunks = [];

  let serverChild;
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await runStep({
      step: "tests",
      args: ["--test"],
      env: process.env,
      label: "node --test",
      logLevel: harnessLogLevel,
    });

    logJson({ status: "verify_step_started", step: "server_boot", baseUrl, dbPath });
    serverChild = spawn(process.execPath, ["src/server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: dbPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    serverChild.stdout.on("data", (chunk) => {
      const text = redactSecretsInText(chunk.toString());
      logStream.write(text);
      logChunks.push(text);
      if (logChunks.length > 250) {
        logChunks.shift();
      }
    });

    serverChild.stderr.on("data", (chunk) => {
      const text = redactSecretsInText(chunk.toString());
      logStream.write(text);
      logChunks.push(text);
      if (logChunks.length > 250) {
        logChunks.shift();
      }
    });

    await waitForReady(baseUrl, serverChild, logChunks);

    const scenarioEnv = { ...process.env, APP_BASE_URL: baseUrl };
    const scenarioSteps = [
      { enabled: true, step: "smoke", args: ["scripts/smoke.js"], label: "smoke" },
      {
        enabled: includeIntakeBookingScenario,
        step: "scenario_intake_page_booking",
        args: ["scripts/intake-page-scenario.js", "--mode", "booking"],
        label: "scenario:intake-page:booking",
      },
      {
        enabled: includeIntakeWalkInScenario,
        step: "scenario_intake_page_walkin",
        args: ["scripts/intake-page-scenario.js", "--mode", "walkin"],
        label: "scenario:intake-page:walkin",
      },
      {
        enabled: includeScenario,
        step: "scenario_scheduling_walkin",
        args: ["scripts/scheduling-walkin-scenario.js"],
        label: "scenario:scheduling-walkin",
      },
      {
        enabled: includePartsScenario,
        step: "scenario_parts_flow",
        args: ["scripts/parts-flow-scenario.js"],
        label: "scenario:parts-flow",
      },
      {
        enabled: includeDispatchBoardScenario,
        step: "scenario_dispatch_board",
        args: ["scripts/dispatch-board-scenario.js"],
        label: "scenario:dispatch-board",
      },
    ];
    for (const scenarioStep of scenarioSteps) {
      if (!scenarioStep.enabled) {
        continue;
      }
      await runStep({
        ...scenarioStep,
        baseUrl,
        env: scenarioEnv,
        logLevel: harnessLogLevel,
      });
    }

    if (includeRender) {
      await runStep({
        step: "render_verify",
        args: ["scripts/verify-render.js"],
        env: process.env,
        label: "verify:render",
        logLevel: harnessLogLevel,
      });
    }

    logJson({
      status: "verify_passed",
      baseUrl,
      includeIntakeBookingScenario,
      includeIntakeWalkInScenario,
      includeScenario,
      includePartsScenario,
      includeDispatchBoardScenario,
      includeRender,
      serverLogPath: writeFullArtifacts ? serverLogPath : null,
      dbPath,
      harnessLogLevel,
      artifactMode: writeFullArtifacts ? "full" : "minimal",
    });
  } catch (error) {
    logJson({
      status: "verify_failed",
      message: error.message,
      baseUrl,
      includeIntakeBookingScenario,
      includeIntakeWalkInScenario,
      includeScenario,
      includePartsScenario,
      includeDispatchBoardScenario,
      includeRender,
      serverLogPath: writeFullArtifacts ? serverLogPath : null,
      harnessLogLevel,
      artifactMode: writeFullArtifacts ? "full" : "minimal",
    });
    process.exitCode = 1;
  } finally {
    if (serverChild) {
      await stopServer(serverChild);
    }

    logStream.end();
    await fsp.rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  logJson({ status: "verify_failed", message: error.message });
  process.exit(1);
});
