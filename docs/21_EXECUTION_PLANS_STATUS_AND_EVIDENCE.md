# 21 — Execution Plans, Status, and Evidence

## Purpose

This file defines the mandatory planning and verification records that make the repository self-operable.

## Required living files

The repository should treat these files as living project records:
- `PLANS.md`
- `STATUS.md`

## `PLANS.md` rule

Use `PLANS.md` for non-trivial work.

A plan should exist before major implementation begins and should remain accurate while the work is active.

`PLANS.md` should stay concise enough for fast operational scanning.
Keep only a short recent window of completed plans in `PLANS.md` and move older completed plans into `PLANS_ARCHIVE.md`.
Retain a skeleton index of archived completed plans inside `PLANS.md` so earlier work remains visible at a glance.
Compaction should happen as part of normal completion handling, not as an occasional manual cleanup.
Hot-path budget: keep `PLANS.md` at or below 350 lines.

## `STATUS.md` rule

Use `STATUS.md` to preserve the latest accepted project state.

A new Codex run should be able to read `STATUS.md` and quickly understand:
- what has been accepted,
- what environments exist,
- what was last validated,
- what is currently blocked,
- and what the next likely milestone is.
Hot-path budget: keep `STATUS.md` at or below 320 lines.

## Evidence rule

Meaningful work should leave evidence.

Evidence may include:
- command outputs,
- generated reports,
- test results,
- screenshots,
- videos when useful,
- environment health results,
- deployment outputs,
- or failure logs.

Evidence classes:
- `summary`: tracked compact artifacts used for routine context and verification.
- `raw`: large/debug payloads generated only when explicitly requested.
- `ephemeral`: temporary local diagnostics not required for repository history.

Repository policy:
- Track `summary` artifacts.
- Keep `raw` artifacts out of git by default (`.raw`, `.ndjson`, `.raw.gz` under `evidence/`).
- Use `scripts/evidence-log-summary.js` to turn raw log exports into compact tracked summaries.

## Minimum evidence expectation

At minimum, a meaningful completed slice should usually have:
1. proof that the current state was understood,
2. proof that the relevant checks ran,
3. proof that the relevant end-to-end path ran,
4. and proof that repository state files were updated.

## Verification against goals and current task

Before considering a slice complete, Codex should compare the result against:
- the packet goals,
- the active task,
- the active plan,
- and the last accepted repository state.

## Failure handling

If verification fails:
- do not silently proceed,
- record the failure,
- repair or narrow the slice,
- rerun validation,
- and update the status or plan to reflect reality.

## Completion handling

When a slice is accepted:
- summarize what changed,
- summarize what was validated,
- record any remaining caveats,
- update both `STATUS.md` and `PLANS.md` accordingly,
- and run plan compaction when thresholds are exceeded so repository state remains fast to resume.
