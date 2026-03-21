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
