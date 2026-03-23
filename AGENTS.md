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
25. `docs/23_LOCAL_AND_RENDER_RUNBOOK.md`
26. `docs/24_PERSISTENCE_TRANSITION_AND_RECOVERY.md`

For any non-trivial change, also read and then update:
27. `PLANS.md`

`MASTER_CONTEXT_PACKET.md` is an index-only pointer document. It is not a canonical source of packet content.

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
10. Compact `PLANS.md` when needed (archive older completed plans into `PLANS_ARCHIVE.md`) and keep an archived-plan skeleton in `PLANS.md` so planning context stays short but historically visible.
11. Only then consider the slice complete.

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
