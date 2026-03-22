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
- `MASTER_CONTEXT_PACKET.md`

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
- `POST /api/v1/intake/walk-ins`
- `GET /api/v1/search?q=<term>` (быстрый поиск по клиенту/телефону/номеру/VIN/модели)

Default local DB path:
- `data/auto-service.sqlite` (override with `DB_PATH`)

### Verification commands

```bash
npm test
npm run smoke
npm run verify
npm run verify:render
npm run verify:full
```

`npm run verify` is self-contained:
- runs tests,
- boots an isolated app instance with a temporary SQLite database,
- runs smoke checks plus booking-page, walk-in-page, and scheduling/walk-in scenarios,
- then stops the app automatically.

Render stage commands:
- `npm run verify:render`:
  - triggers Render deploy for configured service,
  - waits for deploy to reach `live`,
  - verifies deploy commit matches expected local commit (`git HEAD` by default),
  - runs smoke against deployed URL,
  - runs non-destructive booking-page scenario against deployed URL,
  - runs non-destructive walk-in-page scenario against deployed URL,
  - runs non-destructive scheduling+walk-in scenario against deployed URL,
  - and runs a post-deploy Render build/runtime log audit.
- `npm run verify:full`:
  - runs local `verify`,
  - then runs `verify:render`.
- `npm run up:full`:
  - installs dependencies,
  - runs the full local + deploy-aware verification sequence.
- `RENDER_API_KEY` is required for deploy-triggering mode (`RENDER_SKIP_DEPLOY=0`, default).

Render env defaults:
- `RENDER_SERVICE_ID` default: `srv-d6vcmt7diees73d0j04g`
- `APP_BASE_URL` default: `https://auto-service-foundation.onrender.com`
- `RENDER_USE_RESOLVE=1` by default (uses `curl --resolve api.render.com:443:216.24.57.7` for API reliability in this environment)
- `RENDER_SKIP_DEPLOY=1` to run deployed smoke without triggering a new deploy
- `RENDER_DEPLOY_TIMEOUT_MS`, `RENDER_DEPLOY_POLL_INTERVAL_MS` to tune wait behavior
- `RENDER_VERIFY_COMMIT_PARITY=1` by default; set `RENDER_EXPECT_COMMIT=<sha>` to pin expected commit explicitly
- `RENDER_VERIFY_INCLUDE_BOOKING_SCENARIO=1` by default (runs deployed read-only booking-page scenario gate)
- `RENDER_VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO=1` by default (runs deployed read-only walk-in-page scenario gate)
- `RENDER_VERIFY_INCLUDE_SCENARIO=1` by default (runs deployed read-only scenario gate)
- `RENDER_SMOKE_MAX_ATTEMPTS=3` and `RENDER_SMOKE_RETRY_DELAY_MS=10000` by default (retry smoke after deploy to absorb rollout lag)
- `RENDER_VERIFY_LOG_AUDIT=1` by default (runs post-deploy log audit)
- `RENDER_LOG_AUDIT_LIMIT=1000` per log type (`build` + `app`)
- `RENDER_LOG_AUDIT_MAX_WARNINGS=0`, `RENDER_LOG_AUDIT_MAX_ERRORS=0`, `RENDER_LOG_AUDIT_MAX_REPO_WARNINGS=0`
- `RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION=1` by default

Scenario mode defaults:
- local base URL (`127.0.0.1`/`localhost`) => write mode
- non-local base URL => non-destructive read-only mode
- override with `SCENARIO_NON_DESTRUCTIVE=1|0` or `--non-destructive|--destructive` for `scenario:booking-page`, `scenario:walkin-page`, and `scenario:scheduling-walkin`

Smoke/scenario failures are emitted as machine-parseable JSON with step and request diagnostics.

### Linear task harness commands

The harness includes a Playwright-backed Linear workflow (default transport) for environments where direct GraphQL access can be geo-blocked.

Required:
- `LINEAR_API_KEY`

Probe workspace/team/state connectivity:

```bash
LINEAR_API_KEY="<key>" npm run linear:probe -- --team-key AUT --state Backlog
```

Create tasks from a spec file:

```bash
LINEAR_API_KEY="<key>" npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run
```

Template spec:
- `data/linear/phase1-task-template.json`

### Deployment docs

See:
- `render.yaml`
- `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`
