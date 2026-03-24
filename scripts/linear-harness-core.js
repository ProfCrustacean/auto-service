function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, fieldName, { allowEmpty = false } = {}) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();
  if (!allowEmpty && trimmed.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }

  return trimmed;
}

function normalizeStringArray(value, fieldName) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of value) {
    const normalizedEntry = requireString(entry, `${fieldName}[]`);
    const key = normalizedEntry.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(normalizedEntry);
    }
  }

  return normalized;
}

export function normalizeIssueTitle(title) {
  return requireString(title, "issue.title").toLowerCase();
}

export function mergeLabelNames(defaultLabels, issueLabels) {
  const merged = [];
  const seen = new Set();

  for (const label of [...defaultLabels, ...issueLabels]) {
    const key = label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(label);
    }
  }

  return merged;
}

export function normalizeIssueSpec(spec) {
  if (!isPlainObject(spec)) {
    throw new Error("spec must be a JSON object");
  }

  const topLevelAllowed = new Set(["teamKey", "stateName", "defaultLabels", "issues"]);
  for (const key of Object.keys(spec)) {
    if (!topLevelAllowed.has(key)) {
      throw new Error(`spec contains unsupported field: ${key}`);
    }
  }

  const defaultLabels = normalizeStringArray(spec.defaultLabels, "spec.defaultLabels");

  if (!Array.isArray(spec.issues) || spec.issues.length === 0) {
    throw new Error("spec.issues must be a non-empty array");
  }

  const normalizedIssues = [];
  const titleSet = new Set();

  for (const [index, issue] of spec.issues.entries()) {
    if (!isPlainObject(issue)) {
      throw new Error(`spec.issues[${index}] must be an object`);
    }

    const issueAllowed = new Set(["title", "description", "labels", "priority"]);
    for (const key of Object.keys(issue)) {
      if (!issueAllowed.has(key)) {
        throw new Error(`spec.issues[${index}] contains unsupported field: ${key}`);
      }
    }

    const title = requireString(issue.title, `spec.issues[${index}].title`);
    const titleKey = title.toLowerCase();
    if (titleSet.has(titleKey)) {
      throw new Error(`spec.issues contains duplicate title: ${title}`);
    }

    const description = issue.description === undefined
      ? undefined
      : requireString(issue.description, `spec.issues[${index}].description`, { allowEmpty: true });

    const labels = normalizeStringArray(issue.labels, `spec.issues[${index}].labels`);

    let priority;
    if (issue.priority !== undefined) {
      if (!Number.isInteger(issue.priority) || issue.priority < 0 || issue.priority > 4) {
        throw new Error(`spec.issues[${index}].priority must be an integer between 0 and 4`);
      }
      priority = issue.priority;
    }

    normalizedIssues.push({ title, description, labels, priority });
    titleSet.add(titleKey);
  }

  const teamKey = spec.teamKey === undefined ? undefined : requireString(spec.teamKey, "spec.teamKey");
  const stateName = spec.stateName === undefined ? undefined : requireString(spec.stateName, "spec.stateName");

  return {
    teamKey,
    stateName,
    defaultLabels,
    issues: normalizedIssues,
  };
}

export function selectTeam(teams, teamSelector) {
  if (!Array.isArray(teams) || teams.length === 0) {
    throw new Error("No Linear teams available for this API key");
  }

  if (!teamSelector) {
    if (teams.length === 1) {
      return teams[0];
    }

    const options = teams.map((team) => `${team.key} (${team.name})`).join(", ");
    throw new Error(`Multiple teams available; provide --team-key. Available teams: ${options}`);
  }

  const normalizedSelector = teamSelector.trim().toLowerCase();
  const match = teams.find((team) => {
    return team.key.toLowerCase() === normalizedSelector || team.name.toLowerCase() === normalizedSelector;
  });

  if (!match) {
    const options = teams.map((team) => `${team.key} (${team.name})`).join(", ");
    throw new Error(`Team '${teamSelector}' was not found. Available teams: ${options}`);
  }

  return match;
}

export function selectState(states, requestedStateName) {
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("Selected team has no workflow states configured");
  }

  if (requestedStateName) {
    const normalized = requestedStateName.trim().toLowerCase();
    const exactMatch = states.find((state) => state.name.toLowerCase() === normalized);
    if (exactMatch) {
      return exactMatch;
    }
  }

  const preferred = states.find((state) => {
    const type = typeof state.type === "string" ? state.type.toLowerCase() : "";
    return type === "backlog" || type === "unstarted";
  });

  if (preferred) {
    return preferred;
  }

  if (requestedStateName) {
    const options = states.map((state) => `${state.name} (${state.type})`).join(", ");
    throw new Error(`State '${requestedStateName}' was not found. Available states: ${options}`);
  }

  return states[0];
}

export function parsePlaywrightEvalOutput(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0) {
    throw new Error("Playwright CLI returned empty output");
  }

  const resultMarker = "### Result";
  const resultStart = stdout.indexOf(resultMarker);
  if (resultStart === -1) {
    const errorMarker = "### Error";
    const errorStart = stdout.indexOf(errorMarker);
    if (errorStart !== -1) {
      const errorText = stdout.slice(errorStart + errorMarker.length).trim();
      throw new Error(`Playwright CLI eval failed: ${errorText}`);
    }
    throw new Error("Playwright CLI output did not include a result block");
  }

  const tail = stdout.slice(resultStart + resultMarker.length).trimStart();
  const nextHeaderIndex = tail.indexOf("\n### ");
  const resultBlock = (nextHeaderIndex === -1 ? tail : tail.slice(0, nextHeaderIndex)).trim();

  if (!resultBlock) {
    throw new Error("Playwright CLI result block was empty");
  }

  try {
    return JSON.parse(resultBlock);
  } catch (error) {
    throw new Error(`Playwright CLI result was not valid JSON: ${error.message}`);
  }
}
