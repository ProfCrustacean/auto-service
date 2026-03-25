# Task Spec: core-reset-render-deploy-validation

## Metadata
- Task ID: core-reset-render-deploy-validation
- Created: 2026-03-25T09:18:42+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Deploy latest core-reset commit to Render and validate remotely with evidence

## Acceptance criteria
- AC1: Latest repository commit (`0037d01eb8e97524a19858f7a7ad62383a09b0ad`) is deployed to Render web service `auto-service-foundation` (`srv-d6vcmt7diees73d0j04g`) and reaches `live` status.
- AC2: Remote runtime validation passes against `https://auto-service-foundation.onrender.com`:
  - smoke checks pass for health/api/core UI routes,
  - browser QA confirms dashboard, booking page, walk-in page, and active work-orders page are reachable and render expected Russian UI text.
- AC3: Post-deploy operational checks show no critical warnings/errors in recent Render service logs that indicate deployment/runtime failure.
- AC4: Proof-loop artifacts (`evidence.md`, `evidence.json`, `verdict.json`, raw logs/screenshots) are updated and `task_loop.py validate/status` report `PASS` with no missing required files.

## Constraints
- Use the existing Render service and branch (`main`) only; no new infrastructure/services.
- Keep remote validation non-destructive (read-only checks against remote environment).
- Preserve current core-reset product scope; do not reintroduce removed harness/runtime surfaces.
- Keep all proof artifacts inside `.agent/tasks/core-reset-render-deploy-validation/`.

## Non-goals
- No product feature development in this slice.
- No migration of hosting provider or Render service topology changes.
- No replacement of the broader deploy harness removed by core reset; only execute a deterministic deploy/validate step for this task.

## Verification plan
- Build/deploy:
  - push `main` to origin,
  - trigger deploy via Render API-controlled config update,
  - poll deploy status until `live`.
- Unit/local checks:
  - not required for this slice because no production code changes are introduced.
- Integration/remote checks:
  - `APP_BASE_URL=https://auto-service-foundation.onrender.com npm run smoke`
  - browser navigation + screenshot checks for `/`, `/appointments/new`, `/appointments/new?mode=walkin`, `/work-orders/active`
- Operational checks:
  - Render logs query for recent `warn/error` entries after deploy window.
- Artifact integrity:
  - `/Users/ian/.codex/skills/repo-task-proof-loop/scripts/task_loop.py validate --task-id core-reset-render-deploy-validation`
  - `/Users/ian/.codex/skills/repo-task-proof-loop/scripts/task_loop.py status --task-id core-reset-render-deploy-validation`
