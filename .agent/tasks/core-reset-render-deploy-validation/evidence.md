# Evidence Bundle: core-reset-render-deploy-validation

## Summary
- Overall status: PASS
- Last updated: 2026-03-25T09:40:58Z

## Acceptance criteria evidence

### AC1
- Status: PASS
- Proof:
  - Latest Render deploy is `dep-d71qhcogjchc739nj70g` with status `live` and commit `fd151d53e1529f9d746e23d745adc0fcfc39bee5`.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-status-20260325T0926Z.txt`
  - Source calls: `mcp__render__list_deploys`, `mcp__render__get_deploy`.
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
    - `/`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-home-20260325T0937Z.png`
    - `/appointments/new`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-booking-20260325T0937Z.png`
    - `/appointments/new?mode=walkin`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-walkin-20260325T0937Z.png`
    - `/work-orders/active`: `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-active-20260325T0937Z.png`
  - Route text checks for expected Russian UI copy passed.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/remote-route-text-checks.txt`
- Gaps:
  - None.

### AC3
- Status: PASS
- Proof:
  - Deploy-window logs include build, start, and live events for target deploy and commit.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/render-logs-deploy-20260325T0920Z.txt`
  - Warn/error filtered query for same window returned `logs: null`.
  - Artifact: `.agent/tasks/core-reset-render-deploy-validation/raw/render-warn-error-check-20260325T0926Z.txt`
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
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-deploy-status-20260325T0926Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/test-integration.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-home-20260325T0937Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-booking-20260325T0937Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-walkin-20260325T0937Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-e2e-active-20260325T0937Z.png`
- `.agent/tasks/core-reset-render-deploy-validation/raw/remote-route-text-checks.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-logs-deploy-20260325T0920Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/render-warn-error-check-20260325T0926Z.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/build.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/test-unit.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/lint.txt`
- `.agent/tasks/core-reset-render-deploy-validation/raw/screenshot-1.png`

## Known gaps
- None.
