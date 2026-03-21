# PLANS.md

## Purpose

This file holds living execution plans for non-trivial work.

Codex must use it for features, multi-step fixes, integrations, deployment changes, environment setup, substantial refactors, or any task that benefits from an explicit long-horizon plan.

Treat this file as a working design-and-execution document.

## General rule

Before starting non-trivial work:
1. restate the objective,
2. validate the current state,
3. write or update the active plan,
4. and only then implement.

## What an execution plan must contain

Each active plan should contain, at minimum:

1. **Objective**
   - What is being changed and why now.

2. **Task boundary**
   - What is in scope.
   - What is explicitly out of scope for this plan.

3. **Current-state validation**
   - What currently exists.
   - What currently fails or is missing.
   - What evidence confirms that starting point.

4. **Constraints**
   - Relevant rules from the packet.
   - Important defaults.
   - Deployment or environment limits.
   - Verification requirements.

5. **Target outcome**
   - What “done” means for this plan.
   - Which acceptance criteria it must satisfy.

6. **Implementation slices**
   - Small ordered steps.
   - Each slice should be independently understandable and preferably testable.

7. **Verification plan**
   - Which automated checks will run.
   - Which end-to-end flow(s) will be driven.
   - What evidence will be captured.

8. **Deployment and update plan**
   - How the change reaches a runnable environment.
   - Any migration, rollout, or rollback needs.

9. **Risks and fallback**
   - Main failure modes.
   - What the agent will do if the planned path fails.

10. **Progress log**
    - Completed steps.
    - Failures.
    - Repairs.
    - Current next step.

## Active plan template

Use this template for the active plan:

---

## Active Plan — [short title]

### Objective

### Why now

### Scope

### Out of scope

### Current-state validation

### Relevant packet rules and defaults

### Target outcome

### Ordered execution slices
1.
2.
3.

### Verification and evidence plan

### Deployment / update plan

### Risks and fallback plan

### Progress log

### Completion checkpoint

---

## Completed Plan — AUT-8 Customers and Vehicles CRUD API (2026-03-21)

### Objective

Deliver Phase 1 CRUD APIs for customers and vehicles with explicit ownership linkage and test-proven snapshot-preservation behavior.

### Why now

`AUT-7` completed reference-data CRUD for employees/bays. `AUT-8` is the next prerequisite for intake and scheduling flows that depend on customer and vehicle records.

### Scope

- Implement customer CRUD API endpoints with validation boundaries.
- Implement vehicle CRUD API endpoints with owner linkage to customers.
- Add vehicle ownership-history tracking for owner reassignment.
- Add list filtering/search query support aligned with existing indexed fields.
- Add tests covering CRUD behavior and ownership/snapshot rules.
- Re-run local and deployed verification and update project state/evidence.

### Out of scope

- Appointment lifecycle APIs.
- Walk-in intake APIs.
- UI forms for customer/vehicle management.
- Auth/permissions enforcement.

### Current-state validation

- API currently supports dashboard + employee/bay CRUD only.
- Customers/vehicles exist in DB but only read via dashboard repository methods.
- No ownership-history table or API behavior exists yet.

### Relevant packet rules and defaults

- Preserve historical business snapshots (work-order-time facts remain stable).
- Keep operational state explicit and deterministic.
- Use small testable slices with evidence-backed acceptance.
- Keep repository and state docs synchronized after completion.

### Target outcome

- `/api/v1/customers` and `/api/v1/vehicles` expose CRUD with stable error contracts.
- Vehicle owner changes are trackable through ownership history.
- Tests prove customer/vehicle edits do not rewrite existing work-order snapshots.
- Local + Render verification pass, with evidence and state updates recorded.

### Ordered execution slices

1. Extend schema with ownership-history storage and seed/bootstrap updates.
2. Extend SQLite repository with customer/vehicle CRUD + search + ownership-history methods.
3. Add service and route layer for customer/vehicle endpoints with explicit validators.
4. Add tests for CRUD, owner reassignment history, and snapshot-preservation rule.
5. Run local verification and capture evidence.
6. Deploy to Render, run deployed smoke + CRUD smoke + browser checks, capture evidence.
7. Update `PLANS.md`, `STATUS.md`, and Linear issue state/comments.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- local browser snapshot: `evidence/browser-snapshot.md`
- local API payloads for customer/vehicle endpoints in `evidence/`
- Render deploy + poll to live
- deployed smoke and API payload captures
- deployed browser snapshot

### Deployment / update plan

- Push implementation commit to `main`.
- Trigger Render deploy for `srv-d6vcmt7diees73d0j04g`.
- Validate deployment and endpoint behavior.
- Keep rollback path via previous live deployment.

### Risks and fallback plan

- Owner reassignment could break foreign-key assumptions:
  - require customer existence before write and preserve relational checks.
- Snapshot rule could regress inadvertently:
  - add explicit test that work-order snapshots remain unchanged after profile edits.
- Search behavior could become inconsistent:
  - centralize query parsing/validation in route validators.

### Progress log

- 2026-03-21: Plan opened for AUT-8; Linear issue moved to `In Progress`.
- 2026-03-21: Added migration `003` for vehicle ownership history and updated seed path with initial ownership entries.
- 2026-03-21: Extended SQLite repository with customer/vehicle CRUD, search filters, owner reassignment tracking, and ownership-history reads.
- 2026-03-21: Added customer/vehicle service and API routes with explicit validators and stable error contract behavior.
- 2026-03-21: Added integration tests for CRUD, ownership history, and work-order snapshot preservation (`tests/customerVehicleCrud.test.js`).
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`, browser snapshot, local CRUD evidence).
- 2026-03-21: Render deploy `dep-d6vehq9r0fns73c89pc0` reached `live` for commit `5d6ef0b`.
- 2026-03-21: Deployed smoke, API checks, browser snapshot, and deployed CRUD smoke passed.
- 2026-03-21: Linear `AUT-8` moved to `Done` with evidence comment.

### Completion checkpoint

Completed on 2026-03-21:
- customer/vehicle CRUD API contracts implemented,
- ownership linkage and history behavior implemented,
- snapshot-preservation rule verified by tests,
- local and deployed verification passed,
- evidence captured and project state updated.

## Completed Plan — AUT-7 Employees and Bays CRUD API (2026-03-21)

### Objective

Deliver Phase 1 API CRUD support for employees and bays with explicit validation boundaries and stable error contracts.

### Why now

`AUT-6` established persistence and migrations; `AUT-7` is the next dependency for scheduling/intake workflows that require managed staff and bay records.

### Scope

- Implement REST APIs for employees and bays:
  - create,
  - list,
  - get by id,
  - update,
  - delete (soft deactivation to preserve history).
- Add request validation and stable JSON error shape for invalid or conflicting inputs.
- Add repository methods required for these APIs on top of SQLite.
- Add tests covering successful CRUD paths and validation/error responses.
- Re-run local and deployed verification and capture evidence.

### Out of scope

- Customer/vehicle CRUD (`AUT-8`).
- Appointment lifecycle and walk-in APIs (`AUT-9`, `AUT-10`).
- Auth/permission enforcement.
- UI forms for employee/bay management.

### Current-state validation

- Current app serves dashboard/read-only endpoints and placeholder detail routes.
- SQLite repository currently has read methods only for employees/bays.
- No API endpoints for employee/bay mutation exist.

### Relevant packet rules and defaults

- Preserve history and avoid silent destructive behavior.
- Keep business state explicit and validation boundaries mechanical.
- Keep slices small, end-to-end verifiable, and evidence-backed.
- Keep user-facing product UI Russian-only; API internals/docs remain English.

### Target outcome

- `/api/v1/employees` and `/api/v1/bays` support full CRUD semantics with soft-delete behavior.
- Validation failures return deterministic structured errors and are covered by tests.
- Existing dashboard behavior remains intact.
- Local and Render verification paths pass with updated evidence.

### Ordered execution slices

1. Extend SQLite repository with employee/bay create/read/update/deactivate methods.
2. Add API validation helpers and deterministic error response contract.
3. Add employee and bay CRUD routes in Express app.
4. Add automated integration tests for happy paths and validation/conflict/not-found errors.
5. Run local verification and capture evidence.
6. Deploy to Render, run deployed smoke/browser checks, capture evidence, update state files, and close Linear issue.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- local browser snapshot: `evidence/browser-snapshot.md`
- Render deploy for `srv-d6vcmt7diees73d0j04g`
- deployed smoke: `APP_BASE_URL=https://auto-service-foundation.onrender.com npm run smoke`
- deployed browser snapshot: `evidence/render-browser-snapshot.md`
- deployment and API outputs in `evidence/`

### Deployment / update plan

- Commit changes to `main` and push.
- Trigger Render deploy via API and poll to `live`.
- Re-run deployed smoke and browser checks.
- If deploy fails, keep previous live revision and record failure evidence.

### Risks and fallback plan

- Name uniqueness collisions (bays) could produce DB constraint errors:
  - map to stable API `conflict` errors with message and field.
- Hard-delete could break historical references:
  - use soft-delete (`isActive=false`) and keep record visibility options explicit.
- Validation drift risk:
  - centralize request validators and cover negative cases in tests.

### Progress log

- 2026-03-21: Plan opened for AUT-7; Linear issue moved to `In Progress`.
- 2026-03-21: Added API validation boundary helpers and stable error contract utilities.
- 2026-03-21: Extended SQLite repository with employee/bay mutation methods and filtering support.
- 2026-03-21: Added employee and bay CRUD routes with soft-delete semantics (`isActive=false`).
- 2026-03-21: Added migration `002` for bay timestamps and updated seed insertion path.
- 2026-03-21: Added integration coverage for CRUD + validation boundaries (`tests/referenceCrud.test.js`).
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`, browser snapshot).
- 2026-03-21: Render deploy `dep-d6ve6mf5r7bs73ep6rmg` reached `live` for commit `5b7b4a0`; deployed smoke and browser checks passed.
- 2026-03-21: Deployed API CRUD smoke passed on Render (`evidence/render-crud-smoke.json`) with create→update→soft-delete for both employee and bay.
- 2026-03-21: Linear `AUT-7` moved to `Done` with implementation and evidence comment.

### Completion checkpoint

Completed on 2026-03-21:
- employee and bay CRUD API contracts implemented,
- validation and conflict error boundaries test-covered,
- local and deployed verification passed,
- evidence captured and project state updated.

## Completed Plan — AUT-6 Persistent Data Model and Migrations (2026-03-21)

### Objective

Implement the first persistent data foundation for Phase 1 scheduling/intake by introducing SQLite schema migrations, deterministic seed import, and runtime repository wiring.

### Why now

Phase 1 work cannot proceed safely on fixture-only in-memory reads. We need a migration-backed storage boundary before CRUD, appointment lifecycle, and walk-in APIs.

### Scope

- Introduce SQLite runtime persistence with explicit migration tracking.
- Create initial schema covering scheduling/intake entities:
  - employees,
  - bays,
  - customers,
  - vehicles,
  - appointments,
  - intake_events.
- Preserve current dashboard slice by storing/reading compatible work-order and service metadata fields.
- Seed database from existing deterministic fixture packet.
- Switch runtime repository reads from raw fixture file to SQLite-backed queries.
- Add focused automated tests for migration and seed behavior.
- Re-run local and deployed verification and capture evidence.

### Out of scope

- New CRUD HTTP endpoints for Phase 1 entities.
- Auth/permissions implementation.
- Weekly board UI and advanced search API behavior.
- Non-SQLite production data backends.

### Current-state validation

- Current runtime uses `FixtureRepository` over JSON file reads only.
- No migration framework or persistent transactional storage exists yet.
- Current accepted deployed commit is `aaca232` with dashboard UX slice complete.

### Relevant packet rules and defaults

- Every meaningful slice must be runnable and verified with evidence.
- Keep history and state explicit; avoid hidden operational behavior.
- Use small verifiable slices and maintain `STATUS.md` + `PLANS.md`.
- Russian-only user-facing copy remains in effect.
- Render remains the approved temporary deployment target.

### Target outcome

- App startup reliably creates/updates schema and seeds baseline data.
- Dashboard and detail routes continue to function with DB-backed repository.
- Local and deployed smoke checks pass on the new storage path.
- Evidence and state documents reflect the new persistence baseline.

### Ordered execution slices

1. Add DB connection and migration runner modules using `node:sqlite`.
2. Add initial schema migration for Phase 1 base entities and compatibility records.
3. Add deterministic seed importer from `data/seed-fixtures.json` with idempotent behavior.
4. Implement SQLite repository adapter matching current dashboard service contract.
5. Wire startup to run migrations and seed, then serve via SQLite repository.
6. Add/adjust tests for migration + seeded runtime behavior.
7. Run local verification and capture evidence.
8. Deploy to Render, run deployed verification, capture evidence, and update records.

### Verification and evidence plan

- `npm test`
- `npm run smoke`
- local browser smoke snapshot into `evidence/browser-snapshot.md`
- deploy to Render service `srv-d6vcmt7diees73d0j04g`
- deployed smoke (`APP_BASE_URL=... npm run smoke`)
- deployed browser smoke snapshot into `evidence/render-browser-snapshot.md`
- store command outputs in `evidence/` and update `STATUS.md`

### Deployment / update plan

- Push migration-backed changes to `main`.
- Trigger Render deploy for `auto-service-foundation`.
- Validate deploy reaches `live` and smoke checks pass.
- If deployment fails, redeploy last known-good commit and record incident.

### Risks and fallback plan

- SQLite schema mismatch risk during seeding:
  - use single migration source and transactional seed writes.
- Render runtime persistence caveat:
  - keep seed idempotent; app should remain operable even if storage resets.
- If migration fails in deployed environment:
  - fail fast, inspect logs, fix schema, redeploy, and keep rollback path to previous commit.

### Progress log

- 2026-03-21: Plan opened for AUT-6; context, packet rules, and current architecture validated.
- 2026-03-21: Implemented SQLite persistence modules (`src/persistence/*`) with explicit migration runner and seed bootstrap.
- 2026-03-21: Added initial schema migration `001` for scheduling/intake entities and dashboard compatibility entities.
- 2026-03-21: Added idempotent seed import from `data/seed-fixtures.json`, including walk-in and appointment intake event seeding.
- 2026-03-21: Replaced runtime fixture-file repository wiring with DB-backed `SqliteRepository` and server bootstrap integration.
- 2026-03-21: Added `npm run db:init` plus bootstrap script update for one-command DB initialization.
- 2026-03-21: Added persistence-focused tests and updated existing service/HTTP tests to run on SQLite-backed runtime.
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`, local browser snapshot).
- 2026-03-21: Deploy `dep-d6vdv37gi27c73eut2h0` reached `live` for commit `400a62d`; deployed smoke and browser snapshot passed.
- 2026-03-21: Linear observability updated: `AUT-6` moved to `Done` with evidence comment.

### Completion checkpoint

Completed on 2026-03-21:
- SQLite migration + seed foundation accepted,
- local and deployed verification passed,
- evidence captured,
- and repository state files updated.

## Completed Plan — Phase 0 Foundation Slice (2026-03-21)

### Objective

Build the first agent-operable vertical slice from an empty product codebase: runnable app shell, deterministic seed fixtures, automated checks, browser smoke path, and Render-ready deployment blueprint.

### Why now

The repository currently contains only planning context. Phase 0 requires executable foundation behavior before feature phases can start.

### Scope

- Build a small production-like service with explicit module boundaries.
- Add Russian-only UI shell for operational dashboard visibility.
- Add stable seeded scenarios from packet fixtures.
- Add local verification path (automated checks + smoke checks + browser smoke).
- Add Render deployment blueprint and operations docs for temp-domain validation.
- Update living project state files with evidence and known limits.

### Out of scope

- Full Phase 1 scheduling implementation.
- Auth and granular permissions.
- Real supplier, messaging, telephony, or payment integrations.
- Production VPS setup (deferred; Render first by decision).

### Current-state validation

- Repository initially had only placeholder README and no product code.
- Starter packet imported to repository.
- No runnable app, tests, deployment path, or evidence artifacts exist yet.

### Relevant packet rules and defaults

- Use small verifiable slices and evidence over assertions.
- Keep `STATUS.md` and `PLANS.md` current.
- Preserve Russian-ready user-facing copy from day one.
- User decisions for this plan:
  - Render is accepted for first deployment path.
  - Temporary validation hostname is accepted first.
  - Russian-only UI for v1.
  - No additional hard constraints provided.

### Target outcome

Repository can go from clean checkout to:
- running local service,
- seeded operational dashboard view,
- passing focused automated checks,
- passing browser smoke check,
- and having a documented Render deployment path with rollback notes.

### Ordered execution slices

1. Scaffold service, fixture store, domain service layer, and Russian UI shell with health endpoint and structured logs.
2. Add deterministic scripts for bootstrap/run/smoke plus automated unit/integration checks.
3. Add Render blueprint and deployment/operations docs with temp-domain workflow.
4. Run checks, run local runtime verification, capture evidence artifacts, and update status records.

### Verification and evidence plan

- Run automated tests for domain and HTTP behavior.
- Run local smoke script against live service.
- Run browser smoke against local service and capture snapshot evidence.
- Record outputs and artifacts in repository-visible paths.

### Deployment / update plan

- Provide Render Blueprint (`render.yaml`) and environment variables.
- Include health-check path and start command.
- Document manual steps only where external account access is required.
- Keep rollback path simple: redeploy previous Render service revision and verify health.

### Risks and fallback plan

- If dependency install fails: reduce external dependencies and keep runtime on built-in Node capabilities.
- If Render deploy cannot be executed due missing account access: keep blueprint ready, mark deployment verification as blocked by missing external capability.
- If browser automation is flaky: keep CLI smoke as baseline and store failure logs.
- If direct API networking to `api.render.com` fails in this environment: use the documented host override as an operational workaround and record it in status.

### Progress log

- 2026-03-21: Packet unpacked into repository.
- 2026-03-21: Mandatory packet reading completed in required order.
- 2026-03-21: Active plan created; implementation starting.
- 2026-03-21: Service scaffold implemented (`src/*`) with Russian dashboard, health/readiness endpoints, structured logs, and seeded fixtures.
- 2026-03-21: Deterministic scripts and tests added (`scripts/*`, `tests/*`), then executed successfully.
- 2026-03-21: Render deployment blueprint and runbook added (`render.yaml`, `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`).
- 2026-03-21: Evidence artifacts captured in `evidence/` (tests, smoke, API payloads, browser snapshot).
- 2026-03-21: Render API key validated; workspace discovered (`tea-d65tovpr0fns73cqdmo0`); `render.yaml` blueprint validation passed.
- 2026-03-21: Repository pushed to GitHub `main`; repo visibility set to public so Render could fetch source.
- 2026-03-21: Render web service created (`srv-d6vcmt7diees73d0j04g`); initial deploy (`dep-d6vcmtvdiees73d0j0fg`) reached `live`.
- 2026-03-21: Deployed smoke and browser checks passed at `https://auto-service-foundation.onrender.com`.
- 2026-03-21: Phase 0 completion checkpoint met and accepted.

### Completion checkpoint

Completed on 2026-03-21:
- local app and checks passed,
- Render deployment path executed live,
- deployed smoke + browser verification passed,
- and `STATUS.md` updated with environment and evidence state.

## Completed Plan — Phase 1 Dashboard UX Refactor (2026-03-21)

### Objective

Upgrade the operational dashboard from a basic table view to a decision-first cockpit aligned with the project UI/UX and reporting rules.

### Why now

The current dashboard is functional but does not yet satisfy key Daily Board outcomes: triage clarity, load visibility, and action proximity for front-desk workflows.

### Scope

- Redesign dashboard information architecture for triage-first usage.
- Add operational summary cards with queue and money visibility.
- Add bay load and assignee load views for at-a-glance planning.
- Improve waiting and pickup queue rows with action-oriented fields.
- Add row-level navigation affordances for future detail screens.
- Keep Russian-only UI.
- Update tests, run local and deployed verification, and record evidence.

### Out of scope

- Full scheduling CRUD workflows and persistence model changes.
- New auth/permission model.
- New integrations.

### Current-state validation

- Dashboard is currently 3 tables + KPI strip.
- Queue rows do not expose debt amount or blocking duration context.
- No daily load view grouped by bay/person.
- No action controls for core front-desk operations.

### Relevant packet rules and defaults

- UI must answer “what is waiting, what is ready, what is unpaid” quickly.
- Daily board must show time/bays/people/planned vs active/blockers.
- UX should be fast, low-ceremony, and Russian-ready.
- Meaningful slice must stay end-to-end verifiable by Codex.

### Target outcome

Dashboard provides immediate operational triage and planning context:
- urgent queues are visible with money/blocking indicators,
- load by bay and assignee is visible,
- primary actions are one click away,
- and local + deployed smoke checks pass.

### Ordered execution slices

1. Extend dashboard service model with triage and load aggregates.
2. Refactor dashboard UI layout and components for decision-first workflow.
3. Update tests for new model/UI behavior.
4. Run local validation and browser smoke evidence.
5. Deploy to Render, verify smoke, and update status/evidence docs.

### Verification and evidence plan

- `npm test`
- `npm run smoke` (local)
- Browser smoke snapshot (local)
- Deploy latest commit to Render service and run deployed smoke.
- Browser smoke snapshot (deployed)
- Update `STATUS.md` with evidence paths.

### Deployment / update plan

- Push changes to `main`.
- Trigger Render deploy via API for `srv-d6vcmt7diees73d0j04g`.
- Verify live deploy ID and run post-deploy smoke check.

### Risks and fallback plan

- Layout complexity may reduce readability on small screens: keep responsive breakpoints and collapse less critical columns.
- If deploy fails: capture deploy status JSON and roll back by redeploying previous known-good commit.

### Progress log

- 2026-03-21: Plan opened from UX audit request.
- 2026-03-21: Dashboard service model extended with triage, debt, overdue, and load aggregates.
- 2026-03-21: Dashboard UI rebuilt into decision-first layout with action bar, triage cards, load tables, and queue action fields.
- 2026-03-21: Added functional route targets for dashboard links (`/appointments/:id`, `/work-orders/:id`, action placeholders).
- 2026-03-21: Automated tests updated and passed.
- 2026-03-21: Local smoke and browser snapshot verification passed.
- 2026-03-21: Render deploy `dep-d6vdi894tr6s73dis1eg` reached live with commit `aaca232`; deployed smoke and browser snapshot passed.
- 2026-03-21: Linear observability updated: `AUT-5` moved to In Progress, `AUT-11` moved to Done with evidence comment.

### Completion checkpoint

Completed on 2026-03-21:
- redesigned dashboard implemented,
- local + deployed verification passed,
- evidence captured,
- and tracking updated in both repository state files and Linear tasks.

## Maintenance rule

When a plan is completed:
- mark it as completed,
- keep a short summary of what was achieved,
- and ensure `STATUS.md` reflects the newly accepted state.

When a plan becomes obsolete:
- close it explicitly instead of silently rewriting history.
