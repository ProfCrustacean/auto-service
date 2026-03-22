# PLANS.md

## Purpose

Hot-path execution plan file for current non-trivial work.

Historical completed plans live in `PLANS_ARCHIVE.md`.

## Active Plan — None

No active multi-step implementation plan is open right now.

Create a new active plan before the next non-trivial feature/refactor/deployment slice.

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
- Sync artifact: `evidence/linear-aut61-69-done-sync.json`.

### Primary evidence

- `evidence/render-log-audit-summary.json`
- `evidence/linear-aut61-69-done-sync.json`
- `evidence/verify-server.log`
- `evidence/bloat-audit-latest.json`

## Completed Plan — Bloat audit execution (`AUT-55..AUT-60`) (2026-03-22)

### Objective

Reduce repository context/storage/duplication bloat while preserving Phase 1 behavior and gate reliability.

### Delivered

- packet index compaction (`MASTER_CONTEXT_PACKET.md`)
- status/plans hot-path budget enforcement
- evidence retention policy + summarization tooling
- shared UI/page-flow utilities to remove duplication
- automated bloat budget gate (`npm run audit:bloat`)

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:full`: passed

### Linear sync

`AUT-55..AUT-60` transitioned to `Done` via harness sync.

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
