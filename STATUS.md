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

Spring cleanup wave is delivered and verified; next priority is Phase 4 (payments and reporting closure).

## Current state (2026-03-22)

### Product/runtime
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
- Deploy-aware gate exists and is green: `npm run verify:render` (deploy, commit parity, smoke, scenarios including parts-flow, log audit).
- Spring cleanup tooling is now available:
  - `npm run cleanup:spring` (dry-run)
  - `npm run cleanup:spring:apply` (tracked/untracked evidence pruning)
  - canonical tracked evidence policy in `data/hygiene/evidence-canonical.json`
- Linear harness supports probe/create/sync via Playwright fallback:
  - `npm run linear:probe`
  - `npm run linear:create`
  - `npm run linear:sync`

## Last accepted milestones

- 2026-03-22: Phase 2 lifecycle core epic completed (`AUT-61..AUT-69`) and synced to Done.
- 2026-03-22: Bloat audit closure (`AUT-55..AUT-60`) implemented and synced to Done.
- 2026-03-22: Phase 3 parts-flow epic implemented and deployed (`AUT-73..AUT-81`), verification gates green.
- 2026-03-22: Spring cleanup wave executed (`AUT-82..AUT-88`) with canonical evidence retention and harness CLI hardening.

## Verification snapshot

Most recent local gate results:
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed

Most recent deploy-aware gate results:
- `npm run verify:render -- --skip-deploy`: passed
  - explicit CLI skip mode confirmed (`skipDeploy=true`, deploy/parity/log-audit steps skipped by design)
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow): passed
- `npm run verify:render -- --deploy`: passed
  - deploy id: `dep-d707i3sr85hc73dqa3tg`
  - commit parity: passed (`1ec6e8f5b30a825e762967f556c30ff2ec18e271`)
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow): passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

Primary evidence pointers:
- `evidence/render-log-audit-summary.json`
- `evidence/bloat-audit-latest.json`
- `evidence/linear-aut73-81-done-sync.json`

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
