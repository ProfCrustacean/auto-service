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
