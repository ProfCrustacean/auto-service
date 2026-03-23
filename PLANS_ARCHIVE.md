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

