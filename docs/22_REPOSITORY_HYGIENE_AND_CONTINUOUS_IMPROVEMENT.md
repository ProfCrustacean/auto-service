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

Planning files are included in this rule:
- keep `PLANS.md` short and operationally scannable,
- archive older completed plans to `PLANS_ARCHIVE.md`,
- keep an archived-plan skeleton index in `PLANS.md` for quick historical awareness,
- and avoid letting historical sections crowd out active execution context.

Repository budget governance is part of hygiene:
- run `npm run audit:bloat` to enforce tracked-size, duplication, and hot-path doc budgets,
- keep thresholds in `data/bloat/budgets.json`,
- and allow temporary budget regressions only with explicit override (`BLOAT_ALLOW_REGRESSION=1`) plus documented follow-up.

Evidence retention is governed explicitly:
- canonical tracked evidence allowlist lives in `data/hygiene/evidence-canonical.json`,
- tracked `evidence/*` must match that allowlist exactly,
- run `npm run cleanup:spring` to inspect drift (dry-run),
- run `npm run cleanup:spring:apply` to prune tracked legacy artifacts and stale untracked evidence files.

## State coherence rule

Repository state files, verification behavior, and actual runnable behavior should agree.

Do not leave:
- stale status files,
- stale plans,
- stale setup instructions,
- or stale acceptance claims.

## Continuous improvement rule

Each meaningful phase should leave the repository easier for the next Codex run to understand and operate than it was before.
