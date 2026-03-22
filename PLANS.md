# PLANS.md

## Purpose

This file holds living execution plans for non-trivial work.

Codex must use it for features, multi-step fixes, integrations, deployment changes, environment setup, substantial refactors, or any task that benefits from an explicit long-horizon plan.

Treat this file as a working design-and-execution document.

## General rule

Before starting non-trivial work:
1. restate the objective,
2. validate the current state,
3. write or update the active plan,
4. and only then implement.

## What an execution plan must contain

Each active plan should contain, at minimum:

1. **Objective**
   - What is being changed and why now.

2. **Task boundary**
   - What is in scope.
   - What is explicitly out of scope for this plan.

3. **Current-state validation**
   - What currently exists.
   - What currently fails or is missing.
   - What evidence confirms that starting point.

4. **Constraints**
   - Relevant rules from the packet.
   - Important defaults.
   - Deployment or environment limits.
   - Verification requirements.

5. **Target outcome**
   - What “done” means for this plan.
   - Which acceptance criteria it must satisfy.

6. **Implementation slices**
   - Small ordered steps.
   - Each slice should be independently understandable and preferably testable.

7. **Verification plan**
   - Which automated checks will run.
   - Which end-to-end flow(s) will be driven.
   - What evidence will be captured.

8. **Deployment and update plan**
   - How the change reaches a runnable environment.
   - Any migration, rollout, or rollback needs.

9. **Risks and fallback**
   - Main failure modes.
   - What the agent will do if the planned path fails.

10. **Progress log**
    - Completed steps.
    - Failures.
    - Repairs.
    - Current next step.

## Active plan template

Use this template for the active plan:

---

## Active Plan — [short title]

### Objective

### Why now

### Scope

### Out of scope

### Current-state validation

### Relevant packet rules and defaults

### Target outcome

### Ordered execution slices
1.
2.
3.

### Verification and evidence plan

### Deployment / update plan

### Risks and fallback plan

### Progress log

### Completion checkpoint

---

Historical completed plans are archived in:
- `PLANS_ARCHIVE.md`

## Archived plan skeleton

Quick index of older completed plans moved to `PLANS_ARCHIVE.md`.

- 2026-03-21 — Render build/runtime log investigation and follow-up triage
- 2026-03-21 — AUT-14 verification scenarios for scheduling and walk-in
- 2026-03-21 — AUT-10 Walk-in intake API and active queue insertion
- 2026-03-21 — AUT-9 Appointment lifecycle API with deterministic capacity conflicts
- 2026-03-21 — AUT-8 Customers and Vehicles CRUD API
- 2026-03-21 — AUT-7 Employees and Bays CRUD API
- 2026-03-21 — AUT-6 Persistent Data Model and Migrations
- 2026-03-21 — Phase 0 Foundation Slice
- 2026-03-21 — Phase 1 Dashboard UX Refactor
- 2026-03-21 — AUT-17 health-check log noise reduction
- 2026-03-21 — AUT-16 pin Render Node runtime to LTS
- 2026-03-21 — AUT-18 repo-access warning remediation investigation
- 2026-03-21 — Repository spring cleaning and harness simplification
- 2026-03-21 — PLANS archive automation and policy enforcement
- 2026-03-21 — Linear Playwright workflow integrated into harness
- 2026-03-22 — AUT-21/22/23 harness hardening follow-ups

## Completed Plan — Deploy-aware verification gate for Render (2026-03-22)

### Objective

Add a deterministic deployment verification stage so remote smoke checks run against freshly deployed code instead of stale Render state.

### Why now

Local verification is stable, but remote checks can fail repeatedly when Render is behind local changes. This creates avoidable noise and slows iteration.

### Scope

- Add a Render deploy-and-smoke harness script.
- Add package scripts for local-only gate vs full (local + Render) gate.
- Integrate optional Render stage into existing `verify` flow.
- Update runbook/README/state docs with exact command sequence and env requirements.

### Out of scope

- Production-grade multi-environment promotion workflow.
- Replacing Render with VPS flow.

### Current-state validation

- `npm run verify` currently verifies local isolated app only.
- Remote smoke is manual and can fail on stale deployment (`dashboard week payload is missing`).
- Render API in this environment is more reliable with `curl --resolve`.

### Relevant packet rules and defaults

- Keep harness deterministic and machine-readable.
- Prefer one-command workflows.
- Keep rollback/repair paths explicit in docs.

### Target outcome

- `npm run verify:render` can trigger Render deploy, wait for `live`, then run smoke.
- `npm run verify:full` runs local `verify` then Render stage.
- Default local loop remains fast and independent.

### Ordered execution slices
1. Implement Render deploy polling + smoke script with structured status logs.
2. Add npm script entry points and optional hook from `verify.js`.
3. Update docs for two-stage verification policy.
4. Run regression checks and capture evidence.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- `npm run verify:render` (with deploy skipped for dry local harness check)
- Capture evidence under `evidence/`.

### Deployment / update plan

- Uses existing Render service id and API key envs.
- Defaults to `curl --resolve` pathway for API reliability in this machine context.

### Risks and fallback plan

- Risk: Render API connectivity drift.
  - Mitigation: env-controlled resolve toggle/IP and explicit failure diagnostics.
- Risk: deploy takes too long.
  - Mitigation: bounded poll timeout with clear non-zero exit payload.

### Progress log

- 2026-03-22: Confirmed Render API timeout without resolve and successful service read with resolve.
- 2026-03-22: Confirmed deploy status endpoints required for polling.
- 2026-03-22: Implemented `scripts/verify-render.js`:
  - Render service lookup,
  - deploy trigger,
  - deploy polling to `live`,
  - and post-deploy smoke execution.
- 2026-03-22: Integrated optional Render stage into `scripts/verify.js` via `VERIFY_RENDER=1`.
- 2026-03-22: Added npm commands:
  - `npm run verify:render`
  - `npm run verify:full`
  - `npm run up:full`
- 2026-03-22: Updated runbook/README for two-stage verification policy and environment toggles.
- 2026-03-22: Verification outcomes:
  - `npm test` passed,
  - `npm run verify` passed,
  - `RENDER_SKIP_DEPLOY=1 APP_BASE_URL=<local> npm run verify:render` passed,
  - `RENDER_SKIP_DEPLOY=1 APP_BASE_URL=<local> npm run verify:full` passed,
  - live `npm run verify:render` successfully triggered deploy `dep-d6vjrd75gffc73dcbtsg` and reached `live`, then failed smoke on stale deployed contract (`dashboard week payload is missing`).

### Completion checkpoint

Completed on 2026-03-22:
- deploy-aware remote verification is encoded into harness commands,
- default local development loop stays fast and self-contained,
- and release/milestone gate can now enforce deploy-then-smoke behavior in one command.

## Archived plan skeleton

Quick index of older completed plans moved to `PLANS_ARCHIVE.md`.

- 2026-03-21 — Render build/runtime log investigation and follow-up triage
- 2026-03-21 — AUT-14 verification scenarios for scheduling and walk-in
- 2026-03-21 — AUT-10 Walk-in intake API and active queue insertion
- 2026-03-21 — AUT-9 Appointment lifecycle API with deterministic capacity conflicts
- 2026-03-21 — AUT-8 Customers and Vehicles CRUD API
- 2026-03-21 — AUT-7 Employees and Bays CRUD API
- 2026-03-21 — AUT-6 Persistent Data Model and Migrations
- 2026-03-21 — Phase 0 Foundation Slice
- 2026-03-21 — Phase 1 Dashboard UX Refactor
- 2026-03-21 — AUT-17 health-check log noise reduction
- 2026-03-21 — AUT-16 pin Render Node runtime to LTS
- 2026-03-21 — AUT-18 repo-access warning remediation investigation
- 2026-03-21 — Repository spring cleaning and harness simplification
- 2026-03-21 — PLANS archive automation and policy enforcement
- 2026-03-21 — Linear Playwright workflow integrated into harness

## Completed Plan — AUT-13 operational search by customer/phone/plate/VIN/model (2026-03-22)

### Objective

Implement fast, forgiving operational lookup that can be executed both via API and via dashboard UI entry point, covering customer name, phone, plate number, VIN, and vehicle model.

### Why now

`AUT-13` is a remaining open Phase 1 item and is the next blocker before final deployment closeout work (`AUT-15`).

### Scope

- Add unified search API route for front-desk lookup use.
- Extend dashboard service/model to include search results.
- Add dashboard search UI entry point with deterministic result rendering.
- Add focused tests and smoke assertions for the search contract.
- Update status artifacts and Linear state after verification.

### Out of scope

- Work-order lifecycle feature expansion.
- Deployment remediation itself (`AUT-15`) beyond local verification and notes.

### Current-state validation

- Customer and vehicle APIs already support `q`, but there is no single operational search endpoint.
- Dashboard has no search input or results block.
- `AUT-13` is currently `Todo` in Linear (`P1-08 Search: fast lookup by customer, phone, plate, VIN, vehicle`).

### Relevant packet rules and defaults

- Preserve strict boundaries: service builds model, UI renders model.
- Keep outputs deterministic and machine-verifiable.
- Keep user-facing text Russian-first.

### Target outcome

- `GET /api/v1/search?q=...` returns structured search payload.
- Dashboard includes quick-search entry point and result panels.
- Queries by name/phone/plate/VIN/model are covered by automated checks.
- `npm test` and `npm run verify` pass after changes.

### Ordered execution slices
1. Add search aggregation logic in `DashboardService` with stable payload shape.
2. Add `GET /api/v1/search` route using shared service logic.
3. Add dashboard quick-search form and result rendering.
4. Add/extend tests and smoke checks for API/UI behavior.
5. Run regression gates, update docs/status, and close `AUT-13` in Linear.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- `npm run smoke`
- Capture relevant outputs under `evidence/`.

### Deployment / update plan

- No immediate deploy in this slice; deployment validation remains in `AUT-15`.

### Risks and fallback plan

- Risk: noisy or slow results from broad queries.
  - Mitigation: normalize query, cap result lists, expose total+truncation metadata.
- Risk: UI clutter on dashboard.
  - Mitigation: collapsed-by-default behavior when query is empty and compact grouped tables.

### Progress log

- 2026-03-22: Validated Linear acceptance details and current API/UI search gaps.
- 2026-03-22: Implemented unified search model in `DashboardService` with normalized matching for customer/phone/plate/VIN/model and bounded grouped results.
- 2026-03-22: Added API search route (`GET /api/v1/search`) and dashboard query support (`GET /api/v1/dashboard/today?q=...` + UI `/?q=...`).
- 2026-03-22: Added dashboard quick-search section with Russian-first query hints, summary metrics, result tables, and deep links into appointment/work-order details.
- 2026-03-22: Extended verification harness:
  - `tests/dashboardService.test.js` lookup coverage for name/phone/plate/VIN/model,
  - `tests/http.test.js` API/UI search contract checks,
  - `scripts/smoke.js` search endpoint/UI contract assertions.
- 2026-03-22: Regression gates passed:
  - `npm test` (`evidence/test-aut13.txt`),
  - `npm run verify` (`evidence/verify-aut13.txt`),
  - local smoke against ephemeral local instance (`evidence/smoke-aut13-local.txt`).
- 2026-03-22: Linear sync completed:
  - `AUT-12` moved to `Done` with closure comment id `575d8222-4e5e-41b3-968a-f69ff727bd2b`.
  - `AUT-13` moved to `Done` with closure comment id `b22bc233-1c2b-46ca-8411-95a84b2481c4`.

### Completion checkpoint

Completed on 2026-03-22:
- operational unified lookup now exists in both API and dashboard entry point,
- search behavior is covered for name/phone/plate/VIN/model paths,
- and local regression/verify/smoke gates are green.

## Archived plan skeleton

Quick index of older completed plans moved to `PLANS_ARCHIVE.md`.

- 2026-03-21 — Render build/runtime log investigation and follow-up triage
- 2026-03-21 — AUT-14 verification scenarios for scheduling and walk-in
- 2026-03-21 — AUT-10 Walk-in intake API and active queue insertion
- 2026-03-21 — AUT-9 Appointment lifecycle API with deterministic capacity conflicts
- 2026-03-21 — AUT-8 Customers and Vehicles CRUD API
- 2026-03-21 — AUT-7 Employees and Bays CRUD API
- 2026-03-21 — AUT-6 Persistent Data Model and Migrations
- 2026-03-21 — Phase 0 Foundation Slice
- 2026-03-21 — Phase 1 Dashboard UX Refactor
- 2026-03-21 — AUT-17 health-check log noise reduction
- 2026-03-21 — AUT-16 pin Render Node runtime to LTS
- 2026-03-21 — AUT-18 repo-access warning remediation investigation
- 2026-03-21 — Repository spring cleaning and harness simplification
- 2026-03-21 — PLANS archive automation and policy enforcement

## Completed Plan — AUT-12 week planning board with overbooking visibility (2026-03-22)

### Objective

Implement the Phase 1 weekly planning UI so dispatch can see future load by bay and assignee, with clear visual overbooking signals.

### Why now

`AUT-12` is one of the last open Phase 1 execution items and blocks closure of the parent execution issue.

### Scope

- Extend dashboard model with 7-day planning projection.
- Add week load tables in UI for bays and assignees.
- Add explicit overbooking/underbooking visual cues.
- Add/extend tests and smoke assertions for week planning payload/UI.
- Update status/plan records and Linear issue state when complete.

### Out of scope

- Search UX implementation (`AUT-13`).
- Additional deployment hardening beyond normal verification flow.

### Current-state validation

- Dashboard currently exposes only day-level load (`load.byBay`, `load.byAssignee`).
- UI has no weekly planning table and no overbooking cues.
- `AUT-12` remains `Todo` in Linear.

### Relevant packet rules and defaults

- Keep behavior deterministic and easy to verify.
- Favor strict boundaries: service computes model, UI only renders.
- Keep outputs and evidence machine-friendly.

### Target outcome

- Dashboard payload includes week plan structure with by-bay/by-assignee cells.
- UI shows week board with obvious overload/underload styling.
- Tests and verify loop pass without regressions.

### Ordered execution slices
1. Add week planning aggregation in `DashboardService`.
2. Render week planning tables/cues in dashboard UI.
3. Extend tests + smoke checks for week payload/UI.
4. Run `npm test`, `npm run verify`, deployed smoke.
5. Update docs/status and close `AUT-12` in Linear.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- `APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run smoke`
- Capture evidence files under `evidence/` for this slice.

### Deployment / update plan

- No code deployment required for this slice; runtime proof uses existing Render URL.

### Risks and fallback plan

- Risk: planned date strings use mixed formats.
  - Mitigation: support absolute + Russian relative formats and track unscheduled entries explicitly.
- Risk: week cues become unclear.
  - Mitigation: explicit legend and cell status classes (overbooked/high/normal/underbooked).

### Progress log

- 2026-03-22: Context audit completed; dashboard service/UI currently day-only.
- 2026-03-22: Added week projection aggregation in `DashboardService` with 7-day window, resource-level cells, unscheduled appointment tracking, and overload detection by slot conflicts/capacity baseline.
- 2026-03-22: Updated dashboard UI with week planning panels (by bay / by assignee), overload legend, and cell-level visual statuses.
- 2026-03-22: Extended automated checks:
  - `tests/dashboardService.test.js` week-overload/unscheduled scenario coverage,
  - `tests/http.test.js` API + UI assertions for week section,
  - `scripts/smoke.js` week payload + UI contract checks.
- 2026-03-22: Verification completed locally (`npm test`, `npm run verify`).
- 2026-03-22: Deployed smoke against current Render URL failed as expected because environment is on older commit and lacks week payload (`dashboard week payload is missing`), captured in evidence for deployment follow-up (`AUT-15`).

### Completion checkpoint

Completed on 2026-03-22:
- week planning board is implemented with by-bay/by-assignee visibility,
- overbooking is detectable at a glance via dedicated cell states,
- and local verification gates are passing.

## Archived plan skeleton

Quick index of older completed plans moved to `PLANS_ARCHIVE.md`.

- 2026-03-21 — Render build/runtime log investigation and follow-up triage
- 2026-03-21 — AUT-14 verification scenarios for scheduling and walk-in
- 2026-03-21 — AUT-10 Walk-in intake API and active queue insertion
- 2026-03-21 — AUT-9 Appointment lifecycle API with deterministic capacity conflicts
- 2026-03-21 — AUT-8 Customers and Vehicles CRUD API
- 2026-03-21 — AUT-7 Employees and Bays CRUD API
- 2026-03-21 — AUT-6 Persistent Data Model and Migrations
- 2026-03-21 — Phase 0 Foundation Slice
- 2026-03-21 — Phase 1 Dashboard UX Refactor
- 2026-03-21 — AUT-17 health-check log noise reduction
- 2026-03-21 — AUT-16 pin Render Node runtime to LTS
- 2026-03-21 — AUT-18 repo-access warning remediation investigation
- 2026-03-21 — Repository spring cleaning and harness simplification

## Completed Plan — AUT-18 recheck and self-contained verification gate hardening (2026-03-22)

### Objective

Re-check Render repo-access warning status and harden the local harness so verification is self-contained and includes scheduling/walk-in scenario coverage by default.

### Why now

The project sequence required first validating whether `AUT-18` could be closed, then continuing harness reliability work without waiting on external blockers.

### Scope

- Trigger a fresh Render deploy and audit build logs for repo-access warning persistence.
- Capture post-deploy smoke proof.
- Replace `npm run verify` with a self-contained runner that starts/stops its own app instance.
- Include scheduling/walk-in scenario check in default verify gate.
- Keep verification non-destructive to local working DB by using a temporary isolated DB.

### Out of scope

- Render dashboard credential reconnect action itself.
- Broader product-scope feature work (planning board/search UX).
- Full implementation of all remaining harness follow-ups (`AUT-21` to `AUT-23`).

### Current-state validation

- `AUT-18` warning was previously observed in focused build logs.
- `npm run verify` previously required a separately running app and did not include scheduling/walk-in scenario by default.

### Relevant packet rules and defaults

- Favor deterministic one-command workflows and explicit health checks.
- Capture evidence for deploy/runtime claims.
- Improve harness when friction repeats.

### Target outcome

- Fresh proof of whether `AUT-18` is resolved or still externally blocked.
- `npm run verify` runs tests + smoke + scheduling/walk-in scenario without manual server startup.
- Verification flow does not mutate the default local DB.

### Ordered execution slices

1. Trigger Render deploy and poll completion.
2. Pull build logs for deploy window and summarize repo-access warning signal.
3. Run post-deploy smoke against Render URL.
4. Implement self-contained verify runner script with isolated temp DB.
5. Update scripts/docs and run verify loop evidence.

### Verification and evidence plan

- Render:
  - `evidence/render-aut18-recheck-deploy-response.json`
  - `evidence/render-aut18-recheck-deploy-poll.txt`
  - `evidence/render-aut18-recheck-deploy-final.json`
  - `evidence/render-aut18-recheck-log-window-build.json`
  - `evidence/render-aut18-recheck-warning-summary.json`
  - `evidence/render-aut18-recheck-postdeploy-smoke.txt`
- Local harness:
  - `npm run verify`
  - `VERIFY_INCLUDE_SCENARIO=0 npm run verify`
  - `evidence/verify-self-contained-output.txt`
  - `evidence/verify-self-contained-no-scenario-output.txt`
  - `evidence/verify-server.log`

### Deployment / update plan

- No code deployment required for verify harness changes.
- Render deploy triggered only for `AUT-18` audit evidence.

### Risks and fallback plan

- Risk: verify runner leaves orphan server process on failure.
  - Mitigation: explicit SIGTERM with timeout + SIGKILL fallback.
- Risk: verify mutates local development DB.
  - Mitigation: isolated temporary DB path per run.
- Risk: Render warning still external.
  - Mitigation: keep `AUT-18` open and continue internal hardening work in parallel until reconnect can be validated.

### Progress log

- 2026-03-22: Triggered Render deploy `dep-d6vi9un5gffc73dbjat0`; deploy reached `live`.
- 2026-03-22: Build log audit shows repo-access warning still present (`warningCount = 1`) in deploy window.
- 2026-03-22: Post-deploy smoke passed on Render URL.
- 2026-03-22: Added `scripts/verify.js` and switched `npm run verify` to self-contained runner.
- 2026-03-22: Verify runner now executes tests + smoke + scheduling/walk-in scenario with temporary DB and automatic shutdown.
- 2026-03-22: Updated README and runbook docs for the new verify behavior.
- 2026-03-22 (follow-up): Triggered second recheck deploy `dep-d6vih4nafjfc73d29b7g`; build warning count is now `0` after reconnect and post-deploy smoke passed.

### Completion checkpoint

Completed on 2026-03-22:
- local verification gate is now self-contained and scenario-inclusive by default,
- and `AUT-18` is resolved based on follow-up recheck evidence (`warningCount = 0`).

## Maintenance rule

When a plan is completed:
- mark it as completed,
- keep a short summary of what was achieved,
- and ensure `STATUS.md` reflects the newly accepted state.
- run `npm run plans:compact` so `PLANS.md` stays focused, old completed plans move to `PLANS_ARCHIVE.md`, and the archived skeleton index in this file stays current.

Plan-hygiene thresholds for `PLANS.md`:
- at most 4 completed-plan sections in this file,
- and no more than 900 lines total.

If thresholds are exceeded:
- compact immediately in the same task slice (do not defer),
- capture the compaction in the current plan/status update,
- and keep archive history append-only.

When a plan becomes obsolete:
- close it explicitly instead of silently rewriting history.
