import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { runLinearApply } from "../scripts/linear-harness-apply.js";

function createMockTransport() {
  const stateBacklog = { id: "state-backlog", name: "Backlog", type: "backlog" };
  const stateDone = { id: "state-done", name: "Done", type: "completed" };

  const team = {
    id: "team-1",
    key: "AUT",
    name: "Auto Service",
    states: [stateBacklog, stateDone],
    labels: [{ id: "label-harness", name: "Harness" }],
    issues: [
      {
        id: "issue-1",
        identifier: "AUT-1",
        title: "Existing done",
        url: "https://linear.app/aut/issue/AUT-1",
        state: stateDone,
      },
      {
        id: "issue-2",
        identifier: "AUT-2",
        title: "Existing backlog",
        url: "https://linear.app/aut/issue/AUT-2",
        state: stateBacklog,
      },
    ],
    counters: { issue: 2, label: 1 },
  };

  return {
    name: "mock",
    async request(query, variables) {
      if (query.includes("query Discovery")) {
        return {
          viewer: { id: "viewer-1", name: "Harness Bot", email: "bot@example.com" },
          teams: { nodes: [{ id: team.id, key: team.key, name: team.name }] },
        };
      }

      if (query.includes("query TeamContext")) {
        return {
          team: {
            id: team.id,
            key: team.key,
            name: team.name,
            states: { nodes: team.states },
            labels: { nodes: team.labels },
            issues: { nodes: team.issues },
          },
        };
      }

      if (query.includes("mutation CreateIssueLabel")) {
        team.counters.label += 1;
        const label = { id: `label-${team.counters.label}`, name: variables.input.name };
        team.labels.push(label);
        return { issueLabelCreate: { issueLabel: label } };
      }

      if (query.includes("mutation CreateIssue($input: IssueCreateInput!)")) {
        team.counters.issue += 1;
        const identifier = `AUT-${team.counters.issue}`;
        const issue = {
          id: `issue-${team.counters.issue}`,
          identifier,
          title: variables.input.title,
          url: `https://linear.app/aut/issue/${identifier}`,
          state: stateDone,
        };
        team.issues.push(issue);
        return { issueCreate: { issue } };
      }

      if (query.includes("mutation UpdateIssueState")) {
        const issue = team.issues.find((item) => item.id === variables.id);
        issue.state = stateDone;
        return { issueUpdate: { issue } };
      }

      throw new Error("Unexpected query");
    },
  };
}

async function withTempSpec(spec, fn) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "linear-harness-apply-"));
  const specPath = path.join(tempRoot, "spec.json");

  try {
    await fs.writeFile(specPath, `${JSON.stringify(spec, null, 2)}\n`, "utf8");
    await fn(specPath);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

test("runLinearApply is deterministic and idempotent", async () => {
  const spec = {
    teamKey: "AUT",
    stateName: "Done",
    defaultLabels: ["Harness", "E2E"],
    issues: [
      { title: "Existing done" },
      { title: "Existing backlog" },
      { title: "Brand new issue", labels: ["Observability"], priority: 2 },
    ],
  };

  await withTempSpec(spec, async (specPath) => {
    const transport = createMockTransport();

    const first = await runLinearApply(transport, {
      specPath,
      dryRun: false,
      teamKey: undefined,
      stateName: undefined,
      issuesLimit: 250,
    });

    assert.equal(first.status, "linear_apply_complete");
    assert.deepEqual(first.summary, {
      requested: 3,
      created: 1,
      wouldCreate: 0,
      transitioned: 1,
      wouldTransition: 0,
      alreadyInState: 1,
      labelsCreated: 2,
      labelsWouldCreate: 0,
    });

    const second = await runLinearApply(transport, {
      specPath,
      dryRun: false,
      teamKey: undefined,
      stateName: undefined,
      issuesLimit: 250,
    });

    assert.equal(second.status, "linear_apply_complete");
    assert.deepEqual(second.summary, {
      requested: 3,
      created: 0,
      wouldCreate: 0,
      transitioned: 0,
      wouldTransition: 0,
      alreadyInState: 3,
      labelsCreated: 0,
      labelsWouldCreate: 0,
    });
  });
});
