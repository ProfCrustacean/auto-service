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
- Russian-only dashboard refactored to decision-first operational cockpit (actions, triage, load, queue context).
- SQLite persistence foundation implemented with migration tracking and DB-backed repository reads.
- Deterministic seed fixtures imported into SQLite on first bootstrap.
- Phase 1 employee and bay CRUD APIs implemented with explicit validation boundaries.
- Phase 1 customer and vehicle CRUD APIs implemented with ownership-history tracking and search-ready query filters.
- Phase 1 appointment lifecycle APIs implemented with explicit status transitions and deterministic bay/person capacity conflict checks.
- Phase 1 walk-in intake API implemented with active queue/day board insertion behavior.
- Structured health/readiness checks and JSON logs implemented.
- Automated tests and smoke harness implemented and executed locally.
- Render deployment path is implemented and validated in a live environment.

### Last accepted milestone
- 2026-03-21: `AUT-10` accepted end-to-end (walk-in intake API + active queue insertion + local/deployed verification + Linear update).

### Current active objective
- Continue Phase 1 scheduling and intake implementation beyond dashboard shell:
  - planning board and search experience completion,
  - search and scenario verification expansion.

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
- whether deployment is working: yes (local process start)
- whether TLS is working: not configured locally (HTTP only)
- whether end-to-end checks are working: yes (CLI smoke + browser snapshot)
- last validated date or commit: 2026-03-21, commit `91c13d6`
- known caveats: no auth yet; single-node SQLite file model only

2. `render-validation`
- purpose: first durable external deployment validation
- host or URL: `https://auto-service-foundation.onrender.com`
- how Codex reaches it: Render service `srv-d6vcmt7diees73d0j04g` created via API from repo `https://github.com/ProfCrustacean/auto-service`
- whether deployment is working: yes
- whether TLS is working: yes (Render-managed)
- whether end-to-end checks are working: yes (deployed smoke + deployed browser snapshot)
- last validated date or commit: 2026-03-21, commit `91c13d6`
- known caveats:
  - from this local environment, direct `api.render.com` connectivity may timeout; `curl --resolve api.render.com:443:216.24.57.7` worked reliably.
  - app persistence is local SQLite file per service instance; no managed multi-node database yet.

## Verification status

### Automated checks
- `npm test` (Node test runner): passed on 2026-03-21.
- evidence: `evidence/test-output.txt`

### End-to-end checks
- local smoke (`npm run smoke`): passed on 2026-03-21.
- local appointment lifecycle smoke: passed on 2026-03-21.
- local walk-in intake smoke: passed on 2026-03-21.
- local browser smoke snapshot: passed on 2026-03-21.
- deployed Render smoke (`APP_BASE_URL="https://auto-service-foundation.onrender.com" npm run smoke`): passed on 2026-03-21.
- deployed Render appointment lifecycle smoke: passed on 2026-03-21.
- deployed Render walk-in intake smoke: passed on 2026-03-21.
- deployed Render browser smoke snapshot: passed on 2026-03-21.
- deployed Render CRUD smoke for employees/bays (create/update/soft-delete): passed on 2026-03-21.
- deployed Render CRUD smoke for customers/vehicles (create/update/reassign/delete): passed on 2026-03-21.
- evidence:
  - `evidence/smoke-output.txt`
  - `evidence/local-appointment-lifecycle-smoke.json`
  - `evidence/local-walkin-intake-smoke.json`
  - `evidence/browser-snapshot.md`
  - `evidence/render-smoke-output.txt`
  - `evidence/render-appointment-lifecycle-smoke.json`
  - `evidence/render-walkin-intake-smoke.json`
  - `evidence/render-browser-snapshot.md`
  - `evidence/render-crud-smoke.json`
  - `evidence/render-customer-vehicle-crud-smoke.json`

### Deployment smoke checks
- local deployment smoke (`npm start` + health + dashboard endpoints): passed.
- Render deployment smoke: passed (`dep-d6vf6pa4d50c73fvc2h0` reached `live`, commit `91c13d6`).
- evidence:
  - `evidence/healthz.json`
  - `evidence/dashboard-today.json`
  - `evidence/employees-list.json`
  - `evidence/bays-list.json`
  - `evidence/customers-list.json`
  - `evidence/vehicles-list.json`
  - `evidence/vehicle-ownership-history.json`
  - `evidence/local-customer-vehicle-crud-smoke.json`
  - `evidence/render-healthz.json`
  - `evidence/render-dashboard-today.json`
  - `evidence/render-appointments-list.json`
  - `evidence/render-employees-list.json`
  - `evidence/render-bays-list.json`
  - `evidence/render-customers-list.json`
  - `evidence/render-vehicles-list.json`
  - `evidence/render-vehicle-ownership-history.json`
  - `evidence/render-customer-vehicle-crud-smoke.json`
  - `evidence/local-server.log`
  - `evidence/render-create-service-response.json`
  - `evidence/render-deploy-poll.txt`
  - `evidence/render-deploy-latest.json`
  - `evidence/render-manual-deploy-response.json`
  - `evidence/render-manual-deploy-poll.txt`
  - `evidence/render-manual-deploy-final.json`
  - `evidence/render-manual-postdeploy-smoke.txt`
  - `evidence/render-service-state.json`
  - `evidence/render-validate-response.json`

## Evidence inventory

Most recent useful evidence:
- `evidence/test-output.txt`
- `evidence/verify-output.txt`
- `evidence/smoke-output.txt`
- `evidence/local-appointment-lifecycle-smoke.json`
- `evidence/local-walkin-intake-smoke.json`
- `evidence/browser-snapshot.md`
- `evidence/healthz.json`
- `evidence/dashboard-today.json`
- `evidence/employees-list.json`
- `evidence/bays-list.json`
- `evidence/customers-list.json`
- `evidence/vehicles-list.json`
- `evidence/vehicle-ownership-history.json`
- `evidence/local-customer-vehicle-crud-smoke.json`
- `evidence/render-validate-response.json`
- `evidence/render-create-service-response.json`
- `evidence/render-deploy-poll.txt`
- `evidence/render-deploy-latest.json`
- `evidence/render-manual-deploy-response.json`
- `evidence/render-manual-deploy-poll.txt`
- `evidence/render-manual-deploy-final.json`
- `evidence/render-manual-postdeploy-smoke.txt`
- `evidence/render-service-state.json`
- `evidence/render-healthz.json`
- `evidence/render-dashboard-today.json`
- `evidence/render-appointments-list.json`
- `evidence/render-employees-list.json`
- `evidence/render-bays-list.json`
- `evidence/render-customers-list.json`
- `evidence/render-vehicles-list.json`
- `evidence/render-vehicle-ownership-history.json`
- `evidence/render-customer-vehicle-crud-smoke.json`
- `evidence/render-smoke-output.txt`
- `evidence/render-appointment-lifecycle-smoke.json`
- `evidence/render-walkin-intake-smoke.json`
- `evidence/render-browser-snapshot.md`
- `evidence/render-crud-smoke.json`

## Open blockers

- No blocking external dependencies for continuing Phase 1 product work.

## Next recommended milestone

1. Add day/week planning endpoint coverage and acceptance scenarios under `AUT-14`.
2. Continue slice-by-slice deploy validation in `render-validation` for each Phase 1 milestone.

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.
