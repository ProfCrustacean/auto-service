# Task Spec: cleanup-brittle-outdated-loc

## Metadata
- Task ID: cleanup-brittle-outdated-loc
- Created: 2026-03-25T01:06:13+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Identify unoptimized, brittle, and outdated LOC in the repository, implement a focused cleanup, and leave proof-loop evidence with verified PASS.

## Acceptance criteria
- AC1: Brittle field-list drift risks are reduced in validators by removing duplicated field-list logic and centralizing allowed/mutable field definitions.
- AC2: Unoptimized repetitive LOC in work-order page payload normalization and payment-label mapping is reduced without changing API/UI behavior.
- AC3: Full repo gates relevant to this cleanup pass (`lint`, `hygiene`, `test`, `verify`, `audit:bloat`) succeed after the refactor.
- AC4: Cleanup results are documented in proof-loop artifacts with explicit changed files, commands, and verifier verdict.

## Constraints
- Keep behavior backward-compatible for existing API/page contracts and role/mutation policy.
- Prefer smallest defensible diffs in high-churn files (`workOrderValidators`, `workOrderPageRoutes`, `workOrderService`).
- Do not change product scope or introduce new runtime dependencies.
- Keep repository hygiene and bloat budgets passing.

## Non-goals
- No Phase 5 feature work or schema redesign.
- No deployment-policy changes.
- No broad stylistic rewrites outside targeted cleanup areas.

## Verification plan
- Build:
  - N/A (no build step beyond Node runtime checks)
- Unit/integration:
  - `npm test`
  - `npm run verify`
- Lint/hygiene:
  - `npm run lint`
  - `npm run hygiene:check`
  - `npm run audit:bloat`
- Manual checks:
  - inspect targeted files for removed duplication and preserved contracts
  - validate proof-loop artifact schema via `task_loop.py validate/status`
