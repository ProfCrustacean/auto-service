# PLANS.md

## Purpose

Hot-path execution plan file for current non-trivial work.

Historical completed plans live in `PLANS_ARCHIVE.md`.

## Active Plan — None

No active multi-step implementation plan is open right now.

Create a new active plan before the next non-trivial feature/refactor/deployment slice.

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
- 2026-03-23 — Dispatch board full EventCalendar cutover
- 2026-03-23 — Dispatch board DnD/readability hardening + global overlap warnings
- 2026-03-23 — Dashboard week blocks cleanup (vertical stack + Monday week start)

## Completed Plan — Render log selectivity + request log noise control (2026-03-24)

### Objective

Reduce Render log ingestion volume and improve signal quality by combining source-side request log gating with balanced post-deploy log-audit fetching.

### Delivered

- Added app request log policy:
  - `APP_REQUEST_LOG_MODE=all|mutations|errors`
  - production default is reduced-noise (`errors`), non-production default remains `all`.
- Added balanced Render log-audit mode in `verify:render`:
  - `RENDER_LOG_AUDIT_MODE=balanced|minimal|full` (`balanced` default),
  - `RENDER_LOG_AUDIT_INITIAL_LIMIT` for first-pass fetch cap,
  - first-pass narrow fetch + auto-escalation only on warning/error/truncation/repo-access signals.
- Updated log-audit summary contract with fetch metadata:
  - `mode`, `escalated`, `fetch.initialLimit`, `fetch.rowsFetchedInitial`, `fetch.rowsFetchedExpanded`.
- Added request-log behavior tests for `errors` and `mutations` modes.
- Updated runbook/README/STATUS for new logging controls.

### Verification

- `npm run lint`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render -- --skip-deploy`: passed
- `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE=0 npm run verify:render`: passed
  - deploy id: `dep-d70sgq95pdvs739hsk70`
  - commit parity: `3526d2e9f1cbfa44c6b11eb0a31528461525af0f`
  - post-deploy log audit in balanced mode: passed (`rowsFetchedInitial=78`, `escalated=false`)

## Completed Plan — Internal refactor wave (no contract changes) (2026-03-24)

### Objective

Reduce coupling/duplication in hot-path `services/http/ui/scripts` while keeping API/page/CLI behavior stable.

### Delivered

- Dashboard decomposition:
  - `DashboardService` converted to thin orchestrator,
  - projections moved to `src/services/dashboard/{today,week,dispatch,search}Projection.js`,
  - shared date/window helpers moved to `src/services/dashboard/timeUtils.js`.
- Validator dedupe:
  - shared primitives in `src/http/validatorUtils.js` adopted across appointment/work-order/walk-in/reference/customer-vehicle validators.
- Dispatch HTTP dedupe:
  - shared dispatch mutation pipeline extracted to `src/http/dispatchBoardRouteFactory.js`,
  - `dispatchBoardPageRoutes.js` reduced to route wiring + page/api read endpoints.
- Dispatch UI split:
  - `src/ui/dispatchBoardPageTemplate.js` (template),
  - `src/ui/dispatchBoardPageStyles.js` (style contract),
  - `src/ui/dispatchBoardPageClient.js` (client-side interaction),
  - `src/ui/dispatchBoardPage.js` now wrapper-only entrypoint.
- `verify-render` modular split:
  - `scripts/render-verify/config.js`,
  - `scripts/render-verify/api.js`,
  - `scripts/render-verify/deployFlow.js`,
  - `scripts/render-verify/scenarioFlow.js`,
  - `scripts/render-verify/logAuditFlow.js`.

### Verification

- `npm run lint`: passed
- targeted parity suites for dashboard/dispatch/render-preflight: passed
- full gate reruns pending final wave closure in this slice (`npm test`, `npm run verify`, `npm run audit:bloat`, `npm run verify:render -- --skip-deploy`)

## Completed Plan — Aggressive noise cleanup (scripts/tests/logging surface) (2026-03-24)

### Objective

Reduce operational noise and maintenance drag by removing dead UI routes, collapsing duplicated page scenarios, and switching harness output to summary-first defaults without breaking working API contracts.

### Delivered

- Removed legacy walk-in page route registration (`/intake/walk-in` now falls back to standard `404`).
- Unified duplicated booking/walk-in page scenarios into one runner:
  - `scripts/intake-page-scenario.js --mode booking|walkin`
  - removed `scripts/booking-page-scenario.js` and `scripts/walkin-page-scenario.js`.
- Updated `verify` and `verify:render` to use unified intake scenarios and summary-first logging:
  - default `HARNESS_LOG_LEVEL=summary`,
  - verbose logs via `HARNESS_LOG_LEVEL=verbose`,
  - minimal artifact mode by default (`HARNESS_ARTIFACTS=minimal`).
- Simplified Linear harness transport surface to `playwright`-only.
- Reduced duplicate test bootstrap patterns and removed redundant unit-only route primitive/mapper tests in favor of existing higher-level API coverage.

### Verification

- `npm run lint`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
