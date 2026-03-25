# Task Spec: restore-dispatch-calendar

## Metadata
- Task ID: restore-dispatch-calendar
- Created: 2026-03-25T11:05:15+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Restore dispatch calendar page and API/runtime exactly as before core-reset

## Acceptance criteria
- AC1: `GET /dispatch/board` returns `200` and renders the dispatch calendar shell with Russian UI labels and `id="dispatch-calendar"`.
- AC2: Dispatch board API and mutation endpoints are restored and wired:
  - `GET /api/v1/dispatch/board`,
  - `POST /api/v1/dispatch/board/events/:id/preview`,
  - `POST /api/v1/dispatch/board/events/:id/commit`,
  - `POST /api/v1/dispatch/board/queue/appointments/:id/schedule`,
  - `POST /api/v1/dispatch/board/queue/walk-ins/:id/schedule`.
- AC3: Dashboard contains dispatch board action link and dashboard projection exposes dispatch URL action.
- AC4: Vendor/static/runtime support for dispatch board is restored deterministically:
  - `/assets/vendor/event-calendar-5.5.1.min.css`,
  - `/assets/vendor/event-calendar-5.5.1.min.js`,
  - `/assets/css/dispatch-board.css`,
  - `@event-calendar/build` present in package dependencies.
- AC5: Verification passes with dispatch restored:
  - `npm run lint`,
  - `npm test`,
  - `npm run verify`,
  - smoke includes dispatch board API/UI checks and passes.

## Constraints
- Restore from the last known working pre-removal implementation (core-reset parent state), not a newly invented UX/flow.
- Keep existing scheduling/intake/work-order/parts/payments/reporting behavior intact.
- Keep scope narrow to dispatch calendar restoration; do not reintroduce removed non-core harness surfaces.
- Keep Russian user-facing copy.
- Keep proof artifacts inside `.agent/tasks/restore-dispatch-calendar/`.

## Non-goals
- No broad rollback of all core-reset deletions.
- No redesign of dispatch UI behavior.
- No Render deployment in this slice unless required for local restoration verification.

## Verification plan
- Build:
  - Run `npm run assets:sync` implicitly via test/start scripts and ensure dispatch vendor/css assets resolve.
- Unit tests:
  - Run `npm test`.
- Integration tests:
  - Run `npm run verify` (includes smoke) and ensure dispatch checks are present and passing.
- Lint:
  - Run `npm run lint` (static syntax + mutating route policy coverage).
- Manual checks:
  - Start app and confirm:
    - `GET /dispatch/board` is 200 and contains dispatch calendar page shell.
    - `GET /api/v1/dispatch/board` is 200 and includes `calendar.engine = event_calendar`.
