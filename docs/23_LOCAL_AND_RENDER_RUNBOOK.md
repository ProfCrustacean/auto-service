# 23 — Local and Render Runbook

## Purpose

Define deterministic bootstrap, local verification, and Render deployment path for the Phase 0 foundation slice.

## Local bootstrap

From a clean checkout:

```bash
./scripts/bootstrap.sh
npm start
```

Optional explicit DB bootstrap:

```bash
npm run db:init
```

Service defaults:
- URL: `http://127.0.0.1:3000`
- Health: `GET /healthz`
- Readiness: `GET /readyz`
- Dashboard JSON: `GET /api/v1/dashboard/today`
- Employee CRUD API: `GET|POST /api/v1/employees`, `GET|PATCH|DELETE /api/v1/employees/:id`
- Bay CRUD API: `GET|POST /api/v1/bays`, `GET|PATCH|DELETE /api/v1/bays/:id`
- Customer CRUD API: `GET|POST /api/v1/customers`, `GET|PATCH|DELETE /api/v1/customers/:id`
- Vehicle CRUD API: `GET|POST /api/v1/vehicles`, `GET|PATCH|DELETE /api/v1/vehicles/:id`
- Vehicle ownership history API: `GET /api/v1/vehicles/:id/ownership-history`
- Appointment API: `GET|POST /api/v1/appointments`, `GET|PATCH /api/v1/appointments/:id`
- Appointment conversion API: `POST /api/v1/appointments/:id/convert-to-work-order`
- Walk-in intake API: `POST /api/v1/intake/walk-ins`
- Work-order lifecycle API: `GET /api/v1/work-orders`, `GET|PATCH /api/v1/work-orders/:id`
- Work-order parts API:
  - `GET /api/v1/work-orders/:id/parts-requests`
  - `POST /api/v1/work-orders/:id/parts-requests`
  - `PATCH /api/v1/work-orders/:id/parts-requests/:requestId`
  - `POST /api/v1/work-orders/:id/parts-requests/:requestId/purchase-actions`
- Unified lookup API: `GET /api/v1/search?q=<term>` (customer/phone/plate/VIN/model)
- Russian dashboard UI: `GET /`
- Work-order lifecycle/parts UI: `GET /work-orders/active`, `GET|POST /work-orders/:id`, plus parts forms under `/work-orders/:id/parts-requests*`
- DB path: `data/auto-service.sqlite` (override with `DB_PATH`)
- SQLite runtime pragmas: `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL`, `busy_timeout=1000ms` (override timeout via `SQLITE_BUSY_TIMEOUT_MS`)
- Unified mutation policy baseline for API + page form mutations:
  - send `Authorization: Bearer <token>` (or `x-api-token`)
  - form fallback token (`authToken`) is accepted for HTML POST flows
  - default local tokens: `owner-dev-token`, `frontdesk-dev-token`, `technician-dev-token`
  - override via `AUTH_OWNER_TOKEN`, `AUTH_FRONT_DESK_TOKEN`, `AUTH_TECHNICIAN_TOKEN`
  - `AUTH_UI_IMPLICIT_ROLE` controls UI fallback actor (`front_desk` default, `none` disables implicit UI role)
  - disable only for local diagnostics with `AUTH_ENABLED=0`

## Local verification

Automated checks:

```bash
npm run secrets:scan
npm run lint
npm run hygiene:check
npm test
```

Smoke checks against a running instance:

```bash
npm run smoke
```

Combined local verification:

```bash
npm run verify
npm run audit:bloat
npm run db:backup-drill
```

Repository hygiene dry-run/apply:

```bash
npm run cleanup:spring
npm run cleanup:spring:apply
```

Harness scripts auto-load `.env` and `.env.local` without overriding explicitly exported environment variables.
Harness outputs written to stdout/stderr/files are redacted before persistence to avoid credential leakage.

`npm run verify` is self-contained:
- does not require a pre-started local server,
- starts a temporary isolated app instance and DB,
- runs test + smoke + booking-page + walk-in-page + scheduling/walk-in + parts-flow scenario checks,
- and shuts down automatically.

Optional toggles:
- `VERIFY_INCLUDE_BOOKING_SCENARIO=0 npm run verify` (skip booking-page scenario check)
- `VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO=0 npm run verify` (skip walk-in-page scenario check)
- `VERIFY_INCLUDE_SCENARIO=0 npm run verify` (skip scenario check)
- `VERIFY_INCLUDE_PARTS_SCENARIO=0 npm run verify` (skip parts-flow scenario check)
- `npm run scenario:booking-page` defaults to read-only mode on non-local URLs and write mode on local URLs.
- `SCENARIO_NON_DESTRUCTIVE=1 npm run scenario:booking-page` or `npm run scenario:booking-page -- --non-destructive` (force read-only mode)
- `SCENARIO_NON_DESTRUCTIVE=0 npm run scenario:booking-page` or `npm run scenario:booking-page -- --destructive` (force write mode)
- `npm run scenario:walkin-page` defaults to read-only mode on non-local URLs and write mode on local URLs.
- `SCENARIO_NON_DESTRUCTIVE=1 npm run scenario:walkin-page` or `npm run scenario:walkin-page -- --non-destructive` (force read-only mode)
- `SCENARIO_NON_DESTRUCTIVE=0 npm run scenario:walkin-page` or `npm run scenario:walkin-page -- --destructive` (force write mode)
- `npm run scenario:scheduling-walkin` defaults to read-only mode on non-local URLs and write mode on local URLs.
- `SCENARIO_NON_DESTRUCTIVE=1 npm run scenario:scheduling-walkin` or `npm run scenario:scheduling-walkin -- --non-destructive` (force read-only mode)
- `SCENARIO_NON_DESTRUCTIVE=0 npm run scenario:scheduling-walkin` or `npm run scenario:scheduling-walkin -- --destructive` (force write mode)
- `npm run scenario:parts-flow` defaults to read-only mode on non-local URLs and write mode on local URLs.
- `SCENARIO_NON_DESTRUCTIVE=1 npm run scenario:parts-flow` or `npm run scenario:parts-flow -- --non-destructive` (force read-only mode)
- `SCENARIO_NON_DESTRUCTIVE=0 npm run scenario:parts-flow` or `npm run scenario:parts-flow -- --destructive` (force write mode)

Two-stage gate policy:
- day-to-day change gate: `npm run verify` (local, fast, deterministic)
- release/milestone gate: `npm run verify:full` (local gate + Render deploy-and-smoke)
- bootstrap + release gate shortcut: `npm run up:full`

CI gate:
- GitHub Actions workflow: `.github/workflows/ci.yml`
- executes `npm ci`, `npm run secrets:scan`, `npm run lint`, `npm run hygiene:check`, `npm test`, `npm run verify`, `npm run audit:bloat`
- does not require external secrets for default path
- uploads `evidence/ci-*.txt`, `evidence/bloat-audit-latest.json`, and `evidence/verify-server.log` when checks fail

Scenario fixture assumptions (current):
- Smoke checks validate API/UI contracts (including unified lookup) and summary-to-array consistency instead of fixed seeded counts.
- Booking-page scenario validates `/appointments/new` read/write behavior locally and non-destructive behavior remotely.
- Walk-in-page scenario validates `/intake/walk-in` read/write behavior locally and non-destructive behavior remotely.
- Scheduling/walk-in scenario resolves customers/vehicles/bays/employees dynamically from live API data.
- Scheduling/walk-in scenario also validates appointment -> work-order conversion idempotency and lifecycle transitions (`scheduled -> in_progress -> ready_pickup`).
- Parts-flow scenario validates blocking parts request lifecycle (`requested -> received/substituted`), work-order gating, and replacement request creation.
- In write mode, if no customer/vehicle exists, the scenario provisions the minimum required records before creating appointment/walk-in entries.
- Bays/employees are optional in scenario payloads; they are used only when available.
- Smoke/scenario failure output is structured JSON and includes step, method/path, URL, response status, and parsed payload when available.

## Linear task operations (harness)

Use the harness CLI when investigation findings need to be turned into Linear cards without manual click-ops.

Required:
- `LINEAR_API_KEY`
- Harness auto-loads `.env` and `.env.local` (without overriding explicitly exported env vars).

Commands:

```bash
LINEAR_API_KEY="<key>" npm run linear:probe -- --team-key AUT --state Backlog
LINEAR_API_KEY="<key>" npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run
LINEAR_API_KEY="<key>" npm run linear:sync -- --spec data/linear/workorder-epic-aut61-2026-03-22.json --state Done
```

Notes:
- default transport is `playwright` to bypass geo-restricted direct API paths observed in this environment.
- override transport only when needed: `--transport direct` or `--transport auto`.
- `linear:create` is idempotent by issue title within the sampled team issue window (`--issues-limit`, default `250`); existing titles are skipped.
- `linear:sync` matches issues by normalized title from the spec and transitions them to the selected workflow state.

## Render deployment (temporary validation)

Configuration is in `render.yaml`.

Expected setup in Render:
1. Create a Blueprint from the repository root.
2. Confirm service `auto-service-foundation` and runtime `node`.
3. Deploy and wait for health check `/healthz` to pass.
4. Open the Render URL (temporary domain is acceptable for validation).
5. Run smoke check against deployed URL:

```bash
APP_BASE_URL="https://<render-hostname>" npm run smoke
```

Automated deploy-and-smoke gate:

```bash
RENDER_API_KEY="<key>" npm run verify:render
```

Behavior:
- triggers deploy for `RENDER_SERVICE_ID` (default `srv-d6vcmt7diees73d0j04g`)
- polls deploy until `live` (configurable timeout/interval)
- asserts deploy commit parity against expected commit (`git HEAD` by default)
- runs `npm run smoke` against `APP_BASE_URL` (default service URL)
- runs `npm run scenario:booking-page -- --non-destructive` against deployed URL
- runs `npm run scenario:walkin-page -- --non-destructive` against deployed URL
- runs `npm run scenario:scheduling-walkin -- --non-destructive` against deployed URL
- runs `npm run scenario:parts-flow -- --non-destructive` against deployed URL
- audits Render build/app logs for warn/error/repo-access signals in the deploy window
- deploy-triggering mode requires `RENDER_API_KEY`

Useful toggles:
- `RENDER_SKIP_DEPLOY=1` → smoke deployed URL without triggering a new deploy
- `npm run verify:render -- --skip-deploy` → explicit CLI deploy skip override
- `npm run verify:render -- --deploy` → explicit CLI deploy mode override
- `RENDER_USE_RESOLVE=0` → disable `curl --resolve` workaround
- `RENDER_RESOLVE_IP=<ip>` → override resolve IP (default `216.24.57.7`)
- `RENDER_DEPLOY_TIMEOUT_MS=<ms>` and `RENDER_DEPLOY_POLL_INTERVAL_MS=<ms>` → tune polling
- `RENDER_VERIFY_COMMIT_PARITY=0` → disable deploy commit parity check (default enabled)
- `RENDER_EXPECT_COMMIT=<sha>` → override expected commit for parity check
- `RENDER_VERIFY_INCLUDE_BOOKING_SCENARIO=0` → skip deployed non-destructive booking scenario check
- `RENDER_VERIFY_INCLUDE_WALKIN_PAGE_SCENARIO=0` → skip deployed non-destructive walk-in scenario check
- `RENDER_VERIFY_INCLUDE_SCENARIO=0` → skip deployed non-destructive scenario check
- `RENDER_VERIFY_INCLUDE_PARTS_SCENARIO=0` → skip deployed non-destructive parts-flow scenario check
- `RENDER_SMOKE_MAX_ATTEMPTS=<n>` and `RENDER_SMOKE_RETRY_DELAY_MS=<ms>` → retry deployed smoke checks after promotion (defaults `3` and `10000`)
- `RENDER_VERIFY_LOG_AUDIT=0` → skip post-deploy log audit
- `RENDER_LOG_AUDIT_LIMIT=<n>` → per-type (`build`/`app`) log row cap (default `1000`)
- `RENDER_LOG_AUDIT_MAX_WARNINGS=<n>` / `RENDER_LOG_AUDIT_MAX_ERRORS=<n>` / `RENDER_LOG_AUDIT_MAX_REPO_WARNINGS=<n>` → audit thresholds (default `0`)
- `RENDER_LOG_AUDIT_FAIL_ON_TRUNCATION=0` → do not fail when log API reports `hasMore=true`
- `RENDER_LOG_AUDIT_SUMMARY_PATH=<path>` → summary output path (default `evidence/render-log-audit-summary.json`)
- `RENDER_LOG_AUDIT_WRITE_RAW=1` → enable debug raw log artifact output (default disabled)
- `RENDER_LOG_AUDIT_GZIP_RAW=0` → disable gzip for raw output when raw logging is enabled
- `RENDER_LOG_AUDIT_RAW_PATH=<path>` → raw output base path (default `evidence/render-log-audit.raw.ndjson`)

### Current validated Render target (2026-03-21)

- service id: `srv-d6vcmt7diees73d0j04g`
- URL: `https://auto-service-foundation.onrender.com`
- first live deploy id: `dep-d6vcmtvdiees73d0j0fg`

### API connectivity caveat for this local environment

In this machine context, direct requests to `api.render.com` intermittently timed out.

This workaround succeeded reliably for API calls:

```bash
curl --resolve api.render.com:443:216.24.57.7 ...
```

Treat this as an environment-specific workaround, not a product requirement.

Direct requests to `api.linear.app/graphql` from this machine context can also be blocked with:
- `RESTRICTED_COUNTRY_BLOCKED` / `Linear is not available in Russia.`

Harness default (`--transport playwright`) is the documented workaround path for task creation and status probing.

For log API queries, include `ownerId` explicitly, otherwise Render returns:
`{"message":"ownerId is required"}`.

Example:

```bash
curl --resolve api.render.com:443:216.24.57.7 \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/logs?ownerId=<team-id>&resource=<service-id>&type=build&startTime=<iso>&endTime=<iso>&limit=1000"
```

## Recovery path

If deployment fails:
1. Check Render build and runtime logs.
2. Roll back to the previous healthy Render deployment revision.
3. Re-run smoke verification.
4. Record incident details in `STATUS.md` evidence section.

If lifecycle logic regresses after deployment:
1. Roll back to the previous healthy deployment revision.
2. Re-run `npm run verify:render` to confirm recovery.
3. Re-apply critical status corrections through `PATCH /api/v1/work-orders/:id` with explicit `reason` values so audit history remains intact.

If parts-flow data is entered incorrectly:
1. Stop further edits on the affected work-order until current state is confirmed.
2. Use `PATCH /api/v1/work-orders/:id/parts-requests/:requestId` with explicit `reason` for status correction.
3. If substitution chain was incorrect, mark bad request as `cancelled` and create a new replacement request via `POST /api/v1/work-orders/:id/parts-requests`.
4. Re-run `npm run scenario:parts-flow -- --non-destructive` (or full `npm run verify:render`) against target environment.

## Known current limits

- Token auth is baseline only (single-token roles, no rotation service, no identity provider integration).
- SQLite file persistence only (single-node local file model).
- Render deployment execution requires account/project access not stored in repository.
