# PLANS.md

## Purpose

Hot-path execution plan file for current non-trivial work.

Historical completed plans live in `PLANS_ARCHIVE.md`.

## Active Plan — None

No active multi-step implementation plan is open right now.

Create a new active plan before the next non-trivial feature/refactor/deployment slice.

Most recent completed non-trivial slice:
- 2026-03-25 — Phase 4 deploy-mode Render QA/fix loop (`phase4-render-deploy-qa-fix`) completed:
  - task initialized and frozen in `.agent/tasks/phase4-render-deploy-qa-fix/`,
  - full local QA gate passed (`secrets`, `lint`, `hygiene`, `test`, `verify`, `audit:bloat`),
  - deploy-mode Render verification passed (`npm run verify:render -- --deploy`),
  - deploy id: `dep-d71j32f5gffc73fstq10`,
  - deploy commit parity passed for `318516b63efeb8db1ad4ac79082acab53bd9205d`,
  - smoke + non-destructive scenario checks passed and post-deploy log audit passed (`warn=0`, `error=0`, `repoAccessWarning=0`),
  - no additional code fixes were required in this QA pass.
- 2026-03-25 — Phase 4 end-to-end baseline (`phase4-e2e-implementation`) delivered:
  - persistence migration `010` adds `work_order_payments` plus `labor_total_rub` / `outside_service_cost_rub`,
  - payment flow implemented across service/API/UI (`/api/v1/work-orders/:id/payments`, `/work-orders/:id/payments`),
  - reporting API and dashboard financial section implemented (`/api/v1/reports/operations`),
  - bloat governance tuned to Phase 4 baseline footprint (`data/bloat/budgets.json`: `src=528000`, `tests=162500`) with docs/README budgets still enforced,
  - proof-loop artifacts updated under `.agent/tasks/phase4-e2e-implementation/`,
  - verification commands passed: `npm run lint`, `npm test`, `npm run verify`, `npm run hygiene:check`, `npm run secrets:scan`, `npm run audit:bloat`, `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE=0 npm run verify:render -- --skip-deploy`.
- 2026-03-24 — Repo task proof-loop bootstrap (`proof-loop-bootstrap`) initialized and validated:
  - task artifacts seeded under `.agent/tasks/proof-loop-bootstrap/`,
  - project-scoped subagent templates installed/refreshed under `.codex/agents/` and `.claude/agents/`,
  - managed workflow guidance block upserted in `AGENTS.md` and created in `CLAUDE.md`,
  - validation commands: `task_loop.py validate --task-id proof-loop-bootstrap`, `task_loop.py status --task-id proof-loop-bootstrap`.

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
- 2026-03-24 — Deterministic Render verify on new commit only
- 2026-03-24 — Dispatch board reverse DnD unassign flow
- 2026-03-24 — Pico UI baseline rollout + production verification (`AUT-120..AUT-132`)
- 2026-03-24 — Honest bloat remediation (return helper ownership to scripts/tests + direct LOC/byte reduction)
- 2026-03-24 — Unified dashboard queues table + production deploy verification
- 2026-03-24 — Dashboard day-load no-scroll/date-label UX patch + deploy verification
- 2026-03-25 — Phase 4 end-to-end baseline implementation (`phase4-e2e-implementation`)
- 2026-03-25 — Phase 4 deploy-mode Render QA/fix loop (`phase4-render-deploy-qa-fix`)
- 2026-03-24 — Repo task proof-loop bootstrap initialization (`proof-loop-bootstrap`)

## Completed Plan — Linear harness simplification: Playwright-only full rewrite (2026-03-24)

### Objective

Replace the legacy multi-command/transport Linear harness with one deterministic Playwright-only command surface and keep repository docs/status/tests synchronized.

### Delivered

- Rebuilt Linear harness into focused modules:
  - `scripts/linear-harness.js` as thin entrypoint,
  - `scripts/linear-harness-cli.js` for strict CLI/env contract parsing,
  - `scripts/linear-harness-apply.js` for single-pass apply orchestration,
  - `scripts/linear-harness-playwright-transport.js` for strict Playwright transport.
- Replaced package command surface:
  - removed `linear:probe`, `linear:create`, `linear:sync`,
  - added `linear:apply` only.
- Enforced strict legacy rejection with machine-readable failure payloads:
  - rejected legacy commands (`probe/create/sync`),
  - rejected `--transport`,
  - rejected legacy env defaults (`LINEAR_TRANSPORT`, `LINEAR_TEAM_KEY`, `LINEAR_STATE_NAME`, `LINEAR_OUTPUT_PATH`, `LINEAR_ISSUES_LIMIT`).
- Kept spec schema and idempotent normalized-title matching.
- Implemented single-pass `apply` behavior:
  - create missing issues,
  - transition existing issues to target state,
  - no-op issues already in target state,
  - auto-create missing labels for new issues.
- Kept dry-run symmetry (`--dry-run`) with deterministic summary and zero mutations.
- Switched to strict Playwright CLI resolution:
  - `LINEAR_PLAYWRIGHT_CLI` override or bundled wrapper only,
  - removed `npx` fallback.
- Added one critical rewrite-focused test:
  - deterministic/idempotent apply orchestration test with mocked transport (`tests/linearHarnessApply.test.js`).
- Updated operational docs/state pointers:
  - `README.md`,
  - `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`,
  - `MASTER_CONTEXT_PACKET.md`,
  - `STATUS.md`.

### Verification

- `npm run lint`: passed
- `npm test`: passed
- `npm run verify`: passed

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
