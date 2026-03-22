function normalizeDeployModeToken(token) {
  if (token === "--skip-deploy") {
    return "skip";
  }
  if (token === "--deploy") {
    return "deploy";
  }
  return null;
}

export function parseRenderVerifyCliArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let deployMode = null;

  for (const token of args) {
    const normalizedMode = normalizeDeployModeToken(token);
    if (!normalizedMode) {
      throw new Error(`Unknown argument: ${token}`);
    }

    if (deployMode && deployMode !== normalizedMode) {
      throw new Error("Conflicting arguments: use either --skip-deploy or --deploy");
    }

    deployMode = normalizedMode;
  }

  return {
    deployMode,
    skipDeployOverride: deployMode === "skip" ? true : deployMode === "deploy" ? false : null,
  };
}

export function resolveSkipDeployFromInputs({ envValue, cliOptions }) {
  if (cliOptions?.skipDeployOverride !== null && cliOptions?.skipDeployOverride !== undefined) {
    return cliOptions.skipDeployOverride;
  }

  return envValue === "1";
}
