# 20 — Environment, Deployment, and Operations

## Purpose

This file defines the project’s environment and operations contract in a stack-neutral way.

## Human-provided inputs

The human owner is expected to provide, when needed:
- the repository,
- one or more execution environments or machines,
- network reachability where appropriate,
- domains, IPs, or DNS inputs where appropriate,
- secrets or credentials through an approved channel,
- and approvals for actions that are sensitive, costly, or externally irreversible.

## Codex-owned responsibilities

Within the approved boundary, Codex should be able to:
- bootstrap a fresh environment,
- bring the project to a runnable state,
- deploy or update the application,
- apply data or schema changes safely,
- run post-deploy checks,
- keep deployment and recovery instructions in the repo,
- and update project state after changes.

## Environment rule

Every environment Codex is expected to use should be describable from repository-visible instructions.

The repository should avoid hidden one-off environment knowledge.

## Deployment rule

Deployment is part of the project, not an afterthought.

The repository should eventually define:
- how a change reaches a runnable environment,
- how health is checked,
- how a failed update is detected,
- and how to recover to the last known acceptable state.

## Temporary validation hosts

For non-production validation, temporary DNS-friendly hostnames such as nip.io-style or equivalent services are acceptable when useful.

The exact mechanism may change later, but the strategy should remain replaceable and documented.

## Certificates and transport security

When environment conditions allow it, certificate issuance and renewal should be automated and repository-driven as much as practical.

If temporary or self-managed certificate handling is needed for validation, that path should be explicit and replaceable.

## Health and smoke checks

A deployed environment is not considered healthy based on process start alone.

It should be possible for Codex to run:
- health checks,
- smoke checks,
- and scenario checks appropriate to the current phase.

## State recording

For each important environment, `STATUS.md` should record:
- purpose,
- address,
- current health status,
- last validated state,
- and known caveats.

## No hidden click-ops

Avoid relying on undocumented console steps or memory-based operational routines.

If a manual action is unavoidable, document:
- why it exists,
- when it is required,
- what exact input it needs,
- and what Codex should do before and after it.

## Recovery rule

The project should preserve a visible path to recover service after:
- a failed deployment,
- a failed migration,
- a broken verification run,
- or a misconfigured environment update.
