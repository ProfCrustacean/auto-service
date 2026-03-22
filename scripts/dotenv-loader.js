import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/u;

function decodeQuotedValue(value, quote) {
  const inner = value.slice(1, -1);
  if (quote === "\"") {
    return inner
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r")
      .replaceAll("\\t", "\t")
      .replaceAll("\\\"", "\"")
      .replaceAll("\\\\", "\\");
  }

  return inner.replaceAll("\\'", "'");
}

export function parseDotenv(source, { filePath = "<env>" } = {}) {
  const values = new Map();
  const lines = String(source).split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const delimiterIndex = normalized.indexOf("=");
    if (delimiterIndex < 1) {
      throw new Error(`Invalid .env line (${filePath}:${lineNumber}): expected KEY=VALUE`);
    }

    const key = normalized.slice(0, delimiterIndex).trim();
    const rawValue = normalized.slice(delimiterIndex + 1).trim();

    if (!ENV_KEY_PATTERN.test(key)) {
      throw new Error(`Invalid .env key (${filePath}:${lineNumber}): ${key}`);
    }

    let value = rawValue;
    if (
      rawValue.length >= 2
      && ((rawValue.startsWith("\"") && rawValue.endsWith("\"")) || (rawValue.startsWith("'") && rawValue.endsWith("'")))
    ) {
      value = decodeQuotedValue(rawValue, rawValue[0]);
    }

    values.set(key, value);
  }

  return values;
}

export async function loadDotenvIntoProcess({
  cwd = process.cwd(),
  fileNames = [".env", ".env.local"],
  env = process.env,
} = {}) {
  const mergedValues = new Map();
  const loadedFiles = [];

  for (const fileName of fileNames) {
    const filePath = path.resolve(cwd, fileName);
    let content;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        continue;
      }
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }

    loadedFiles.push(filePath);
    const parsed = parseDotenv(content, { filePath });
    for (const [key, value] of parsed.entries()) {
      mergedValues.set(key, value);
    }
  }

  const appliedKeys = [];
  for (const [key, value] of mergedValues.entries()) {
    if (env[key] === undefined) {
      env[key] = value;
      appliedKeys.push(key);
    }
  }

  return {
    loadedFiles,
    appliedKeys,
  };
}

export function loadDotenvIntoProcessSync({
  cwd = process.cwd(),
  fileNames = [".env", ".env.local"],
  env = process.env,
} = {}) {
  const mergedValues = new Map();
  const loadedFiles = [];

  for (const fileName of fileNames) {
    const filePath = path.resolve(cwd, fileName);
    let content;
    try {
      content = fsSync.readFileSync(filePath, "utf8");
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        continue;
      }
      throw new Error(`Failed to read ${filePath}: ${error.message}`);
    }

    loadedFiles.push(filePath);
    const parsed = parseDotenv(content, { filePath });
    for (const [key, value] of parsed.entries()) {
      mergedValues.set(key, value);
    }
  }

  const appliedKeys = [];
  for (const [key, value] of mergedValues.entries()) {
    if (env[key] === undefined) {
      env[key] = value;
      appliedKeys.push(key);
    }
  }

  return {
    loadedFiles,
    appliedKeys,
  };
}
