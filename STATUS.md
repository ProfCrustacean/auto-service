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

Dispatch board full vertical-calendar migration is delivered and verified; next priority remains Phase 4 (payments and reporting closure).

## Current state (2026-03-23)

### Product/runtime
- Dispatch board is fully migrated to EventCalendar (`@event-calendar/build@5.5.1`) with owner-focused calendar-only controls:
  - vertical `resourceTimeGridDay` view (time top-to-bottom, resources as lanes),
  - removed top metric strips and removed bottom manual control panel,
  - queue scheduling is drag-and-drop into calendar only,
  - existing booking move/resize is calendar-native only,
  - dispatch writes now use API-only routes under `/api/v1/dispatch/board/*`.
- Phase 1 scheduling/intake remains fully implemented:
  - employee/bay/customer/vehicle APIs,
  - appointment lifecycle with deterministic capacity checks,
  - walk-in intake API + production pages,
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

### Harness/operations
- Local gate is self-contained: `npm run verify` (tests + smoke + booking/walk-in/scheduling + parts-flow scenarios).
- Deploy-aware gate exists and is green: `npm run verify:render` (deploy, commit parity, smoke, scenarios including dispatch board, log audit).
- Authorization boundary is unified across API/page write routes using `src/http/mutationPolicy.js`.
- Render verify deploy mode is explicit and deterministic via CLI flags (`--skip-deploy` / `--deploy`) with CLI-over-env precedence.
- Harness internals now share process orchestration helpers via `scripts/harness-process.js`.
- Static/hygiene guardrails are enforceable via:
  - `npm run lint` (route policy + syntax contract checks),
  - `npm run hygiene:check` (branch and tracked-artifact hygiene policy),
  - `npm run db:backup-drill` (backup/restore drill script).
- Spring cleanup tooling is now available:
  - `npm run cleanup:spring` (dry-run)
  - `npm run cleanup:spring:apply` (tracked/untracked evidence pruning)
  - canonical tracked evidence policy in `data/hygiene/evidence-canonical.json`
- Linear harness supports probe/create/sync via Playwright fallback:
  - `npm run linear:probe`
  - `npm run linear:create`
  - `npm run linear:sync`

## Last accepted milestones

- 2026-03-23: Dispatch board owner-focused simplification delivered and deployed (`ea3ca989dee8362ceadd3882a1c08bdc2da39da2`, runtime fix on top `3945ce76b7667ee5ecccaabee04b235eeb3eabf4`).
- 2026-03-23: Dispatch board full EventCalendar cutover delivered and deployed (`c9a1ebeb35a5ab81121f7b65e7f911b9f669792a` on latest verified deploy; feature payload introduced in `a885874c7d0e7546769eb3b5cda074853f4252d5`).
- 2026-03-22: Phase 2 lifecycle core epic completed (`AUT-61..AUT-69`) and synced to Done.
- 2026-03-22: Bloat audit closure (`AUT-55..AUT-60`) implemented and synced to Done.
- 2026-03-22: Phase 3 parts-flow epic implemented and deployed (`AUT-73..AUT-81`), verification gates green.
- 2026-03-22: Spring cleanup wave executed (`AUT-82..AUT-88`) with canonical evidence retention and harness CLI hardening.
- 2026-03-23: Foundation hardening epic completed (`AUT-89..AUT-96`) and synced to Done.

## Verification snapshot

Most recent local gate results:
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: failed (pre-existing area budget overruns in `src/tests/scripts`)
- `npm run lint`: passed
- `npm run secrets:scan`: passed

Most recent deploy-aware gate results:
- `npm run verify:render`: passed
  - deploy id: `dep-d70mt21r0fns73elrchg`
  - commit parity: passed (`c9a1ebeb35a5ab81121f7b65e7f911b9f669792a`)
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow, dispatch-board): passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

Primary evidence pointers:
- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`
- `evidence/linear-aut73-81-done-sync.json`
- Linear sync audit (AUT-89..AUT-96): `/tmp/linear-aut89-96-sync-result.json`

## Environments

### local-dev
- URL: `http://127.0.0.1:3000`
- status: healthy via `npm run verify`
- caveat: single-node SQLite file model

### render-validation
- URL: `https://auto-service-foundation.onrender.com`
- service id: `srv-d6vcmt7diees73d0j04g`
- status: deploy + smoke + scenario + log-audit gates green on latest verified run
- caveat: app-level persistence is local SQLite file per instance

## Known caveats

- Render API access can require `--resolve` fallback from this local environment; harness already supports this path.
- Token auth remains baseline-level (no IdP/session/rotation service yet).
- SQLite remains single-node file persistence.
- `audit:bloat` is currently red because existing area budgets (`src/tests/scripts`) are below current repository footprint.

## Active work focus

1. Plan and execute Phase 4 payment flow and reporting closure.
2. Keep baseline gates green (`npm test`, `npm run verify`, `npm run audit:bloat`).
3. Keep Render deploy verification green (`npm run verify:render`) for milestone commits.
4. Keep Linear states and repository status/plans synchronized per completed slice.

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
