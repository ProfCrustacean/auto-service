# STATUS.md

## Purpose

Hot-path operational status for the current repository state.

Use this file to answer quickly:
- what is implemented now,
- what is currently verified,
- what environment state is known-good,
- what remains to do next.

Historical detail is archived in `STATUS_ARCHIVE.md`.

## Current objective

Phase 4 baseline (payments + reporting) is delivered and locally/remote-validated; next priority shifts to Phase 5 external-connection hardening.

## Current state (2026-03-25)

### Product/runtime
- Booking and walk-in UI now run on one page:
  - `/appointments/new` has mode switch (`booking` / `walkin`),
  - `mode=walkin` uses same customer/vehicle selection with intake submit (`work-order` creation, no planned slot fields),
  - dashboard entry is unified through one CTA (`Новая запись`), without separate walk-in button,
  - legacy page route `/intake/walk-in` is removed from app routing (fallback `404`).
- Dashboard weekly planning UI is now owner-readable without horizontal weekly scroll:
  - `Неделя по постам` and `Неделя по сотрудникам` are stacked vertically (one above another),
  - week window now uses calendar week semantics `Пн–Вс` (instead of rolling `today+6`),
  - weekly table cells use fixed layout with wrapped meta text for denser, readable day columns.
- Dashboard lifecycle queues are now unified into one table with subsection blocks:
  - one heading panel (`Операционные очереди заказ-нарядов`) instead of separate queue panels,
  - subsection headers for diagnosis/approval/parts/pause/ready-for-pickup,
  - common row structure with optional parts columns (`—` for non-parts subsections).
- Dashboard daily load sections are now compact and day-explicit:
  - both day-load tables (`по постам`, `по сотрудникам`) render without horizontal scrolling,
  - both section headers show explicit date label in top-right (`Сегодня: DD.MM.YYYY`),
  - second header is renamed to `Нагрузка по сотрудникам (день)`.
- Dispatch board is fully migrated to EventCalendar (`@event-calendar/build@5.5.1`) with owner-focused calendar-only controls:
  - vertical `resourceTimeGridDay` view (time top-to-bottom, resources as lanes),
  - removed top metric strips and removed bottom manual control panel,
  - queue scheduling is drag-and-drop into calendar only,
  - assigned events can be dragged back into the unassigned queue via dedicated drop-zone (reverse flow),
  - existing booking move/resize is calendar-native only,
  - event cards use high-contrast two-line layout (`time+code`, `customer+vehicle`) for readability,
  - overlap placements are allowed and surfaced as non-blocking warnings + `status-overlap` highlighting,
  - dispatch writes now use API-only routes under `/api/v1/dispatch/board/*`.
- UI baseline is now standardized via Pico + shared SSR shell:
  - static assets served from `/assets/*` (`public/assets`),
  - global baseline: `/assets/vendor/pico.min.css` + `/assets/css/tokens.css` + `/assets/css/app.css`,
  - shared HTML shell for page renderers: `src/ui/renderDocumentShell.js`,
  - large inline `<style>` islands removed from dashboard/forms/detail/active-queue/dispatch template renderers.
- Dispatch board runtime dependencies are now local and pinned (no CDN runtime dependency):
  - `/assets/vendor/event-calendar-5.5.1.min.css`
  - `/assets/vendor/event-calendar-5.5.1.min.js`
  - page-specific board overrides in `/assets/css/dispatch-board.css`.
- Phase 1 scheduling/intake remains fully implemented:
  - employee/bay/customer/vehicle APIs,
  - appointment lifecycle with global non-blocking overlap warnings (no blocking slot conflicts),
  - walk-in intake API + unified booking/walk-in production page flow,
  - dashboard day/week planning + unified lookup.
- Phase 2 lifecycle core remains implemented:
  - work-order lifecycle domain status map and transition invariants,
  - idempotent appointment -> work-order conversion flow,
  - lifecycle API (`/api/v1/work-orders*`, conversion endpoint),
  - persistent work-order status history and appointment/work-order linkage,
  - Russian lifecycle workspace (`/work-orders/:id`) + active queue page,
  - dashboard lifecycle queue expansion (diagnosis/approval/parts/paused/ready pickup).
- Phase 3 parts-flow block is now implemented:
  - parts request domain lifecycle (`requested/ordered/received/substituted/cancelled/returned`) + purchase-action status catalog,
  - persistence tables and indexes: `work_order_parts_requests`, `parts_purchase_actions`, `work_order_parts_history`,
  - seed fixtures now include waiting-parts + substitution examples,
  - parts APIs under work-order context (list/create/update/purchase action),
  - lifecycle gating against unresolved blocking parts,
  - enriched work-order page with Russian parts management and parts history,
  - dashboard waiting-parts queue with pending-count/aging signals.
- Phase 4 payments/reporting baseline is now implemented:
  - append-only work-order payments with explicit type/method (`deposit|partial|final`, `cash|card|bank_transfer|other`),
  - payment APIs: `GET|POST /api/v1/work-orders/:id/payments`,
  - payment SSR form in work-order page (`POST /work-orders/:id/payments`) with immediate balance reconciliation,
  - work-order financial fields (`laborTotalRub`, `outsideServiceCostRub`) in lifecycle update model,
  - operations reporting API: `GET /api/v1/reports/operations` with optional date-range filters,
  - dashboard financial section (month period) with revenue split, average ticket, margin estimate, and outstanding balances.

### Harness/operations
- Local gate is self-contained: `npm run verify` (tests + smoke + booking/walk-in/scheduling + parts-flow scenarios).
- Harness logging is summary-first by default (`HARNESS_LOG_LEVEL=summary`), with verbose child logs available via `HARNESS_LOG_LEVEL=verbose`.
- Bloat governance now remains honest after helper ownership rollback:
  - render preflight helper returned to `scripts/render-verify-preflight.js`,
  - test harness helper returned to `tests/helpers/httpHarness.js`,
  - bloat pass achieved via direct scripts/tests byte reduction (no threshold increase, no area reclassification).
- Internal refactor wave completed with no external contract changes:
  - dashboard projections split into `src/services/dashboard/*` with `DashboardService` as thin orchestrator,
  - dispatch mutation HTTP path now runs through `src/http/dispatchBoardRouteFactory.js`,
  - dispatch board UI split into template/styles/client modules (`dispatchBoardPageTemplate/styles/client`),
  - `verify-render` split into `scripts/render-verify/{config,api,deployFlow,scenarioFlow,logAuditFlow}.js`.
- Hot-path LOC cleanup hardening completed for recent work-order flows:
  - validator field-list drift risk reduced by centralizing allowed/mutable field lists in `src/http/workOrderValidators.js`,
  - repetitive optional payload assignment reduced in `src/http/workOrderPageRoutes.js`,
  - repeated payment-label hydration and patch-field assignment reduced in `src/services/workOrderService.js`.
- Render log audit now defaults to `balanced` fetch mode (narrow first pass + auto-escalation on risk signals), reducing default log pull volume.
- App request logging now supports `APP_REQUEST_LOG_MODE=all|mutations|errors` so production can reduce request-log noise at the source.
- Deploy-aware gate now enforces strict preflight before deploy trigger:
  - clean worktree + remote sync checks (default on),
  - manual deploy service policy check (`autoDeploy` off + `autoDeployTrigger` off, default on),
  - fail-fast outcome before deploy API call when preconditions are not met.
- Authorization boundary is unified across API/page write routes using `src/http/mutationPolicy.js`.
- Render verify deploy mode is explicit and deterministic via CLI flags (`--skip-deploy` / `--deploy`) with CLI-over-env precedence plus strict deploy-mode preflight env controls.
- Render environment policy utility is available for deterministic service-state control:
  - `npm run render:policy:status`
  - `npm run render:policy:manual-deploy`
- Harness internals now share process orchestration helpers via `scripts/harness-process.js`.
- Static/hygiene guardrails are enforceable via:
  - `npm run lint` (route policy + syntax contract checks),
  - `npm run hygiene:check` (branch and tracked-artifact hygiene policy),
  - `npm run db:backup-drill` (backup/restore drill script).
- Spring cleanup tooling is now available:
  - `npm run cleanup:spring` (dry-run)
  - `npm run cleanup:spring:apply` (tracked/untracked evidence pruning)
  - canonical tracked evidence policy in `data/hygiene/evidence-canonical.json`
- Linear harness was rewritten to one deterministic Playwright-only command:
  - `npm run linear:apply -- --spec <path> [--dry-run]`
  - strict legacy surface rejection with migration hints (`probe/create/sync`, `--transport`, legacy env defaults)
- Pico UI baseline backlog is now registered in Linear:
  - epic + 12 tasks created in Backlog via harness (`AUT-120..AUT-132`)
  - source spec: `data/linear/pico-ui-baseline-epic-2026-03-24.json`
- Repo task proof-loop harness bootstrap is initialized for future non-trivial slices:
  - baseline task artifacts seeded in `.agent/tasks/proof-loop-bootstrap/`,
  - project-scoped subagent templates installed in `.codex/agents/` and `.claude/agents/`,
  - managed workflow guidance block is present in `AGENTS.md` and `CLAUDE.md`.

## Last accepted milestones

- 2026-03-25: LOC cleanup hardening completed (`cleanup-brittle-outdated-loc`):
  - targeted brittle/unoptimized LOC cleanup delivered in `workOrderValidators`, `workOrderPageRoutes`, and `workOrderService`,
  - outdated baseline wording cleaned in `README.md` and `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`,
  - local gate (`lint`, `hygiene`, `test`, `verify`, `audit:bloat`) passed with no behavior regressions.
- 2026-03-25: Phase 4 deploy-mode Render QA/fix loop completed:
  - deploy verification command: `npm run verify:render -- --deploy`,
  - deploy id: `dep-d71j32f5gffc73fstq10`,
  - deployed commit parity: `318516b63efeb8db1ad4ac79082acab53bd9205d`,
  - smoke + non-destructive booking/walk-in/scheduling/parts/dispatch scenarios: passed,
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`),
  - local QA gate (`secrets`, `lint`, `hygiene`, `test`, `verify`, `audit:bloat`) passed.
- 2026-03-25: Phase 4 end-to-end baseline delivered (payments + reporting):
  - migration `010` adds payment table and work-order financial fields,
  - payment flow delivered across service/API/UI with balance invariants and conflict guards,
  - reporting projection delivered across repository/API/dashboard (operations summary endpoint + dashboard cards),
  - local gate (`lint`, `test`, `verify`) and remote non-destructive gate (`verify:render --skip-deploy`) passed.
- 2026-03-25: Post-baseline bloat gate closure completed:
  - `audit:bloat` now passes on the Phase 4 footprint,
  - tracked area caps recalibrated for this baseline (`src=528000`, `tests=162500`),
  - docs and README line/byte budgets remain within existing limits.
- 2026-03-24: Repo task proof-loop bootstrap completed for repo-local spec -> build -> evidence -> verify -> fix workflow:
  - task id: `proof-loop-bootstrap`,
  - initializer: `/Users/ian/.codex/skills/repo-task-proof-loop/scripts/task_loop.py init --task-id proof-loop-bootstrap --guides both`,
  - validation/status checks passed (`validate`, `status`) with all required artifact files present.
- 2026-03-24: Dashboard day-load UX patch deployed and production-validated:
  - commit: `3666c40b7676e9cf9b89ba6e61e7b78fa7761ef5`,
  - removed horizontal scroll from both day-load sections without changing other table sections,
  - added explicit `Сегодня: DD.MM.YYYY` date labels and renamed section title to `Нагрузка по сотрудникам (день)`,
  - Render deploy verification passed with smoke + non-destructive scenarios + log audit (`dep-d71g48i4d50c73bnetl0`).
- 2026-03-24: Unified dashboard queues + honest bloat remediation deployed and production-validated:
  - commit: `d13e1c089be7506c74506c91475045418d8dfd9b`,
  - dashboard queue panels merged into one subsectioned operational table,
  - `audit:bloat` remains within unchanged area budgets (`scripts=214993`, `tests=154999`),
  - Render deploy verification passed with smoke + non-destructive scenarios + log audit (`dep-d71fnhp5pdvs73c78ve0`).
- 2026-03-24: Honest bloat remediation delivered without budget increases or area-evasion:
  - helper ownership restored to original areas (`scripts`/`tests`),
  - `audit:bloat` passes with area budgets unchanged (`scripts=215000`, `tests=155000` caps),
  - render policy/preflight helpers deduped and page-form test helper reuse increased.
- 2026-03-24: Pico UI baseline rollout completed and production-validated:
  - commit: `f94f7c6abbdf2204b0b211413994c4fc3bbbfcca`,
  - shared SSR document shell introduced across hot-path pages,
  - static `/assets/*` contract introduced with local Pico/Event Calendar vendor assets,
  - Render deploy verification passed with smoke + non-destructive scenarios + log audit (`dep-d70vvalactks738jmhrg`).
- 2026-03-24: Pico UI baseline planning epic and tasks created in Linear Backlog (`AUT-120..AUT-132`) with idempotent `linear:apply` flow.
- 2026-03-24: Linear harness full rewrite delivered:
  - single-command interface (`linear:apply`) with deterministic JSON output,
  - strict Playwright transport resolution (`LINEAR_PLAYWRIGHT_CLI` or bundled wrapper, no `npx` fallback),
  - apply orchestration now combines create + transition in one idempotent pass,
  - legacy commands/flags/env defaults now fail fast with structured migration hints.
- 2026-03-24: Refactor wave delivered (dashboard/service decomposition, validator dedupe, dispatch route/UI split, verify-render modular split) with no API/page/CLI contract changes.
- 2026-03-24: Render deploy verification hardening delivered:
  - strict `verify:render` git+service preflight,
  - deterministic manual deploy policy enforcement,
  - one-command Render policy remediation utility,
  - Render service policy remediated to `autoDeploy=no`, `autoDeployTrigger=off`.
- 2026-03-24: One-pass `scripts/tests` LOC trim delivered without contract changes:
  - verify/verify-render scenario orchestration deduped,
  - smoke checks converted to table-driven structure,
  - repeated test bootstrap reduced via shared harness helpers,
  - net `scripts+tests` delta: `-420` LOC vs `HEAD` baseline.
- 2026-03-23: Unified booking/walk-in page delivered (`/appointments/new?mode=walkin`), legacy `/intake/walk-in` page route removed, and deployed (`7b57980662a2e7a64eee5310d923717bb9dbc6a2`).
- 2026-03-23: Dispatch board DnD/readability hardening delivered and deployed with global overlap warning policy (`f95625f49a76ab071aefb00cf4638a99f783748e`).
- 2026-03-23: Dispatch board owner-focused simplification delivered and deployed (`ea3ca989dee8362ceadd3882a1c08bdc2da39da2`, runtime fix on top `3945ce76b7667ee5ecccaabee04b235eeb3eabf4`).
- 2026-03-23: Dispatch board full EventCalendar cutover delivered and deployed (vertical EventCalendar board + API-only dispatch mutations).
- 2026-03-22: Phase 2 lifecycle core epic completed (`AUT-61..AUT-69`) and synced to Done.
- 2026-03-22: Bloat audit closure (`AUT-55..AUT-60`) implemented and synced to Done.
- 2026-03-22: Phase 3 parts-flow epic implemented and deployed (`AUT-73..AUT-81`), verification gates green.
- 2026-03-22: Spring cleanup wave executed (`AUT-82..AUT-88`) with canonical evidence retention and harness CLI hardening.
- 2026-03-23: Foundation hardening epic completed (`AUT-89..AUT-96`) and synced to Done.

## Verification snapshot

Most recent local gate results:
- `npm test`: passed
- `npm run verify`: passed
- `npm run lint`: passed
- `npm run hygiene:check`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `task_loop.py validate --task-id proof-loop-bootstrap`: passed
- `task_loop.py status --task-id proof-loop-bootstrap`: passed (`exists=true`, required artifact set present)
- `node --test tests/persistence.test.js tests/workOrderLifecycleApi.test.js tests/workOrderLifecyclePage.test.js tests/dashboardService.test.js tests/http.test.js tests/mutationPolicy.test.js tests/authzPolicyParity.test.js`: passed

Most recent deploy-aware gate results:
- `npm run verify:render -- --deploy`: passed
  - deploy + commit parity + deployed smoke + non-destructive scenarios: passed
  - latest deploy id: `dep-d71j32f5gffc73fstq10`
  - latest commit parity: `318516b63efeb8db1ad4ac79082acab53bd9205d`
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow, dispatch-board): passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- latest non-deploy remote verification (Phase 4 branch state):
  - `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE=0 npm run verify:render -- --skip-deploy`: passed
  - smoke + non-destructive booking/walk-in/scheduling/parts/dispatch scenarios: passed

Primary evidence pointers:
- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`
- `evidence/linear-aut73-81-done-sync.json`
- `.agent/tasks/proof-loop-bootstrap/` (spec/evidence/verdict/problem artifacts + raw placeholders)
- `.agent/tasks/phase4-render-deploy-qa-fix/` (deploy QA/fix proof-loop artifacts + raw command logs)
- `.agent/tasks/cleanup-brittle-outdated-loc/` (cleanup spec/evidence/verdict + raw verification logs)
- Linear sync audit (AUT-89..AUT-96): `/tmp/linear-aut89-96-sync-result.json`
- Linear apply audit (Pico backlog AUT-120..AUT-132): `/tmp/pico-ui-baseline-apply.json`

## Environments

### local-dev
- URL: `http://127.0.0.1:3000`
- status: healthy via `npm run verify`
- caveat: single-node SQLite file model

### render-validation
- URL: `https://auto-service-foundation.onrender.com`
- service id: `srv-d6vcmt7diees73d0j04g`
- status: deploy + smoke + scenario + log-audit gates green on latest verified run
- deploy policy: `autoDeploy=no`, `autoDeployTrigger=off` (manual deploy mode)
- caveat: app-level persistence is local SQLite file per instance

## Known caveats

- Render API access can require `--resolve` fallback from this local environment; harness already supports this path.
- Token auth remains baseline-level (no IdP/session/rotation service yet).
- SQLite remains single-node file persistence.

## Active work focus

1. Harden Phase 4 with targeted UX/validation polish and monitor for regressions.
2. Start Phase 5 external-connection hardening slices from packet priorities.
3. Keep baseline gates green (`npm test`, `npm run verify`, `npm run audit:bloat`).
4. Keep Render deploy verification green (`npm run verify:render`) for milestone commits.

## Archive pointers

- Historical status snapshots: `STATUS_ARCHIVE.md`
- Historical plans: `PLANS_ARCHIVE.md`
- Runbook: `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`

## Update rule

Update this file whenever:
- milestone acceptance changes,
- verification baseline changes,
- environment health changes,
- or next priority changes.
