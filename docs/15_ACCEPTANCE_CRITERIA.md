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
