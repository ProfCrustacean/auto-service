# Auto Service Project Starter Packet

This packet is the starting operating context for a new custom system for a single-location independent auto service.

It serves two purposes at the same time:

1. define the product,
2. define how Codex must build, validate, deploy, and maintain it with as little human intervention as possible.

## Product in one sentence

Build a custom front-office and workshop operations system for a single-location auto service in Saransk, Russia, focused on scheduling, intake, work orders, vehicle history, job-based parts flow, payment recording, operational visibility, and flexible external integrations.

## Project engineering goal in one sentence

Build the repository so that Codex can operate it end to end: understand it, plan work, bootstrap environments, deploy updates, run automated and end-to-end checks, capture evidence, detect regressions, and keep repository state current.

## Why this packet exists

The business wants a custom product because off-the-shelf products are too restrictive for affordable integrations and workflow control.

The business also wants a repo that does not depend on hidden human memory or repeated hand-holding. The human owner should mostly provide:
- the repository,
- execution environments,
- credentials or secrets through approved channels,
- domains, IPs, or DNS inputs when needed,
- and judgment only when the issue is truly blocking or high-risk.

Everything else should become visible, repeatable, and agent-operable from inside the repository.

## Core philosophy

If Codex cannot discover something from the repository, the repository state, or the provided execution environments, that thing should be treated as missing.

Important knowledge should be encoded into:
- repository docs,
- plans,
- status files,
- scripts,
- tests,
- verification flows,
- deployment logic,
- and evidence records.

## How Codex should use this packet

1. Read the packet in the documented order.
2. Treat it as the source of truth for business intent, project rules, and agent operating rules.
3. Use documented defaults when something is ambiguous.
4. Prefer the smallest complete vertical slice that can be tested by Codex end to end.
5. Keep `STATUS.md` and `PLANS.md` current.
6. Only escalate to a human when the issue is truly blocking, missing required external access, or carries direct legal, financial, security, or irreversible production risk.

`MASTER_CONTEXT_PACKET.md` is intentionally index-only; canonical packet content lives in `README.md` and `docs/*.md`.

## Intended result

After reading these files, Codex should understand:
- the business context,
- the final product goal,
- the intermediate product phases,
- the project boundaries,
- the domain rules,
- the workflows,
- the reporting expectations,
- the non-functional requirements,
- the self-validation and deployment requirements,
- the environment and operations contract,
- and the rules for plans, status tracking, and evidence.

## File layout

### Root files
- `AGENTS.md`
- `README.md`
- `STATUS.md`
- `PLANS.md`
- `MASTER_CONTEXT_PACKET.md` (index-only, no packet mirroring)

### Packet documents
- `docs/01_EXECUTIVE_SUMMARY.md`
- `docs/02_PRODUCT_GOALS_AND_PHASES.md`
- `docs/03_SCOPE_AND_NON_GOALS.md`
- `docs/04_BUSINESS_CONTEXT.md`
- `docs/05_USERS_ROLES_AND_PERMISSIONS.md`
- `docs/06_DOMAIN_MODEL_AND_RULES.md`
- `docs/07_CORE_WORKFLOWS.md`
- `docs/08_SYSTEM_DESIGN_PRINCIPLES.md`
- `docs/09_INFORMATION_MODEL.md`
- `docs/10_EXTERNAL_CONNECTIONS_AND_INTEGRATIONS.md`
- `docs/11_UI_UX_GUIDELINES.md`
- `docs/12_REPORTING_AND_METRICS.md`
- `docs/13_NON_FUNCTIONAL_REQUIREMENTS.md`
- `docs/14_DELIVERY_PLAN_AND_BACKLOG.md`
- `docs/15_ACCEPTANCE_CRITERIA.md`
- `docs/16_OPEN_QUESTIONS_AND_DEFAULTS.md`
- `docs/17_WORKING_RULES_FOR_CODEX.md`
- `docs/18_SEED_DATA_AND_FIXTURES.md`
- `docs/19_AGENT_AUTONOMY_AND_HARNESS_MODEL.md`
- `docs/20_ENVIRONMENT_DEPLOYMENT_AND_OPERATIONS.md`
- `docs/21_EXECUTION_PLANS_STATUS_AND_EVIDENCE.md`
- `docs/22_REPOSITORY_HYGIENE_AND_CONTINUOUS_IMPROVEMENT.md`
- `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`
- `docs/24_PERSISTENCE_TRANSITION_AND_RECOVERY.md`

## What this packet does not do

This packet does not prescribe:
- a technology stack,
- a framework,
- a programming language,
- a hosting provider,
- a database choice,
- a reverse proxy choice,
- a CI vendor,
- or a deployment platform.

It defines goals, rules, boundaries, defaults, and operational expectations only.

## Current executable foundation (Phase 1 in progress)

The repository now includes a first runnable application slice with:
- a Node.js service shell,
- SQLite persistence with schema migrations and deterministic seed import,
- Russian-only operational dashboard UI,
- deterministic packet fixtures loaded into DB on first bootstrap,
- health and readiness endpoints,
- structured JSON request logs,
- automated tests and smoke checks,
- and a Render blueprint for first deployment validation.

### Quickstart

```bash
./scripts/bootstrap.sh
npm start
```

Optional explicit DB bootstrap:

```bash
npm run db:init
```

Open:
- `http://127.0.0.1:3000/` (Russian dashboard UI)
- `http://127.0.0.1:3000/healthz`
- `http://127.0.0.1:3000/api/v1/dashboard/today`
- `http://127.0.0.1:3000/appointments/new` (единая страница записи; `?mode=walkin` для приема без записи)

Phase 1 reference-data APIs:
- `GET|POST /api/v1/employees`
- `GET|PATCH|DELETE /api/v1/employees/:id`
- `GET|POST /api/v1/bays`
- `GET|PATCH|DELETE /api/v1/bays/:id`
- `GET|POST /api/v1/customers`
- `GET|PATCH|DELETE /api/v1/customers/:id`
- `GET|POST /api/v1/vehicles`
- `GET|PATCH|DELETE /api/v1/vehicles/:id`
- `GET /api/v1/vehicles/:id/ownership-history`
- `GET|POST /api/v1/appointments`
- `GET|PATCH /api/v1/appointments/:id`
- `POST /api/v1/appointments/:id/convert-to-work-order`
- `POST /api/v1/intake/walk-ins`
- `GET /api/v1/work-orders`
- `GET|PATCH /api/v1/work-orders/:id`
- `GET /api/v1/work-orders/:id/parts-requests`
- `POST /api/v1/work-orders/:id/parts-requests`
- `PATCH /api/v1/work-orders/:id/parts-requests/:requestId`
- `POST /api/v1/work-orders/:id/parts-requests/:requestId/purchase-actions`
- `GET /api/v1/search?q=<term>` (быстрый поиск по клиенту/телефону/номеру/VIN/модели)

Phase 2/3 work-order UI:
- `GET /work-orders/active`
- `GET|POST /work-orders/:id`

Mutating API/page endpoints use one shared policy matrix (`src/http/mutationPolicy.js`):
- header: `Authorization: Bearer <token>` or `x-api-token`
- fallback for HTML form posts: `authToken` in form/query payload
- default local tokens: `owner-dev-token`, `frontdesk-dev-token`, `technician-dev-token`
- optional UI implicit role: `AUTH_UI_IMPLICIT_ROLE` (`front_desk` default, set `none` to force token-only UI mutations)
- role baseline:
  - `owner`: all mutations
  - `front_desk`: customers/vehicles/appointments/walk-ins mutations
  - `technician`: work-order lifecycle/parts mutations (API + page work-order forms)

Default local DB path:
- `data/auto-service.sqlite` (override with `DB_PATH`)

### Verification commands

```bash
npm run secrets:scan
npm run lint
npm run hygiene:check
npm test
npm run smoke
npm run verify
npm run audit:bloat
npm run db:backup-drill
npm run verify:render
npm run verify:full
```

Harness scripts auto-load `.env` and `.env.local` without overriding already exported environment variables.
Harness outputs written to stdout/stderr/files are redacted to avoid leaking API credentials.
Harness log policy defaults to compact step summaries; set `HARNESS_LOG_LEVEL=verbose` for full child-process logs.
App request logging can be tuned via `APP_REQUEST_LOG_MODE=all|mutations|errors` (default `errors` in production, `all` outside production).

CI quality gate:
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs `npm ci`, `npm run secrets:scan`, `npm run lint`, `npm run hygiene:check`, `npm test`, `npm run verify`, `npm run audit:bloat` on PRs and pushes to `main`.
- Render deploy checks remain opt-in (`npm run verify:render`) and are intentionally excluded from default CI.

`npm run verify` is self-contained:
- runs tests,
- boots an isolated app instance with a temporary SQLite database,
- runs smoke checks plus booking-page (`/appointments/new`), walk-in mode (`/appointments/new?mode=walkin`), scheduling/walk-in, and parts-flow scenarios,
- then stops the app automatically.

Render stage commands:
- `npm run verify:render`:
  - resolves expected commit (`RENDER_EXPECT_COMMIT` or local `git HEAD`), runs deploy-mode preflight (clean worktree + remote sync by default), enforces manual deploy policy by default, triggers deploy, waits `live`, verifies commit parity, runs smoke + non-destructive scenarios, and performs post-deploy log audit.
- `npm run render:policy:status` / `npm run render:policy:manual-deploy`: inspect or enforce manual deploy policy (`autoDeploy=no`, `autoDeployTrigger=off`).
- `npm run verify:full`: runs local `verify`, then `verify:render`.
- `npm run up:full`: installs dependencies, then runs the full local + deploy-aware verification sequence.
- `RENDER_API_KEY` is required for deploy-triggering mode (`RENDER_SKIP_DEPLOY=0`, default).

Render defaults and toggles:
- `RENDER_SERVICE_ID` default: `srv-d6vcmt7diees73d0j04g`
- `APP_BASE_URL` default: `https://auto-service-foundation.onrender.com`
- `RENDER_GIT_REMOTE` default: `origin`
- `RENDER_GIT_BRANCH` default: `main`
- `npm run verify:render -- --skip-deploy` explicitly skips deploy (CLI override wins over env)
- `npm run verify:render -- --deploy` explicitly forces deploy mode
- `RENDER_VERIFY_REQUIRE_CLEAN_WORKTREE=0` disables dirty-worktree fail-fast preflight (default enabled)
- `RENDER_VERIFY_REQUIRE_REMOTE_SYNC=0` disables remote branch sync fail-fast preflight (default enabled)
- `RENDER_VERIFY_REQUIRE_MANUAL_DEPLOY=0` disables strict manual deploy policy check (default enabled)
- scenario and log-audit gates are enabled by default in `verify:render`
- `RENDER_LOG_AUDIT_MODE=balanced|minimal|full` controls Render log-audit fetch strategy (default `balanced`)
- for full env matrix and all tuning knobs, use `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`

Scenario mode defaults:
- local base URL (`127.0.0.1`/`localhost`) => write mode
- non-local base URL => non-destructive read-only mode
- override with `SCENARIO_NON_DESTRUCTIVE=1|0` or `--non-destructive|--destructive` for `scenario:intake-page`, `scenario:scheduling-walkin`, and `scenario:parts-flow`

Smoke/scenario failures are emitted as machine-parseable JSON with step and request diagnostics.

### Bloat governance commands

- `npm run audit:bloat`:
  - computes tracked byte budgets by area,
  - reports largest tracked files,
  - measures JS duplication via `jscpd`,
  - validates hot-path doc line budgets (`README`, `STATUS`, `PLANS`),
  - and writes machine-readable output to `evidence/bloat-audit-latest.json`.
- Budget thresholds live in `data/bloat/budgets.json`.
- Ratchet override is explicit and temporary: run with `BLOAT_ALLOW_REGRESSION=1` only when intentionally accepting a short-term breach.
- Raw log payloads can be summarized/compressed with:

```bash
npm run evidence:summary -- --input evidence/example.raw.ndjson --output evidence/example.summary.json --gzip-raw --delete-input-after-gzip
```

### Spring cleanup commands

- canonical tracked evidence allowlist: `data/hygiene/evidence-canonical.json`
- `npm run cleanup:spring` runs deterministic dry-run analysis for tracked and untracked `evidence/` files
- `npm run cleanup:spring:apply` removes tracked evidence outside allowlist and prunes stale untracked `evidence/*`
- both commands emit machine-readable JSON with candidate/pruned counts, bytes, and file lists
### Persistence recovery drill

- `npm run db:backup-drill` performs a copy-and-verify backup/restore drill for SQLite:
  - copies DB to backup file,
  - compares schema version and per-table row counts,
  - fails fast when drift exceeds threshold.
- Override paths/threshold:

```bash
npm run db:backup-drill -- --db data/auto-service.sqlite --backup evidence/db-backup-drill.sqlite --max-row-drift 0
```
### Linear task harness commands

The harness includes a Playwright-backed Linear workflow (default transport) for environments where direct GraphQL access can be geo-blocked.

Required: `LINEAR_API_KEY` (harness auto-loads `.env` and `.env.local` without overriding already-exported env vars).
Probe workspace/team/state connectivity:

```bash
LINEAR_API_KEY="<key>" npm run linear:probe -- --team-key AUT --state Backlog
```

Create tasks from a spec file:

```bash
LINEAR_API_KEY="<key>" npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run
```

Sync existing tasks from a spec file into a target state:

```bash
LINEAR_API_KEY="<key>" npm run linear:sync -- --spec data/linear/workorder-epic-aut61-2026-03-22.json --state Done
```

- `data/linear/phase1-task-template.json`
- `data/linear/workorder-epic-aut61-2026-03-22.json`
- `linear:create` is idempotent by normalized title (skips existing tasks).
- `linear:sync` transitions matching tasks to the selected workflow state.

### Deployment docs

See:
- `render.yaml`
- `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`
