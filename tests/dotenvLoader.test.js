import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { loadDotenvIntoProcess, loadDotenvIntoProcessSync, parseDotenv } from "../scripts/dotenv-loader.js";

function mapToObject(map) {
  return Object.fromEntries(map.entries());
}

test("parseDotenv reads common key/value patterns", () => {
  const parsed = parseDotenv(`
    # comment
    LINEAR_API_KEY=lin_api_token
    LINEAR_TEAM_KEY = AUT
    export LINEAR_STATE_NAME="Backlog"
    LINEAR_NOTE='hello world'
    LINEAR_NEWLINE="a\\nb"
  `, { filePath: "test.env" });

  assert.deepEqual(mapToObject(parsed), {
    LINEAR_API_KEY: "lin_api_token",
    LINEAR_TEAM_KEY: "AUT",
    LINEAR_STATE_NAME: "Backlog",
    LINEAR_NOTE: "hello world",
    LINEAR_NEWLINE: "a\nb",
  });
});

test("parseDotenv rejects malformed keys and lines", () => {
  assert.throws(
    () => parseDotenv("INVALID LINE", { filePath: "bad.env" }),
    /expected KEY=VALUE/u,
  );

  assert.throws(
    () => parseDotenv("1BAD=value", { filePath: "bad.env" }),
    /Invalid \.env key/u,
  );
});

test("loadDotenvIntoProcess uses process env precedence and merges files deterministically", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "auto-service-dotenv-loader-"));
  const env = {
    LINEAR_API_KEY: "from_process_env",
  };

  try {
    await fs.writeFile(
      path.join(tmpRoot, ".env"),
      "LINEAR_API_KEY=from_dotenv\nLINEAR_TEAM_KEY=AUT\nSHARED=from_env\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmpRoot, ".env.local"),
      "LINEAR_STATE_NAME=Backlog\nSHARED=from_env_local\n",
      "utf8",
    );

    const result = await loadDotenvIntoProcess({
      cwd: tmpRoot,
      env,
    });

    assert.equal(Array.isArray(result.loadedFiles), true);
    assert.equal(result.loadedFiles.length, 2);
    assert.equal(result.appliedKeys.includes("LINEAR_TEAM_KEY"), true);
    assert.equal(result.appliedKeys.includes("LINEAR_STATE_NAME"), true);
    assert.equal(result.appliedKeys.includes("LINEAR_API_KEY"), false);

    assert.equal(env.LINEAR_API_KEY, "from_process_env");
    assert.equal(env.LINEAR_TEAM_KEY, "AUT");
    assert.equal(env.LINEAR_STATE_NAME, "Backlog");
    assert.equal(env.SHARED, "from_env_local");
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

test("loadDotenvIntoProcessSync matches async precedence behavior", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "auto-service-dotenv-loader-sync-"));
  const env = {
    LINEAR_TRANSPORT: "direct",
  };

  try {
    await fs.writeFile(
      path.join(tmpRoot, ".env"),
      "LINEAR_TRANSPORT=playwright\nLINEAR_TEAM_KEY=AUT\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmpRoot, ".env.local"),
      "LINEAR_STATE_NAME=Backlog\n",
      "utf8",
    );

    const result = loadDotenvIntoProcessSync({
      cwd: tmpRoot,
      env,
    });

    assert.equal(result.loadedFiles.length, 2);
    assert.equal(result.appliedKeys.includes("LINEAR_TEAM_KEY"), true);
    assert.equal(result.appliedKeys.includes("LINEAR_STATE_NAME"), true);
    assert.equal(result.appliedKeys.includes("LINEAR_TRANSPORT"), false);
    assert.equal(env.LINEAR_TRANSPORT, "direct");
    assert.equal(env.LINEAR_TEAM_KEY, "AUT");
    assert.equal(env.LINEAR_STATE_NAME, "Backlog");
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});
