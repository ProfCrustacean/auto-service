# 23 — Local and Render Runbook

## Purpose

Define deterministic bootstrap, local verification, and Render deployment path for the Phase 0 foundation slice.

## Local bootstrap

From a clean checkout:

```bash
./scripts/bootstrap.sh
npm start
```

Service defaults:
- URL: `http://127.0.0.1:3000`
- Health: `GET /healthz`
- Readiness: `GET /readyz`
- Dashboard JSON: `GET /api/v1/dashboard/today`
- Russian dashboard UI: `GET /`

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

## Recovery path

If deployment fails:
1. Check Render build and runtime logs.
2. Roll back to the previous healthy Render deployment revision.
3. Re-run smoke verification.
4. Record incident details in `STATUS.md` evidence section.

## Known current limits

- No production auth yet.
- No persistent transactional storage yet (seed fixtures only).
- Render deployment execution requires account/project access not stored in repository.
