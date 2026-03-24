function normalizeDeployModeToken(token) {
  if (token === "--skip-deploy") {
    return "skip";
  }
  if (token === "--deploy") {
    return "deploy";
  }
  return null;
}

function normalizeLogLevelToken(token) {
  if (token === "--verbose") {
    return "verbose";
  }
  if (token === "--summary") {
    return "summary";
  }
  return null;
}

export function parseRenderVerifyCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let deployMode = null;
  let logLevel = null;

  for (const token of args) {
    const normalizedMode = normalizeDeployModeToken(token);
    if (normalizedMode) {
      if (deployMode && deployMode !== normalizedMode) {
        throw new Error("Conflicting arguments: use either --skip-deploy or --deploy");
      }
      deployMode = normalizedMode;
      continue;
    }

    const normalizedLogLevel = normalizeLogLevelToken(token);
    if (normalizedLogLevel) {
      if (logLevel && logLevel !== normalizedLogLevel) {
        throw new Error("Conflicting arguments: use either --summary or --verbose");
      }
      logLevel = normalizedLogLevel;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return {
    deployMode,
    skipDeployOverride: deployMode === "skip" ? true : deployMode === "deploy" ? false : null,
    logLevel,
  };
}

export function resolveSkipDeployFromInputs({ envValue, cliOptions }) {
  if (cliOptions?.skipDeployOverride !== null && cliOptions?.skipDeployOverride !== undefined) {
    return cliOptions.skipDeployOverride;
  }

  return envValue === "1";
}
