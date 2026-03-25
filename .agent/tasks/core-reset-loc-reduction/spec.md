# Task Spec: core-reset-loc-reduction

## Metadata
- Task ID: core-reset-loc-reduction
- Created: 2026-03-25T01:20:08+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Massively reduce LOC, codebase complexity, and harness size from first product principles. Breaking changes allowed. Then commit the changes, run real frontend end-to-end validation, and fix any issues found.

## Acceptance criteria
- AC1: Repository JavaScript LOC (`src + scripts + tests`) is reduced by at least 30% from the pre-change baseline (27,549 LOC).
- AC2: Harness surface is collapsed to a minimal local loop (no Render/Linear/cleanup orchestration scripts), with `verify` simplified to local product checks only.
- AC3: Product runtime is simplified to core shop operations (appointments, intake, work orders, parts, payments, reporting) while removing dispatch-board complexity and related runtime dependencies.
- AC4: Post-reset baseline gates pass (`lint`, `hygiene:check`, `test`, `verify`, `audit:bloat`) and proof-loop artifacts are updated with measured LOC deltas and verification evidence.
- AC5: Real frontend browser E2E validation is executed against a live local app session (dashboard, booking page, walk-in page, active work-orders page), with evidence captured and any discovered issues fixed.
- AC6: The resulting repository state is committed only after AC1-AC5 are satisfied.

## Constraints
- Breaking changes are explicitly allowed for non-core tooling and interfaces.
- Keep the app runnable from `npm start` with deterministic SQLite bootstrap.
- Preserve Russian-facing copy for user-visible pages retained in the core product.
- Prefer deletions over abstractions when reducing complexity.

## Non-goals
- No attempt to preserve backward compatibility for removed harness commands/endpoints.
- No Render deployment validation in this reset slice.
- No new feature additions outside simplification.
- No multi-browser or cross-device matrix; one deterministic local browser flow is sufficient for this slice.

## Verification plan
- LOC measurement:
  - `find src scripts tests -type f -name '*.js' -print0 | xargs -0 wc -l | tail -n 1`
- Gates:
  - `npm run lint`
  - `npm run hygiene:check`
  - `npm test`
  - `npm run verify`
  - `npm run audit:bloat`
- Artifact checks:
  - `task_loop.py validate --task-id core-reset-loc-reduction`
  - `task_loop.py status --task-id core-reset-loc-reduction`
- Browser E2E checks:
  - start local app (`npm start`)
  - run Playwright-driven UI flow across core pages
  - capture snapshots/screenshots and record result in task raw artifacts
- Commit check:
  - create one commit after all checks pass
