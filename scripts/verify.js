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

function log(payload) {
  process.stdout.write(`${stringifyRedacted(payload)}\n`);
}

function runProcess(command, args, { env, label, logLevel }) {
  return runProcessBase(command, args, { env, label, logLevel });
}

function getLastLogLines(chunks, maxBytes = 4000) {
  const text = chunks.join("");
  if (text.length <= maxBytes) {
    return text;
  }
  return text.slice(-maxBytes);
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
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

      server.close((closeError) => {
        if (closeError) {
          reject(new Error(`failed to close ephemeral port probe: ${closeError.message}`));
          return;
        }
        resolve(address.port);
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

async function main() {
  assertPositiveInteger(READY_TIMEOUT_MS, "VERIFY_READY_TIMEOUT_MS");
  const harnessLogLevel = resolveHarnessLogLevel();

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

  try {
    log({ status: "verify_step_started", step: "tests" });
    await runProcess(process.execPath, ["--test"], {
      env: process.env,
      label: "node --test",
      logLevel: harnessLogLevel,
    });

    const port = await findAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;

    log({ status: "verify_step_started", step: "server_boot", baseUrl, dbPath });
    serverChild = spawn(process.execPath, ["src/server.js"], {
      env: {
        ...process.env,
        PORT: String(port),
        DB_PATH: dbPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const captureLog = (chunk) => {
      const text = redactSecretsInText(chunk.toString());
      logStream.write(text);
      logChunks.push(text);
      if (logChunks.length > 250) {
        logChunks.shift();
      }
    };

    serverChild.stdout.on("data", captureLog);
    serverChild.stderr.on("data", captureLog);

    await waitForReady(baseUrl, serverChild, logChunks);

    log({ status: "verify_step_started", step: "smoke", baseUrl });
    await runProcess(process.execPath, ["scripts/smoke.js"], {
      env: {
        ...process.env,
        APP_BASE_URL: baseUrl,
      },
      label: "smoke",
      logLevel: harnessLogLevel,
    });

    log({
      status: "verify_passed",
      baseUrl,
      checks: ["tests", "smoke"],
      harnessLogLevel,
      artifactMode: writeFullArtifacts ? "full" : "minimal",
      serverLogPath: writeFullArtifacts ? serverLogPath : null,
      dbPath,
    });
  } catch (error) {
    log({
      status: "verify_failed",
      message: error.message,
      harnessLogLevel,
      artifactMode: writeFullArtifacts ? "full" : "minimal",
      serverLogPath: writeFullArtifacts ? serverLogPath : null,
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
  log({ status: "verify_failed", message: error.message });
  process.exit(1);
});
