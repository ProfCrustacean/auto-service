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

Keep Phase 1 stable while moving from bloat cleanup into next feature-delivery slices.

## Current state (2026-03-22)

### Product/runtime
- Phase 1 scheduling and intake slices are implemented end-to-end:
  - employee/bay/customer/vehicle APIs,
  - appointment lifecycle with capacity conflict checks,
  - walk-in intake API and queue insertion,
  - production `/appointments/new` and `/intake/walk-in` pages,
  - dashboard day/week planning and unified search.
- Mutating `/api/v1/**` endpoints enforce auth + role baseline (`owner`, `front_desk`, `technician`).
- Persistence is SQLite with migrations, seed bootstrap, WAL/busy-timeout tuning, and transactional write flows.

### Harness/operations
- Local verification gate is self-contained: `npm run verify` boots isolated app+DB, runs smoke + scenarios, then stops server.
- Deploy-aware gate exists: `npm run verify:render` (deploy, live wait, commit parity, smoke, non-destructive scenarios, log audit).
- Full gate exists: `npm run verify:full` (local verify + Render verify).
- Linear harness supports probe/create/sync via Playwright fallback:
  - `npm run linear:probe`
  - `npm run linear:create`
  - `npm run linear:sync`

## Last accepted milestones

- 2026-03-22: Technical audit closure (`AUT-41..AUT-54`) implemented and synced to Done.
- 2026-03-22: Bloat audit closure (`AUT-55..AUT-60`) implemented end-to-end and synced to Done.

## Verification snapshot

Most recent local gate results:
- `npm test`: passed
- `npm run verify`: passed
- `npm run secrets:scan`: passed

Most recent deploy-aware gate result:
- `npm run verify:full`: passed
  - Render deploy reached `live`
  - commit parity passed
  - deployed smoke passed
  - deployed non-destructive scenarios passed
  - post-deploy log audit passed (`warn=0`, `error=0`, `repoAccessWarning=0`)

Primary evidence pointers:
- `evidence/bloat-audit-latest.json`
- `evidence/render-log-audit-summary.json`
- `evidence/linear-bloat-sync-done.json`
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

- Render API can be unreliable from this local environment without `--resolve` fallback; harness already supports this path.
- Token auth is baseline-only (no IdP/session management yet).

## Active work focus

1. Prepare the next Phase 1 delivery plan (new workflow/value slice) in `PLANS.md`.
2. Keep baseline gates green (`npm test`, `npm run verify`, `npm run audit:bloat`).
3. Keep Linear state and repository status/plans synchronized per completed slice.

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
