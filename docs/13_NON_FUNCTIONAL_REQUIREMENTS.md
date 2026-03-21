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
