import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import net from "node:net";
import { spawn } from "node:child_process";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import { redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";

loadDotenvIntoProcessSync();
const READY_TIMEOUT_MS = Number.parseInt(process.env.VERIFY_READY_TIMEOUT_MS ?? "30000", 10);
const READY_POLL_MS = 500;
const SERVER_STOP_TIMEOUT_MS = 10000;

function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function waitForExit(child) {
  return new Promise((resolve) => {
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
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

  const includeScenario = process.env.VERIFY_INCLUDE_SCENARIO !== "0";
  const includeBookingScenario = process.env.VERIFY_INCLUDE_BOOKING_SCENARIO !== "0";
  const includeWalkInPageScenario = process.env.VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO !== "0";
  const includeRender = process.env.VERIFY_RENDER === "1";
  const tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "auto-service-verify-"));
  const dbPath = path.join(tmpRoot, "verify.sqlite");

  await fsp.mkdir(path.resolve("evidence"), { recursive: true });
  const serverLogPath = path.resolve("evidence", "verify-server.log");
  const logStream = fs.createWriteStream(serverLogPath, { flags: "w" });
  const logChunks = [];

  let serverChild;
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    logJson({ status: "verify_step_started", step: "tests" });
    await runProcess(process.execPath, ["--test"], {
      env: process.env,
      label: "node --test",
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

    logJson({ status: "verify_step_started", step: "smoke", baseUrl });
    await runProcess(process.execPath, ["scripts/smoke.js"], {
      env: {
        ...process.env,
        APP_BASE_URL: baseUrl,
      },
      label: "smoke",
    });

    if (includeBookingScenario) {
      logJson({ status: "verify_step_started", step: "scenario_booking_page", baseUrl });
      await runProcess(process.execPath, ["scripts/booking-page-scenario.js"], {
        env: {
          ...process.env,
          APP_BASE_URL: baseUrl,
        },
        label: "scenario:booking-page",
      });
    }

    if (includeWalkInPageScenario) {
      logJson({ status: "verify_step_started", step: "scenario_walkin_page", baseUrl });
      await runProcess(process.execPath, ["scripts/walkin-page-scenario.js"], {
        env: {
          ...process.env,
          APP_BASE_URL: baseUrl,
        },
        label: "scenario:walkin-page",
      });
    }

    if (includeScenario) {
      logJson({ status: "verify_step_started", step: "scenario_scheduling_walkin", baseUrl });
      await runProcess(process.execPath, ["scripts/scheduling-walkin-scenario.js"], {
        env: {
          ...process.env,
          APP_BASE_URL: baseUrl,
        },
        label: "scenario:scheduling-walkin",
      });
    }

    if (includeRender) {
      logJson({ status: "verify_step_started", step: "render_verify" });
      await runProcess(process.execPath, ["scripts/verify-render.js"], {
        env: process.env,
        label: "verify:render",
      });
    }

    logJson({
      status: "verify_passed",
      baseUrl,
      includeBookingScenario,
      includeWalkInPageScenario,
      includeScenario,
      includeRender,
      serverLogPath,
      dbPath,
    });
  } catch (error) {
    logJson({
      status: "verify_failed",
      message: error.message,
      baseUrl,
      includeBookingScenario,
      includeWalkInPageScenario,
      includeScenario,
      includeRender,
      serverLogPath,
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
