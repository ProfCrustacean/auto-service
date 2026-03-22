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
- Walk-in intake API: `POST /api/v1/intake/walk-ins`
- Unified lookup API: `GET /api/v1/search?q=<term>` (customer/phone/plate/VIN/model)
- Russian dashboard UI: `GET /`
- DB path: `data/auto-service.sqlite` (override with `DB_PATH`)

## Local verification

Automated checks:

```bash
npm test
```

Smoke checks against a running instance:

```bash
npm run smoke
```

Combined local verification:

```bash
npm run verify
```

`npm run verify` is self-contained:
- does not require a pre-started local server,
- starts a temporary isolated app instance and DB,
- runs test + smoke + scheduling/walk-in scenario checks,
- and shuts down automatically.

Optional toggles:
- `VERIFY_INCLUDE_SCENARIO=0 npm run verify` (skip scenario check)
- `npm run scenario:scheduling-walkin` defaults to read-only mode on non-local URLs and write mode on local URLs.
- `SCENARIO_NON_DESTRUCTIVE=1 npm run scenario:scheduling-walkin` or `npm run scenario:scheduling-walkin -- --non-destructive` (force read-only mode)
- `SCENARIO_NON_DESTRUCTIVE=0 npm run scenario:scheduling-walkin` or `npm run scenario:scheduling-walkin -- --destructive` (force write mode)

Two-stage gate policy:
- day-to-day change gate: `npm run verify` (local, fast, deterministic)
- release/milestone gate: `npm run verify:full` (local gate + Render deploy-and-smoke)
- bootstrap + release gate shortcut: `npm run up:full`

Scenario fixture assumptions (current):
- Smoke checks validate API/UI contracts (including unified lookup) and summary-to-array consistency instead of fixed seeded counts.
- Scheduling/walk-in scenario resolves customers/vehicles/bays/employees dynamically from live API data.
- In write mode, if no customer/vehicle exists, the scenario provisions the minimum required records before creating appointment/walk-in entries.
- Bays/employees are optional in scenario payloads; they are used only when available.
- Smoke/scenario failure output is structured JSON and includes step, method/path, URL, response status, and parsed payload when available.

## Linear task operations (harness)

Use the harness CLI when investigation findings need to be turned into Linear cards without manual click-ops.

Required:
- `LINEAR_API_KEY`

Commands:

```bash
LINEAR_API_KEY="<key>" npm run linear:probe -- --team-key AUT --state Backlog
LINEAR_API_KEY="<key>" npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run
```

Notes:
- default transport is `playwright` to bypass geo-restricted direct API paths observed in this environment.
- override transport only when needed: `--transport direct` or `--transport auto`.
- `linear:create` is idempotent by issue title within the sampled team issue window (`--issues-limit`, default `250`); existing titles are skipped.

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
- runs `npm run smoke` against `APP_BASE_URL` (default service URL)
- deploy-triggering mode requires `RENDER_API_KEY`

Useful toggles:
- `RENDER_SKIP_DEPLOY=1` → smoke deployed URL without triggering a new deploy
- `RENDER_USE_RESOLVE=0` → disable `curl --resolve` workaround
- `RENDER_RESOLVE_IP=<ip>` → override resolve IP (default `216.24.57.7`)
- `RENDER_DEPLOY_TIMEOUT_MS=<ms>` and `RENDER_DEPLOY_POLL_INTERVAL_MS=<ms>` → tune polling

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

## Known current limits

- No production auth yet.
- SQLite file persistence only (single-node local file model).
- Render deployment execution requires account/project access not stored in repository.
