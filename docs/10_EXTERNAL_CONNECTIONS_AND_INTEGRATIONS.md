# 10 — External Connections and Integrations

## Why this matters

Flexible integrations are one of the main reasons the business wants a custom product.

The product must therefore be ready to connect cleanly to outside systems without forcing the entire operational model to follow their limitations.

## Priority connection types

### Parts suppliers
Highest priority.

The system should support:
- looking up items,
- creating supplier-side purchase actions,
- storing supplier references,
- tracking receive state,
- handling substitutions,
- and handling returns or cancellations.

### Notifications
Useful early.

The system should support:
- reminders about appointments,
- reminders about ready-for-pickup cars,
- and possibly selected status updates.

### Optional later connection types
- telephony,
- cash register or receipt support,
- data export for outside bookkeeping,
- and selected communication channels.

## Connection principles

1. The product must keep its own internal truth.
2. The product must continue operating when an outside system is unavailable.
3. Every outside action should be visible to a human reviewer.
4. Failed outside actions should be easy to notice and retry.
5. Vendor-specific naming should be mapped into the product’s own business language.
6. Manual fallback must exist for critical flows.

## Supplier-side rules

- A requested part inside the product is not the same thing as a supplier-side purchase action.
- One request may become several supplier-side attempts.
- One supplier-side result may replace another.
- Supplier references should be preserved.
- Receive, shortage, replacement, cancellation, and return states should be visible.

## Notification rules

Notifications are supportive, not authoritative.

The product itself remains the source of truth for:
- appointment status,
- work order status,
- and payment state.

## Money and status rule

No outside connection may silently change:
- money totals,
- protected prices,
- or critical work order states
without an explicit and reviewable rule.

## Integration maturity goal

The product should be ready for real outside connections without becoming dependent on any single vendor’s way of thinking.
