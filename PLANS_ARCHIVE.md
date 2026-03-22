# PLANS_ARCHIVE.md

## Purpose

This file is the append-only archive for completed plans moved out of `PLANS.md`.

Use `PLANS.md` for active work and a short recent-history window.
Use this archive for full historical plan details.

## Archive batches

## Archive Batch — 2026-03-21

### Moved from PLANS.md

- Completed Plan — Render build/runtime log investigation and follow-up triage (2026-03-21)
- Completed Plan — AUT-14 verification scenarios for scheduling and walk-in (2026-03-21)
- Completed Plan — AUT-10 Walk-in intake API and active queue insertion (2026-03-21)
- Completed Plan — AUT-9 Appointment lifecycle API with deterministic capacity conflicts (2026-03-21)
- Completed Plan — AUT-8 Customers and Vehicles CRUD API (2026-03-21)
- Completed Plan — AUT-7 Employees and Bays CRUD API (2026-03-21)
- Completed Plan — AUT-6 Persistent Data Model and Migrations (2026-03-21)
- Completed Plan — Phase 0 Foundation Slice (2026-03-21)
- Completed Plan — Phase 1 Dashboard UX Refactor (2026-03-21)

## Completed Plan — Render build/runtime log investigation and follow-up triage (2026-03-21)

### Objective

Inspect Render build and runtime logs beyond deploy-state checks to verify operational health and produce actionable follow-up issues where needed.

### Why now

Post-AUT-14 deploy verification confirmed HTTP/e2e behavior. The next required confidence step was direct log-level validation of build/runtime conditions and failure signals.

### Scope

- Pull deploy/build event history from Render API.
- Pull paginated service logs across the full available window.
- Analyze for build failures, runtime errors, and observability quality risks.
- Create Linear backlog cards only for confirmed findings.

### Out of scope

- Implementing fixes for discovered issues.
- Runtime architecture changes.
- Production incident response workflow design.

### Current-state validation

- Render service: `srv-d6vcmt7diees73d0j04g`.
- Latest deploy: `dep-d6vfe9ea2pns73aiapqg` (`live`).
- Render API network caveat handled via `curl --resolve api.render.com:443:216.24.57.7`.

### Relevant packet rules and defaults

- Operational claims require evidence, not assertions.
- Prefer deterministic, agent-runnable verification steps with stored artifacts.
- Record follow-up work in the project task system with explicit acceptance criteria.

### Target outcome

- Clear statement of build/runtime log health.
- Evidence files in `evidence/` sufficient for replay/audit.
- Linear cards created for every confirmed improvement need.

### Ordered execution slices

1. Retrieve Render deploy/build events and latest deploy log window.
2. Retrieve paginated logs across the full service lifetime window.
3. Quantify status/error/noise signals and identify concrete issues.
4. Create Linear cards with acceptance criteria for each validated finding.
5. Record evidence and state updates.

### Verification and evidence plan

- Event stream: `evidence/render-log-audit-events.json`
- Latest deploy window: `evidence/render-log-audit-latest-deploy-window.json`
- Full log extract: `evidence/render-log-audit-all.ndjson`
- Computed metrics: `evidence/render-log-audit-summary.json`

### Deployment / update plan

- No deployment changes in this investigation.
- Capture findings as backlog issues for execution in subsequent slices.

### Risks and fallback plan

- API endpoint mismatch risk:
  - resolve with official Render OpenAPI/docs and endpoint probing.
- High-volume log data risk:
  - store both raw extract and compact summary metrics.

### Progress log

- 2026-03-21: Pulled Render service events and verified all 9 builds/deploys succeeded.
- 2026-03-21: Pulled 2,828 log rows across service lifetime and generated summary metrics.
- 2026-03-21: Identified three follow-up findings:
  - Node runtime drift (`25.8.1` chosen from permissive engines),
  - repeated repo-access fallback warning during clone,
  - `/healthz` request logs dominating runtime signal (~99% of HTTP request logs).
- 2026-03-21: Created Linear backlog cards:
  - `AUT-16` (Node LTS pinning),
  - `AUT-17` (health-check log noise reduction),
  - `AUT-18` (repo-access fallback warning removal).

### Completion checkpoint

Completed on 2026-03-21.

## Completed Plan — AUT-14 verification scenarios for scheduling and walk-in (2026-03-21)

### Objective

Extend the verification harness with realistic acceptance scenarios covering appointment scheduling and walk-in intake, with both automated test coverage and browser-evidence runs.

### Why now

`AUT-9` and `AUT-10` implemented API behavior for appointments and walk-ins. `AUT-14` verifies those flows as realistic, repeatable acceptance scenarios with saved artifacts.

### Scope

- Add explicit domain-level automated scenario checks for scheduling and walk-in behavior.
- Add API-level end-to-end scenario test combining appointment booking + walk-in intake + board visibility.
- Add runnable scenario script for local and deployed execution.
- Capture browser e2e evidence for scheduling + walk-in visibility and detail-page reachability.
- Update state docs and Linear issue.

### Out of scope

- New scheduling domain features.
- New walk-in business behavior.
- UI form implementation for intake/booking.
- Auth/permissions work.

### Current-state validation

- Appointment lifecycle and walk-in APIs are implemented and tested separately.
- Existing tests are mostly feature-slice tests, but no dedicated combined acceptance scenario harness for scheduling + walk-in.
- Browser evidence exists for dashboard snapshots, but not explicit scenario-focused scheduling/walk-in e2e artifacts.

### Relevant packet rules and defaults

- Every meaningful slice must be runnable end-to-end and evidence-backed.
- Verification should cover realistic business paths, not only isolated checks.
- Repository must stay self-operable for future runs with deterministic scripts/artifacts.

### Target outcome

- Automated domain + API scenario checks exist for appointment booking and walk-in intake.
- Browser e2e path evidence exists for both local and Render environments.
- Evidence artifacts are saved in `evidence/` and referenced in state files.
- Linear `AUT-14` is closed with verification evidence.

### Ordered execution slices

1. Add domain scenario test for appointment + walk-in services.
2. Add combined API acceptance scenario test.
3. Add reusable scenario runner script (`scripts/scheduling-walkin-scenario.js`).
4. Run local verification and capture local scenario + browser e2e artifacts.
5. Push, deploy to Render, run deployed scenario + browser e2e artifacts.
6. Update `PLANS.md`, `STATUS.md`, and Linear state/comment.

### Verification and evidence plan

- `npm test`
- `npm run smoke`
- `npm run verify`
- local scenario artifact: `evidence/local-scheduling-walkin-scenario.json`
- local browser artifacts:
  - `evidence/local-scheduling-walkin-browser-dashboard.md`
  - `evidence/local-scheduling-walkin-browser-appointment.md`
  - `evidence/local-scheduling-walkin-browser-workorder.md`
- deployed scenario artifact: `evidence/render-scheduling-walkin-scenario.json`
- deployed browser artifacts:
  - `evidence/render-scheduling-walkin-browser-dashboard.md`
  - `evidence/render-scheduling-walkin-browser-appointment.md`
  - `evidence/render-scheduling-walkin-browser-workorder.md`

### Deployment / update plan

- Commit AUT-14 harness changes to `main`.
- Trigger Render deploy for `srv-d6vcmt7diees73d0j04g`.
- Poll to `live`, run deployed scenario and browser evidence capture.

### Risks and fallback plan

- Scenario artifacts could fail from reused slots/ids:
  - use timestamped values for deterministic uniqueness.
- Browser path could break on state drift:
  - navigate directly to created appointment/work-order IDs from scenario output.
- Verification-only slice could drift from active APIs:
  - run scenario against both local and deployed environments.

### Progress log

- 2026-03-21: Plan opened for `AUT-14`; Linear moved to `In Progress`.
- 2026-03-21: Added domain scenario test (`tests/domainSchedulingWalkin.test.js`), API scenario test (`tests/schedulingWalkinApiScenario.test.js`), and scenario runner (`scripts/scheduling-walkin-scenario.js`).
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`); local scenario + browser artifacts captured.
- 2026-03-21: Changes pushed on `main` as commit `be35d5a`.
- 2026-03-21: Render deploy `dep-d6vfe9ea2pns73aiapqg` reached `live`; deployed scenario + browser artifacts captured.
- 2026-03-21: Linear `AUT-14` moved to `Done`; evidence comment posted (`5097c936-60b0-4d2b-b53b-977fabfb6658`).

### Completion checkpoint

Completed on 2026-03-21.

## Completed Plan — AUT-10 Walk-in intake API and active queue insertion (2026-03-21)

### Objective

Deliver Phase 1 walk-in intake API behavior that allows same-day unscheduled visits to be accepted without a prior appointment and inserted into active operational flow immediately.

### Why now

`AUT-9` completed appointment lifecycle behavior. `AUT-10` is the next required intake slice to ensure non-scheduled demand can enter the system and appear on the day board/active queue.

### Scope

- Add API endpoint for walk-in intake creation.
- Persist walk-in intake event (`source = walk_in`) without requiring appointment linkage.
- Create associated active work-order record from walk-in intake.
- Ensure walk-in result is visible in dashboard active queue/day board response.
- Add validation and deterministic error contracts.
- Add integration tests and local/deployed verification evidence.
- Update Linear and repository state files.

### Out of scope

- Full work-order editing/details flow.
- Walk-in UI form implementation.
- Auth/permissions enforcement changes.
- Parts/payment workflow changes.

### Current-state validation

- Intake placeholder UI route exists (`/intake/walk-in`), but no walk-in API path exists.
- `intake_events` table exists and is seeded, but there is no create API behavior.
- Dashboard active queue is sourced from `work_orders`; walk-ins cannot currently create active queue entries.

### Relevant packet rules and defaults

- Walk-ins are allowed and important by default.
- No real car should be “nowhere”; accepted walk-ins must enter active flow visibly.
- Meaningful behavior must be deterministic, test-backed, and evidence-backed.
- Repository state files and deployment verification must be updated on completion.

### Target outcome

- `POST /api/v1/intake/walk-ins` accepts same-day walk-ins without appointment.
- API creates:
  - intake event (`source: walk_in`),
  - active work order (`waiting_diagnosis`) with customer/vehicle snapshots.
- New walk-in appears in dashboard active queue/day board immediately.
- Local and Render verification pass and are captured in evidence.

### Ordered execution slices

1. Extend repository with intake-event and work-order create methods.
2. Add walk-in intake service with reference checks and deterministic code generation.
3. Add walk-in validator and HTTP route.
4. Wire route/service into app/server/test harness.
5. Add integration tests for acceptance criteria and error behavior.
6. Run local checks + smoke + walk-in lifecycle smoke evidence.
7. Deploy to Render and run deployed verification + evidence capture.
8. Update `PLANS.md`, `STATUS.md`, and Linear issue state/comment.

### Verification and evidence plan

- `npm test`
- `npm run smoke`
- `npm run verify`
- local walk-in smoke: `evidence/local-walkin-intake-smoke.json`
- local browser snapshot refresh
- Render deploy + poll
- deployed smoke + deployed walk-in smoke:
  - `evidence/render-smoke-output.txt`
  - `evidence/render-walkin-intake-smoke.json`
  - `evidence/render-browser-snapshot.md`

### Deployment / update plan

- Commit AUT-10 implementation to `main`.
- Push and trigger Render deploy for `srv-d6vcmt7diees73d0j04g`.
- Poll deployment to `live`, run post-deploy checks, record evidence.
- Keep rollback path via prior live deploy.

### Risks and fallback plan

- Walk-in insertion could miss active queue visibility:
  - create work-order in active status and verify through dashboard API test.
- Work-order code collisions:
  - derive next code from existing persisted code set with deterministic increment.
- Invalid customer/vehicle pairing:
  - enforce ownership check and return stable conflict response.

### Progress log

- 2026-03-21: Plan opened for `AUT-10`; Linear moved to `In Progress`.
- 2026-03-21: Implemented repository write path for atomic walk-in intake + work-order creation.
- 2026-03-21: Added walk-in intake service, validator, and route (`POST /api/v1/intake/walk-ins`).
- 2026-03-21: Added integration coverage in `tests/walkInIntake.test.js` and updated app/server wiring.
- 2026-03-21: Local verification passed (`npm test`, `npm run smoke`, `npm run verify`, local walk-in intake smoke, browser snapshot).
- 2026-03-21: Pushed commit `91c13d6` to `main`.
- 2026-03-21: Render deploy `dep-d6vf6pa4d50c73fvc2h0` reached `live` for commit `91c13d6`.
- 2026-03-21: Deployed verification passed (`APP_BASE_URL=https://auto-service-foundation.onrender.com npm run smoke`, deployed walk-in intake smoke, deployed browser snapshot).
- 2026-03-21: Linear `AUT-10` moved to `Done` with evidence comment (`comment id: 622316f0-bdaa-4f8c-864a-5215298b576f`).

### Completion checkpoint

Completed on 2026-03-21:
- walk-in intake API implemented (`POST /api/v1/intake/walk-ins`),
- walk-ins can be accepted without prior appointments,
- accepted walk-ins create intake events and active work orders,
- active queue/day board visibility verified locally and on Render,
- evidence captured and project tracking updated.

## Completed Plan — AUT-9 Appointment lifecycle API with deterministic capacity conflicts (2026-03-21)

### Objective

Deliver Phase 1 appointment lifecycle APIs with explicit status transitions and deterministic double-booking conflict responses for bay and primary assignee capacity.

### Why now

`AUT-8` completed customer/vehicle CRUD and ownership constraints. Appointment lifecycle is the next required Phase 1 slice before walk-in intake and planning board completion.

### Scope

- Add appointment CRUD/lifecycle API endpoints.
- Enforce appointment statuses: `booked`, `confirmed`, `arrived`, `cancelled`, `no-show`.
- Enforce deterministic capacity conflict checks for same-slot bay and assignee double-booking attempts.
- Add validators and service boundary rules for transitions and referential checks.
- Add tests for lifecycle, conflicts, and failure contracts.
- Run local verification, deploy to Render, run post-deploy verification, and capture evidence.
- Update Linear, `STATUS.md`, and `PLANS.md` after validation.

### Out of scope

- Walk-in intake API (`AUT-10`).
- UI appointment creation/edit forms.
- Work-order creation from appointment.
- Auth/permission enforcement changes.

### Current-state validation

- Appointments currently exist in seed data and are shown on dashboard/read-only pages.
- No appointment API routes currently exist under `/api/v1/appointments`.
- No capacity-conflict API behavior currently exists for appointment create/update.

### Relevant packet rules and defaults

- Bay and employee are real capacity constraints and should prevent accidental overbooking.
- Appointment and work order remain separate objects in Phase 1.
- Operational state transitions must be explicit, deterministic, and reviewable.
- Meaningful slice must include runnable verification, evidence, and repo state updates.

### Target outcome

- `/api/v1/appointments` and `/api/v1/appointments/:id` support list/get/create/update.
- Lifecycle statuses are constrained to the accepted set and transition rules are enforced.
- Conflicts return deterministic `409` responses for bay/person double-booking attempts.
- Local and Render verification pass with evidence captured and Linear updated.

### Ordered execution slices

1. Extend repository methods for appointment CRUD + slot conflict lookup.
2. Add appointment service lifecycle logic and conflict enforcement.
3. Add appointment validators and HTTP routes with stable error mapping.
4. Wire new service/routes into app/server and test harness.
5. Add integration tests for lifecycle and conflict contracts.
6. Run local validation and capture evidence.
7. Deploy to Render and run deployed validation and smoke/evidence collection.
8. Update `PLANS.md`, `STATUS.md`, and Linear issue state/comment.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- local appointment lifecycle API checks saved to `evidence/local-appointment-lifecycle-smoke.json`
- local browser snapshot refresh
- Render deploy, then:
  - `APP_BASE_URL="https://auto-service-foundation.onrender.com" npm run smoke`
  - deployed appointment lifecycle checks saved to `evidence/render-appointment-lifecycle-smoke.json`
  - deployed browser snapshot refresh

### Deployment / update plan

- Commit AUT-9 implementation to `main`.
- Trigger Render deploy for `srv-d6vcmt7diees73d0j04g`.
- Poll until live, then run post-deploy checks and evidence capture.
- If deploy verification fails, keep previous known-good Render revision as rollback target.

### Risks and fallback plan

- Transition constraints could be too strict and block valid operations:
  - enforce explicit matrix and test key allowed/denied transitions.
- Conflict detection could produce false positives:
  - scope conflicts to same slot and blocking statuses only, with deterministic details.
- Reference mismatches (customer/vehicle/bay) could cause opaque failures:
  - map service errors to stable API 404/409 responses.

### Progress log

- 2026-03-21: Plan opened for `AUT-9`; packet and current state validated.
- 2026-03-21: Implemented repository appointment CRUD/search methods, slot-conflict lookup, and update support for appointment snapshots.
- 2026-03-21: Added `AppointmentService` with lifecycle transition matrix and deterministic bay/assignee double-booking checks.
- 2026-03-21: Added appointment validators/routes and wired appointment service into app/server/test harness.
- 2026-03-21: Added integration test coverage in `tests/appointmentLifecycle.test.js` and updated smoke harness to include appointments API.
- 2026-03-21: Local verification passed (`npm test`, `npm run smoke`, `npm run verify`, local appointment lifecycle smoke, local browser snapshot).
- 2026-03-21: Pushed commit `ec63a57` to `main`.
- 2026-03-21: Render deploy `dep-d6veugnafjfc73d0f96g` reached `live` for commit `ec63a57`.
- 2026-03-21: Deployed verification passed (`APP_BASE_URL=https://auto-service-foundation.onrender.com npm run smoke`, deployed appointment lifecycle smoke, deployed browser snapshot).
- 2026-03-21: Linear `AUT-9` moved to `Done` with evidence comment (`comment id: 9180a0be-00a2-4462-8a41-367a41c6bf8a`).

### Completion checkpoint

Completed on 2026-03-21:
- appointment lifecycle API endpoints implemented (`GET|POST /api/v1/appointments`, `GET|PATCH /api/v1/appointments/:id`),
- status model enforced (`booked`, `confirmed`, `arrived`, `cancelled`, `no-show`) with explicit transition rules,
- deterministic bay/person slot conflict responses implemented and tested,
- local and deployed verification passed,
- evidence captured and Linear updated.

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

## Archive Batch — 2026-03-21

### Moved from PLANS.md

- Completed Plan — AUT-17 health-check log noise reduction (2026-03-21)

## Completed Plan — AUT-17 health-check log noise reduction (2026-03-21)

### Objective

Reduce Render runtime log noise from repetitive health checks while preserving visibility for business-path requests and error conditions.

### Why now

Render log audit showed `/healthz` requests account for ~99% of HTTP request logs, masking useful operational signals. `AUT-17` is the direct follow-up to improve observability quality.

### Scope

- Update HTTP request logging middleware to suppress successful `/healthz` request logs.
- Keep non-health endpoints logged as before.
- Add automated tests covering log filtering behavior.
- Re-run local checks, deploy, and verify log-noise reduction on Render.
- Update state docs and Linear issue.

### Out of scope

- Replacing the current logger implementation.
- Adding external log aggregation tooling.
- Broad API/UI changes unrelated to logging.

### Current-state validation

- `src/app.js` logs every request in middleware via `logger.info("http_request", ...)`.
- Render evidence confirms health-check dominance (`evidence/render-log-audit-summary.json`).
- No runtime warnings/errors currently observed, but signal quality is poor due to noise.

### Relevant packet rules and defaults

- Prefer deterministic, testable behavior with explicit evidence.
- Keep operational behavior observable and agent-maintainable.
- Ensure meaningful slices are validated locally and in deployed environment.

### Target outcome

- Successful `/healthz` requests no longer flood runtime logs.
- Business-path request logs remain intact.
- Automated tests verify the behavior.
- Deployed log audit shows significant reduction in health-check noise.

### Ordered execution slices

1. Implement health-check log suppression in request middleware.
2. Add test coverage for log suppression and normal request logging.
3. Run local tests/verification and capture evidence.
4. Deploy to Render and capture post-deploy log audit evidence.
5. Update `PLANS.md`, `STATUS.md`, and Linear (`AUT-17`).

### Verification and evidence plan

- `npm test`
- `npm run verify`
- local proof artifact for request-log behavior
- Render post-deploy log audit artifacts with updated health-check ratio

### Deployment / update plan

- Commit AUT-17 change to `main`.
- Trigger Render deploy for `srv-d6vcmt7diees73d0j04g`.
- Poll to `live`, then audit Render logs for ratio change.

### Risks and fallback plan

- Over-filtering request logs:
  - restrict suppression to successful `/healthz` only.
- False confidence without deploy verification:
  - measure pre/post healthz ratio directly from Render logs.

### Progress log

- 2026-03-21: Plan opened from `AUT-17` backlog issue.
- 2026-03-21: Implemented `/healthz` log suppression in HTTP middleware (`src/app.js`) for successful health checks only.
- 2026-03-21: Added automated behavior test (`tests/httpLoggingNoise.test.js`).
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`); local evidence captured (`evidence/local-healthz-log-filter-check.json`).
- 2026-03-21: Changes pushed on `main` as commit `c023e10`.
- 2026-03-21: Render deploy `dep-d6vg0e75r7bs73eq156g` reached `live`.
- 2026-03-21: Deployed log audit confirmed health-check noise reduction:
  - transition window ratio `0.142857` (`evidence/render-aut17-log-audit-summary.json`),
  - stable window ratio `0.0` on current instance (`evidence/render-aut17-log-audit-summary-stable.json`).

### Completion checkpoint

Completed on 2026-03-21.

## Archive Batch — 2026-03-21

### Moved from PLANS.md

- Completed Plan — AUT-16 pin Render Node runtime to LTS (2026-03-21)

## Completed Plan — AUT-16 pin Render Node runtime to LTS (2026-03-21)

### Objective

Pin runtime policy to Node 22 LTS for deterministic Render deployments and enforce the policy in-repo.

### Why now

Render log audit found deployments running Node `25.8.1` due permissive engine range (`>=22`). This creates runtime drift risk and weakens repeatability.

### Scope

- Change repository runtime policy to explicit Node 22 LTS.
- Add repository guard test to prevent future Node policy drift.
- Run local verification.
- Deploy to Render and verify build logs show Node 22.x.
- Update state docs and Linear issue.

### Out of scope

- Re-architecting deployment.
- Dependency upgrades unrelated to runtime pinning.
- Fixing other observability backlog items (`AUT-18` remains separate).

### Current-state validation

- `package.json` currently has `engines.node: ">=22"`.
- Render logs show `Using Node.js version 25.8.1`.
- Existing deployment path and smoke checks are stable.

### Relevant packet rules and defaults

- Prioritize deterministic setup and operations.
- Use testable/mechanically enforced policies over conventions.
- Capture proof from deployed environment, not only local assertions.

### Target outcome

- Runtime policy pinned to Node 22 LTS in repository.
- Automated test fails if Node policy drifts from pinned value.
- Render deploy uses Node 22.x according to build logs.
- `AUT-16` closed with evidence.

### Ordered execution slices

1. Pin Node runtime policy in repository config.
2. Add guard test for runtime policy.
3. Run local tests/verify and capture evidence.
4. Deploy to Render and capture Node-version proof from build logs.
5. Update `PLANS.md`, `STATUS.md`, and Linear issue state/comment.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- local runtime policy evidence from tests
- Render deploy artifacts and log window proving Node 22.x

### Deployment / update plan

- Commit AUT-16 changes to `main`.
- Trigger deploy for `srv-d6vcmt7diees73d0j04g`.
- Poll to `live`.
- Query deploy log window and extract Node version line.

### Risks and fallback plan

- Render build could fail on Node pin:
  - choose semver-compatible LTS major (`22.x`) not fragile exact patch.
- Policy can drift later:
  - add test guard to catch unintended changes.

### Progress log

- 2026-03-21: Plan opened for `AUT-16`.
- 2026-03-21: Pinned runtime policy in-repo (`package.json` engines `22.x`, `.node-version` set to `22`).
- 2026-03-21: Added guard test `tests/nodeRuntimePolicy.test.js` to enforce Node policy.
- 2026-03-21: Local verification passed (`npm test`, `npm run verify`); local policy evidence saved (`evidence/local-node-runtime-policy.json`).
- 2026-03-21: Changes pushed on `main` as commit `121df5f`.
- 2026-03-21: Render deploy `dep-d6vg51buibrs73f0tth0` reached `live`.
- 2026-03-21: Render build logs confirmed Node 22 policy:
  - `Requesting Node.js version 22`
  - `Using Node.js version 22.22.1 via /opt/render/project/src/.node-version`
  - evidence: `evidence/render-aut16-node-runtime-summary.json`.

### Completion checkpoint

Completed on 2026-03-21.

## Archive Batch — 2026-03-21

### Moved from PLANS.md

- Completed Plan — AUT-18 repo-access warning remediation investigation (2026-03-21)

## Completed Plan — AUT-18 repo-access warning remediation investigation (2026-03-21)

### Objective

Attempt to remove the Render build-time repo-access fallback warning and close `AUT-18`, or conclusively identify the smallest external action required.

### Why now

`AUT-16` and `AUT-17` closed previous observability follow-ups, leaving `AUT-18` as the remaining deploy/log hardening item.

### Scope

- Re-check Render service configuration for current repo/branch binding.
- Validate `PATCH /v1/services/{serviceId}` request surface for credential-related controls.
- Attempt API-level service update path and verify whether warning is removed on a fresh deploy.
- Capture focused build-log evidence and update state files.

### Out of scope

- Manual Render dashboard operations requiring interactive account access.
- Broader deployment architecture changes (for example image-based pipeline migration).

### Current-state validation

- Prior deploy windows contained clone-step warning:
  - `It looks like we don't have access to your repo, but we'll try to clone it anyway.`
- Service remained healthy and deploys were succeeding despite warning.

### Relevant packet rules and defaults

- Prefer deterministic, evidence-backed decisions.
- Complete the loop to runtime verification in Render where possible.
- If capability is external, capture the minimum required handoff.

### Target outcome

- Either warning removed in a fresh deploy, or blocker narrowed to explicit external action with proof.
- State artifacts updated so the next slice can resume without re-discovery.

### Ordered execution slices

1. Reconfirm service repo binding and deployment state from Render API.
2. Inspect Render Update Service API body fields for credential control availability.
3. Attempt API-level update path and trigger a fresh deploy.
4. Pull focused build logs for that deploy and measure warning persistence.
5. Update repository state and Linear tracking.

### Verification and evidence plan

- Render service state pull:
  - `evidence/render-aut18-service-state.json`
- Render docs field-surface snapshot excerpt:
  - `evidence/render-aut18-update-service-body-params.txt`
- Fresh deploy and poll:
  - `evidence/render-aut18-deploy-response.json`
  - `evidence/render-aut18-deploy-poll.txt`
  - `evidence/render-aut18-deploy-final.json`
  - `evidence/render-aut18-deploy-final-compact.json`
- Build log verification:
  - `evidence/render-aut18-log-window-build-focus.json`
  - `evidence/render-aut18-warning-summary-focus.json`
  - `evidence/render-aut18-log-query-window-focus.json`

### Deployment / update plan

- No code deployment required for AUT-18 investigation; use API-triggered deploy for runtime proof only.
- If warning persists and API cannot rebind credentials, hand off single dashboard action.

### Risks and fallback plan

- Render API schema ambiguity risk:
  - mitigate by combining docs snapshot evidence with live endpoint probes.
- External toolchain dependency risk (Linear sync):
  - if API unavailable from runtime region, persist local evidence + explicit blocker.

### Progress log

- 2026-03-21: Retrieved service state; repo remains `https://github.com/ProfCrustacean/auto-service` on `main`.
- 2026-03-21: Inspected Render Update Service reference via Playwright snapshot; body params include `repo`/`branch`/`rootDir`/`serviceDetails`, but no Git credential field (`evidence/render-aut18-update-service-body-params.txt`).
- 2026-03-21: Executed API update probe (`PATCH /v1/services/{serviceId}`) and triggered fresh deploy `dep-d6vganruibrs73f116n0`, which reached `live`.
- 2026-03-21: Focused build log verification showed warning persists for fresh deploy:
  - warning timestamp `2026-03-21T20:53:57.025230636Z`,
  - evidence `evidence/render-aut18-warning-summary-focus.json`.
- 2026-03-21: Attempted Linear API synchronization for `AUT-18`; request blocked from this runtime location with `RESTRICTED_COUNTRY_BLOCKED` (`evidence/linear-api-country-blocked.json`).

### Completion checkpoint

Completed on 2026-03-21 as an investigation/triage slice.  
`AUT-18` remediation remains blocked on Render dashboard-level repo access reconnection (external action).

## Archive Batch — 2026-03-21

### Moved from PLANS.md

- Completed Plan — Repository spring cleaning and harness simplification (2026-03-21)

## Completed Plan — Repository spring cleaning and harness simplification (2026-03-21)

### Objective

Remove low-value duplication across validators/routes/tests to reduce maintenance bloat while preserving all current API and domain behavior.

### Why now

The repository had repeated helper logic spread across multiple files, which slowed safe iteration and increased risk of inconsistent fixes. This cleanup improves the project’s agent-operable foundation without changing product scope.

### Scope

- Consolidate shared HTTP validator primitives into one utility module.
- Consolidate shared route-level unexpected-error handling into one utility module.
- Consolidate repeated HTTP integration test bootstrap/request helpers into one test harness module.
- Refactor existing validator/route/test files to use the shared helpers.
- Re-run local automated and scenario verification and capture evidence.

### Out of scope

- Any domain-rule or API-contract changes.
- UI redesign work.
- Render deployment/configuration changes.
- AUT-18 external unblock work.

### Current-state validation

- Repeated helper implementations existed in:
  - `src/http/referenceValidators.js`
  - `src/http/customerVehicleValidators.js`
  - `src/http/appointmentValidators.js`
  - `src/http/walkInIntakeValidators.js`
- Repeated route error helper existed in:
  - `src/http/referenceRoutes.js`
  - `src/http/customerVehicleRoutes.js`
  - `src/http/appointmentRoutes.js`
  - `src/http/walkInIntakeRoutes.js`
- Repeated HTTP test server/bootstrap/request scaffolding existed across most integration tests in `tests/*.test.js`.

### Relevant packet rules and defaults

- Prefer deterministic, mechanically verifiable repository structure.
- Remove obsolete or duplicated paths in small reviewable slices.
- Require evidence-backed verification after meaningful changes.

### Target outcome

- Shared helper modules are the single source for repeated validation and test harness logic.
- Net reduction in code volume and duplication without regression.
- Full local automated and runtime checks still pass.

### Ordered execution slices

1. Add shared validator and route utility modules and refactor consumers.
2. Add shared test harness module and refactor HTTP/domain/persistence tests to use it.
3. Run automated tests.
4. Start local app and run smoke + scheduling/walk-in scenario scripts.
5. Attempt browser smoke and record blocker if tooling is unavailable.
6. Update repository state docs with evidence.

### Verification and evidence plan

- Automated tests:
  - `evidence/spring-cleaning-test-output.txt`
- Local smoke:
  - `evidence/spring-cleaning-smoke-output.txt`
- Local scheduling + walk-in scenario:
  - `evidence/spring-cleaning-scenario-output.json`
- Browser smoke attempt outcome:
  - `evidence/spring-cleaning-browser-smoke.txt`

### Deployment / update plan

- No deployment required; this is a repository hygiene slice with unchanged runtime contract.
- Keep Render validation state unchanged and continue with existing AUT-18 follow-up plan.

### Risks and fallback plan

- Risk: subtle validation behavior drift while deduplicating helpers.
  - Mitigation: preserve existing messages/return shapes and run full test suite.
- Risk: test harness abstraction masks differences needed by a specific test.
  - Mitigation: allow logger override and keep explicit assertions in each test file.
- Risk: browser tooling unavailable in current runtime.
  - Mitigation: record blocker evidence and keep CLI smoke/scenario coverage as active proof.

### Progress log

- 2026-03-21: Added `src/http/validatorUtils.js` and refactored all validator modules to use shared primitives.
- 2026-03-21: Added `src/http/routeUtils.js` and refactored all route modules to use shared unexpected-error handler.
- 2026-03-21: Added `tests/helpers/httpHarness.js` and refactored integration/domain/persistence tests to use shared bootstrap helpers.
- 2026-03-21: Executed `npm test` successfully (all 11 tests passed).
- 2026-03-21: Started local server and executed smoke + scheduling/walk-in scenario scripts successfully.
- 2026-03-21: Browser smoke attempt via Playwright MCP failed due local browser profile/session lock (`Opening in existing browser session`); blocker captured in `evidence/spring-cleaning-browser-smoke.txt`.

### Completion checkpoint

Completed on 2026-03-21 as a repository hygiene slice:
- duplicated scaffolding removed,
- local runtime behavior re-verified,
- and evidence plus state updates recorded.

## Archive Batch — 2026-03-22

### Moved from PLANS.md

- Completed Plan — PLANS archive automation and policy enforcement (2026-03-21)

## Completed Plan — PLANS archive automation and policy enforcement (2026-03-21)

### Objective

Make plan-file cleanup automatic so `PLANS.md` stays compact without requiring manual user prompts.

### Why now

`PLANS.md` grew to 1,400 lines and was slowing scan/resume behavior. The user explicitly requested that compaction become part of the default loop.

### Scope

- Add deterministic compaction tooling for `PLANS.md`.
- Archive older completed plans into append-only `PLANS_ARCHIVE.md`.
- Keep a one-line skeleton index of archived completed plans in `PLANS.md`.
- Encode compaction rules in project operating docs.
- Add mechanical guard test for plan-hygiene policy.

### Out of scope

- Product feature behavior changes.
- Deployment/environment changes.
- Existing completed-plan content edits beyond relocation.

### Current-state validation

- Before compaction: `PLANS.md` was 1,400 lines and contained 13 completed-plan sections.
- Existing maintenance rule had no explicit compaction thresholds or archive loop.

### Relevant packet rules and defaults

- Prefer encoded, repeatable repository operations over ad-hoc manual reminders.
- Keep state files coherent and operationally scannable.
- Use mechanical enforcement where practical.

### Target outcome

- `PLANS.md` contains only a recent completed-plan window.
- Older completed plans are preserved in `PLANS_ARCHIVE.md`.
- `PLANS.md` still exposes older completed-plan history via a skeleton index.
- A repeatable command (`npm run plans:compact`) performs compaction.
- Automated test fails when plan-hygiene policy drifts.

### Ordered execution slices

1. Add compaction script and npm command.
2. Run compaction to create/archive historical plans.
3. Add plan-hygiene policy test.
4. Update planning/hygiene process docs and AGENTS loop.
5. Re-run test suite and evidence capture.

### Verification and evidence plan

- `npm run plans:compact`
- `npm test`
- `wc -l PLANS.md PLANS_ARCHIVE.md`
- heading-count checks for completed-plan sections in both files

### Deployment / update plan

- No deployment actions required.
- Repository-process-only change.

### Risks and fallback plan

- Risk: accidental history loss during compaction.
  - Mitigation: append-only archive file + deterministic section moves.
- Risk: future drift if compaction is forgotten.
  - Mitigation: guard test + AGENTS/doc loop rule.

### Progress log

- 2026-03-21: Added `scripts/compact-plans.js` and npm script `plans:compact`.
- 2026-03-21: Compacted plans (`movedPlans: 9`, `remainingInPlans: 4`) and created `PLANS_ARCHIVE.md`.
- 2026-03-21: Added archived-plan skeleton index generation in `PLANS.md` via compaction script.
- 2026-03-21: Added guard test `tests/plansHygienePolicy.test.js`.
- 2026-03-21: Updated `AGENTS.md`, `docs/21_EXECUTION_PLANS_STATUS_AND_EVIDENCE.md`, and `docs/22_REPOSITORY_HYGIENE_AND_CONTINUOUS_IMPROVEMENT.md` with plan-compaction loop rules.

### Completion checkpoint

Completed on 2026-03-21 with archive automation and policy enforcement in place.

## Archive Batch — 2026-03-22

### Moved from PLANS.md

- Completed Plan — Linear Playwright workflow integrated into harness (2026-03-21)

## Completed Plan — Linear Playwright workflow integrated into harness (2026-03-21)

### Objective

Bake the validated Playwright-based Linear workflow into repository harness scripts so Codex can create backlog cards from findings without manual UI work.

### Why now

Direct Linear API calls from this runtime can fail due geo restrictions, while Playwright-origin calls succeed. The workflow needed to be encoded as a deterministic command path.

### Scope

- Add a dedicated Linear harness CLI with `probe` and batch `create` commands.
- Default Linear transport to Playwright and retain `direct`/`auto` overrides.
- Add strict JSON spec validation and idempotent title-based skip behavior for batch issue creation.
- Add focused automated tests for parsing and validation logic.
- Document commands and template spec in repo docs.

### Out of scope

- Changing product runtime behavior.
- Non-Linear tracker integrations.
- Automatic state transitions beyond issue creation/skip.

### Current-state validation

- Repository had no built-in Linear automation.
- Prior task creation succeeded only when executed through Playwright-backed GraphQL flow.
- Existing harness did not encode this flow for repeat use.

### Relevant packet rules and defaults

- Prefer mechanical, scripted flows over repeated human prompts.
- Keep boundaries explicit and deterministic.
- Require evidence-backed verification for meaningful harness changes.

### Target outcome

- One-command Linear connectivity probe and batch issue creation are available in-repo.
- Default behavior uses Playwright transport to remain resilient in this environment.
- Dry-run mode supports safe task planning without mutating Linear.
- New behavior is covered by automated tests and runtime evidence.

### Ordered execution slices

1. Build core validation/parsing helpers and transport abstraction.
2. Implement CLI commands (`probe`, `create`) with Playwright-first transport.
3. Add npm scripts and task template file.
4. Add focused tests for helpers and parser behavior.
5. Run tests and live probe + dry-run creation against Linear.

### Verification and evidence plan

- `npm test`
- `LINEAR_API_KEY=... npm run linear:probe -- --team-key AUT --state Backlog --output evidence/linear-harness-probe.json`
- `LINEAR_API_KEY=... npm run linear:create -- --spec data/linear/phase1-task-template.json --dry-run --team-key AUT --state Backlog --output evidence/linear-harness-create-dry-run.json`
- `LINEAR_API_KEY=... node scripts/linear-harness.js probe --team-key AUT --state Backlog --transport auto --output evidence/linear-harness-probe-auto.json`

### Deployment / update plan

- No product deploy required.
- Repository harness/docs update only.

### Risks and fallback plan

- Risk: Playwright CLI wrapper path differences across environments.
  - Mitigation: support explicit `LINEAR_PLAYWRIGHT_CLI`, Codex skill wrapper default, and `npx` fallback.
- Risk: repeated task creation duplication.
  - Mitigation: skip by exact title match within sampled team issue window.
- Risk: direct transport intermittently blocked.
  - Mitigation: Playwright default and auto fallback on 403/country-block conditions.

### Progress log

- 2026-03-21: Added `scripts/linear-harness-core.js` for spec validation, team/state selection, and Playwright result parsing.
- 2026-03-21: Added `scripts/linear-harness.js` with `probe` + `create` commands and Playwright/default transport.
- 2026-03-21: Added template spec `data/linear/phase1-task-template.json`.
- 2026-03-21: Added npm scripts `linear:probe` and `linear:create`.
- 2026-03-21: Added tests `tests/linearHarnessCore.test.js`; full test suite passed.
- 2026-03-21: Verified live Linear probe, dry-run create flow, and auto transport fallback.

### Completion checkpoint

Completed on 2026-03-21 with Linear Playwright workflow now encoded as harness commands.

## Archive Batch — 2026-03-22

### Moved from PLANS.md

- Completed Plan — AUT-21/22/23 harness hardening follow-ups (2026-03-22)

## Completed Plan — AUT-21/22/23 harness hardening follow-ups (2026-03-22)

### Objective

Close the remaining harness backlog issues (`AUT-21`, `AUT-22`, `AUT-23`) by removing destructive-default risk on shared environments, decoupling scripts from fixed fixtures, and improving failure diagnostics for fast triage.

### Why now

The previous verification hardening slice intentionally deferred these items; they were the remaining harness debt before continuing product-scope work.

### Scope

- `AUT-21`: non-local scenario runs default to non-destructive mode; output includes isolation/cleanup status.
- `AUT-22`: smoke/scenario scripts rely on behavioral contracts and dynamic resource discovery/provisioning instead of hardcoded fixtures.
- `AUT-23`: smoke/scenario failures emit machine-parseable diagnostics (step, method/path/url, status, payload, stack).
- Update runbook/docs for defaults and remaining assumptions.
- Move Linear backlog issues to `Done` with evidence comments.

### Out of scope

- New product features (planning board/search UX).
- Deployment-configuration changes.

### Current-state validation

- `AUT-21/22/23` were in Linear `Backlog`.
- Scenario script required explicit non-destructive flag and lacked automatic remote safety default.
- Failure output often only surfaced generic messages.

### Relevant packet rules and defaults

- Prefer deterministic, low-friction one-command verification.
- Encode repeated operational workflows directly into harness scripts/docs.
- Keep outputs machine-parseable and evidence-backed.

### Target outcome

- Harness scripts are safer on shared environments, less brittle to fixture drift, and faster to triage on failures.
- All three related Linear issues are closed with linked validation evidence.

### Ordered execution slices

1. Implement and validate `AUT-21` mode behavior and output fields.
2. Implement and validate `AUT-22` fixture decoupling + assumption documentation.
3. Implement and validate `AUT-23` structured diagnostics + helper tests.
4. Sync Linear status/comments for `AUT-21/22/23`.

### Verification and evidence plan

- `npm test`
- `npm run verify`
- `APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run smoke`
- `APP_BASE_URL=\"https://auto-service-foundation.onrender.com\" npm run scenario:scheduling-walkin`
- Diagnostic-path checks:
  - `APP_BASE_URL=\"http://127.0.0.1:9\" npm run smoke`
  - `APP_BASE_URL=\"http://127.0.0.1:9\" npm run scenario:scheduling-walkin`
- Evidence files:
  - `evidence/test-after-aut21.txt`
  - `evidence/verify-after-aut21.txt`
  - `evidence/scenario-aut21-remote-default.txt`
  - `evidence/test-after-aut22.txt`
  - `evidence/verify-after-aut22.txt`
  - `evidence/smoke-after-aut22.txt`
  - `evidence/test-after-aut23.txt`
  - `evidence/verify-after-aut23.txt`
  - `evidence/smoke-after-aut23.txt`
  - `evidence/scenario-after-aut23-remote-default.txt`
  - `evidence/smoke-failure-diagnostics-aut23.txt`
  - `evidence/scenario-failure-diagnostics-aut23.txt`

### Deployment / update plan

- No deploy required for harness code changes.
- Deployed smoke/scenario checks run against current Render service URL for runtime confirmation.

### Risks and fallback plan

- Risk: non-local default blocks intentional shared-environment write scenarios.
  - Mitigation: explicit destructive overrides via env flag or CLI arg.
- Risk: diagnostic payloads become too verbose.
  - Mitigation: clip response snippets and keep error JSON flat.

### Progress log

- 2026-03-22: Implemented non-local non-destructive default and isolation status output for scenario script.
- 2026-03-22: Implemented fixture-decoupled smoke assertions and dynamic scenario resource resolution/provisioning.
- 2026-03-22: Added shared diagnostics helper and wired smoke/scenario structured error payloads.
- 2026-03-22: Added diagnostics helper tests (`tests/harnessDiagnostics.test.js`).
- 2026-03-22: Validated local/deployed success paths and forced-failure diagnostics paths.
- 2026-03-22: Moved `AUT-21`, `AUT-22`, `AUT-23` to Linear `Done` and posted evidence comments.

### Completion checkpoint

Completed on 2026-03-22:
- `AUT-21/22/23` acceptance criteria are implemented and verified.
- Linear issues `AUT-21`, `AUT-22`, and `AUT-23` are now in `Done` with completion comments.

