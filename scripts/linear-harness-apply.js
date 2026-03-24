import fs from "node:fs/promises";
import path from "node:path";
import {
  mergeLabelNames,
  normalizeIssueSpec,
  normalizeIssueTitle,
  selectState,
  selectTeam,
} from "./linear-harness-core.js";
import { DEFAULT_STATE_NAME } from "./linear-harness-cli.js";

const DISCOVERY_QUERY = `
  query Discovery {
    viewer {
      id
      name
      email
    }
    teams {
      nodes {
        id
        key
        name
      }
    }
  }
`;

const TEAM_CONTEXT_QUERY = (issuesLimit) => `
  query TeamContext($teamId: String!) {
    team(id: $teamId) {
      id
      key
      name
      states {
        nodes {
          id
          name
          type
        }
      }
      labels(first: 250) {
        nodes {
          id
          name
        }
      }
      issues(first: ${issuesLimit}) {
        nodes {
          id
          identifier
          title
          url
          state {
            id
            name
            type
          }
        }
      }
    }
  }
`;

const CREATE_LABEL_MUTATION = `
  mutation CreateIssueLabel($input: IssueLabelCreateInput!) {
    issueLabelCreate(input: $input) {
      issueLabel {
        id
        name
      }
    }
  }
`;

const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`;

const UPDATE_STATE_MUTATION = `
  mutation UpdateIssueState($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      issue {
        id
        state {
          id
          name
          type
        }
      }
    }
  }
`;

async function loadSpec(specPath) {
  const absolutePath = path.resolve(process.cwd(), specPath);
  let parsed;

  try {
    parsed = JSON.parse(await fs.readFile(absolutePath, "utf8"));
  } catch (error) {
    const reason = error.name === "SyntaxError" ? "is not valid JSON" : "could not be read";
    throw new Error(`Spec '${absolutePath}' ${reason}: ${error.message}`);
  }

  return { absolutePath, spec: normalizeIssueSpec(parsed) };
}

async function fetchContext(transport, { teamSelector, stateName, issuesLimit }) {
  const discoveryData = await transport.request(DISCOVERY_QUERY, {});
  const viewer = discoveryData?.viewer;
  const teams = discoveryData?.teams?.nodes ?? [];

  if (!viewer?.id) {
    throw new Error("Linear API key is valid but viewer context is missing");
  }

  const selectedTeam = selectTeam(teams, teamSelector);
  const teamData = await transport.request(TEAM_CONTEXT_QUERY(issuesLimit), { teamId: selectedTeam.id });
  const team = teamData?.team;

  if (!team?.id) {
    throw new Error("Failed to load selected Linear team context");
  }

  return {
    viewer,
    team,
    state: selectState(team.states?.nodes ?? [], stateName ?? DEFAULT_STATE_NAME),
  };
}

function dryRunId(prefix, value) {
  return `${prefix}${value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

async function ensureLabel(transport, teamId, labelName, dryRun) {
  if (dryRun) {
    return { id: dryRunId("dry-run-label-", labelName), name: labelName, dryRun: true };
  }

  const label = (await transport.request(CREATE_LABEL_MUTATION, {
    input: { teamId, name: labelName },
  }))?.issueLabelCreate?.issueLabel;

  if (!label?.id) {
    throw new Error(`Failed to create Linear label '${labelName}'`);
  }

  return label;
}

async function createIssue(transport, input, dryRun) {
  if (dryRun) {
    return {
      id: dryRunId("dry-run-issue-", input.title),
      identifier: "DRY-RUN",
      title: input.title,
      url: undefined,
    };
  }

  const issue = (await transport.request(CREATE_ISSUE_MUTATION, { input }))?.issueCreate?.issue;
  if (!issue?.id) {
    throw new Error(`Failed to create Linear issue '${input.title}'`);
  }

  return issue;
}

async function transitionIssue(transport, issueId, stateId, dryRun) {
  if (dryRun) {
    return { state: { id: stateId } };
  }

  const issue = (await transport.request(UPDATE_STATE_MUTATION, {
    id: issueId,
    input: { stateId },
  }))?.issueUpdate?.issue;

  if (!issue?.id) {
    throw new Error(`Failed to update Linear issue state for issue '${issueId}'`);
  }

  return issue;
}

export async function runLinearApply(transport, options) {
  const { absolutePath, spec } = await loadSpec(options.specPath);
  const teamSelector = options.teamKey ?? spec.teamKey;
  const stateName = options.stateName ?? spec.stateName ?? DEFAULT_STATE_NAME;

  const context = await fetchContext(transport, {
    teamSelector,
    stateName,
    issuesLimit: options.issuesLimit,
  });

  const labelMap = new Map((context.team.labels?.nodes ?? []).map((label) => [label.name.toLowerCase(), label]));
  const existingByTitle = new Map((context.team.issues?.nodes ?? []).map((issue) => [normalizeIssueTitle(issue.title), issue]));

  const issues = [];
  const summary = {
    requested: spec.issues.length,
    created: 0,
    wouldCreate: 0,
    transitioned: 0,
    wouldTransition: 0,
    alreadyInState: 0,
    labelsCreated: 0,
    labelsWouldCreate: 0,
  };

  for (const issueSpec of spec.issues) {
    const existing = existingByTitle.get(normalizeIssueTitle(issueSpec.title));

    if (existing) {
      if (existing.state?.id === context.state.id) {
        summary.alreadyInState += 1;
        issues.push({
          title: issueSpec.title,
          action: "already_in_state",
          identifier: existing.identifier,
          url: existing.url,
          state: existing.state?.name ?? null,
        });
        continue;
      }

      const updated = await transitionIssue(transport, existing.id, context.state.id, options.dryRun);
      const action = options.dryRun ? "would_transition" : "transitioned";
      summary[action === "would_transition" ? "wouldTransition" : "transitioned"] += 1;
      issues.push({
        title: issueSpec.title,
        action,
        identifier: existing.identifier,
        url: existing.url,
        fromState: existing.state?.name ?? null,
        toState: options.dryRun ? context.state.name : updated.state?.name ?? context.state.name,
      });
      continue;
    }

    const labelNames = mergeLabelNames(spec.defaultLabels, issueSpec.labels);
    const labelIds = [];

    for (const labelName of labelNames) {
      const key = labelName.toLowerCase();
      let label = labelMap.get(key);
      if (!label) {
        label = await ensureLabel(transport, context.team.id, labelName, options.dryRun);
        labelMap.set(key, label);
        summary[label.dryRun ? "labelsWouldCreate" : "labelsCreated"] += 1;
      }
      labelIds.push(label.id);
    }

    const created = await createIssue(transport, {
      teamId: context.team.id,
      stateId: context.state.id,
      title: issueSpec.title,
      labelIds,
      ...(issueSpec.description !== undefined ? { description: issueSpec.description } : {}),
      ...(issueSpec.priority !== undefined ? { priority: issueSpec.priority } : {}),
    }, options.dryRun);

    const action = options.dryRun ? "would_create" : "created";
    summary[action === "would_create" ? "wouldCreate" : "created"] += 1;
    issues.push({
      title: issueSpec.title,
      action,
      identifier: created.identifier,
      url: created.url,
      labels: labelNames,
      targetState: context.state.name,
    });

    if (!options.dryRun) {
      existingByTitle.set(normalizeIssueTitle(issueSpec.title), {
        id: created.id,
        identifier: created.identifier,
        title: created.title,
        url: created.url,
        state: { id: context.state.id, name: context.state.name, type: context.state.type },
      });
    }
  }

  return {
    status: options.dryRun ? "linear_apply_dry_run_complete" : "linear_apply_complete",
    transport: transport.name,
    dryRun: options.dryRun,
    specPath: absolutePath,
    viewer: context.viewer,
    team: {
      id: context.team.id,
      key: context.team.key,
      name: context.team.name,
    },
    targetState: {
      id: context.state.id,
      name: context.state.name,
      type: context.state.type,
    },
    summary,
    issues,
  };
}
