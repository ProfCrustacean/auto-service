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
