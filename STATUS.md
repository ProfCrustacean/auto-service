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
- Deterministic seed fixtures implemented from packet scenario set.
- Structured health/readiness checks and JSON logs implemented.
- Automated tests and smoke harness implemented and executed locally.
- Render deployment path is implemented and validated in a live environment.

### Last accepted milestone
- 2026-03-21: Phase 1 dashboard UX slice accepted end-to-end (implementation, local verification, Render deploy, deployed smoke, browser smoke, evidence captured).

### Current active objective
- Continue Phase 1 scheduling and intake implementation beyond dashboard shell:
  - persistent records and CRUD flows,
  - appointment lifecycle and walk-in intake APIs,
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
- last validated date or commit: 2026-03-21, commit `aaca232`
- known caveats: seed-fixture data only; no auth yet; no persistent transactional storage yet

2. `render-validation`
- purpose: first durable external deployment validation
- host or URL: `https://auto-service-foundation.onrender.com`
- how Codex reaches it: Render service `srv-d6vcmt7diees73d0j04g` created via API from repo `https://github.com/ProfCrustacean/auto-service`
- whether deployment is working: yes
- whether TLS is working: yes (Render-managed)
- whether end-to-end checks are working: yes (deployed smoke + deployed browser snapshot)
- last validated date or commit: 2026-03-21, commit `aaca232`
- known caveats:
  - from this local environment, direct `api.render.com` connectivity may timeout; `curl --resolve api.render.com:443:216.24.57.7` worked reliably.

## Verification status

### Automated checks
- `npm test` (Node test runner): passed on 2026-03-21.
- evidence: `evidence/test-output.txt`

### End-to-end checks
- local smoke (`npm run smoke`): passed on 2026-03-21.
- local browser smoke snapshot: passed on 2026-03-21.
- deployed Render smoke (`APP_BASE_URL="https://auto-service-foundation.onrender.com" npm run smoke`): passed on 2026-03-21.
- deployed Render browser smoke snapshot: passed on 2026-03-21.
- evidence:
  - `evidence/smoke-output.txt`
  - `evidence/browser-snapshot.md`
  - `evidence/render-smoke-output.txt`
  - `evidence/render-browser-snapshot.md`

### Deployment smoke checks
- local deployment smoke (`npm start` + health + dashboard endpoints): passed.
- Render deployment smoke: passed (`dep-d6vdi894tr6s73dis1eg` reached `live`, commit `aaca232`).
- evidence:
  - `evidence/healthz.json`
  - `evidence/dashboard-today.json`
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
- `evidence/browser-snapshot.md`
- `evidence/render-validate-response.json`
- `evidence/render-create-service-response.json`
- `evidence/render-deploy-poll.txt`
- `evidence/render-deploy-latest.json`
- `evidence/render-manual-deploy-response.json`
- `evidence/render-manual-deploy-poll.txt`
- `evidence/render-manual-deploy-final.json`
- `evidence/render-manual-postdeploy-smoke.txt`
- `evidence/render-service-state.json`
- `evidence/render-smoke-output.txt`
- `evidence/render-browser-snapshot.md`

## Open blockers

- No blocking external dependencies for continuing Phase 1 product work.

## Next recommended milestone

1. Execute `AUT-6` to establish persistent data model + migration path.
2. Execute `AUT-7` and `AUT-8` for employee/bay and customer/vehicle CRUD APIs.
3. Execute `AUT-9` and `AUT-10` for appointment lifecycle and walk-in intake.
4. Extend acceptance scenarios under `AUT-14` and deploy each slice to `render-validation`.

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.
