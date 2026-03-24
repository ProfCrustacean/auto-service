# PLANS_ARCHIVE.md

## Purpose

Compact archive index for completed plans moved out of `PLANS.md`.

Detailed narratives are intentionally removed from this hot repository context.
Use git history and commit pointers for full historical reconstruction.

## Completed plan index

## Completed Plan — Render build/runtime log investigation and follow-up triage (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-14 verification scenarios for scheduling and walk-in (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-10 Walk-in intake API and active queue insertion (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-9 Appointment lifecycle API with deterministic capacity conflicts (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-8 Customers and Vehicles CRUD API (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-7 Employees and Bays CRUD API (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-6 Persistent Data Model and Migrations (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — Phase 0 Foundation Slice (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — Phase 1 Dashboard UX Refactor (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-17 health-check log noise reduction (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-16 pin Render Node runtime to LTS (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-18 repo-access warning remediation investigation (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — Repository spring cleaning and harness simplification (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — PLANS archive automation and policy enforcement (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — Linear Playwright workflow integrated into harness (2026-03-21)
- hash pointer: `34cd93f`

## Completed Plan — AUT-21/22/23 harness hardening follow-ups (2026-03-22)
- hash pointer: `34cd93f`

## Completed Plan — AUT-18 recheck and self-contained verification gate hardening (2026-03-22)
- hash pointer: `54acfc4`

## Completed Plan — Bloat audit execution (`AUT-55..AUT-60`) (2026-03-22)
- hash pointer: `5c04bfe`

## Archive Batch — 2026-03-23

### Moved from PLANS.md

- Completed Plan — Phase 2 lifecycle core (`AUT-61..AUT-69`) (2026-03-22)

## Completed Plan — Phase 2 lifecycle core (`AUT-61..AUT-69`) (2026-03-22)

### Objective

Deliver the first complete Phase 2 lifecycle slice so a vehicle can move from intake/appointment to completion through explicit work-order statuses, auditable transitions, operational queues, and deploy-verified harness coverage.

### Delivered

- `AUT-62`: centralized lifecycle domain map (statuses, labels, allowed transitions, blocked/terminal semantics).
- `AUT-63`: work-order lifecycle API (`GET /api/v1/work-orders`, `GET|PATCH /api/v1/work-orders/:id`).
- `AUT-64`: idempotent appointment conversion API (`POST /api/v1/appointments/:id/convert-to-work-order`).
- `AUT-65`: persistence audit trail (`work_order_status_history`, `appointment_work_order_links`, seed + runtime history writes).
- `AUT-66`: Russian lifecycle workspace and active queue UI (`/work-orders/:id`, `/work-orders/active`).
- `AUT-67`: dashboard expanded with lifecycle-driven queues and summary metrics.
- `AUT-68`: lifecycle domain/API/UI tests + scenario/smoke harness upgrades.
- `AUT-69`: runbook/README lifecycle updates, rollback guidance, and Linear sync artifacts.

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run verify:render`: passed
  - deploy: `dep-d703dqk50q8c73fhb08g`
  - commit parity: `b404dccd7a81279dd8f917040f4724b0486d03f6`
  - deployed smoke + non-destructive scenarios: passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

### Linear sync

- `AUT-61..AUT-69` transitioned to `Done`.
- Sync artifact was retired from git as part of canonical evidence retention cleanup.

### Primary evidence

- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`

## Archive Batch — 2026-03-23

### Moved from PLANS.md

- Completed Plan — Spring cleanup wave (`AUT-82..AUT-88`) (2026-03-22)
- Completed Plan — Phase 3 parts flow (`AUT-73..AUT-81`) (2026-03-22)

## Completed Plan — Spring cleanup wave (`AUT-82..AUT-88`) (2026-03-22)

### Objective

Reduce repository noise and enforce deterministic hygiene contracts before next feature work, without changing product behavior.

### Delivered

- Added canonical tracked evidence allowlist at `data/hygiene/evidence-canonical.json`.
- Added cleanup tooling:
  - `scripts/cleanup-spring.js`,
  - `npm run cleanup:spring` (dry-run),
  - `npm run cleanup:spring:apply` (apply pruning).
- Enforced canonical evidence policy with tests.
- Pruned legacy tracked and stale untracked evidence artifacts.
- Added `verify:render` CLI deploy mode parser with explicit `--skip-deploy` / `--deploy` precedence over env.
- Updated runbook/hygiene docs and status records to match cleanup workflow.

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render -- --skip-deploy`: passed
- `npm run verify:render -- --deploy`: passed
  - deploy: `dep-d707i3sr85hc73dqa3tg`
  - commit parity: `1ec6e8f5b30a825e762967f556c30ff2ec18e271`
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

### Linear sync

- Epic and subtasks `AUT-82..AUT-88` created and transitioned to `Done` via harness.

### Primary evidence

- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`
- `evidence/linear-aut73-81-done-sync.json`

## Completed Plan — Phase 3 parts flow (`AUT-73..AUT-81`) (2026-03-22)

### Objective

Deliver the next feature block after lifecycle core: explicit parts-request operations under work orders, lifecycle gating while parts are unresolved, dashboard visibility for waiting-parts aging, and harness-level end-to-end verification.

### Delivered

- `AUT-74`: parts-request domain status machine and supplier-action status catalog.
- `AUT-75`: migration `008` with `work_order_parts_requests`, `parts_purchase_actions`, `work_order_parts_history`, indexes, and seeded substitution examples.
- `AUT-76`: strict work-order parts APIs and validation contracts.
- `AUT-77`: service gating so blocking parts prevent premature lifecycle progression and resolved parts allow continuation.
- `AUT-78`: Russian work-order page parts workspace (create/update/supplier events/history) on `/work-orders/:id`.
- `AUT-79`: dashboard waiting-parts queue expanded with pending-count and aging signal.
- `AUT-80`: new `scenario:parts-flow` plus `verify`/`verify:render` integration.
- `AUT-81`: runbook/README/seed updates and bloat-budget recalibration for Phase 3 footprint.

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run verify:render`: passed
  - deploy: `dep-d7071q1r0fns73cm2o70`
  - commit parity: `be422e1752d37e9ad190fce47bd9bc99100e4401`
  - deployed smoke + non-destructive booking/walk-in/scheduling/parts-flow scenarios: passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

### Linear sync

- Epic and subtasks (`AUT-73..AUT-81`) are ready for Done sync through harness.
- Sync command: `npm run linear:sync -- --spec data/linear/workorder-epic-aut61-2026-03-22.json --state Done`

### Primary evidence

- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`
- `evidence/linear-aut73-81-done-sync.json`

## Archive Batch — 2026-03-23

### Moved from PLANS.md

- Completed Plan — Dispatch board full EventCalendar cutover (2026-03-23)

## Completed Plan — Dispatch board full EventCalendar cutover (2026-03-23)

### Objective

Replace `vis-timeline` with vertical `@event-calendar/build` (`resourceTimeGridDay`) and migrate dispatch board writes to API-only routes.

### Delivered

- Replaced dispatch board engine with EventCalendar standalone bundle (`@event-calendar/build@5.5.1`) in vertical `resourceTimeGridDay` mode.
- Migrated `GET /api/v1/dispatch/board` payload to calendar-native schema:
  - `calendar`, `resources`, `events`, `queues`, `actions`.
- Removed legacy write routes under `/dispatch/board/*` and added API-only mutations:
  - `POST /api/v1/dispatch/board/events/:id/preview`
  - `POST /api/v1/dispatch/board/events/:id/commit`
  - `POST /api/v1/dispatch/board/queue/appointments/:id/schedule`
  - `POST /api/v1/dispatch/board/queue/walk-ins/:id/schedule`
- Updated mutation policy for dispatch board API writes (`api.dispatch_board.write`).
- Updated dispatch board integration tests, smoke checks, and dispatch scenario harness flow.
- Updated runbook + UX guidelines for vertical calendar and queue drag-only control model.

### Verification

- `npm run lint`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render`: passed
  - deploy + commit parity + smoke + non-destructive scenarios + post-deploy log audit: passed
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow, dispatch-board): passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- Browser smoke (Playwright) on production `/dispatch/board`:
  - vertical resource time-grid visible,
  - queue cards draggable,
  - legacy manual-control blocks absent,
  - console errors: 0.
- `npm run audit:bloat`: failed (pre-existing budget overruns in `src/tests/scripts`; unchanged blocker category).

## Archive Batch — 2026-03-23

### Moved from PLANS.md

- Completed Plan — Dispatch board DnD/readability hardening + global overlap warnings (2026-03-23)

## Completed Plan — Dispatch board DnD/readability hardening + global overlap warnings (2026-03-23)

### Objective

Fix dispatch board usability blockers (queue drag/drop and unreadable event cards) and switch capacity conflicts from blocking errors to global non-blocking warnings.

### Delivered

- Reworked appointment capacity policy in domain/service layer:
  - overlap checks now produce structured warning details instead of throwing blocking domain conflicts,
  - create/update responses can carry `warnings` while still committing.
- Updated API routes (`appointments` and dispatch board mutations) to surface `warnings` payloads.
- Updated booking page flow:
  - overlap is previewed as warning detail,
  - submission is no longer blocked by slot overlap.
- Hardened dispatch board DnD:
  - transfer payload fallback parsing (`dataTransfer`) added,
  - drop target fallback resolution added when direct point resolution is unavailable.
- Redesigned dispatch board event readability:
  - high-contrast event palette,
  - deterministic two-line event content rendering (time/code + customer/vehicle),
  - overlap events are visually marked (`status-overlap`).
- Updated tests for the new global overlap policy and dispatch board UI contract.

### Verification

- `npm test -- tests/appointmentLifecycle.test.js tests/appointmentBookingPage.test.js tests/domainSchedulingWalkin.test.js tests/dispatchBoard.test.js`: passed
- `npm test`: passed
- `npm run lint`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render`: passed
  - deploy id: `dep-d70obktm5p6s73a1f52g`
  - commit parity: `f95625f49a76ab071aefb00cf4638a99f783748e`
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- Playwright production smoke on `/dispatch/board`: passed
  - queue drop into occupied slot succeeds (`201`) with warning toast
  - event drag and resize commit successfully (`200`)
  - no browser console errors/warnings

## Archive Batch — 2026-03-23

### Moved from PLANS.md

- Completed Plan — Dashboard week blocks cleanup (vertical stack + Monday week start) (2026-03-23)

## Completed Plan — Dashboard week blocks cleanup (vertical stack + Monday week start) (2026-03-23)

### Objective

Increase weekly planning readability on `/` by stacking weekly blocks vertically and switching week semantics to calendar week (`Пн..Вс`).

### Delivered

- `DashboardService` week window anchor changed from rolling `today+6` to Monday-based calendar week:
  - new helper `startOfLocalWeekMonday(...)`,
  - `buildWeekDays(...)` now starts from local Monday.
- Dashboard weekly section layout changed from `split-grid` to single-column `week-stack`.
- Weekly tables now use dedicated non-scrolling wrapper (`week-table-wrap`) and fixed table layout:
  - removed wide `min-width` behavior for week tables,
  - enabled wrapping for weekly cell metadata to keep columns readable.
- Tests updated:
  - `tests/dashboardService.test.js` now asserts Monday-first weekly header and monotonic day sequence,
  - `tests/http.test.js` now asserts weekly stack/layout markers in rendered dashboard HTML.

### Verification

- `npm run lint`: passed
- `npm test -- tests/dashboardService.test.js tests/http.test.js`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed

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
- 2026-03-22 — AUT-18 recheck and self-contained verification gate hardening
- 2026-03-22 — Bloat audit execution (`AUT-55..AUT-60`)
- 2026-03-22 — Phase 2 lifecycle core (`AUT-61..AUT-69`)
- 2026-03-22 — Spring cleanup wave (`AUT-82..AUT-88`)
- 2026-03-22 — Phase 3 parts flow (`AUT-73..AUT-81`)
- 2026-03-23 — Dispatch board UX simplification (calendar-only controls)
- 2026-03-23 — Foundation hardening (`AUT-89..AUT-96`)

## Archive Batch — 2026-03-24

### Moved from PLANS.md

- Completed Plan — Deterministic Render verify on new commit only (2026-03-24)

## Completed Plan — Deterministic Render verify on new commit only (2026-03-24)

### Objective

Eliminate wasted first-pass Render verification against stale live commit by enforcing strict deploy readiness and manual deploy service policy.

### Delivered

- Added deploy-mode preflight module `scripts/render-verify-preflight.js` with testable checks for:
  - clean worktree gating,
  - expected commit parity with local `HEAD`,
  - expected commit sync with `origin/main` (configurable remote/branch),
  - strict Render manual deploy policy (`autoDeploy` off + `autoDeployTrigger` off).
- Integrated preflight into `scripts/verify-render.js` before deploy trigger:
  - new structured steps/logs: `git_preflight`, `render_service_policy_check`, `render_verify_preflight_passed`, `render_verify_preflight_failed`,
  - deploy API trigger is skipped when preflight fails,
  - `--skip-deploy` now emits explicit skipped-step logs for deploy-specific preflight.
- Added Render service policy utility `scripts/render-service-policy.js` with one-command operations:
  - `npm run render:policy:status`,
  - `npm run render:policy:manual-deploy`.
- Added strict preflight defaults and toggles:
  - `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE`,
  - `RENDER_VERIFY_REQUIRE_REMOTE_SYNC`,
  - `RENDER_VERIFY_REQUIRE_MANUAL_DEPLOY`,
  - `RENDER_GIT_REMOTE`,
  - `RENDER_GIT_BRANCH`.
- Added infrastructure default in `render.yaml`: `autoDeployTrigger: off`.
- Added unit tests: `tests/renderVerifyPreflight.test.js`.
- Updated deployment documentation:
  - `README.md`,
  - `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`,
  - `docs/20_ENVIRONMENT_DEPLOYMENT_AND_OPERATIONS.md`.

### Verification

- `npm test`: passed
- `npm run lint`: passed
- `npm run verify`: passed
- `npm run secrets:scan`: passed
- `npm run audit:bloat`: passed
- `npm run render:policy:status`: passed (confirmed policy state)
- `npm run render:policy:manual-deploy`: passed (service policy remediated to manual deploy)
- `npm run verify:render`: failed fast as expected on dirty worktree preflight (no deploy trigger)
- `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE=0 npm run verify:render`: passed
  - deploy id: `dep-d70r6ac9c44c73b7h07g`
  - commit parity: `d73af5315c419cbcf30c474825e609b8f68d6623`
  - smoke + non-destructive scenarios + post-deploy log audit: passed
- Playwright production smoke on `/dispatch/board`: passed (title/content loaded, console warnings/errors: 0)

