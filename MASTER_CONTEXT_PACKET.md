# FILE: README.md

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

---

# FILE: STATUS.md

# STATUS.md

## Purpose

This is the living state file for the repository.

Codex must keep this file current enough that a new Codex run can answer:
- what exists now,
- what is known to work,
- what environments exist,
- what was last validated,
- what is currently in progress,
- and what the next high-leverage step should be.

## Current repository state

### Repository maturity
- Starter packet installed.
- Product implementation not started yet.
- No application behavior is accepted yet.
- No deployment path is accepted yet.
- No end-to-end path is accepted yet.

### Last accepted milestone
- Context packet v3 is the current accepted starting point.

### Current active objective
- Establish the first self-operable vertical slice:
  - runnable repo foundation,
  - first deployable environment path,
  - first end-to-end verifiable product slice.

## Environments

### Known environments
- None recorded yet.

### Required fields for each environment once it exists
For each environment, record:
- environment name,
- purpose,
- host or URL,
- how Codex reaches it,
- whether deployment is working,
- whether TLS is working,
- whether end-to-end checks are working,
- last validated date or commit,
- and known caveats.

## Verification status

### Automated checks
- None recorded yet.

### End-to-end checks
- None recorded yet.

### Deployment smoke checks
- None recorded yet.

## Evidence inventory

Record the most recent useful evidence here once it exists:
- screenshots,
- videos,
- logs,
- reports,
- or links/paths to generated artifacts.

Current state:
- no evidence yet.

## Open blockers

- No codebase exists yet.
- No deployment process exists yet.
- No test harness exists yet.
- No environment contract has been instantiated yet.

## Next recommended milestone

Create the first agent-operable foundation slice:
1. repository bootstrap path,
2. first runnable application shell,
3. first deployment path,
4. first seeded scenario,
5. first end-to-end test that Codex can run itself,
6. first evidence artifact,
7. and updated status after validation.

## Update rule

Codex must update this file when:
- a milestone is accepted,
- an environment is created or changed,
- a deployment path changes,
- a verification path changes,
- an important blocker appears or is removed,
- or the next recommended milestone changes.

---

# FILE: PLANS.md

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

## Maintenance rule

When a plan is completed:
- mark it as completed,
- keep a short summary of what was achieved,
- and ensure `STATUS.md` reflects the newly accepted state.

When a plan becomes obsolete:
- close it explicitly instead of silently rewriting history.

---

# FILE: AGENTS.md

# AGENTS.md

## Mission

Build and evolve a focused custom operating system for a single-location independent auto service in Saransk, Russia.

The product is a front-office and workshop operations system. It is not a full accounting suite and not a generic ERP.

At the same time, build the repository so Codex can operate it end to end with minimal human intervention.

That means the repository must become:
- understandable from in-repo context,
- runnable from a clean checkout,
- deployable by Codex,
- testable by Codex,
- repairable by Codex,
- and maintainable by Codex.

## Mandatory reading order

Before making any meaningful product, architecture, verification, deployment, or operational decision, read these files in order:

1. `README.md`
2. `STATUS.md`
3. `docs/01_EXECUTIVE_SUMMARY.md`
4. `docs/02_PRODUCT_GOALS_AND_PHASES.md`
5. `docs/03_SCOPE_AND_NON_GOALS.md`
6. `docs/04_BUSINESS_CONTEXT.md`
7. `docs/05_USERS_ROLES_AND_PERMISSIONS.md`
8. `docs/06_DOMAIN_MODEL_AND_RULES.md`
9. `docs/07_CORE_WORKFLOWS.md`
10. `docs/08_SYSTEM_DESIGN_PRINCIPLES.md`
11. `docs/09_INFORMATION_MODEL.md`
12. `docs/10_EXTERNAL_CONNECTIONS_AND_INTEGRATIONS.md`
13. `docs/11_UI_UX_GUIDELINES.md`
14. `docs/12_REPORTING_AND_METRICS.md`
15. `docs/13_NON_FUNCTIONAL_REQUIREMENTS.md`
16. `docs/14_DELIVERY_PLAN_AND_BACKLOG.md`
17. `docs/15_ACCEPTANCE_CRITERIA.md`
18. `docs/16_OPEN_QUESTIONS_AND_DEFAULTS.md`
19. `docs/17_WORKING_RULES_FOR_CODEX.md`
20. `docs/18_SEED_DATA_AND_FIXTURES.md`
21. `docs/19_AGENT_AUTONOMY_AND_HARNESS_MODEL.md`
22. `docs/20_ENVIRONMENT_DEPLOYMENT_AND_OPERATIONS.md`
23. `docs/21_EXECUTION_PLANS_STATUS_AND_EVIDENCE.md`
24. `docs/22_REPOSITORY_HYGIENE_AND_CONTINUOUS_IMPROVEMENT.md`

For any non-trivial change, also read and then update:
25. `PLANS.md`

## Prime directives

1. Treat the packet as the source of truth for product intent and project operating rules.
2. Treat repository-visible context as the only reliable memory.
3. If a rule, workflow, or decision is important and not yet encoded in the repo, encode it.
4. Prefer choices that Codex can inspect, validate, modify, deploy, and test directly.
5. Keep every meaningful slice end-to-end testable by Codex itself.
6. Do not mark work complete based on assertion alone; require evidence.
7. Keep humans at the level of priorities, access, and judgment—not routine implementation or verification.

## Planning rule

When writing a non-trivial feature, integration, migration, deployment change, major refactor, or multi-step fix, use an execution plan in `PLANS.md` before implementation.

A task is non-trivial by default if it:
- affects more than one workflow,
- changes data behavior,
- changes deployment or environment behavior,
- changes verification or evidence behavior,
- changes external connections,
- or is likely to take more than a short isolated patch.

## Iteration loop

For every meaningful task, follow this loop:

1. Read the packet and current `STATUS.md`.
2. Compare the requested task against:
   - the project goals,
   - the last accepted state,
   - and the active plan.
3. Validate the current repository and environment state before changing anything.
4. Implement the smallest complete slice.
5. Run or update automated checks.
6. Start, update, or deploy a runnable environment as needed.
7. Run end-to-end verification that proves the slice in realistic conditions.
8. Capture evidence.
9. Update `STATUS.md`, `PLANS.md`, and any affected packet docs.
10. Only then consider the slice complete.

## Definition of done

A task is not done unless:
- the requested behavior exists,
- it matches the packet,
- the current repository state is understood,
- the change is runnable from repository instructions,
- automated checks relevant to the change pass,
- end-to-end validation relevant to the change passes,
- evidence exists,
- the result is compared against the packet and current task,
- and `STATUS.md` plus any affected docs are updated.

## Product priorities

Optimize for:
1. operational clarity,
2. speed to a useful first release,
3. deterministic and auditable business behavior,
4. low maintenance burden,
5. strong integration readiness,
6. agent-operable development and operations,
7. and future extensibility without overbuilding.

## Product guardrails

Keep the product centered on:
- scheduling,
- intake,
- work orders,
- vehicle history,
- parts under a job,
- payments recording,
- operational queues,
- and lightweight management reporting.

Do not add:
- full bookkeeping,
- tax accounting,
- formal payroll accounting,
- multi-branch complexity,
- customer mobile apps,
- loyalty programs,
- broad warehouse systems unrelated to job-based parts flow,
- speculative diagnosis features,
- or hidden operational logic.

## Project guardrails

Do not rely on:
- undocumented manual click-ops,
- hidden environment tweaks,
- undocumented secrets handling,
- “works on my machine” assumptions,
- external tribal knowledge,
- or acceptance without agent-run validation.

If Codex repeatedly struggles with the same class of task, fix the repository so the next run goes better.

## Escalation rule

Escalate to a human only when:
- a required external system, credential, approval, or environment is missing,
- the packet has no safe default and the issue is truly blocking,
- the action is legally, financially, security-wise, or operationally risky,
- or the next step would be materially irreversible in production.

## Language

Use:
- English for repository docs, comments, plans, and operational records.
- Russian-ready user-facing copy from the beginning.

## Final instruction

Do not just build the product.

Build the product and the harness that lets Codex keep building, validating, deploying, and maintaining it.

---

# FILE: docs/01_EXECUTIVE_SUMMARY.md

# 01 — Executive Summary

## Product in one sentence

Build a custom front-office and workshop operations system for a small independent auto service, focused on scheduling, work orders, vehicle history, parts ordered for a job, payment recording, and lightweight management reporting.

## Project in one sentence

Build the repository so Codex can take it from empty or partially built state to a validated, deployable, and maintainable operating system for the service with minimal human intervention.

## Business context

The business is a single-location auto service in Saransk, Russia. It operates with:
- 2 service bays / lifts,
- 1 owner who is also a working technician,
- 2 mechanics,
- 1 electrician,
- parts usually purchased for a specific vehicle or repair,
- and simplified accounting outside the product.

## Why build a custom product

The main reason is control over workflow and integrations.

Existing market products are considered too restrictive or too closed for affordable integration work. The business wants one system that fits its actual operational flow instead of adapting itself to rigid software.

## Final product goal

The service should be able to run daily operations through one main system where every car goes through a visible and controlled flow:
1. appointment or walk-in intake,
2. customer and vehicle identification,
3. work order creation,
4. diagnosis and approval,
5. parts request and ordering,
6. repair execution in a specific bay by assigned people,
7. payment and release,
8. history and reporting.

Nothing important should depend on memory, chat history, scattered spreadsheets, or verbal coordination alone.

## Final project goal

Codex should be able to:
- understand the repository from in-repo context,
- plan substantial work without hidden assumptions,
- bootstrap or update environments from repository instructions,
- deploy changes,
- validate changes through automated and end-to-end checks,
- capture evidence,
- and keep project state current in the repository.

## What success looks like

The product is successful when:
- the front desk can see today’s and this week’s load by bay and by employee;
- every active vehicle has a clear current status;
- all work and parts are tied to work orders;
- waiting-for-parts cars are easy to track;
- payment status is always visible;
- the owner can see basic operational and money metrics without manual spreadsheet assembly;
- and external integrations can be added without bending the core workflow.

The project is successful when:
- Codex can make progress from a fresh run without hidden human memory,
- every meaningful iteration is end-to-end testable by Codex,
- deployment and update steps are repeatable,
- and the repo stays legible and self-operable over time.

## Product principle

This is a narrow custom system for one real service location first.

It is not meant to become a universal product by default.

---

# FILE: docs/02_PRODUCT_GOALS_AND_PHASES.md

# 02 — Product Goals and Phases

## End-state product goal

Create a reliable operating system for the service that gives one shared view of:
- incoming demand,
- current load,
- active repairs,
- parts waiting states,
- money collected and outstanding,
- and recent history by customer and vehicle.

## End-state project goal

Create a repository and operating model that let Codex:
- validate the current state,
- plan work,
- implement changes,
- deploy updates,
- run automated and end-to-end checks,
- capture evidence,
- and keep the repository’s own state current.

## Primary product goals

1. Reduce chaos in daily operations.
2. Make scheduling and load planning visible.
3. Ensure every real job is documented.
4. Link work, parts, and payments in one place.
5. Make queues and blockers visible.
6. Provide a stable base for future integrations.

## Primary project goals

1. Remove hidden context from the development loop.
2. Make every meaningful change runnable and verifiable by Codex.
3. Keep deployment and update paths repeatable.
4. Keep the repository understandable for future Codex runs.
5. Let humans operate mainly at the level of priorities, access, and judgment.

## Secondary goals

1. Reduce time spent searching for past vehicle history.
2. Reduce forgotten follow-ups and missed parts states.
3. Support faster owner review of daily activity.
4. Make later growth easier without rebuilding the product from scratch.

## Phase structure

### Phase 0 — Agent-operable foundation
Outcome:
- the glossary is stable,
- the business rules are documented,
- the default assumptions are clear,
- `STATUS.md` and `PLANS.md` are in use,
- a repeatable bootstrap path exists,
- at least one runnable environment path exists,
- and the first end-to-end verification path exists.

### Phase 1 — Scheduling and intake
Outcome:
- bays, employees, customers, and vehicles exist;
- appointments and walk-ins can be recorded;
- and load is visible by day and week.

### Phase 2 — Work orders and status flow
Outcome:
- a car can move from intake to active work to completion through explicit statuses;
- notes, photos, findings, and approvals can be attached;
- and the front desk and owner can see the state of every active job.

### Phase 3 — Parts under a job
Outcome:
- parts can be requested, ordered, received, replaced, returned, and linked to work orders;
- and waiting-for-parts jobs become visible and manageable.

### Phase 4 — Payments and basic reporting
Outcome:
- deposits, partial payments, final payments, and balances can be recorded;
- and the owner can see basic activity and money metrics.

### Phase 5 — External connections and operational hardening
Outcome:
- the product can connect to outside systems cleanly;
- deployment and update behavior are stable;
- verification is routine;
- and operational reliability is strong enough for real daily use.

## Sequence rule

Do not treat phases as separate mini-products.

Each phase must strengthen the single main flow: a real vehicle through a real service visit.

Each phase must also leave the repository more self-operable than before.

---

# FILE: docs/03_SCOPE_AND_NON_GOALS.md

# 03 — Scope and Non-Goals

## In scope for the initial useful release

### Core records
- employees,
- service bays,
- customers,
- vehicles,
- and vehicle visit history.

### Front-office flow
- appointment booking,
- walk-in intake,
- daily and weekly scheduling,
- load visibility by bay and employee,
- search by phone, plate number, VIN, customer name, and work order number.

### Work order flow
- work order creation,
- labor lines,
- parts lines,
- notes,
- photos,
- findings,
- estimate changes,
- approvals,
- explicit statuses,
- delivery and closure.

### Parts flow
- parts request under a work order,
- ordering from an outside supplier,
- receiving,
- replacement,
- return,
- cancellation,
- reserve under the job,
- and linkage between sold part and purchased part.

### Money flow
- deposits,
- partial payments,
- final payments,
- payment method,
- outstanding balance,
- and simple sales split between labor and parts.

### Operational visibility
- waiting-for-parts queue,
- active work queue,
- ready-for-pickup queue,
- overdue or stalled work,
- today’s workload,
- and this week’s workload.

### Lightweight management reporting
- revenue by labor and parts,
- average ticket,
- number of completed jobs,
- gross margin by work order,
- open balances,
- and employee/bay utilization basics.

## In scope later, but not required for the first useful release

- public booking for selected simple services,
- simple reminders and notifications,
- more detailed productivity views,
- more detailed supplier connection flow,
- customer communication history,
- and limited data export for outside bookkeeping.

## Not in scope

- full bookkeeping,
- tax accounting,
- formal payroll accounting,
- statutory reporting,
- multi-branch operations,
- broad CRM or loyalty systems,
- marketing campaigns,
- customer mobile apps,
- broad warehouse management unrelated to job-based parts flow,
- engine-teardown process depth beyond what the service actually performs,
- or speculative features for hypothetical future businesses.

## Boundary rule

When unsure whether to include a feature, ask:

“Does this directly help one real car move through one real visit at this real service location?”

If not, it is probably outside the initial scope.

---

# FILE: docs/04_BUSINESS_CONTEXT.md

# 04 — Business Context

## Service profile

This is a new or greenfield operating environment for a small independent auto service in Saransk, Russia.

The business is small enough that one person may play multiple roles during the same day:
- the owner may approve prices, diagnose electrical issues, and review the board;
- the front desk role may be performed by the owner or by a separate person later;
- parts work may be handled by whoever is available.

## Team shape

Current working assumption:
- 1 owner / administrator / lead technician,
- 2 mechanics,
- 1 electrician,
- 2 bays / lifts.

## Commercial reality

The service makes money mostly on:
- suspension and undercarriage work,
- quick and medium repair jobs,
- diagnostics,
- electrical work,
- and attached parts sales.

The business does not want to position itself around heavy engine rebuilds as the core operating model.

## Parts reality

Parts are usually bought for a specific repair rather than carried as a deep standing stock.

This means the system must treat parts as:
- job-linked,
- often supplier-dependent,
- and often time-sensitive.

## Scheduling reality

The workshop will likely handle a mix of:
- pre-booked appointments,
- same-day calls,
- walk-ins,
- repairs that expand after diagnosis,
- and jobs paused while parts are pending.

Therefore, the schedule cannot be only a simple time calendar. It must reflect:
- bay capacity,
- employee capacity,
- expected duration,
- current status,
- and blockers.

## Why software matters here

The software must solve real operational pain:
- who is doing what,
- what is waiting,
- what parts are missing,
- what can be promised today,
- what money is still owed,
- and what happened to this vehicle last time.

## Business constraint

The product should stay simple enough that the owner can actually use it and trust it every day, not only during a launch period.

---

# FILE: docs/05_USERS_ROLES_AND_PERMISSIONS.md

# 05 — Users, Roles, and Permissions

## Role model

Roles are based on real work responsibilities, not on theoretical corporate structure.

A single person may hold more than one role.

## Main roles

### Owner / Administrator
Purpose:
- overall control of the service.

Can:
- see everything,
- change prices,
- approve or reverse sensitive actions,
- view all reports,
- manage employees, bays, and rules,
- and handle exceptions.

### Front Desk / Service Advisor
Purpose:
- intake, communication, planning, and closure.

Can:
- create and edit appointments,
- create and edit customers and vehicles,
- create and update work orders,
- record approvals,
- record payments,
- and view operational reports.

Should not:
- change protected settings,
- change historical money records without permission,
- or override sensitive decisions without a reason.

### Technician
Purpose:
- execute work and record findings.

Can:
- view assigned and relevant work orders,
- add notes and photos,
- mark findings,
- mark work steps complete,
- request parts,
- and update technical progress.

Should not by default:
- edit protected prices,
- close money-related records,
- or change high-level business settings.

### Parts Operator
Purpose:
- manage parts under jobs.

Can:
- view parts requests,
- create and update supplier-side orders,
- record received parts,
- record replacements and returns,
- and view parts-related queues and reports.

### Read-Only Observer
Purpose:
- accountant, partner, or reviewer who needs visibility but not editing power.

Can:
- view selected records and reports.

Cannot:
- change operational data.

## Permission principles

1. Sensitive money actions should be limited.
2. Sensitive price changes should be limited.
3. Status changes should be visible in history.
4. The system should support role overlap without confusion.
5. Permissions should follow real operations, not formal titles.

## Practical default

In the first release, it is acceptable if the owner has broad rights and other roles are simpler, as long as the boundaries around money and protected changes are clear.

---

# FILE: docs/06_DOMAIN_MODEL_AND_RULES.md

# 06 — Domain Model and Rules

## Core domain idea

The product revolves around a vehicle visit.

A visit may start from an appointment or a walk-in and may produce one or more work orders over time, but each active repair job must be traceable and visible.

## Core entities

- Customer
- Vehicle
- Employee
- Bay
- Appointment
- Work Order
- Labor Line
- Parts Line
- Parts Request
- Supplier-Side Order
- Payment
- Note
- Attachment
- Status History

## Rules by entity

### Customer
A customer is the person or business currently interacting with the service.

Rules:
- one customer may have many vehicles;
- one vehicle may have historical association with different customers over time;
- a work order should preserve customer details as they were at the time of service.

### Vehicle
A vehicle is a central operating object.

Rules:
- each work order belongs to one vehicle;
- vehicle history must be easy to retrieve;
- key identifiers should include at least plate number and VIN where available.

### Bay
A bay is a real capacity constraint.

Rules:
- a bay can only host one active planned job in the same time slot unless the service explicitly allows overlap for a specific case;
- a bay assignment may change during the day, but changes should be visible.

### Employee
An employee is a real labor capacity constraint.

Rules:
- an employee can be assigned to multiple jobs only if the service intentionally allows it;
- a primary responsible person should be visible for each work order even when several people contribute.

### Appointment
An appointment is a planned visit, not yet necessarily a real repair order.

Rules:
- appointments can be created without a work order;
- appointments can become work orders later;
- walk-ins may create same-day appointments or skip directly into intake flow;
- cancelled appointments should remain visible in history.

### Work Order
A work order is the main operational record for a repair visit.

Rules:
- every paid job must have a work order;
- every work order belongs to one vehicle;
- a work order may have many labor and parts lines;
- a work order may have deposits, partial payments, and final payment;
- a closed work order should remain immutable except for controlled correction flow.

## Status model

Recommended work order status families:
- draft,
- waiting for diagnosis,
- waiting for customer approval,
- waiting for parts,
- scheduled,
- in progress,
- paused,
- ready for pickup,
- completed,
- cancelled.

Rules:
- status names must be explicit and understandable to non-technical staff;
- status changes must be recorded in history;
- money-sensitive or completion-sensitive transitions should be controlled;
- the front desk must always be able to answer “what is happening with this car right now?”

## Labor lines

Rules:
- labor lines may be planned, revised, approved, completed, or cancelled;
- the system should support revised estimates after diagnosis;
- labor sold and labor completed are related but not always identical.

## Parts lines and parts requests

Rules:
- parts sold to the customer and parts purchased from suppliers are related but should not be treated as the same thing;
- the system must preserve purchase-side and sale-side meaning separately;
- one requested part may lead to replacement by another part;
- returns and cancellations must remain visible.

## Payments

Rules:
- payments may be deposit, partial, or final;
- one work order may have multiple payments;
- outstanding balance must always be visible;
- money records should have controlled edit rules.

## Reporting rule for gross margin

Default gross margin per work order:
- labor sold
- plus parts sold
- minus purchased part cost
- minus direct outside service cost if any.

Do not include:
- rent,
- salaries,
- utilities,
- or broad overhead inside work-order gross margin by default.

## Audit rule

Price overrides, sensitive status changes, money edits, and key parts substitutions should be traceable in history.

---

# FILE: docs/07_CORE_WORKFLOWS.md

# 07 — Core Workflows

## 1. Appointment booking

Typical path:
1. identify or create customer,
2. identify or create vehicle,
3. select requested service or problem description,
4. choose date, time, bay, and responsible person,
5. record expected duration,
6. save appointment,
7. make the appointment visible on the board.

## 2. Walk-in intake

Typical path:
1. identify or create customer,
2. identify or create vehicle,
3. record complaint,
4. decide whether the car can be accepted now,
5. place it into the active flow,
6. create work order or same-day visit record,
7. assign bay and responsible person when known.

## 3. Diagnosis and estimate

Typical path:
1. start diagnosis,
2. record findings,
3. add or revise labor lines,
4. add needed parts,
5. produce an estimate,
6. mark approval state,
7. move the job to the next appropriate status.

## 4. Parts request and ordering

Typical path:
1. technician or front desk marks a needed part,
2. a parts request is created under the work order,
3. the request may become one or more supplier-side purchase actions,
4. parts arrival is recorded,
5. the work order becomes ready for continuation,
6. substitutions, shortages, or returns remain visible.

## 5. Repair execution

Typical path:
1. assign or confirm bay,
2. assign or confirm responsible person,
3. perform work,
4. add notes and photos as needed,
5. mark completed labor items,
6. keep the work order status accurate.

## 6. Payment and release

Typical path:
1. confirm final work order content,
2. record payment or remaining balance,
3. mark the car ready for pickup or handed over,
4. close the work order when operationally complete.

## 7. Reopen or correction flow

Typical path:
1. identify the completed work order,
2. open a controlled correction path,
3. preserve history,
4. avoid silent deletion or overwrite of important money and parts facts.

## Operational queues that must always exist

At minimum the system must be able to show:
- today’s schedule,
- active jobs,
- waiting for approval,
- waiting for parts,
- paused jobs,
- ready for pickup,
- and recently completed jobs.

## Workflow principle

No real car should be “nowhere”.

If a vehicle is physically in the service or is expected today, it should be visible in a meaningful state.

---

# FILE: docs/08_SYSTEM_DESIGN_PRINCIPLES.md

# 08 — System Design Principles

## Purpose of this file

This file defines structural principles for the product and project without prescribing implementation choices.

## Principle 1 — One real service location first

Design for one real location and one real team first.

Do not introduce extra complexity for future branches, chains, franchises, or marketplace scenarios unless the current product truly needs it.

## Principle 2 — Explicit operational state

The system must represent operational reality through visible states.

Important things should never be hidden in:
- free-text notes only,
- private memory,
- or informal side channels.

## Principle 3 — Clear separation between core flow and outside connections

The core product must retain its own internal truth about:
- customers,
- vehicles,
- appointments,
- work orders,
- parts,
- and payments.

Outside systems may inform or support that truth, but should not define it.

## Principle 4 — Deterministic critical behavior

Ordering, state transitions, money handling, and closure logic must be explicit, reviewable, and consistent.

Critical actions should not depend on opaque or probabilistic behavior.

## Principle 5 — Human fallback

If an outside connection fails, the service must still be able to continue work through a visible manual path.

## Principle 6 — Start narrow, grow cleanly

Start with the smallest useful product that supports the real vehicle flow.

Later expansion should come from clear domain boundaries, not from early over-generalization.

## Principle 7 — Preserve history

Operational history is valuable.

Prefer:
- status history,
- payment history,
- parts change history,
- and order snapshots.

Avoid silent rewriting of important past facts.

## Principle 8 — Optimize for operator speed

The product should reduce clicks, reduce repeated data entry, and reduce uncertainty.

The best design is the one the team can use all day without avoiding it.

## Principle 9 — Product rules over vendor rules

When integrating with outside systems, map them into the product’s own domain model and business language.

Do not let external naming or external process shape the internal product unnecessarily.

## Principle 10 — Small verifiable slices

The product should be built and reviewed through small slices that a business owner can understand and that Codex can test against real service work.

## Principle 11 — If Codex cannot see it, it does not exist

Important product and project knowledge must be visible inside the repository or discoverable from the current execution environments.

Do not depend on:
- side conversations,
- remembered verbal agreements,
- undocumented admin steps,
- or hidden setup knowledge.

## Principle 12 — Agent-operable repository over cleverness

Prefer structures and rules that Codex can inspect, reason about, validate, modify, and keep coherent over time.

## Principle 13 — Every meaningful slice must remain end-to-end testable

A meaningful slice is not complete if it cannot be validated through a realistic runnable path.

## Principle 14 — Deployment is part of the product system

Deployment, update behavior, health checks, and rollback paths are part of the system that must be designed, not treated as afterthoughts.

## Principle 15 — Evidence over assertion

Verification should produce visible evidence:
- passing checks,
- end-to-end results,
- logs,
- screenshots,
- videos when useful,
- and updated repository state.

## Principle 16 — Encode lessons into the repo

When Codex encounters repeated friction, the remedy should usually be:
- better documentation,
- better scripts,
- better plans,
- better tests,
- better defaults,
- or better constraints in the repository.

---

# FILE: docs/09_INFORMATION_MODEL.md

# 09 — Information Model

## Purpose

This file describes the first-pass information model in business terms.

It does not prescribe storage shape. It defines the facts the product must be able to represent.

## Entity list

### Customer
Minimum facts:
- full name,
- phone,
- optional messaging handle,
- optional notes,
- history of visits.

### Vehicle
Minimum facts:
- make,
- model,
- year if known,
- plate number,
- VIN if known,
- engine or trim if useful,
- mileage if known,
- customer association,
- service history.

### Employee
Minimum facts:
- name,
- role,
- active or inactive state,
- working schedule if used,
- and visibility in assignment views.

### Bay
Minimum facts:
- name or number,
- active or inactive state,
- and scheduling visibility.

### Appointment
Minimum facts:
- customer,
- vehicle,
- requested service or complaint,
- planned date and time,
- expected duration,
- planned bay if known,
- planned responsible person if known,
- status,
- source of booking,
- and notes.

### Work Order
Minimum facts:
- visible number,
- vehicle,
- customer snapshot,
- creation moment,
- current status,
- assigned bay,
- assigned responsible person,
- complaint,
- findings,
- internal notes,
- customer-facing notes,
- money totals,
- and closure moment.

### Labor Line
Minimum facts:
- description,
- quantity or expected duration,
- sell price,
- approval state,
- completion state,
- and performer link where relevant.

### Parts Request
Minimum facts:
- requested item name,
- optional part number,
- quantity,
- linked work order,
- requester,
- urgency,
- current state,
- and replacement relationship if applicable.

### Purchased Part
Minimum facts:
- supplier reference,
- purchased item name,
- purchased quantity,
- purchase cost,
- receive state,
- return state,
- and linkage to the work order and request.

### Sold Part Line
Minimum facts:
- customer-facing item name,
- quantity,
- sell price,
- linked purchased part if known,
- and cancellation or return state.

### Payment
Minimum facts:
- work order,
- amount,
- payment type,
- payment method,
- recorded moment,
- recorded by whom,
- and optional comment.

### Note and Attachment
Minimum facts:
- linked object,
- author,
- moment,
- content or file reference,
- and visibility level if needed.

### Status History
Minimum facts:
- object,
- previous state,
- new state,
- moment,
- actor,
- and optional reason.

## Relationship rules

- one customer can relate to many vehicles;
- one vehicle can have many work orders over time;
- one appointment may lead to one work order, or none;
- one work order can contain many labor lines;
- one work order can contain many parts lines;
- one work order can have many payments;
- one work order can have many notes and attachments;
- one parts request can lead to zero, one, or many purchase actions.

## Search rules

The product should support fast lookup by:
- phone,
- customer name,
- plate number,
- VIN,
- work order number,
- and recent activity.

## Snapshot rule

Important business documents should preserve visible snapshots of customer-facing facts at the time of service so history still makes sense after later profile edits.

---

# FILE: docs/10_EXTERNAL_CONNECTIONS_AND_INTEGRATIONS.md

# 10 — External Connections and Integrations

## Why this matters

Flexible integrations are one of the main reasons the business wants a custom product.

The product must therefore be ready to connect cleanly to outside systems without forcing the entire operational model to follow their limitations.

## Priority connection types

### Parts suppliers
Highest priority.

The system should support:
- looking up items,
- creating supplier-side purchase actions,
- storing supplier references,
- tracking receive state,
- handling substitutions,
- and handling returns or cancellations.

### Notifications
Useful early.

The system should support:
- reminders about appointments,
- reminders about ready-for-pickup cars,
- and possibly selected status updates.

### Optional later connection types
- telephony,
- cash register or receipt support,
- data export for outside bookkeeping,
- and selected communication channels.

## Connection principles

1. The product must keep its own internal truth.
2. The product must continue operating when an outside system is unavailable.
3. Every outside action should be visible to a human reviewer.
4. Failed outside actions should be easy to notice and retry.
5. Vendor-specific naming should be mapped into the product’s own business language.
6. Manual fallback must exist for critical flows.

## Supplier-side rules

- A requested part inside the product is not the same thing as a supplier-side purchase action.
- One request may become several supplier-side attempts.
- One supplier-side result may replace another.
- Supplier references should be preserved.
- Receive, shortage, replacement, cancellation, and return states should be visible.

## Notification rules

Notifications are supportive, not authoritative.

The product itself remains the source of truth for:
- appointment status,
- work order status,
- and payment state.

## Money and status rule

No outside connection may silently change:
- money totals,
- protected prices,
- or critical work order states
without an explicit and reviewable rule.

## Integration maturity goal

The product should be ready for real outside connections without becoming dependent on any single vendor’s way of thinking.

---

# FILE: docs/11_UI_UX_GUIDELINES.md

# 11 — UI / UX Guidelines

## Design intent

The product should feel fast, clear, and low-ceremony for a busy service environment.

The team should be able to answer common questions in a few seconds:
- who is booked now,
- what is waiting,
- which cars need parts,
- what is ready,
- what is overdue,
- and what is still unpaid.

## Main experience goals

1. Fast daily planning.
2. Minimal repeated typing.
3. High visibility of current state.
4. Easy switching between customer, vehicle, appointment, and work order.
5. Clear money visibility without accountant-style complexity.

## Key screens

### Daily board
Must show:
- time,
- bays,
- assigned people,
- current and planned jobs,
- blockers,
- and simple status cues.

### Weekly planning view
Must show:
- future load by bay,
- future load by person,
- and obvious overbooking or underbooking.

### Customer and vehicle record
Must show:
- basic profile,
- recent history,
- open jobs,
- and easy entry into a new appointment or work order.

### Work order detail
Must show:
- complaint,
- status,
- assigned people,
- labor,
- parts,
- notes,
- photos,
- payments,
- and next action.

### Waiting-for-parts queue
Must make it easy to answer:
- what is missing,
- for which car,
- from which supplier action,
- and what can move again today.

### Ready-for-pickup queue
Must make it easy to answer:
- what is done,
- what is owed,
- and who should be contacted.

## Interaction rules

- important states should be readable at a glance;
- searches should be forgiving and fast;
- the most common actions should be one or two steps away;
- editing money or sensitive status should be explicit;
- historical context should be easy to reach without cluttering the main path.

## Language rule

User-facing text should be ready for Russian-speaking staff from the beginning.

Internal naming, docs, and product reasoning may remain in English.

---

# FILE: docs/12_REPORTING_AND_METRICS.md

# 12 — Reporting and Metrics

## Purpose

Reporting should help run the service, not imitate formal accounting.

The first reporting layer should answer:
- how loaded are we,
- what is blocked,
- what earned money,
- what is still unpaid,
- and where time is being lost.

## Core reports for the initial useful release

### 1. Today’s load
Should show:
- jobs by bay,
- jobs by employee,
- planned vs active work,
- and free capacity.

### 2. This week’s load
Should show:
- future appointments,
- bay occupancy,
- employee occupancy,
- and obvious overload or gaps.

### 3. Active jobs by status
Should show counts and lists for:
- waiting for diagnosis,
- waiting for approval,
- waiting for parts,
- in progress,
- paused,
- ready for pickup.

### 4. Waiting-for-parts report
Should show:
- work order,
- vehicle,
- requested items,
- current request state,
- supplier-side state if known,
- and how long the job has been blocked.

### 5. Revenue split
Should show:
- labor revenue,
- parts revenue,
- total revenue,
- and completed jobs count
for the selected period.

### 6. Average ticket
Default formula:
- total completed sales value
- divided by count of completed work orders
for the selected period.

### 7. Gross margin by work order
Default formula:
- labor sold
- plus parts sold
- minus purchased part cost
- minus direct outside service cost if any.

### 8. Outstanding balances
Should show:
- open work orders with unpaid balance,
- partially paid completed orders,
- and ready-for-pickup jobs that still require payment.

### 9. Basic productivity view
Should show:
- completed work orders count by person,
- labor sold by person where meaningful,
- and assignment load.

## Reporting rules

1. Reports should use explicit date ranges.
2. Reports should distinguish labor and parts.
3. Reports should preserve history even if names or prices change later.
4. Reports should be operationally understandable by the owner without spreadsheet reconstruction.

## Explicit non-goal

Reports in this product are management and operations reports, not formal accounting reports.

---

# FILE: docs/13_NON_FUNCTIONAL_REQUIREMENTS.md

# 13 — Non-Functional Requirements

## Usability

The system must be usable during a real working day by busy staff.

Common actions should feel quick:
- find a customer,
- find a vehicle,
- add an appointment,
- open a work order,
- update a status,
- add a part,
- record a payment.

## Clarity

The product must reduce uncertainty.

A user should not need to guess:
- whether a car is scheduled,
- whether a part is still missing,
- whether money is still owed,
- or who is responsible for the next action.

## Reliability

Important operational facts must not disappear.

The product must preserve:
- work order history,
- status history,
- payment history,
- parts changes,
- and relevant attachments.

## Access control

Different users should not all have the same level of power.

Sensitive actions should be limited and reviewable.

## Auditability

Changes to protected money, price, parts, or status facts should be visible after the fact.

## Maintainability

The product should remain understandable from repository docs, sample scenarios, plans, and clear naming.

A new Codex run should be able to understand the business model and project state from the repository, not from tribal knowledge.

## Data portability

The business should not feel trapped.

Important records should be exportable in a practical way if needed.

## Graceful failure

If an outside connection fails, the core workshop flow should still be able to continue through a visible manual path.

## Human trust

The owner should be able to trust the system enough to stop relying on side spreadsheets for the main operational picture.

## Bootstrap determinism

A fresh checkout in an approved environment should be able to reach a runnable state through repository-defined instructions.

## Deployability

The repository must support a repeatable way for Codex to push a change into a runnable environment.

Deployment behavior must be documented, testable, and recoverable.

## End-to-end testability

Every meaningful product slice must be verifiable through a realistic end-to-end path that Codex can execute itself.

## Observability

When something fails, Codex must have enough signal to understand what happened.

The repository and deployed system should expose clear verification outputs, health signals, and failure evidence.

## Recoverability

After a failed deployment or failed change, there must be a clear path to recover service operation and return to the last known acceptable state.

## Documentation completeness

Important product behavior, deployment behavior, environment assumptions, and verification behavior should live in the repository and stay current.

---

# FILE: docs/14_DELIVERY_PLAN_AND_BACKLOG.md

# 14 — Delivery Plan and Backlog

## Delivery rule

Build in small business-valid slices.

Each slice should improve the path of one real car through the service and should leave the repository more self-operable than before.

## Phase 0 — Agent-operable foundation

Deliver:
- stable glossary,
- stable defaults,
- sample data,
- `STATUS.md` workflow,
- `PLANS.md` workflow,
- first repeatable bootstrap path,
- first runnable application path,
- first deployable environment path,
- first smoke check,
- first end-to-end verification path,
- and first evidence-capture routine.

Reason:
- avoid building a product that Codex cannot reliably operate or verify.

Success condition:
- Codex can take the repository from current state to a runnable validated slice without hidden manual knowledge.

## Phase 1 — Scheduling and intake

Deliver:
- employee records,
- bay records,
- customer records,
- vehicle records,
- appointment flow,
- walk-in flow,
- day board,
- week board,
- and search.

Success condition:
- the service can plan and see its load without side spreadsheets.

## Phase 2 — Work orders and states

Deliver:
- work order creation,
- explicit status flow,
- labor lines,
- notes,
- photos,
- findings,
- approvals,
- and closure path.

Success condition:
- every active job has a visible home and a visible state.

## Phase 3 — Parts under the job

Deliver:
- parts requests,
- supplier-side purchase actions,
- receive state,
- substitution handling,
- return handling,
- waiting-for-parts queue,
- and linkage between purchased and sold parts.

Success condition:
- blocked jobs become obvious and manageable.

## Phase 4 — Payments and reporting

Deliver:
- deposits,
- partial payments,
- final payments,
- outstanding balances,
- and core operational reports.

Success condition:
- the owner can see what was sold, what is blocked, and what is still unpaid.

## Phase 5 — Outside connections and operational hardening

Deliver:
- first real outside connections,
- retry and fallback behavior,
- deployment hardening,
- evidence and recovery improvements,
- and usability improvements.

Success condition:
- the system can support real daily work with less manual duplication and can be updated by Codex with confidence.

## Deferred backlog candidates

Only consider later:
- customer self-booking for simple services,
- reminders and message templates,
- more detailed productivity views,
- richer communication history,
- selected export flows,
- selected customer-facing convenience features,
- and deeper operational automation that is justified by real usage.

## Explicit backlog rule

A later idea does not automatically belong in the product.

Every new idea must justify itself against:
- the main operating flow,
- the project’s self-operability goals,
- and the current phase priorities.

---

# FILE: docs/15_ACCEPTANCE_CRITERIA.md

# 15 — Acceptance Criteria

## Overall product acceptance for the first useful release

The first useful release is acceptable when the service can run a normal week through the system for its main flow without depending on side spreadsheets for:
- appointments,
- active work tracking,
- waiting-for-parts tracking,
- and payment visibility.

## Overall project acceptance for the first useful release

The first useful release is not acceptable unless Codex can:
- understand the current repo state from repository files,
- bootstrap or update a runnable environment from repository-defined instructions,
- run automated checks relevant to the slice,
- execute end-to-end validation for the core flow,
- capture evidence of pass or fail,
- and update repository state documents after validation.

## Scenario-based acceptance criteria

### Scheduling
A front-desk user can:
- create an appointment,
- assign a bay,
- assign a responsible person,
- and see the result immediately on the planning board.

### Walk-in
A user can:
- accept a same-day walk-in,
- create the vehicle visit,
- and place it into the active operational flow.

### Work order
A user can:
- create a work order from a visit,
- add labor and parts,
- update status,
- add notes and photos,
- and understand the current state of the job at a glance.

### Approval
A user can:
- mark that customer approval is pending,
- record that approval was received,
- and continue the job with a clear history.

### Waiting for parts
A user can:
- create a parts request,
- mark that the job is waiting,
- record receipt,
- and see that the job can move again.

### Payment
A user can:
- record deposit, partial, and final payment,
- see outstanding balance,
- and close the money picture of the job clearly.

### Reporting
The owner can:
- see today’s load,
- see this week’s load,
- see waiting-for-parts jobs,
- see completed jobs,
- see labor vs parts revenue,
- and see open balances.

## Verification acceptance

A slice is not accepted unless:
- the target behavior is covered by at least one realistic verification path,
- Codex can execute that verification path itself,
- the outcome is recorded as evidence,
- and the evidence is understandable to a later reviewer.

## Deployment acceptance

A deployable slice is not accepted unless:
- the current deployment path is documented in the repo,
- Codex can perform or drive the deployment in the approved environment,
- post-deploy verification can be run,
- and the last known acceptable state is recoverable.

## Quality acceptance

The product is not acceptable if:
- active vehicles disappear from the operational view,
- statuses are unclear,
- parts and work orders drift apart,
- payment state is hidden,
- staff must reconstruct the day manually from notes and memory,
- or a meaningful change cannot be re-verified by Codex.

## Change acceptance

Any change that alters business behavior, environment behavior, deployment behavior, or verification behavior should update the packet, especially:
- domain rules,
- workflow rules,
- defaults,
- acceptance scenarios,
- environment assumptions,
- or agent operating rules.

---

# FILE: docs/16_OPEN_QUESTIONS_AND_DEFAULTS.md

# 16 — Open Questions and Defaults

## Purpose

This file defines defaults that Codex should use when the business has not yet answered a question explicitly.

## Defaults

### 1. Number of locations
Default:
- exactly one service location.

### 2. Number of bays
Default:
- two active bays / lifts.

### 3. Team size
Default:
- one owner with full rights,
- two mechanics,
- one electrician.

### 4. Public self-booking
Default:
- not required for the first useful release.

### 5. Complex diagnostics in self-booking
Default:
- not offered in the first useful release.

### 6. Walk-ins
Default:
- allowed and important.

### 7. Appointment vs work order
Default:
- appointments and work orders are different objects;
- an appointment may become a work order later.

### 8. Parts stocking model
Default:
- low standing stock,
- mostly job-based parts purchasing.

### 9. Parts substitutions
Default:
- allowed, but must remain visible and linked to the original request.

### 10. Returns
Default:
- part returns and cancellations must be recorded, not silently erased.

### 11. Multiple technicians on one job
Default:
- allowed, but one primary responsible person should remain visible.

### 12. Bay assignment
Default:
- expected for scheduled and active jobs once known.

### 13. Partial payments
Default:
- supported.

### 14. Money edits
Default:
- protected and traceable.

### 15. Price overrides
Default:
- allowed only for trusted roles and with a reason.

### 16. Gross margin formula
Default:
- labor sold plus parts sold minus purchased part cost minus direct outside service cost if any.

### 17. Rent and salary treatment in order margin
Default:
- excluded from work-order gross margin.

### 18. Vehicle ownership history
Default:
- keep current association, but preserve order-time customer snapshots.

### 19. Attachments and photos
Default:
- supported from early releases because they matter in service work.

### 20. Language
Default:
- English for repository docs and internal naming,
- Russian-ready user-facing copy.

### 21. Outside connection failure
Default:
- manual fallback must exist.

### 22. Customer approval before extra paid work
Default:
- required unless the line is a small pre-approved diagnostic item or the business later defines a controlled exception.

### 23. Closed work orders
Default:
- remain visible in history and should not be silently rewritten.

### 24. Role overlap
Default:
- one person may hold multiple roles.

### 25. Owner reporting depth
Default:
- lightweight operational and management reporting only.

### 26. Meaningful change verification
Default:
- every meaningful slice must be verifiably runnable and end-to-end testable by Codex.

### 27. State tracking
Default:
- `STATUS.md` and `PLANS.md` are living project files and should be maintained continuously.

### 28. Temporary validation domains
Default:
- temporary DNS-friendly hostnames such as nip.io-style or equivalent services are acceptable for non-production validation when needed.

### 29. Environment count
Default:
- at least one durable runnable environment is expected;
- extra preview-like environments are optional when available.

### 30. Manual operations
Default:
- avoid undocumented manual click-ops;
- prefer repeatable repository-defined operations.

### 31. Evidence capture
Default:
- UI, deployment, or verification changes should produce reviewable evidence.

## Escalation rule

If a new question appears:
1. prefer the narrowest safe default,
2. write the chosen default down,
3. and only escalate if the issue is truly blocking or high-risk.

---

# FILE: docs/17_WORKING_RULES_FOR_CODEX.md

# 17 — Working Rules for Codex

## Primary rule

Treat this packet as the source of truth for product intent and project operating rules.

## Working rules

1. Read the packet before making major decisions.
2. Use the documented defaults instead of pausing for unnecessary questions.
3. Prefer smaller slices over large speculative design.
4. Keep names and concepts aligned with the packet glossary.
5. Preserve business clarity over cleverness.
6. Keep money, status, and parts behavior explicit.
7. Update the packet when confirmed product behavior changes.
8. Separate confirmed rules from temporary assumptions.
9. Keep sample scenarios alive as the product evolves.
10. Avoid adding features that do not serve the main service flow.
11. Keep `STATUS.md` current enough that a new Codex run can resume work safely.
12. Use `PLANS.md` for non-trivial work.
13. Require runnable validation, not just static inspection.
14. Require evidence, not just statements of success.
15. If important knowledge is missing from the repo, write it into the repo.
16. If a repeated problem appears, prefer fixing the harness instead of accepting recurring friction.

## Change discipline

When behavior changes:
- update the relevant document,
- update affected scenarios,
- update plan or status records when relevant,
- and keep terminology consistent.

## Review discipline

Before presenting major work as complete:
- compare the result to the packet,
- compare it to the acceptance criteria,
- compare it to the active task and last accepted state,
- verify that the change helps the main workflow,
- and verify that the slice is runnable and testable by Codex.

## Scope discipline

If a proposed feature sounds attractive but does not directly improve the real operating flow of the service, treat it as deferred by default.

## Freedom of choice

This packet defines goals, rules, boundaries, defaults, and operational expectations.

It does not prescribe the means used to achieve them.

## Human escalation

Ask a human only when:
- a decision is truly blocking,
- the packet has no usable default,
- a required environment input, credential, approval, or external access is missing,
- or the issue could create legal, financial, security, or irreversible production risk.

---

# FILE: docs/18_SEED_DATA_AND_FIXTURES.md

# 18 — Seed Data and Fixtures

## Purpose

The product should begin with realistic sample data so the owner can review real flows quickly.

## Sample service structure

### Bays
1. Bay 1
2. Bay 2

### Employees
1. Ivan Petrov — owner / administrator / lead technician
2. Aleksei Sokolov — mechanic
3. Sergei Kuznetsov — mechanic
4. Dmitrii Orlov — electrician

## Sample customers

1. Elena Smirnova — phone +7 927 100 10 10
2. Pavel Ivanov — phone +7 927 200 20 20
3. OOO Volga Trade — phone +7 927 300 30 30
4. Marina Kozlova — phone +7 927 400 40 40

## Sample vehicles

1. Kia Rio, plate A123AA13, VIN available
2. Toyota Camry, plate B456BB13, VIN available
3. Lada Vesta, plate C789CC13, VIN available
4. Ford Focus, plate E321EE13, VIN available

## Sample scenario set

### Scenario 1 — Upcoming appointment
- customer: Elena Smirnova
- vehicle: Kia Rio
- complaint: front suspension knock
- planned for tomorrow morning
- assigned bay: Bay 1
- assigned primary person: Aleksei Sokolov

### Scenario 2 — Walk-in diagnosis
- customer: Pavel Ivanov
- vehicle: Lada Vesta
- complaint: charging issue / battery warning
- same-day intake
- primary person: Dmitrii Orlov
- status: waiting for diagnosis

### Scenario 3 — Waiting for parts
- customer: Marina Kozlova
- vehicle: Ford Focus
- work order exists
- diagnosis complete
- one suspension part requested
- supplier-side purchase action created
- status: waiting for parts

### Scenario 4 — In progress
- customer: Elena Smirnova
- vehicle: Kia Rio
- work order approved
- one labor line complete
- one labor line still in progress
- status: in progress

### Scenario 5 — Ready for pickup with balance state
- customer: OOO Volga Trade
- vehicle: Toyota Camry
- work complete
- payment partly recorded
- status: ready for pickup
- outstanding balance visible

### Scenario 6 — Completed history
- an older completed work order exists for each vehicle
- visible in history with labor, parts, and payment summary

## Sample labor lines

Use a small realistic set such as:
- front strut replacement,
- stabilizer link replacement,
- charging system diagnosis,
- alternator removal / install,
- brake pad replacement,
- oil service,
- wheel alignment referral if used.

## Sample part lines

Use a small realistic set such as:
- stabilizer link,
- front strut,
- top mount,
- voltage regulator,
- alternator belt,
- brake pads,
- oil filter.

## Sample statuses to seed

Appointments:
- booked,
- confirmed,
- arrived,
- cancelled,
- no-show.

Work orders:
- draft,
- waiting for diagnosis,
- waiting for approval,
- waiting for parts,
- scheduled,
- in progress,
- paused,
- ready for pickup,
- completed,
- cancelled.

## Review goal

A human owner should be able to open the product with seed data and immediately understand:
- what is booked,
- what is active,
- what is blocked,
- what is ready,
- and what the product is meant to manage.

---

# FILE: docs/19_AGENT_AUTONOMY_AND_HARNESS_MODEL.md

# 19 — Agent Autonomy and Harness Model

## Purpose

This file defines the expected operating model for Codex on this repository.

## Core idea

Codex is not only the primary implementer.

Codex is also expected to be the primary operator of the development loop:
- understand,
- plan,
- implement,
- validate,
- deploy,
- inspect,
- recover,
- and keep repository state current.

## Repository-visible memory

What is not visible to Codex in the repository or current execution environments should be treated as missing.

Important context should live in:
- packet documents,
- plans,
- status files,
- scripts,
- tests,
- verification flows,
- deployment logic,
- runbooks,
- and evidence records.

## What Codex should be able to produce over time

The repository should eventually contain, as needed:
- product code,
- automated checks,
- end-to-end verification,
- repository tooling,
- deployment/update logic,
- design history,
- evidence of validation,
- and maintenance improvements.

## Preferred project behavior

The repository should let Codex:
1. validate the current state,
2. reproduce an issue or missing behavior,
3. implement a change,
4. run or update checks,
5. drive the application or deployed system,
6. capture evidence,
7. detect and repair failures where possible,
8. and leave behind better repository instructions for the next run.

## Human role

The human owner is primarily expected to provide:
- goals and priorities,
- repository access,
- environment access,
- secrets or credentials through approved channels,
- infrastructure or domain inputs,
- and judgment for high-risk decisions.

The human should not have to supply repeated operational memory that could instead be encoded into the repository.

## Harness-first expectation

If Codex struggles because something is not encoded, not scripted, not testable, or not observable, the preferred response is usually to improve the harness:
- add missing documentation,
- add or improve verification,
- add or improve status tracking,
- add or improve deployment instructions,
- add or improve environment handling,
- or add or improve recovery paths.

## Autonomy boundary

Codex should act autonomously inside the boundary of:
- repository changes,
- environment usage already granted,
- deployment or update actions already approved,
- and project defaults already documented.

Codex should escalate when the next action crosses outside that boundary.

---

# FILE: docs/20_ENVIRONMENT_DEPLOYMENT_AND_OPERATIONS.md

# 20 — Environment, Deployment, and Operations

## Purpose

This file defines the project’s environment and operations contract in a stack-neutral way.

## Human-provided inputs

The human owner is expected to provide, when needed:
- the repository,
- one or more execution environments or machines,
- network reachability where appropriate,
- domains, IPs, or DNS inputs where appropriate,
- secrets or credentials through an approved channel,
- and approvals for actions that are sensitive, costly, or externally irreversible.

## Codex-owned responsibilities

Within the approved boundary, Codex should be able to:
- bootstrap a fresh environment,
- bring the project to a runnable state,
- deploy or update the application,
- apply data or schema changes safely,
- run post-deploy checks,
- keep deployment and recovery instructions in the repo,
- and update project state after changes.

## Environment rule

Every environment Codex is expected to use should be describable from repository-visible instructions.

The repository should avoid hidden one-off environment knowledge.

## Deployment rule

Deployment is part of the project, not an afterthought.

The repository should eventually define:
- how a change reaches a runnable environment,
- how health is checked,
- how a failed update is detected,
- and how to recover to the last known acceptable state.

## Temporary validation hosts

For non-production validation, temporary DNS-friendly hostnames such as nip.io-style or equivalent services are acceptable when useful.

The exact mechanism may change later, but the strategy should remain replaceable and documented.

## Certificates and transport security

When environment conditions allow it, certificate issuance and renewal should be automated and repository-driven as much as practical.

If temporary or self-managed certificate handling is needed for validation, that path should be explicit and replaceable.

## Health and smoke checks

A deployed environment is not considered healthy based on process start alone.

It should be possible for Codex to run:
- health checks,
- smoke checks,
- and scenario checks appropriate to the current phase.

## State recording

For each important environment, `STATUS.md` should record:
- purpose,
- address,
- current health status,
- last validated state,
- and known caveats.

## No hidden click-ops

Avoid relying on undocumented console steps or memory-based operational routines.

If a manual action is unavoidable, document:
- why it exists,
- when it is required,
- what exact input it needs,
- and what Codex should do before and after it.

## Recovery rule

The project should preserve a visible path to recover service after:
- a failed deployment,
- a failed migration,
- a broken verification run,
- or a misconfigured environment update.

---

# FILE: docs/21_EXECUTION_PLANS_STATUS_AND_EVIDENCE.md

# 21 — Execution Plans, Status, and Evidence

## Purpose

This file defines the mandatory planning and verification records that make the repository self-operable.

## Required living files

The repository should treat these files as living project records:
- `PLANS.md`
- `STATUS.md`

## `PLANS.md` rule

Use `PLANS.md` for non-trivial work.

A plan should exist before major implementation begins and should remain accurate while the work is active.

## `STATUS.md` rule

Use `STATUS.md` to preserve the latest accepted project state.

A new Codex run should be able to read `STATUS.md` and quickly understand:
- what has been accepted,
- what environments exist,
- what was last validated,
- what is currently blocked,
- and what the next likely milestone is.

## Evidence rule

Meaningful work should leave evidence.

Evidence may include:
- command outputs,
- generated reports,
- test results,
- screenshots,
- videos when useful,
- environment health results,
- deployment outputs,
- or failure logs.

## Minimum evidence expectation

At minimum, a meaningful completed slice should usually have:
1. proof that the current state was understood,
2. proof that the relevant checks ran,
3. proof that the relevant end-to-end path ran,
4. and proof that repository state files were updated.

## Verification against goals and current task

Before considering a slice complete, Codex should compare the result against:
- the packet goals,
- the active task,
- the active plan,
- and the last accepted repository state.

## Failure handling

If verification fails:
- do not silently proceed,
- record the failure,
- repair or narrow the slice,
- rerun validation,
- and update the status or plan to reflect reality.

## Completion handling

When a slice is accepted:
- summarize what changed,
- summarize what was validated,
- record any remaining caveats,
- and update both `STATUS.md` and `PLANS.md` accordingly.

---

# FILE: docs/22_REPOSITORY_HYGIENE_AND_CONTINUOUS_IMPROVEMENT.md

# 22 — Repository Hygiene and Continuous Improvement

## Purpose

This file defines the repository maintenance rules that keep an agent-built codebase coherent over time.

## Golden principle

Do not let repeated human prompting substitute for missing repository structure.

When a pattern matters, encode it.

## What should be encoded

Over time, important preferences and constraints should move into:
- packet documents,
- status records,
- plans,
- repository checks,
- tests,
- shared patterns,
- runbooks,
- and verification rules.

## Drift control

Agent-built repositories can drift when uneven patterns accumulate.

To control drift:
- prefer one clear way to do an important thing,
- centralize repeated rules where practical,
- remove obsolete paths,
- and document important changes when behavior shifts.

## Boundary validation

Important external or integration boundaries should be explicit and reviewable.

Do not let the repository grow around guessed shapes, hidden assumptions, or silent coercions.

## Cleanup rule

Small cleanup and consistency work is good project maintenance.

If Codex finds repeated sloppiness, outdated docs, dead paths, or confusing duplication, it should clean them up in small reviewable slices.

## State coherence rule

Repository state files, verification behavior, and actual runnable behavior should agree.

Do not leave:
- stale status files,
- stale plans,
- stale setup instructions,
- or stale acceptance claims.

## Continuous improvement rule

Each meaningful phase should leave the repository easier for the next Codex run to understand and operate than it was before.
