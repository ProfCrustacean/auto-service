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

## Completed Plan — Foundation hardening (`AUT-89..AUT-96`) (2026-03-23)

### Objective

Reduce future delivery friction by hardening auth boundaries, decomposing repository hotspots, codifying persistence transition/recovery paths, and enforcing stronger harness/static hygiene contracts.

### Delivered

- Unified mutation auth policy across API/page write paths (`src/http/mutationPolicy.js`, `src/http/authz.js`) with role parity tests.
- Split `SqliteRepository` hotspot into bounded modules (`sqliteRepositoryMappers`, `sqliteRepositoryReferenceCustomerVehicle`) while keeping repository interface stable.
- Added persistence transition/recovery deliverables:
  - `docs/24_PERSISTENCE_TRANSITION_AND_RECOVERY.md`,
  - fixture-integrity validation in seeding flow,
  - `scripts/db-backup-restore-drill.js`.
- Modularized harness process orchestration (`scripts/harness-process.js`) and applied it in `verify`/`verify:render`.
- Added and wired static + hygiene gates:
  - `npm run lint` (`scripts/static-guardrails.js`),
  - `npm run hygiene:check` (`scripts/hygiene-check.js`).

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run lint`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render -- --skip-deploy`: passed

### Linear sync

- Epic and subtasks `AUT-89..AUT-96` transitioned to `Done` via harness sync.
- Sync log: `/tmp/linear-aut89-96-sync-result.json`

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
