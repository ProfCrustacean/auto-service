import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeLabelNames,
  normalizeIssueSpec,
  parsePlaywrightEvalOutput,
  selectState,
  selectTeam,
} from "../scripts/linear-harness-core.js";

test("normalizeIssueSpec validates and normalizes issue specs", () => {
  const normalized = normalizeIssueSpec({
    teamKey: "AUT",
    stateName: "Backlog",
    defaultLabels: ["Harness", "Harness", "E2E"],
    issues: [
      {
        title: "Example issue",
        description: "  keep spacing  ",
        labels: ["Observability", "observability"],
        priority: 2,
      },
    ],
  });

  assert.equal(normalized.teamKey, "AUT");
  assert.equal(normalized.stateName, "Backlog");
  assert.deepEqual(normalized.defaultLabels, ["Harness", "E2E"]);
  assert.deepEqual(normalized.issues, [
    {
      title: "Example issue",
      description: "keep spacing",
      labels: ["Observability"],
      priority: 2,
    },
  ]);
});

test("normalizeIssueSpec rejects duplicate titles and unsupported fields", () => {
  assert.throws(
    () => normalizeIssueSpec({
      issues: [
        { title: "Issue A" },
        { title: "issue a" },
      ],
    }),
    /duplicate title/i,
  );

  assert.throws(
    () => normalizeIssueSpec({
      issues: [{ title: "Issue A", nope: true }],
    }),
    /unsupported field: nope/i,
  );
});

test("selectTeam resolves by key or name with clear errors", () => {
  const teams = [
    { id: "1", key: "AUT", name: "Automaton-paradise" },
    { id: "2", key: "OPS", name: "Ops" },
  ];

  assert.equal(selectTeam(teams, "AUT").id, "1");
  assert.equal(selectTeam(teams, "automaton-paradise").id, "1");

  assert.throws(() => selectTeam(teams, undefined), /multiple teams available/i);
  assert.throws(() => selectTeam(teams, "MISSING"), /was not found/i);
});

test("selectState prefers requested state then backlog/unstarted fallback", () => {
  const states = [
    { id: "a", name: "Todo", type: "unstarted" },
    { id: "b", name: "Backlog", type: "backlog" },
    { id: "c", name: "In Progress", type: "started" },
  ];

  assert.equal(selectState(states, "In Progress").id, "c");
  assert.equal(selectState(states, "Missing").id, "a");
  assert.equal(selectState(states, undefined).id, "a");
});

test("parsePlaywrightEvalOutput extracts JSON result payload", () => {
  const output = `### Result\n{\n  \"data\": {\n    \"ok\": true\n  }\n}\n### Ran Playwright code\n\
\`\`\`js\nfoo\n\`\`\``;

  const parsed = parsePlaywrightEvalOutput(output);
  assert.deepEqual(parsed, { data: { ok: true } });

  assert.throws(() => parsePlaywrightEvalOutput("### Error\nboom"), /eval failed/i);
});

test("mergeLabelNames keeps order while deduplicating", () => {
  const merged = mergeLabelNames(["Improvement", "Harness"], ["Harness", "E2E", "improvement"]);
  assert.deepEqual(merged, ["Improvement", "Harness", "E2E"]);
});
