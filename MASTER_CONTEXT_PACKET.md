# MASTER_CONTEXT_PACKET.md

## Purpose

This file is an index only.
It is not a content mirror.

Canonical packet content lives in:
- `README.md`
- `STATUS.md`
- `docs/01..23_*.md`
- `PLANS.md`

If this file and canonical docs disagree, canonical docs win.

## Canonical Packet Entry Points

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
27. `PLANS.md`

## Operational Shortcuts

Local gates:
- `npm run secrets:scan`
- `npm test`
- `npm run verify`

Deploy-aware gate:
- `npm run verify:full`

Linear harness:
- `npm run linear:probe`
- `npm run linear:create`
- `npm run linear:sync`

## Maintenance Rules

- Do not paste full packet documents into this file.
- Keep this file compact and pointer-based.
- Update links/order when canonical docs move.
