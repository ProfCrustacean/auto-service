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

## Completed Plan — Bloat audit execution (`AUT-55..AUT-60`) (2026-03-22)

### Objective

Reduce repository context/storage/duplication bloat while preserving Phase 1 behavior and gate reliability.

### Delivered

- `AUT-55`: `MASTER_CONTEXT_PACKET.md` converted to compact index-only pointer + anti-mirror policy test.
- `AUT-56`: `STATUS.md` / `PLANS.md` kept in strict hot-path budgets with archive-backed policy tests.
- `AUT-57`: evidence retention policy enforced (`summary` tracked, `raw` ignored/debug-only), raw summary tool added, oversized raw artifact removed.
- `AUT-58`: shared UI primitives extracted for booking/walk-in page renderers.
- `AUT-59`: booking/walk-in page route orchestration unified through shared page-flow utilities.
- `AUT-60`: automated `audit:bloat` budget gate added with machine-readable report and CI wiring.

### Verification

- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:full`: passed (Render deploy `dep-d70220a4d50c7391unv0`, commit parity + smoke + non-destructive scenarios + post-deploy log audit)

### Linear sync

- `npm run linear:sync -- --spec data/linear/bloat-audit-2026-03-22.json --state Done` executed successfully.
- Transitioned to `Done`: `AUT-55`, `AUT-56`, `AUT-57`, `AUT-58`, `AUT-59`, `AUT-60`.
- Spec entries intentionally not found (skipped by scope): scenario/test dedupe cards.

### Primary evidence

- `evidence/bloat-audit-latest.json`
- `evidence/render-log-audit-summary.json`
- `evidence/linear-bloat-sync-done.json`
- `evidence/verify-server.log`

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
