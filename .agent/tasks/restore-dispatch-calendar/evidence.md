# Evidence Bundle: restore-dispatch-calendar

## Summary
- Overall status: PASS
- Last updated: 2026-03-25T14:18:00Z

## Acceptance criteria evidence

### AC1
- Status: PASS
- Proof:
  - `curl -s -o /tmp/dispatch_board.html -w "%{http_code}\n" http://127.0.0.1:3000/dispatch/board` returned `200`.
  - `rg -n "Диспетчерская доска|dispatch-calendar|Очередь" /tmp/dispatch_board.html` confirms shell labels and `id="dispatch-calendar"`.
  - Screenshot artifact exists: `.agent/tasks/restore-dispatch-calendar/raw/screenshot-1.png`.

### AC2
- Status: PASS
- Proof:
  - `GET /api/v1/dispatch/board` returned `200` with `calendar.engine=event_calendar` in `.agent/tasks/restore-dispatch-calendar/raw/runtime-checks.txt`.
  - POST checks for all four mutation endpoints returned `400` (validation), proving route wiring (not `404`): `.agent/tasks/restore-dispatch-calendar/raw/runtime-checks.txt`.
  - Route registrations are present in `src/http/dispatchBoardPageRoutes.js`.

### AC3
- Status: PASS
- Proof:
  - `GET /` HTML contains `<a class="btn" href="/dispatch/board">Диспетчерская доска</a>` in `.agent/tasks/restore-dispatch-calendar/raw/runtime-checks.txt`.
  - Dashboard action projection includes `/dispatch/board` in `src/services/dashboard/todayProjection.js` and `src/ui/dashboardPage.js`.

### AC4
- Status: PASS
- Proof:
  - Assets are present:
    - `public/assets/vendor/event-calendar-5.5.1.min.css`
    - `public/assets/vendor/event-calendar-5.5.1.min.js`
    - `public/assets/css/dispatch-board.css`
  - Dependency is present: `@event-calendar/build@5.5.1` in `package.json`.
  - Vendor sync coverage is present in `src/ui/syncVendorAssets.js`.

### AC5
- Status: PASS
- Proof:
  - `npm run lint` passed (`raw/lint.txt`).
  - `npm test` passed (`raw/test-unit.txt`).
  - `npm run verify` passed (`raw/test-integration.txt`).
  - `BASE_URL=http://127.0.0.1:3000 npm run smoke` passed with `dispatch_board_api` and `dispatch_board_ui` checks (`raw/build.txt`).
  - Render deploy `dep-d71sp4n5r7bs73e46qsg` for commit `1d0f9186a416de610a2f50ec3a3b5528ff27a4cc` reached `live` status.
  - Production runtime checks passed on `https://auto-service-foundation.onrender.com` (`raw/render-runtime-checks.txt`).
  - Production smoke passed with dispatch checks (`raw/render-smoke.txt`).
  - Browser E2E navigation dashboard -> dispatch board passed (`raw/render-e2e-dispatch-board.png`).

## Commands run
- `npm run lint` (exit `0`)
- `npm test` (exit `0`)
- `npm run verify` (exit `0`)
- `BASE_URL=http://127.0.0.1:3000 npm run smoke` (exit `0`)
- Runtime curl/rg checks captured in `.agent/tasks/restore-dispatch-calendar/raw/runtime-checks.txt` (exit `0`)

## Raw artifacts
- .agent/tasks/restore-dispatch-calendar/raw/build.txt
- .agent/tasks/restore-dispatch-calendar/raw/test-unit.txt
- .agent/tasks/restore-dispatch-calendar/raw/test-integration.txt
- .agent/tasks/restore-dispatch-calendar/raw/lint.txt
- .agent/tasks/restore-dispatch-calendar/raw/screenshot-1.png
- .agent/tasks/restore-dispatch-calendar/raw/runtime-checks.txt
- .agent/tasks/restore-dispatch-calendar/raw/render-runtime-checks.txt
- .agent/tasks/restore-dispatch-calendar/raw/render-smoke.txt
- .agent/tasks/restore-dispatch-calendar/raw/render-e2e-dispatch-board.png

## Known gaps
- None.
