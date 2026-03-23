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

