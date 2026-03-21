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
