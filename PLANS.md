# PLANS.md

## Purpose

Hot-path execution plan file for current non-trivial work.

Historical completed plans live in `PLANS_ARCHIVE.md`.

## Active Plan — `AUT-61` Phase 2 work-order lifecycle core (2026-03-22)

### Objective

Deliver the first complete Phase 2 slice so a job can move from intake/appointment to completion through explicit work-order lifecycle rules, API, UI, queue visibility, and harness verification.

### Scope map (Linear)

- `AUT-62`: domain transition engine + lifecycle invariants
- `AUT-63`: work-order lifecycle API (list/detail/update)
- `AUT-64`: appointment -> work-order conversion (idempotent)
- `AUT-65`: persistence for status history + lifecycle audit trail
- `AUT-66`: Russian work-order lifecycle workspace (`/work-orders/:id`)
- `AUT-67`: dashboard queues aligned to lifecycle statuses
- `AUT-68`: lifecycle tests + scenario harness coverage
- `AUT-69`: docs/runbook/rollback/status evidence updates

### Planned sequence

1. Domain + persistence foundation (`AUT-62`, `AUT-65`):
   - add lifecycle transition map and invariants,
   - add status-history persistence,
   - wire audit trail writes for create + transition flows.
2. API layer (`AUT-63`, `AUT-64`):
   - add `GET /api/v1/work-orders`,
   - add `GET /api/v1/work-orders/:id`,
   - add `PATCH /api/v1/work-orders/:id`,
   - add idempotent `POST /api/v1/appointments/:id/convert-to-work-order`.
3. UI + board integration (`AUT-66`, `AUT-67`):
   - replace simple work-order detail with lifecycle workspace,
   - add transition form with Russian operator copy,
   - expand dashboard lifecycle queues and summary blocks.
4. Verification/harness (`AUT-68`):
   - add domain/API/UI lifecycle tests,
   - extend smoke/scenario checks for lifecycle endpoints and conversion flow.
5. Ops/docs/closure (`AUT-69`):
   - update packet/runbook/status for new lifecycle behavior,
   - run local + deploy-aware verification,
   - sync Linear card states after evidence is captured.

### Verification policy for this plan

- After each completed step: run focused tests for the touched slice.
- After all steps: run `npm test`, `npm run verify`, `npm run audit:bloat`.
- Final acceptance gate: run `npm run verify:render` (deploy + post-deploy checks).

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
