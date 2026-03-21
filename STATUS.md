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
- Phase 1 scheduling + walk-in acceptance verification harness implemented (domain/API scenario tests, reusable scenario runner, local/deployed browser evidence).
- Render build/runtime log audit completed with evidence-backed follow-up triage.
- Phase 1 health-check log noise reduction implemented (successful `/healthz` request logs suppressed, business-path request logs preserved).
- Structured health/readiness checks and JSON logs implemented.
- Automated tests and smoke harness implemented and executed locally.
- Render deployment path is implemented and validated in a live environment.

### Last accepted milestone
- 2026-03-21: `AUT-17` accepted end-to-end (health-check log-noise reduction with automated test coverage, local evidence, deployed verification, and Linear update).

### Current active objective
- Continue Phase 1 scheduling and intake implementation beyond dashboard shell:
  - planning board and search experience completion,
  - day/week planning workflows and operational search UX,
  - observability/deploy hardening follow-ups from Render log audit (`AUT-16`..`AUT-18`).

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
- last validated date or commit: 2026-03-21, commit `c023e10`
- known caveats: no auth yet; single-node SQLite file model only

2. `render-validation`
- purpose: first durable external deployment validation
- host or URL: `https://auto-service-foundation.onrender.com`
- how Codex reaches it: Render service `srv-d6vcmt7diees73d0j04g` created via API from repo `https://github.com/ProfCrustacean/auto-service`
- whether deployment is working: yes
- whether TLS is working: yes (Render-managed)
- whether end-to-end checks are working: yes (deployed smoke + deployed browser snapshot)
- last validated date or commit: 2026-03-21, commit `c023e10`
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
- local scheduling + walk-in scenario script (`node scripts/scheduling-walkin-scenario.js`): passed on 2026-03-21.
- local scheduling + walk-in browser path snapshots (dashboard + appointment + work-order): passed on 2026-03-21.
- local health-check log filter check (successful `/healthz` suppressed): passed on 2026-03-21.
- deployed Render smoke (`APP_BASE_URL="https://auto-service-foundation.onrender.com" npm run smoke`): passed on 2026-03-21.
- deployed Render appointment lifecycle smoke: passed on 2026-03-21.
- deployed Render walk-in intake smoke: passed on 2026-03-21.
- deployed Render browser smoke snapshot: passed on 2026-03-21.
- deployed Render CRUD smoke for employees/bays (create/update/soft-delete): passed on 2026-03-21.
- deployed Render CRUD smoke for customers/vehicles (create/update/reassign/delete): passed on 2026-03-21.
- deployed scheduling + walk-in scenario script (`APP_BASE_URL="https://auto-service-foundation.onrender.com" node scripts/scheduling-walkin-scenario.js`): passed on 2026-03-21.
- deployed scheduling + walk-in browser path snapshots (dashboard + appointment + work-order): passed on 2026-03-21.
- deployed AUT-17 log audit (stable window): passed on 2026-03-21 (`healthzRatio = 0.0`).
- evidence:
  - `evidence/smoke-output.txt`
  - `evidence/local-appointment-lifecycle-smoke.json`
  - `evidence/local-walkin-intake-smoke.json`
  - `evidence/browser-snapshot.md`
  - `evidence/local-scheduling-walkin-scenario.json`
  - `evidence/local-scheduling-walkin-browser-dashboard.md`
  - `evidence/local-scheduling-walkin-browser-appointment.md`
  - `evidence/local-scheduling-walkin-browser-workorder.md`
  - `evidence/local-healthz-log-filter-check.json`
  - `evidence/render-smoke-output.txt`
  - `evidence/render-appointment-lifecycle-smoke.json`
  - `evidence/render-walkin-intake-smoke.json`
  - `evidence/render-browser-snapshot.md`
  - `evidence/render-crud-smoke.json`
  - `evidence/render-customer-vehicle-crud-smoke.json`
  - `evidence/render-scheduling-walkin-scenario.json`
  - `evidence/render-scheduling-walkin-browser-dashboard.md`
  - `evidence/render-scheduling-walkin-browser-appointment.md`
  - `evidence/render-scheduling-walkin-browser-workorder.md`
  - `evidence/render-aut17-log-audit-summary.json`
  - `evidence/render-aut17-log-audit-window.json`
  - `evidence/render-aut17-log-audit-summary-stable.json`
  - `evidence/render-aut17-log-audit-window-stable.json`

### Operational log audit
- Render API events and logs inspected directly on 2026-03-21.
- build/deploy event result: 9/9 succeeded (`build_ended`, `deploy_ended`).
- runtime warn/error signal: none observed in structured app logs (`json_warn_error_count = 0`).
- findings requiring follow-up:
  - Node runtime drift risk: Render selected `Node.js 25.8.1` from permissive `>=22` constraint.
  - Repo-access fallback warning on every deploy clone step.
- Linear follow-up issues created in Backlog:
  - `AUT-16` Node LTS pinning
  - `AUT-18` repo-access warning removal
- evidence:
  - `evidence/render-log-audit-summary.json`
  - `evidence/render-log-audit-events.json`
  - `evidence/render-log-audit-latest-deploy-window.json`
  - `evidence/render-log-audit-all.ndjson`

### AUT-17 observability verification
- middleware behavior: successful `/healthz` requests are skipped in `http_request` logs; business-path requests remain logged.
- local proof: `healthzHttpRequestLogCount = 0` with dashboard requests still present.
- deployed proof:
  - transition window (`evidence/render-aut17-log-audit-summary.json`): health-check ratio dropped to `0.142857` with one stale-instance health log during rollout overlap.
  - stable window (`evidence/render-aut17-log-audit-summary-stable.json`): `healthzRatio = 0.0`, only new instance logs observed.

### Deployment smoke checks
- local deployment smoke (`npm start` + health + dashboard endpoints): passed.
- Render deployment smoke: passed (`dep-d6vg0e75r7bs73eq156g` reached `live`, commit `c023e10`).
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
  - `evidence/render-aut14-deploy-response.json`
  - `evidence/render-aut14-deploy-poll.txt`
  - `evidence/render-aut14-deploy-final.json`
  - `evidence/render-aut17-deploy-response.json`
  - `evidence/render-aut17-deploy-poll.txt`
  - `evidence/render-aut17-deploy-final.json`
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
- `evidence/local-scheduling-walkin-scenario.json`
- `evidence/local-scheduling-walkin-browser-dashboard.md`
- `evidence/local-scheduling-walkin-browser-appointment.md`
- `evidence/local-scheduling-walkin-browser-workorder.md`
- `evidence/local-healthz-log-filter-check.json`
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
- `evidence/render-aut14-deploy-response.json`
- `evidence/render-aut14-deploy-poll.txt`
- `evidence/render-aut14-deploy-final.json`
- `evidence/render-aut17-deploy-response.json`
- `evidence/render-aut17-deploy-poll.txt`
- `evidence/render-aut17-deploy-final.json`
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
- `evidence/render-scheduling-walkin-scenario.json`
- `evidence/render-scheduling-walkin-browser-dashboard.md`
- `evidence/render-scheduling-walkin-browser-appointment.md`
- `evidence/render-scheduling-walkin-browser-workorder.md`
- `evidence/render-log-audit-summary.json`
- `evidence/render-log-audit-events.json`
- `evidence/render-log-audit-latest-deploy-window.json`
- `evidence/render-log-audit-all.ndjson`
- `evidence/render-aut17-log-audit-summary.json`
- `evidence/render-aut17-log-audit-window.json`
- `evidence/render-aut17-log-audit-summary-stable.json`
- `evidence/render-aut17-log-audit-window-stable.json`

## Open blockers

- No blocking external dependencies for continuing Phase 1 product work.

## Next recommended milestone

1. Implement day/week planning board endpoint and Russian UI entry for dispatch planning (`AUT-11` scope).
2. Execute `AUT-16`: pin Node.js runtime to LTS and verify on next Render deploy.
3. Execute `AUT-18`: remove repo-access fallback warning in Render build clone step.
4. Add customer/vehicle operational search flow with deterministic filters and acceptance scenarios (`AUT-12` scope).

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.
