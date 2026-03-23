# PLANS.md

## Purpose

Hot-path execution plan file for current non-trivial work.

Historical completed plans live in `PLANS_ARCHIVE.md`.

## Active Plan — None

No active multi-step implementation plan is open right now.

Create a new active plan before the next non-trivial feature/refactor/deployment slice.

## Completed Plan — Unified `/appointments/new` with walk-in mode (2026-03-23)

### Objective

Collapse duplicated booking/walk-in page flows into one owner-facing page and deprecate the legacy walk-in page route.

### Delivered

- `/appointments/new` now supports two UI modes on one form:
  - `booking` (default),
  - `walkin` (`/appointments/new?mode=walkin`).
- Unified POST handler in `appointmentPageRoutes`:
  - booking mode preserves existing appointment create flow,
  - walk-in mode calls `walkInIntakeService.createWalkInFromIntakeForm(...)` and redirects to `/work-orders/:id?created=1`.
- Legacy page route `/intake/walk-in` is now explicit `410 Gone` for both GET and POST with migration hint.
- Dashboard/dispatch actions now point to `/appointments/new?mode=walkin`.
- Harness updates:
  - smoke now validates walk-in mode via `/appointments/new?mode=walkin`,
  - `scripts/walkin-page-scenario.js` moved from legacy path to mode-aware unified page submit.
- Removed dead legacy UI renderer file `src/ui/walkInIntakePage.js`.
- Docs/status sync:
  - `README.md`,
  - `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`,
  - `STATUS.md`.

### Verification

- `npm test`: passed
- `npm run lint`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed
- `npm run secrets:scan`: passed

## Completed Plan — Dashboard week blocks cleanup (vertical stack + Monday week start) (2026-03-23)

### Objective

Increase weekly planning readability on `/` by stacking weekly blocks vertically and switching week semantics to calendar week (`Пн..Вс`).

### Delivered

- `DashboardService` week window anchor changed from rolling `today+6` to Monday-based calendar week:
  - new helper `startOfLocalWeekMonday(...)`,
  - `buildWeekDays(...)` now starts from local Monday.
- Dashboard weekly section layout changed from `split-grid` to single-column `week-stack`.
- Weekly tables now use dedicated non-scrolling wrapper (`week-table-wrap`) and fixed table layout:
  - removed wide `min-width` behavior for week tables,
  - enabled wrapping for weekly cell metadata to keep columns readable.
- Tests updated:
  - `tests/dashboardService.test.js` now asserts Monday-first weekly header and monotonic day sequence,
  - `tests/http.test.js` now asserts weekly stack/layout markers in rendered dashboard HTML.

### Verification

- `npm run lint`: passed
- `npm test -- tests/dashboardService.test.js tests/http.test.js`: passed
- `npm test`: passed
- `npm run verify`: passed
- `npm run audit:bloat`: passed

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
- 2026-03-23 — Dispatch board UX simplification (calendar-only controls)
- 2026-03-23 — Foundation hardening (`AUT-89..AUT-96`)

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

## Maintenance rule

When a plan is completed:
- move detailed completed-plan history into `PLANS_ARCHIVE.md`,
- keep `PLANS.md` short and active-context-first,
- and run `npm run plans:compact` in the same task slice.

Hot-path budget policy for `PLANS.md`:
- at most 4 completed-plan sections in `PLANS.md`,
- max 350 lines total.
