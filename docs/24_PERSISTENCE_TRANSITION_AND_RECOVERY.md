# 24 — Persistence Transition and Recovery

## Purpose

Define a deterministic path from the current single-node SQLite baseline to a future VPS database target, while keeping rollback and recovery simple.

## Current baseline

- Runtime database: SQLite (`data/auto-service.sqlite` by default).
- Migrations: `src/persistence/migrations.js` via `runMigrations`.
- Seeding: `seedDatabase` with fixture integrity validation (`validateSeedFixtures`).

## Transition plan (SQLite -> VPS DB)

1. Contract lock:
   - keep repository methods as the data access boundary,
   - do not leak raw SQL into services/routes.
2. Dual-environment verification:
   - preserve all current tests against SQLite,
   - add adapter parity tests for target DB implementation before cutover.
3. Cutover phases:
   - phase A: read/write parity in staging,
   - phase B: shadow verification for critical queries,
   - phase C: production switch with rollback toggle.
4. Rollback:
   - keep SQLite snapshot backup until post-cutover stabilization window ends,
   - restore app to previous DB target + replay bounded delta if required.

## Backup/restore drill

Run a deterministic drill before migration milestones and before risky schema updates:

```bash
npm run db:backup-drill
```

Explicit paths/threshold:

```bash
npm run db:backup-drill -- --db data/auto-service.sqlite --backup evidence/db-backup-drill.sqlite --max-row-drift 0
```

What it verifies:

- backup file exists and is non-empty,
- latest schema version matches source DB,
- per-table row counts match source (or stay within configured drift threshold).

## Seed integrity guard

`seedDatabase` now validates fixture integrity before writes:

- required top-level structures exist,
- IDs are unique where required,
- cross-entity references (customer/vehicle/appointment/intake/work-order) are valid.

If validation fails, seeding aborts with a single integrity error payload.
