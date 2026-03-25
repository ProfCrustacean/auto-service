# Evidence Bundle: core-reset-loc-reduction

## Summary
- Overall status: PASS
- Last updated: 2026-03-25T09:13:31Z

## Acceptance criteria evidence

### AC1
- Status: PASS
- Criterion: Repository JavaScript LOC (`src + scripts + tests`) is reduced by at least 30% from baseline (`27,549`).
- Proof:
  - LOC command output (`.agent/tasks/core-reset-loc-reduction/raw/loc.txt`) reports `19,118` total lines.
  - Delta: `27,549 - 19,118 = 8,431` lines removed.
  - Reduction: `30.60%`.

### AC2
- Status: PASS
- Criterion: Harness surface is collapsed to a minimal local loop (no Render/Linear/cleanup orchestration scripts), with `verify` simplified to local checks only.
- Proof:
  - Removed scripts: `scripts/verify-render.js`, `scripts/render-service-policy.js`, `scripts/linear-harness*.js`, `scripts/cleanup-spring.js`, scenario runners.
  - `package.json` script surface now keeps local-only verification commands (`lint`, `hygiene:check`, `test`, `smoke`, `verify`, `audit:bloat`).
  - `scripts/verify.js` now runs only `node --test` + isolated app boot + `scripts/smoke.js`.

### AC3
- Status: PASS
- Criterion: Product runtime is simplified to core operations while removing dispatch-board complexity and dependencies.
- Proof:
  - Removed runtime modules: `src/http/dispatchBoard*`, `src/ui/dispatchBoard*`, `src/services/dashboard/dispatchProjection.js`.
  - Removed dispatch references from `src/app.js`, `src/services/dashboardService.js`, `src/services/dashboard/todayProjection.js`, and `src/ui/dashboardPage.js`.
  - Removed dependency: `@event-calendar/build` from `package.json` and vendor sync mapping from `src/ui/syncVendorAssets.js`.
  - Removed dispatch mutation policy entry in `src/http/mutationPolicy.js` and corresponding assertion in `tests/mutationPolicy.test.js`.

### AC4
- Status: PASS
- Criterion: Post-reset gates pass and proof-loop artifacts are updated.
- Proof:
  - `npm run lint` passed (`.agent/tasks/core-reset-loc-reduction/raw/lint.txt`).
  - `npm run hygiene:check` passed (`.agent/tasks/core-reset-loc-reduction/raw/hygiene.txt`).
  - `npm test` passed (`.agent/tasks/core-reset-loc-reduction/raw/test-unit.txt`).
  - `npm run verify` passed (`.agent/tasks/core-reset-loc-reduction/raw/test-integration.txt`).
  - `npm run audit:bloat` passed (`.agent/tasks/core-reset-loc-reduction/raw/audit-bloat.txt`).

### AC5
- Status: PASS
- Criterion: Real frontend browser E2E validation is executed against a live local app session (dashboard, booking page, walk-in page, active work-orders page), with evidence captured and any discovered issues fixed.
- Proof:
  - Booking flow validated with successful redirect to created appointment (`Запись APT-015`) on `/appointments/apt-b4fabec9?created=1`.
  - Walk-in flow validated with successful redirect to created work order (`Заказ-наряд WO-1018`) on `/work-orders/wo-4ffa7e09?created=1`.
  - Active queue validated with `WO-1018` present on `/work-orders/active`.
  - Screenshots captured:
    - `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-booking-result-20260325T091000Z.png`
    - `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-walkin-before-submit-20260325T091100Z.png`
    - `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-walkin-result-20260325T091140Z.png`
    - `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-active-queue-20260325T091200Z.png`
  - No runtime defects were observed in this pass; no additional production-code fixes were required.

### AC6
- Status: PASS
- Criterion: The resulting repository state is committed only after AC1-AC5 are satisfied.
- Proof:
  - Commit created after AC1-AC5 checks/evidence completion in this task slice.
  - Commit hash is recorded in repository history for this task completion step.

## Commands run
- `find src scripts tests -type f -name '*.js' -print0 | xargs -0 wc -l`
- `npm run lint`
- `npm run hygiene:check`
- `npm test`
- `npm run verify`
- `npm run audit:bloat`
- Playwright browser checks against live app at `http://127.0.0.1:3100`:
  - `GET /` (dashboard visual check)
  - `GET /appointments/new?mode=booking` (booking flow)
  - `GET /appointments/new?mode=walkin` (walk-in flow)
  - `GET /work-orders/active` (active queue confirmation)

## Raw artifacts
- `.agent/tasks/core-reset-loc-reduction/raw/loc.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/lint.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/hygiene.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/test-unit.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/test-integration.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/audit-bloat.txt`
- `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-booking-result-20260325T091000Z.png`
- `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-walkin-before-submit-20260325T091100Z.png`
- `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-walkin-result-20260325T091140Z.png`
- `.agent/tasks/core-reset-loc-reduction/raw/frontend-e2e-active-queue-20260325T091200Z.png`

## Known gaps
- None for current acceptance criteria.
