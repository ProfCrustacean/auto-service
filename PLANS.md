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

## Active Plan — Phase 1 Dashboard UX Refactor

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

### Completion checkpoint

Complete when redesigned dashboard is implemented, verified locally and on Render, and status/evidence records are updated.

## Maintenance rule

When a plan is completed:
- mark it as completed,
- keep a short summary of what was achieved,
- and ensure `STATUS.md` reflects the newly accepted state.

When a plan becomes obsolete:
- close it explicitly instead of silently rewriting history.
