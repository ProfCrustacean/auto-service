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
- 2026-03-22 — Phase 2 lifecycle core (`AUT-61..AUT-69`)
- 2026-03-22 — Spring cleanup wave (`AUT-82..AUT-88`)
- 2026-03-22 — Phase 3 parts flow (`AUT-73..AUT-81`)

## Completed Plan — Dispatch board DnD/readability hardening + global overlap warnings (2026-03-23)

### Objective

Fix dispatch board usability blockers (queue drag/drop and unreadable event cards) and switch capacity conflicts from blocking errors to global non-blocking warnings.

### Delivered

- Reworked appointment capacity policy in domain/service layer:
  - overlap checks now produce structured warning details instead of throwing blocking domain conflicts,
  - create/update responses can carry `warnings` while still committing.
- Updated API routes (`appointments` and dispatch board mutations) to surface `warnings` payloads.
- Updated booking page flow:
  - overlap is previewed as warning detail,
  - submission is no longer blocked by slot overlap.
- Hardened dispatch board DnD:
  - transfer payload fallback parsing (`dataTransfer`) added,
  - drop target fallback resolution added when direct point resolution is unavailable.
- Redesigned dispatch board event readability:
  - high-contrast event palette,
  - deterministic two-line event content rendering (time/code + customer/vehicle),
  - overlap events are visually marked (`status-overlap`).
- Updated tests for the new global overlap policy and dispatch board UI contract.

### Verification

- `npm test -- tests/appointmentLifecycle.test.js tests/appointmentBookingPage.test.js tests/domainSchedulingWalkin.test.js tests/dispatchBoard.test.js`: passed
- `npm test`: passed
- `npm run lint`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render`: passed
  - deploy id: `dep-d70obktm5p6s73a1f52g`
  - commit parity: `f95625f49a76ab071aefb00cf4638a99f783748e`
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- Playwright production smoke on `/dispatch/board`: passed
  - queue drop into occupied slot succeeds (`201`) with warning toast
  - event drag and resize commit successfully (`200`)
  - no browser console errors/warnings

## Completed Plan — Dispatch board full EventCalendar cutover (2026-03-23)

### Objective

Replace `vis-timeline` with vertical `@event-calendar/build` (`resourceTimeGridDay`) and migrate dispatch board writes to API-only routes.

### Delivered

- Replaced dispatch board engine with EventCalendar standalone bundle (`@event-calendar/build@5.5.1`) in vertical `resourceTimeGridDay` mode.
- Migrated `GET /api/v1/dispatch/board` payload to calendar-native schema:
  - `calendar`, `resources`, `events`, `queues`, `actions`.
- Removed legacy write routes under `/dispatch/board/*` and added API-only mutations:
  - `POST /api/v1/dispatch/board/events/:id/preview`
  - `POST /api/v1/dispatch/board/events/:id/commit`
  - `POST /api/v1/dispatch/board/queue/appointments/:id/schedule`
  - `POST /api/v1/dispatch/board/queue/walk-ins/:id/schedule`
- Updated mutation policy for dispatch board API writes (`api.dispatch_board.write`).
- Updated dispatch board integration tests, smoke checks, and dispatch scenario harness flow.
- Updated runbook + UX guidelines for vertical calendar and queue drag-only control model.

### Verification

- `npm run lint`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render`: passed
  - deploy + commit parity + smoke + non-destructive scenarios + post-deploy log audit: passed
  - deployed smoke + non-destructive scenarios (booking, walk-in, scheduling/walk-in, parts-flow, dispatch-board): passed
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- Browser smoke (Playwright) on production `/dispatch/board`:
  - vertical resource time-grid visible,
  - queue cards draggable,
  - legacy manual-control blocks absent,
  - console errors: 0.
- `npm run audit:bloat`: failed (pre-existing budget overruns in `src/tests/scripts`; unchanged blocker category).

## Completed Plan — Dispatch board UX simplification (calendar-only controls) (2026-03-23)

### Objective

Remove non-essential owner-facing noise on `/dispatch/board` and enforce a single interaction model where schedule changes happen only through the calendar.

### Delivered

- Removed top metric strips from dispatch board UI:
  - global summary cards,
  - per-lane metric cards.
- Removed bottom manual controls:
  - `Выбранный слот`,
  - `Выбранная запись`,
  - quick duration buttons `-15/+15`.
- Kept and hardened calendar-native operations:
  - existing appointment move/resize via timeline drag/resize,
  - queue scheduling via direct drag-and-drop from queue cards to timeline.
- Updated UI contract checks:
  - page test now asserts removed blocks are absent and queue cards are draggable,
  - smoke check now validates dispatch timeline marker is present.
- Fixed production runtime regression in timeline init (`formatLaneLoad` browser-scope bug) and redeployed.

### Verification

- `npm test`: passed
- `npm run lint`: passed
- `npm run verify`: passed
- `npm run secrets:scan`: passed
- `npm run verify:render`: passed
  - deploy id: `dep-d70m0a9r0fns73elbq90`
  - commit parity: `3945ce76b7667ee5ecccaabee04b235eeb3eabf4`
  - post-deploy log audit: passed (`warn=0`, `error=0`, `repoAccessWarning=0`)
- Playwright browser smoke on deployed page:
  - `.vis-timeline` exists,
  - queue cards are `draggable="true"`,
  - removed blocks absent,
  - console errors: 0.

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
