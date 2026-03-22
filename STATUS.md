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

Phase 2 lifecycle core is delivered and stable; next priority is the next feature block (parts flow under work orders).

## Current state (2026-03-22)

### Product/runtime
- Phase 1 scheduling/intake remains fully implemented:
  - employee/bay/customer/vehicle APIs,
  - appointment lifecycle with deterministic capacity checks,
  - walk-in intake API + production pages,
  - dashboard day/week planning + unified lookup.
- Phase 2 lifecycle core is now implemented:
  - work-order lifecycle domain status map and transition invariants,
  - idempotent appointment -> work-order conversion flow,
  - lifecycle API (`/api/v1/work-orders*`, conversion endpoint),
  - persistent work-order status history and appointment/work-order linkage,
  - Russian lifecycle workspace (`/work-orders/:id`) + active queue page,
  - dashboard lifecycle queue expansion (diagnosis/approval/parts/paused/ready pickup).

### Harness/operations
- Local gate is self-contained: `npm run verify` (tests + smoke + booking/walk-in/scheduling scenarios).
- Deploy-aware gate exists and is green: `npm run verify:render` (deploy, commit parity, smoke, scenarios, log audit).
- Linear harness supports probe/create/sync via Playwright fallback:
  - `npm run linear:probe`
  - `npm run linear:create`
  - `npm run linear:sync`

## Last accepted milestones

- 2026-03-22: Phase 2 lifecycle core epic completed (`AUT-61..AUT-69`) and synced to Done.
- 2026-03-22: Bloat audit closure (`AUT-55..AUT-60`) implemented and synced to Done.

## Verification snapshot

Most recent local gate results:
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed

Most recent deploy-aware gate result:
- `npm run verify:render`: passed
  - deploy id: `dep-d703dqk50q8c73fhb08g`
  - commit parity: passed (`b404dccd7a81279dd8f917040f4724b0486d03f6`)
  - deployed smoke: passed
  - deployed non-destructive scenarios: passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

Primary evidence pointers:
- `evidence/render-log-audit-summary.json`
- `evidence/linear-aut61-69-done-sync.json`
- `evidence/bloat-audit-latest.json`
- `evidence/verify-server.log`

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

1. Plan and execute the next Phase 2 block: parts requests and waiting-for-parts operational control.
2. Keep baseline gates green (`npm test`, `npm run verify`, `npm run audit:bloat`).
3. Keep Linear states and repository status/plans synchronized per completed slice.

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
