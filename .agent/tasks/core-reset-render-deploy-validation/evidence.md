# Evidence Bundle: core-reset-render-deploy-validation

## Summary
- Overall status: PASS
- Last updated: 2026-03-25T09:48:00Z

## Acceptance criteria evidence

### AC1
- Status: PASS
- Proof:
  - Latest Render deploy is `dep-d71qtkfgi27c73fm0bp0` with status `live` and commit `0037d01eb8e97524a19858f7a7ad62383a09b0ad`.
  - Artifacts:
    - `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-trigger-20260325T0945Z.txt`
    - `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-status-20260325T0946Z.txt`
  - Source calls: Render REST API with `RENDER_API_KEY`.
- Gaps:
  - None.

### AC2
- Status: PASS
- Proof:
  - Remote smoke suite passed against Render URL.
  - Command: `APP_BASE_URL='https://auto-service-foundation.onrender.com' npm run smoke`
  - Exit code: `0`
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/test-integration.txt`
  - Browser QA screenshots captured for required routes:
    - `/`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-home-20260325T0948Z.png`
    - `/appointments/new`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-booking-20260325T0948Z.png`
    - `/appointments/new?mode=walkin`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-walkin-20260325T0948Z.png`
    - `/work-orders/active`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-active-20260325T0948Z.png`
  - Route text checks for expected Russian UI copy passed.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/remote-route-text-checks.txt`
- Gaps:
  - None.

### AC3
- Status: PASS
- Proof:
  - Warn/error filtered query after deploy returned `logs: null`.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/render-warn-error-check-20260325T0947Z.txt`
- Gaps:
  - None.

### AC4
- Status: PASS
- Proof:
  - Proof-loop required files are present and updated.
  - `task_loop.py validate` and `task_loop.py status` both report `PASS` after evidence refresh.
- Gaps:
  - None.

## Commands run
- `APP_BASE_URL='https://auto-service-foundation.onrender.com' npm run smoke`
- `/Users/ian/.codex/skills/repo-task-proof-loop/scripts/task_loop.py validate --task-id core-reset-render-deploy-validation`
- `/Users/ian/.codex/skills/repo-task-proof-loop/scripts/task_loop.py status --task-id core-reset-render-deploy-validation`

## Raw artifacts
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-trigger-20260325T0945Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-status-20260325T0946Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/test-integration.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-home-20260325T0948Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-booking-20260325T0948Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-walkin-20260325T0948Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-active-20260325T0948Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/remote-route-text-checks.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-warn-error-check-20260325T0947Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/build.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/test-unit.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/lint.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/screenshot-1.png`

## Known gaps
- None.
