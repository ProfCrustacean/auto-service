# STATUS.md

## Purpose

This is the living state file for the repository.

Codex must keep this file current enough that a new Codex run can answer:
- what exists now,
- what is known to work,
- what environments exist,
- what was last validated,
- what is currently in progress,
- and what the next high-leverage step should be.

## Current repository state

### Repository maturity
- Starter packet installed and preserved.
- Phase 0 foundation slice implemented as runnable Node.js service.
- Russian-only UI shell implemented for the operational dashboard.
- Deterministic seed fixtures implemented from packet scenario set.
- Structured health/readiness checks and JSON logs implemented.
- Automated tests and smoke harness implemented and executed locally.
- Render deployment blueprint prepared but not yet executed in a real Render account.

### Last accepted milestone
- 2026-03-21: Local Phase 0 foundation accepted (runnable app + checks + evidence + deployment blueprint).

### Current active objective
- Instantiate and validate first durable Render environment using temporary validation hostname.
- Run post-deploy smoke verification against deployed URL.
- Record deployment evidence and environment details.

## Confirmed decisions (human input)

- Deployment path (first): Render.
- Temporary domain strategy: allowed for first validation.
- UI language for v1: Russian only.
- Additional hard constraints: none declared.

## Environments

### Known environments

1. `local-dev`
- purpose: development and verification
- host or URL: `http://127.0.0.1:3000`
- how Codex reaches it: `npm start`
- whether deployment is working: local process start works
- whether TLS is working: not configured locally (HTTP only)
- whether end-to-end checks are working: yes (CLI smoke + browser smoke snapshot)
- last validated date or commit: 2026-03-21, local working tree
- known caveats: seed-fixture data only; no auth yet; no persistent transactional storage yet

2. `render-validation` (planned, not instantiated)
- purpose: first external deploy validation
- host or URL: pending Render-provided hostname
- how Codex reaches it: `render.yaml` blueprint once account/project access is available
- whether deployment is working: not yet validated
- whether TLS is working: expected via Render managed certs after deployment
- whether end-to-end checks are working: pending deployment
- last validated date or commit: not yet validated
- known caveats: blocked by missing Render account/project access in current environment

## Verification status

### Automated checks
- `npm test` (Node test runner): passed on 2026-03-21.
- evidence: `evidence/test-output.txt`

### End-to-end checks
- local smoke (`npm run smoke`): passed on 2026-03-21.
- browser smoke (Playwright MCP snapshot against local UI): passed on 2026-03-21.
- evidence:
  - `evidence/smoke-output.txt`
  - `evidence/browser-snapshot.md`

### Deployment smoke checks
- local deployment smoke (`npm start` + health + dashboard endpoints): passed.
- Render deployment smoke: not run yet (environment not instantiated).
- evidence:
  - `evidence/healthz.json`
  - `evidence/dashboard-today.json`
  - `evidence/local-server.log`

## Evidence inventory

Most recent useful evidence:
- `evidence/test-output.txt`
- `evidence/smoke-output.txt`
- `evidence/healthz.json`
- `evidence/dashboard-today.json`
- `evidence/browser-snapshot.md`
- `evidence/local-server.log`

## Open blockers

- Render deployment cannot be executed yet because no authenticated Render project/account access is available in this environment.

## Next recommended milestone

1. Connect repository to Render project and apply `render.yaml` blueprint.
2. Capture deployed URL and run `APP_BASE_URL="https://<render-hostname>" npm run smoke`.
3. Store deployment logs/evidence and update `STATUS.md`.
4. Start Phase 1 scheduling and intake implementation on top of the accepted foundation.

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.
