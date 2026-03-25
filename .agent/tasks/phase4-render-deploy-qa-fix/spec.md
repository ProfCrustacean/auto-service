# Task Spec: phase4-render-deploy-qa-fix

## Metadata
- Task ID: phase4-render-deploy-qa-fix
- Created: 2026-03-25T00:47:29+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Deploy current Phase 4 baseline to Render, validate runtime behavior, run QA checks, fix discovered issues, and finish with PASS proof-loop artifacts.

## Acceptance criteria
- AC1: Render deployment is executed via repository harness in deploy mode and completes with a successful deploy verification result.
- AC2: Full QA gate for this slice passes locally (`secrets`, `lint`, `hygiene`, `test`, `verify`, `audit:bloat`) and deploy-aware verification passes against Render.
- AC3: Any issues discovered during local QA, deploy verification, smoke/scenario checks, or Render log audit are fixed with the smallest safe change set and regression-tested.
- AC4: Proof-loop artifacts for this task (`evidence.md`, `evidence.json`, `verdict.json`, `problems.md`, raw logs) are updated with concrete command evidence and repository state docs are synchronized.

## Constraints
- Follow packet + runbook contracts (`README.md`, `STATUS.md`, docs `01..24`) and keep Phase 4 scope/behavior intact.
- Use deterministic repository commands and preserve mutation-policy/authz contracts.
- Avoid destructive git operations and keep rollback path simple (new deploys only through existing harness flow).
- Keep bloat/hygiene policy green (`npm run audit:bloat`, `npm run hygiene:check`).
- Preserve prior accepted behavior unless a fix is required to pass explicit QA/deploy checks.

## Non-goals
- No Phase 5 feature expansion or new product-scope additions.
- No redesign of deployment architecture beyond fixing blockers for this deploy/QA slice.
- No manual dashboard-only click-op claims without harness/verifier evidence.

## Verification plan
- Build/deploy:
  - `npm run verify:render -- --deploy`
- Unit/integration/system:
  - `npm test`
  - `npm run verify`
- Static/security/hygiene:
  - `npm run secrets:scan`
  - `npm run lint`
  - `npm run hygiene:check`
  - `npm run audit:bloat`
- Additional deploy validation:
  - Render smoke + non-destructive scenarios executed by `verify:render`
  - post-deploy log audit outcome from `evidence/render-log-audit-summary.json`
