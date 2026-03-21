# 19 — Agent Autonomy and Harness Model

## Purpose

This file defines the expected operating model for Codex on this repository.

## Core idea

Codex is not only the primary implementer.

Codex is also expected to be the primary operator of the development loop:
- understand,
- plan,
- implement,
- validate,
- deploy,
- inspect,
- recover,
- and keep repository state current.

## Repository-visible memory

What is not visible to Codex in the repository or current execution environments should be treated as missing.

Important context should live in:
- packet documents,
- plans,
- status files,
- scripts,
- tests,
- verification flows,
- deployment logic,
- runbooks,
- and evidence records.

## What Codex should be able to produce over time

The repository should eventually contain, as needed:
- product code,
- automated checks,
- end-to-end verification,
- repository tooling,
- deployment/update logic,
- design history,
- evidence of validation,
- and maintenance improvements.

## Preferred project behavior

The repository should let Codex:
1. validate the current state,
2. reproduce an issue or missing behavior,
3. implement a change,
4. run or update checks,
5. drive the application or deployed system,
6. capture evidence,
7. detect and repair failures where possible,
8. and leave behind better repository instructions for the next run.

## Human role

The human owner is primarily expected to provide:
- goals and priorities,
- repository access,
- environment access,
- secrets or credentials through approved channels,
- infrastructure or domain inputs,
- and judgment for high-risk decisions.

The human should not have to supply repeated operational memory that could instead be encoded into the repository.

## Harness-first expectation

If Codex struggles because something is not encoded, not scripted, not testable, or not observable, the preferred response is usually to improve the harness:
- add missing documentation,
- add or improve verification,
- add or improve status tracking,
- add or improve deployment instructions,
- add or improve environment handling,
- or add or improve recovery paths.

## Autonomy boundary

Codex should act autonomously inside the boundary of:
- repository changes,
- environment usage already granted,
- deployment or update actions already approved,
- and project defaults already documented.

Codex should escalate when the next action crosses outside that boundary.
