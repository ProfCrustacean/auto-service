import https from "node:https";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const CUTOFF_UTC = process.env.LINEAR_CLEAR_CUTOFF_UTC || new Date().toISOString();
const ACTIVE_UNTIL_UTC = process.env.LINEAR_CLEAR_ACTIVE_UNTIL_UTC || CUTOFF_UTC;
const TEAM_KEYS = (process.env.LINEAR_CLEAR_TEAM_KEYS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function requestGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: LINEAR_API_KEY,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.errors && parsed.errors.length > 0) {
            const message = parsed.errors.map((entry) => entry.message).join('; ');
            reject(new Error(message));
            return;
          }
          resolve(parsed.data);
        } catch (error) {
          reject(new Error(`invalid json response: ${String(raw).slice(0, 300)}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('linear request timeout')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function loadTeams() {
  const data = await requestGraphQL(
    `query Teams($first: Int!) {
      viewer { id name email }
      teams(first: $first) { nodes { id key name } }
    }`,
    { first: 100 },
  );
  const allTeams = Array.isArray(data.teams?.nodes) ? data.teams.nodes : [];
  const selected = TEAM_KEYS.length === 0
    ? allTeams
    : allTeams.filter((team) => TEAM_KEYS.includes(team.key));
  return { viewer: data.viewer, teams: selected, allTeams };
}

async function loadTeamStates(teamId) {
  const data = await requestGraphQL(
    `query TeamStates($id: String!) {
      team(id: $id) {
        id
        key
        name
        states {
          nodes { id name type }
        }
      }
    }`,
    { id: teamId },
  );
  return data.team?.states?.nodes ?? [];
}

async function loadTeamIssues(teamId) {
  const out = [];
  let cursor = null;
  while (true) {
    const data = await requestGraphQL(
      `query TeamIssues($teamId: ID!, $after: String) {
        issues(filter: { team: { id: { eq: $teamId } } }, first: 100, after: $after) {
          nodes {
            id
            identifier
            title
            createdAt
            state { id name type }
            archivedAt
            canceledAt
            completedAt
          }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { teamId, after: cursor },
    );
    const nodes = data.issues?.nodes ?? [];
    out.push(...nodes);
    const pageInfo = data.issues?.pageInfo;
    if (!pageInfo?.hasNextPage) {
      break;
    }
    cursor = pageInfo.endCursor;
  }
  return out;
}

async function moveIssueToState(issueId, stateId) {
  const data = await requestGraphQL(
    `mutation MoveIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue { id identifier state { id name type } }
      }
    }`,
    { id: issueId, stateId },
  );
  if (!data.issueUpdate?.success) {
    throw new Error(`issueUpdate failed for ${issueId}`);
  }
  return data.issueUpdate.issue;
}

function shouldCloseIssue(issue, cutoffMs) {
  if (!issue || issue.archivedAt) {
    return false;
  }
  const type = issue.state?.type;
  if (type === 'completed' || type === 'canceled') {
    return false;
  }
  const createdMs = Date.parse(issue.createdAt || '');
  if (!Number.isFinite(createdMs)) {
    return false;
  }
  return createdMs <= cutoffMs;
}

(async () => {
  const now = new Date();
  const activeUntil = new Date(ACTIVE_UNTIL_UTC);
  const cutoffMs = Date.parse(CUTOFF_UTC);

  if (!LINEAR_API_KEY) {
    console.log(JSON.stringify({ status: 'error', message: 'LINEAR_API_KEY missing' }));
    process.exit(1);
  }
  if (!Number.isFinite(cutoffMs)) {
    console.log(JSON.stringify({ status: 'error', message: 'Invalid LINEAR_CLEAR_CUTOFF_UTC', cutoff: CUTOFF_UTC }));
    process.exit(1);
  }

  if (Number.isFinite(activeUntil.getTime()) && now.getTime() > activeUntil.getTime()) {
    console.log(JSON.stringify({
      status: 'skipped',
      reason: 'outside_active_window',
      now: now.toISOString(),
      activeUntil: activeUntil.toISOString(),
      cutoffUtc: CUTOFF_UTC,
      teamKeysFilter: TEAM_KEYS,
    }));
    return;
  }

  const startedAt = new Date().toISOString();
  const { viewer, teams, allTeams } = await loadTeams();

  const summary = {
    status: 'ok',
    startedAt,
    finishedAt: null,
    viewer,
    teamKeysFilter: TEAM_KEYS,
    selectedTeamCount: teams.length,
    visibleTeamCount: allTeams.length,
    cutoffUtc: new Date(cutoffMs).toISOString(),
    teams: [],
    totals: {
      scanned: 0,
      matchedBeforeCutoff: 0,
      movedToClosed: 0,
      failed: 0,
    },
  };

  for (const team of teams) {
    const teamSummary = {
      id: team.id,
      key: team.key,
      name: team.name,
      scanned: 0,
      matchedBeforeCutoff: 0,
      movedToClosed: 0,
      failed: 0,
      stateUsed: null,
      failures: [],
    };

    const states = await loadTeamStates(team.id);
    const canceledState = states.find((state) => state.type === 'canceled');
    const completedState = states.find((state) => state.type === 'completed');
    const targetState = canceledState || completedState;

    if (!targetState) {
      teamSummary.failures.push('No canceled/completed workflow state found for team');
      teamSummary.failed += 1;
      summary.totals.failed += 1;
      summary.teams.push(teamSummary);
      continue;
    }

    teamSummary.stateUsed = { id: targetState.id, name: targetState.name, type: targetState.type };

    const issues = await loadTeamIssues(team.id);
    for (const issue of issues) {
      teamSummary.scanned += 1;
      summary.totals.scanned += 1;
      if (!shouldCloseIssue(issue, cutoffMs)) {
        continue;
      }

      teamSummary.matchedBeforeCutoff += 1;
      summary.totals.matchedBeforeCutoff += 1;

      try {
        await moveIssueToState(issue.id, targetState.id);
        teamSummary.movedToClosed += 1;
        summary.totals.movedToClosed += 1;
      } catch (error) {
        teamSummary.failed += 1;
        summary.totals.failed += 1;
        teamSummary.failures.push(`${issue.identifier}: ${error.message}`);
      }
    }

    summary.teams.push(teamSummary);
  }

  summary.finishedAt = new Date().toISOString();
  summary.status = summary.totals.failed > 0 ? 'partial' : 'ok';

  console.log(JSON.stringify(summary));

  if (summary.totals.failed > 0) {
    process.exit(2);
  }
})();
