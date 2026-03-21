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
