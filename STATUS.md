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
- Node runtime policy pinned to 22 LTS for deterministic Render deploy/runtime behavior.
- Repository spring-cleaning slice completed: shared HTTP validator/route utilities and shared test harness removed duplicated logic while preserving behavior.
- Plan-hygiene automation implemented: `PLANS.md` compaction command, append-only `PLANS_ARCHIVE.md`, archived-plan skeleton index in main plan file, and guard test enforcing compact plan-window policy.
- Linear harness automation implemented: Playwright-backed `probe/create` CLI for deterministic Linear task operations with dry-run and title-based skip behavior.
- Verification gate hardened: `npm run verify` now self-boots an isolated app+DB, runs smoke plus scheduling/walk-in scenario checks, and shuts down automatically.
- Deploy-aware verification gates implemented:
  - `npm run verify:render` (Render deploy + wait-live + commit-parity + remote smoke + deployed non-destructive scenario + post-deploy log audit),
  - `npm run verify:full` (local verify + Render stage).
- Deploy gate hardening follow-ups completed:
  - `AUT-24`: commit parity assertion in Render deploy gate.
  - `AUT-25`: automated post-deploy Render build/app log audit with threshold gating.
  - `AUT-26`: deployed non-destructive scheduling/walk-in scenario integrated into `verify:render`.
- Harness hardening follow-ups completed:
  - `AUT-21`: scenario defaults to non-destructive mode on non-local targets with explicit override switches.
  - `AUT-22`: smoke/scenario scripts decoupled from fixed fixtures via contract assertions, dynamic entity selection, and minimal resource provisioning.
  - `AUT-23`: smoke/scenario failures now emit structured diagnostics (step/method/path/url/status/payload/stack).
- Phase 1 weekly planning board is implemented with 7-day load visibility by bay and assignee plus explicit overbooking/underbooking cues.
- Phase 1 unified operational search is implemented with API + dashboard entry point for customer/phone/plate/VIN/model lookup.
- Structured health/readiness checks and JSON logs implemented.
- Automated tests and smoke harness implemented and executed locally.
- Render deployment path is implemented and validated in a live environment.

### Last accepted milestone
- 2026-03-22: AUT-24/25/26 completed (Render deploy gate hardening: commit parity + post-deploy log audit + deployed non-destructive scenario).

### Current active objective
- Maintain Phase 1 closeout quality bar by keeping deploy-aware verification as the release gate and syncing Linear issue state with latest evidence.

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
- last validated date or commit: 2026-03-22, commit `36295bd`
- known caveats:
  - no auth yet; single-node SQLite file model only
  - Playwright MCP browser smoke can be blocked in this runtime by existing local Chrome profile/session lock (`Opening in existing browser session`); CLI smoke/scenario checks remain available.

2. `render-validation`
- purpose: first durable external deployment validation
- host or URL: `https://auto-service-foundation.onrender.com`
- how Codex reaches it: Render service `srv-d6vcmt7diees73d0j04g` created via API from repo `https://github.com/ProfCrustacean/auto-service`
- whether deployment is working: yes
- whether TLS is working: yes (Render-managed)
- whether end-to-end checks are working: yes (deployed smoke + deployed browser snapshot)
- last validated date or commit: 2026-03-22, commit `36295bd` (deploy `dep-d6vkg34jppes738kuh2g`)
- known caveats:
  - from this local environment, direct `api.render.com` connectivity may timeout; `curl --resolve api.render.com:443:216.24.57.7` worked reliably.
  - app persistence is local SQLite file per service instance; no managed multi-node database yet.

## Verification status

### Automated checks
- `npm test` (AUT-24/25/26 regression): passed on 2026-03-22.
- evidence: `evidence/test-after-aut24-aut26-v2.txt`
- `npm run verify` (AUT-24/25/26 regression): passed on 2026-03-22.
- evidence: `evidence/verify-after-aut24-aut26-v2.txt`
- `RENDER_API_KEY=*** npm run verify:render` (deploy parity + smoke + scenario + log audit): passed on 2026-03-22.
- evidence:
  - `evidence/verify-render-after-aut24-aut26.txt`
  - `evidence/verify-render-aut24-aut26-post-push.txt`
- `npm test` (Node test runner): passed on 2026-03-22.
- evidence: `evidence/test-output.txt`
- `npm test` (Linear harness + full regression rerun): passed on 2026-03-22.
- `npm test` (AUT-21 regression): passed on 2026-03-22.
- `npm run verify` (AUT-21 regression): passed on 2026-03-22.
- `npm test` (AUT-22 regression): passed on 2026-03-22.
- `npm run verify` (AUT-22 regression): passed on 2026-03-22.
- `npm test` (AUT-23 regression, includes diagnostics helper tests): passed on 2026-03-22.
- `npm run verify` (AUT-23 regression): passed on 2026-03-22.
- `npm test` (AUT-12 week planning board regression): passed on 2026-03-22.
- `npm run verify` (AUT-12 week planning board regression): passed on 2026-03-22.
- `npm test` (AUT-13 unified search regression): passed on 2026-03-22.
- `npm run verify` (AUT-13 unified search regression): passed on 2026-03-22.
- `npm test` (deploy-gate harness update regression): passed on 2026-03-22.
- `npm run verify` (deploy-gate harness update regression): passed on 2026-03-22.
- `RENDER_SKIP_DEPLOY=1 APP_BASE_URL=\"http://127.0.0.1:3231\" npm run verify:render` (deploy gate script in smoke-only mode): passed on 2026-03-22.
- `RENDER_SKIP_DEPLOY=1 APP_BASE_URL=\"http://127.0.0.1:3232\" npm run verify:full` (full gate wiring with Render stage): passed on 2026-03-22.
- `npm run verify` (self-contained gate with scenario): passed on 2026-03-22.
- `VERIFY_INCLUDE_SCENARIO=0 npm run verify` (self-contained gate without scenario): passed on 2026-03-22.
- `npm test` (spring-cleaning rerun): passed on 2026-03-21.
- evidence: `evidence/spring-cleaning-test-output.txt`
- `npm test` (plan-hygiene policy rerun): passed on 2026-03-21.
- `npm run plans:compact` (policy no-op confirmation): passed on 2026-03-21.
- evidence:
  - `evidence/plans-hygiene-test-output.txt`
  - `evidence/plans-compact-check-output.txt`
  - `evidence/plans-compact-after-aut18-recheck.txt`
  - `evidence/plans-line-counts.txt`
  - `evidence/plans-completed-headings.txt`
  - `evidence/test-after-aut18-recheck.txt`

### End-to-end checks
- deploy-aware Render gate (`npm run verify:render`) passed on 2026-03-22 for deploy `dep-d6vke77kijhs73ctdecg`:
  - deploy reached `live`,
  - commit parity check passed (`expected == actual`),
  - deployed smoke passed,
  - deployed scheduling/walk-in scenario passed in explicit non-destructive mode,
  - post-deploy log audit passed (`warn=0`, `error=0`, `repoAccessWarnings=0`).
- local smoke (`npm run smoke`): passed on 2026-03-21.
- local appointment lifecycle smoke: passed on 2026-03-21.
- local walk-in intake smoke: passed on 2026-03-21.
- local browser smoke snapshot: passed on 2026-03-21.
- local scheduling + walk-in scenario script (`node scripts/scheduling-walkin-scenario.js`): passed on 2026-03-21.
- local scheduling + walk-in browser path snapshots (dashboard + appointment + work-order): passed on 2026-03-21.
- local smoke (`npm run smoke`, spring-cleaning rerun): passed on 2026-03-21.
- local scheduling + walk-in scenario script (spring-cleaning rerun): passed on 2026-03-21.
- local browser smoke via Playwright MCP (spring-cleaning rerun): blocked on 2026-03-21 by local browser profile/session lock (`Opening in existing browser session`); captured as tooling caveat with no API/service regression evidence.
- local health-check log filter check (successful `/healthz` suppressed): passed on 2026-03-21.
- local Node runtime policy guard (`engines.node=22.x`, `.node-version=22`): passed on 2026-03-21.
- local self-contained verify loop (`npm run verify`): passed on 2026-03-22.
- local self-contained verify loop with scenario disabled (`VERIFY_INCLUDE_SCENARIO=0 npm run verify`): passed on 2026-03-22.
- local week planning smoke path (inside `npm run verify`): passed on 2026-03-22 (dashboard week payload + UI contract present).
- local unified search smoke path (inside `npm run verify`): passed on 2026-03-22 (`/api/v1/search` contract + dashboard search entry point present).
- local standalone smoke rerun (`APP_BASE_URL=\"http://127.0.0.1:3210\" npm run smoke`): passed on 2026-03-22.
- deployed Render scenario default-mode guard (`APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run scenario:scheduling-walkin`): passed on 2026-03-22 (auto non-destructive mode confirmed).
- failure-diagnostics smoke check (`APP_BASE_URL=\"http://127.0.0.1:9\" npm run smoke`): passed on 2026-03-22 (structured failure JSON confirmed).
- failure-diagnostics scenario check (`APP_BASE_URL=\"http://127.0.0.1:9\" npm run scenario:scheduling-walkin`): passed on 2026-03-22 (structured failure JSON confirmed).
- deployed Render smoke (`APP_BASE_URL="https://auto-service-foundation.onrender.com" npm run smoke`): passed on 2026-03-21.
- deployed Render appointment lifecycle smoke: passed on 2026-03-21.
- deployed Render walk-in intake smoke: passed on 2026-03-21.
- deployed Render browser smoke snapshot: passed on 2026-03-21.
- deployed Render CRUD smoke for employees/bays (create/update/soft-delete): passed on 2026-03-21.
- deployed Render CRUD smoke for customers/vehicles (create/update/reassign/delete): passed on 2026-03-21.
- deployed scheduling + walk-in scenario script (`APP_BASE_URL="https://auto-service-foundation.onrender.com" node scripts/scheduling-walkin-scenario.js`): passed on 2026-03-21.
- deployed scheduling + walk-in browser path snapshots (dashboard + appointment + work-order): passed on 2026-03-21.
- deployed AUT-17 log audit (stable window): passed on 2026-03-21 (`healthzRatio = 0.0`).
- deployed AUT-16 Node runtime audit: passed on 2026-03-21 (`Using Node.js version 22.22.1`).
- Linear harness probe (`npm run linear:probe -- --team-key AUT --state Backlog`): passed on 2026-03-21 (Playwright transport).
- Linear harness dry-run task creation (`npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run`): passed on 2026-03-21.
- Linear harness auto-transport probe (`node scripts/linear-harness.js probe --transport auto`): passed on 2026-03-21 (direct fallback to Playwright).
- Render AUT-18 recheck deploy (`dep-d6vi9un5gffc73dbjat0`) reached `live`; post-deploy smoke passed on 2026-03-22.
- Render AUT-18 recheck #2 deploy (`dep-d6vih4nafjfc73d29b7g`) reached `live`; repo-access warning count `0` and post-deploy smoke passed on 2026-03-22.
- deploy-aware Render gate run (`npm run verify:render`) reached `live` deploy `dep-d6vjrd75gffc73dcbtsg` on 2026-03-22 and executed remote smoke in the same command.
- Render smoke after AUT-12 harness contract update (`APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run smoke`) failed on 2026-03-22 with `dashboard week payload is missing`; this reflects deployed environment lagging behind local code and is now tracked as deployment follow-up (`AUT-15`), not a local regression.
- Render smoke after AUT-13 search contract update (`APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run smoke`) failed on 2026-03-22 with the same `dashboard week payload is missing` signal; deployed environment is still behind current local Phase 1 contract and remains tracked in `AUT-15`.
- Render smoke inside deploy-aware gate (`npm run verify:render`) also failed on 2026-03-22 with `dashboard week payload is missing`; the gate behavior is correct and the remaining issue is that deployed commit still lacks latest local dashboard contract changes.
- evidence:
  - `evidence/smoke-output.txt`
  - `evidence/local-appointment-lifecycle-smoke.json`
  - `evidence/local-walkin-intake-smoke.json`
  - `evidence/browser-snapshot.md`
  - `evidence/local-scheduling-walkin-scenario.json`
  - `evidence/local-scheduling-walkin-browser-dashboard.md`
  - `evidence/local-scheduling-walkin-browser-appointment.md`
  - `evidence/local-scheduling-walkin-browser-workorder.md`
  - `evidence/spring-cleaning-smoke-output.txt`
  - `evidence/spring-cleaning-scenario-output.json`
  - `evidence/spring-cleaning-browser-smoke.txt`
  - `evidence/local-healthz-log-filter-check.json`
  - `evidence/local-node-runtime-policy.json`
  - `evidence/verify-self-contained-output.txt`
  - `evidence/verify-self-contained-no-scenario-output.txt`
  - `evidence/verify-after-aut18-recheck.txt`
  - `evidence/verify-server.log`
  - `evidence/verify-render-skip-deploy-local.txt`
  - `evidence/verify-full-skip-deploy-local.txt`
  - `evidence/verify-render-deploy-current.txt`
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
  - `evidence/render-aut16-node-runtime-summary.json`
  - `evidence/render-aut16-log-window.json`
  - `evidence/render-aut18-recheck-deploy-response.json`
  - `evidence/render-aut18-recheck-deploy-poll.txt`
  - `evidence/render-aut18-recheck-deploy-final.json`
  - `evidence/render-aut18-recheck-log-window-build.json`
  - `evidence/render-aut18-recheck-warning-summary.json`
  - `evidence/render-aut18-recheck-postdeploy-smoke.txt`
  - `evidence/render-aut18-recheck2-deploy-response.json`
  - `evidence/render-aut18-recheck2-deploy-poll.txt`
  - `evidence/render-aut18-recheck2-deploy-final.json`
  - `evidence/render-aut18-recheck2-log-window-build.json`
  - `evidence/render-aut18-recheck2-warning-summary.json`
  - `evidence/render-aut18-recheck2-postdeploy-smoke.txt`
  - `evidence/linear-harness-probe.json`
  - `evidence/linear-harness-create-dry-run.json`
  - `evidence/linear-harness-probe-auto.json`

### Operational log audit
- Render API events and logs inspected directly on 2026-03-22.
- build/deploy event result: latest verified deploy `dep-d6vkg34jppes738kuh2g` reached `live` for commit `36295bd6d25dc2d90ed2740b7c48731878a28720`.
- runtime warn/error signal: none observed in structured app logs (`json_warn_error_count = 0`).
- deploy-gate log audit result (`AUT-25`): passed in-gate with zero warnings/errors/repo-access warnings.
- finding status:
  - Node runtime drift risk: resolved in `AUT-16` (pinned to Node 22 LTS; Render now resolves `22.22.1`).
  - health-check log noise: resolved in `AUT-17` (`healthzRatio = 0.0` in stable deployed window).
  - repo-access fallback warning (`AUT-18`): resolved.
    - latest recheck deploy shows `warningCount = 0` in build logs:
      - deploy `dep-d6vih4nafjfc73d29b7g`
      - summary `evidence/render-aut18-recheck2-warning-summary.json`
- Linear status:
  - `AUT-12` done (state moved to Done; closure comment id `575d8222-4e5e-41b3-968a-f69ff727bd2b`).
  - `AUT-13` done (state moved to Done; closure comment id `b22bc233-1c2b-46ca-8411-95a84b2481c4`).
  - `AUT-15` done (closure comment id `b8b3e9cb-59df-42d4-b36f-9e7e0f0a31a6`).
  - `AUT-16` done
  - `AUT-17` done
  - `AUT-18` done (state moved to Done; closure comment id `78301235-d432-4163-be51-2a24052849d1` with recheck2 evidence).
  - `AUT-24` done (closure comment id `d31cfcc3-41e8-463e-aa4a-c277d9d623f9`).
  - `AUT-25` done (closure comment id `46bb5af3-f0cd-45a8-b951-5a5a2f9131d0`).
  - `AUT-26` done (closure comment id `f7b4d6f3-1941-45e5-bfb1-592613f80f00`).
  - Linear issue sync workaround encoded in harness: use Playwright transport (`npm run linear:probe` / `npm run linear:create`).
- evidence:
  - `evidence/render-log-audit-summary.json`
  - `evidence/render-log-audit-events.json`
  - `evidence/render-log-audit-latest-deploy-window.json`
  - `evidence/render-log-audit-all.ndjson`
  - `evidence/render-aut18-service-state.json`
  - `evidence/render-aut18-update-service-body-params.txt`
  - `evidence/render-aut18-deploy-response.json`
  - `evidence/render-aut18-deploy-poll.txt`
  - `evidence/render-aut18-deploy-final.json`
  - `evidence/render-aut18-deploy-final-compact.json`
  - `evidence/render-aut18-log-window-build-focus.json`
  - `evidence/render-aut18-warning-summary-focus.json`
  - `evidence/render-aut18-log-query-window-focus.json`
  - `evidence/render-aut18-recheck-deploy-response.json`
  - `evidence/render-aut18-recheck-deploy-poll.txt`
  - `evidence/render-aut18-recheck-deploy-final.json`
  - `evidence/render-aut18-recheck-log-window-build.json`
  - `evidence/render-aut18-recheck-warning-summary.json`
  - `evidence/render-aut18-recheck-postdeploy-smoke.txt`
  - `evidence/render-aut18-recheck2-deploy-response.json`
  - `evidence/render-aut18-recheck2-deploy-poll.txt`
  - `evidence/render-aut18-recheck2-deploy-final.json`
  - `evidence/render-aut18-recheck2-log-window-build.json`
  - `evidence/render-aut18-recheck2-warning-summary.json`
  - `evidence/render-aut18-recheck2-postdeploy-smoke.txt`
  - `evidence/linear-api-country-blocked.json`
  - `evidence/linear-aut12-aut13-state-before.raw`
  - `evidence/linear-aut12-aut13-done-mutation.raw`
  - `evidence/linear-aut12-aut13-comments.raw`
  - `evidence/linear-aut12-aut13-done-verify.raw`
  - `evidence/linear-aut15-harness-note.raw`
  - `evidence/linear-harness-probe.json`
  - `evidence/linear-harness-create-dry-run.json`
  - `evidence/linear-harness-probe-auto.json`

### AUT-17 observability verification
- middleware behavior: successful `/healthz` requests are skipped in `http_request` logs; business-path requests remain logged.
- local proof: `healthzHttpRequestLogCount = 0` with dashboard requests still present.
- deployed proof:
  - transition window (`evidence/render-aut17-log-audit-summary.json`): health-check ratio dropped to `0.142857` with one stale-instance health log during rollout overlap.
  - stable window (`evidence/render-aut17-log-audit-summary-stable.json`): `healthzRatio = 0.0`, only new instance logs observed.

### Deployment smoke checks
- local deployment smoke (`npm start` + health + dashboard endpoints): passed.
- Render deployment smoke: passed (`dep-d6vih4nafjfc73d29b7g` reached `live`, commit `6344e9f`).
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
  - `evidence/render-aut16-deploy-response.json`
  - `evidence/render-aut16-deploy-poll.txt`
  - `evidence/render-aut16-deploy-final.json`
  - `evidence/render-service-state.json`
  - `evidence/render-validate-response.json`

## Evidence inventory

Most recent useful evidence:
- `evidence/test-output.txt`
- `evidence/spring-cleaning-test-output.txt`
- `evidence/plans-hygiene-test-output.txt`
- `evidence/plans-compact-after-aut18-recheck.txt`
- `evidence/verify-output.txt`
- `evidence/verify-self-contained-output.txt`
- `evidence/verify-self-contained-no-scenario-output.txt`
- `evidence/verify-after-aut18-recheck.txt`
- `evidence/verify-server.log`
- `evidence/smoke-output.txt`
- `evidence/spring-cleaning-smoke-output.txt`
- `evidence/spring-cleaning-scenario-output.json`
- `evidence/spring-cleaning-browser-smoke.txt`
- `evidence/plans-compact-check-output.txt`
- `evidence/plans-line-counts.txt`
- `evidence/plans-completed-headings.txt`
- `evidence/local-appointment-lifecycle-smoke.json`
- `evidence/local-walkin-intake-smoke.json`
- `evidence/browser-snapshot.md`
- `evidence/local-scheduling-walkin-scenario.json`
- `evidence/local-scheduling-walkin-browser-dashboard.md`
- `evidence/local-scheduling-walkin-browser-appointment.md`
- `evidence/local-scheduling-walkin-browser-workorder.md`
- `evidence/local-healthz-log-filter-check.json`
- `evidence/local-node-runtime-policy.json`
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
- `evidence/render-aut16-deploy-response.json`
- `evidence/render-aut16-deploy-poll.txt`
- `evidence/render-aut16-deploy-final.json`
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
- `evidence/render-aut16-node-runtime-summary.json`
- `evidence/render-aut16-log-window.json`
- `evidence/render-aut18-service-state.json`
- `evidence/render-aut18-update-service-body-params.txt`
- `evidence/render-aut18-deploy-response.json`
- `evidence/render-aut18-deploy-poll.txt`
- `evidence/render-aut18-deploy-final.json`
- `evidence/render-aut18-deploy-final-compact.json`
- `evidence/render-aut18-log-window-build-focus.json`
- `evidence/render-aut18-warning-summary-focus.json`
- `evidence/render-aut18-log-query-window-focus.json`
- `evidence/render-aut18-recheck-deploy-response.json`
- `evidence/render-aut18-recheck-deploy-poll.txt`
- `evidence/render-aut18-recheck-deploy-final.json`
- `evidence/render-aut18-recheck-log-window-build.json`
- `evidence/render-aut18-recheck-warning-summary.json`
- `evidence/render-aut18-recheck-postdeploy-smoke.txt`
- `evidence/render-aut18-recheck2-deploy-response.json`
- `evidence/render-aut18-recheck2-deploy-poll.txt`
- `evidence/render-aut18-recheck2-deploy-final.json`
- `evidence/render-aut18-recheck2-log-window-build.json`
- `evidence/render-aut18-recheck2-warning-summary.json`
- `evidence/render-aut18-recheck2-postdeploy-smoke.txt`
- `evidence/test-after-aut18-recheck.txt`
- `evidence/linear-api-country-blocked.json`
- `evidence/linear-harness-probe.json`
- `evidence/linear-harness-create-dry-run.json`
- `evidence/linear-harness-probe-auto.json`
- `evidence/linear-harness-probe-backlog-current.json`
- `evidence/test-after-aut21.txt`
- `evidence/verify-after-aut21.txt`
- `evidence/scenario-aut21-remote-default.txt`
- `evidence/test-after-aut22.txt`
- `evidence/verify-after-aut22.txt`
- `evidence/smoke-after-aut22.txt`
- `evidence/test-after-aut23.txt`
- `evidence/verify-after-aut23.txt`
- `evidence/smoke-after-aut23.txt`
- `evidence/scenario-after-aut23-remote-default.txt`
- `evidence/smoke-failure-diagnostics-aut23.txt`
- `evidence/scenario-failure-diagnostics-aut23.txt`
- `evidence/linear-aut21-raw.json`
- `evidence/linear-aut22-aut23-raw.json`
- `evidence/linear-aut21-22-23-done.json`
- `evidence/test-aut12.txt`
- `evidence/verify-aut12.txt`
- `evidence/smoke-aut12-render.txt`
- `evidence/smoke-aut13-render.txt`
- `evidence/test-aut13.txt`
- `evidence/verify-aut13.txt`
- `evidence/smoke-aut13-local.txt`
- `evidence/test-after-render-gate-update.txt`
- `evidence/verify-after-render-gate-update.txt`
- `evidence/test-after-render-gate-final.txt`
- `evidence/verify-after-render-gate-final.txt`
- `evidence/verify-render-skip-deploy-local.txt`
- `evidence/verify-full-skip-deploy-local.txt`
- `evidence/verify-render-deploy-current.txt`
- `evidence/verify-render-skip-deploy-final.txt`
- `evidence/verify-full-skip-deploy-final.txt`
- `evidence/verify-after-render-gate-docs-final.txt`
- `evidence/verify-after-up-full-script.txt`
- `evidence/plans-compact-after-render-gate.txt`
- `evidence/linear-aut19-aut20-current.raw`
- `evidence/linear-aut15-harness-note.raw`
- `evidence/linear-aut12-aut13-aut15-current.raw`

## Open blockers

- No active technical blockers are currently confirmed for the Phase 1 harness scope.

## Next recommended milestone

1. Keep `npm run verify:full` as the default pre-merge/pre-release gate for all Phase 1 closeout changes.
2. Start Phase 2 planning slice (work-order lifecycle) with the hardened deploy gate as baseline acceptance.
3. Continue hardening Linear harness ergonomics for non-create workflows (state sync/commenting) without manual UI operations.

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.
