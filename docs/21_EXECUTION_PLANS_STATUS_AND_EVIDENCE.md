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

## `STATUS.md` rule

Use `STATUS.md` to preserve the latest accepted project state.

A new Codex run should be able to read `STATUS.md` and quickly understand:
- what has been accepted,
- what environments exist,
- what was last validated,
- what is currently blocked,
- and what the next likely milestone is.

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
- and update both `STATUS.md` and `PLANS.md` accordingly.
