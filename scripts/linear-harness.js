import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadDotenvIntoProcess } from "./dotenv-loader.js";
import { redactSecrets, redactSecretsInText, stringifyRedacted } from "./secret-redaction.js";
import {
  formatLinearHarnessHelp,
  LinearHarnessCliError,
  parseLinearHarnessArgs,
} from "./linear-harness-cli.js";
import { PlaywrightLinearTransport, LinearGraphQLError } from "./linear-harness-playwright-transport.js";
import { runLinearApply } from "./linear-harness-apply.js";

function resolveOutputPath(outputPath) {
  if (!outputPath) {
    return undefined;
  }
  return path.resolve(process.cwd(), outputPath);
}

async function writeOutput(outputPath, payload) {
  const resolved = resolveOutputPath(outputPath);
  if (!resolved) {
    return;
  }

  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, `${stringifyRedacted(payload, 2)}\n`, "utf8");
}

function renderError(error) {
  if (error instanceof LinearGraphQLError) {
    return {
      status: "linear_harness_failed",
      errorType: error.name,
      message: redactSecretsInText(error.message),
      transport: error.transportName,
      statusCode: error.statusCode,
      errors: redactSecrets(error.errors),
    };
  }

  if (error instanceof LinearHarnessCliError) {
    return {
      status: "linear_harness_failed",
      errorType: error.name,
      code: error.code,
      message: redactSecretsInText(error.message),
      hint: error.hint,
    };
  }

  return {
    status: "linear_harness_failed",
    errorType: error?.name ?? "Error",
    message: redactSecretsInText(error?.message ?? "Unknown error"),
  };
}

async function main() {
  try {
    await loadDotenvIntoProcess();
  } catch (error) {
    process.stderr.write(`${stringifyRedacted(renderError(error), 2)}\n`);
    process.exit(1);
  }

  let options;
  try {
    options = parseLinearHarnessArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${stringifyRedacted(renderError(error), 2)}\n`);
    process.exit(1);
  }

  if (options.help) {
    process.stdout.write(formatLinearHarnessHelp());
    return;
  }

  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    process.stderr.write(`${stringifyRedacted(renderError(new Error("LINEAR_API_KEY is required")), 2)}\n`);
    process.exit(1);
  }

  let transport;
  try {
    transport = new PlaywrightLinearTransport(apiKey.trim());
    const result = await runLinearApply(transport, options);
    await writeOutput(options.outputPath, result);
    process.stdout.write(`${stringifyRedacted(result, 2)}\n`);
  } catch (error) {
    const payload = renderError(error);
    if (options?.outputPath) {
      await writeOutput(options.outputPath, payload);
    }
    process.stderr.write(`${stringifyRedacted(payload, 2)}\n`);
    process.exitCode = 1;
  } finally {
    if (transport) {
      await transport.close();
    }
  }
}

main();
