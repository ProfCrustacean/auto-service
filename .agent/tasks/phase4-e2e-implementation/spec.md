# Task Spec: phase4-e2e-implementation

## Metadata
- Task ID: phase4-e2e-implementation
- Created: 2026-03-25T00:16:11+00:00
- Repo root: /Users/ian/auto-service
- Working directory at init: /Users/ian/auto-service

## Guidance sources
- AGENTS.md
- CLAUDE.md

## Original task statement
Implement Phase 4 end-to-end as originally outlined: deposits/partial/final payments, outstanding balances, and core operational reporting with repository evidence and verification.

## Acceptance criteria
- AC1: Work-order payment recording is implemented end-to-end in API and domain logic.
- AC2: Payment recording is available from the work-order SSR page and recorded payments are visible in page/API detail.
- AC3: Core operational reporting for Phase 4 is implemented and exposed through a stable API and owner-facing dashboard section.
- AC4: Phase 4 slice is verified with automated tests and repository state/docs are updated with evidence and current status.

## Constraints
- Keep all monetary values deterministic integer rubles (no floating-point math).
- Preserve existing scheduling/intake/work-order/parts contracts unless directly required by Phase 4.
- Keep mutation authorization explicit through existing policy and role boundaries.
- Keep implementation agent-operable: small modules, explicit interfaces, machine-verifiable behavior.

## Non-goals
- Full accounting/tax/payroll workflows.
- External payment gateway integrations.
- Payment reversal/edit history UX beyond append-only payment recording.
- Multi-branch or multi-currency behavior.

## Verification plan
- Build:
  - Implement persistence migration(s), repository/service/http/page updates, and dashboard/reporting projection changes.
- Unit tests:
  - Extend service/projection tests for payment and reporting calculations.
- Integration tests:
  - Add API/page tests for payment create/list/update-balance and reporting endpoint behavior.
- Lint:
  - `npm run lint`
- Manual checks:
  - `npm test`
  - `npm run verify`
  - spot-check `/api/v1/work-orders/:id/payments`, `/api/v1/reports/operations`, `/work-orders/:id`, and `/`.

## Assumptions
- Labor revenue per work order is captured as an explicit work-order field in rubles.
- Parts revenue/cost reporting is derived from job-linked parts requests under the work order.
- Payment recording is append-only and updates `balanceDueRub` deterministically.
