import { spawn } from "node:child_process";

const LOG_LEVELS = new Set(["summary", "verbose"]);

export function assertPositiveInteger(value, fieldName) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

export function assertNonNegativeInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
}

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getFailureTail(stdout, stderr, maxChars = 2000) {
  const normalizedStdout = typeof stdout === "string" ? stdout.trim() : "";
  const normalizedStderr = typeof stderr === "string" ? stderr.trim() : "";
  const combined = [normalizedStderr, normalizedStdout]
    .filter((entry) => entry.length > 0)
    .join("\n");

  if (combined.length <= maxChars) {
    return combined || "n/a";
  }

  return combined.slice(-maxChars);
}

export function resolveHarnessLogLevel({ env = process.env, override } = {}) {
  const candidate = String(override ?? env?.HARNESS_LOG_LEVEL ?? "summary").trim().toLowerCase();
  if (!LOG_LEVELS.has(candidate)) {
    throw new Error("HARNESS_LOG_LEVEL must be either 'summary' or 'verbose'");
  }
  return candidate;
}

export function runCommandCapture(command, args, { env, label }) {
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

export function runProcess(command, args, { env, label, logLevel } = {}) {
  const resolvedLogLevel = resolveHarnessLogLevel({ env, override: logLevel });

  if (resolvedLogLevel === "verbose") {
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
          resolve({ stdout: "", stderr: "" });
          return;
        }

        const detail = signal ? `signal ${signal}` : `exit code ${code}`;
        reject(new Error(`${label} failed with ${detail}`));
      });
    });
  }

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
      reject(new Error(`${label} failed with ${detail}; tail: ${getFailureTail(stdout, stderr)}`));
    });
  });
}

export async function runProcessWithRetries({
  command,
  args,
  env,
  label,
  step,
  maxAttempts,
  retryDelayMs,
  onRetry = () => {},
  onRecovered = () => {},
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        onRetry({
          phase: "retry_started",
          step,
          attempt,
          maxAttempts,
          retryDelayMs,
        });
      }

      await runProcess(command, args, { env, label });

      if (attempt > 1) {
        onRecovered({
          phase: "retry_recovered",
          step,
          attempt,
          maxAttempts,
        });
      }
      return;
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      onRetry({
        phase: "retry_scheduled",
        step,
        attempt,
        maxAttempts,
        retryDelayMs,
        message: error.message,
      });
      await wait(retryDelayMs);
    }
  }

  throw lastError;
}

export async function withTimeout(promise, timeoutMs, timeoutMessage) {
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
