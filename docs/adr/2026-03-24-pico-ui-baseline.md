# ADR 2026-03-24 — Pico CSS baseline for SSR pages

## Status
Accepted

## Context
UI styles were fragmented across server-rendered page templates:
- large inline style blocks in form/dashboard/detail/work-order queue pages,
- separate dispatch-board style contract,
- runtime CDN dependency for Event Calendar assets.

This increased drift risk, made style changes expensive, and reduced deterministic operability.

## Decision
1. Keep the existing SSR HTML-string architecture (no SPA framework introduction).
2. Adopt Pico CSS as the global baseline stylesheet.
3. Introduce a project-controlled theme/bridge layer on top of Pico:
   - `public/assets/css/tokens.css`
   - `public/assets/css/app.css`
4. Introduce one SSR document shell helper for all UI pages:
   - `src/ui/renderDocumentShell.js`
5. Move runtime style/script dependencies to local static assets under `/assets/*`.
6. Keep dispatch board as a special-case page with dedicated overrides in `dispatch-board.css`.

## Non-goals
- No React/Vue migration.
- No business workflow redesign.
- No full dispatch board rewrite.
- No classless-Pico global reset rollout.

## Consequences
Positive:
- One baseline for typography/forms/tables/buttons and shared primitives.
- Deterministic local and Render runtime without external CDN dependency for critical UI assets.
- Easier UI maintenance and safer incremental page migrations.

Trade-offs:
- Existing classes (`btn`, `panel`, `callout`, etc.) remain as bridge primitives to avoid risky full markup rewrite.
- Dispatch board still carries page-specific CSS due Event Calendar and DnD behavior constraints.

## Asset pinning policy
- Pico: `public/assets/vendor/pico.min.css`
- Event Calendar: `public/assets/vendor/event-calendar-5.5.1.min.css` and `.min.js`

Upgrade flow:
1. Replace vendor files with pinned new version.
2. Run `npm run lint && npm test && npm run verify && npm run scenario:dispatch-board`.
3. Validate deployed behavior with `npm run verify:render`.
4. Update this ADR and runbook version references.
