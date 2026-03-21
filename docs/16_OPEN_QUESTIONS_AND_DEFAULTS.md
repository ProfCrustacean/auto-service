# 16 — Open Questions and Defaults

## Purpose

This file defines defaults that Codex should use when the business has not yet answered a question explicitly.

## Defaults

### 1. Number of locations
Default:
- exactly one service location.

### 2. Number of bays
Default:
- two active bays / lifts.

### 3. Team size
Default:
- one owner with full rights,
- two mechanics,
- one electrician.

### 4. Public self-booking
Default:
- not required for the first useful release.

### 5. Complex diagnostics in self-booking
Default:
- not offered in the first useful release.

### 6. Walk-ins
Default:
- allowed and important.

### 7. Appointment vs work order
Default:
- appointments and work orders are different objects;
- an appointment may become a work order later.

### 8. Parts stocking model
Default:
- low standing stock,
- mostly job-based parts purchasing.

### 9. Parts substitutions
Default:
- allowed, but must remain visible and linked to the original request.

### 10. Returns
Default:
- part returns and cancellations must be recorded, not silently erased.

### 11. Multiple technicians on one job
Default:
- allowed, but one primary responsible person should remain visible.

### 12. Bay assignment
Default:
- expected for scheduled and active jobs once known.

### 13. Partial payments
Default:
- supported.

### 14. Money edits
Default:
- protected and traceable.

### 15. Price overrides
Default:
- allowed only for trusted roles and with a reason.

### 16. Gross margin formula
Default:
- labor sold plus parts sold minus purchased part cost minus direct outside service cost if any.

### 17. Rent and salary treatment in order margin
Default:
- excluded from work-order gross margin.

### 18. Vehicle ownership history
Default:
- keep current association, but preserve order-time customer snapshots.

### 19. Attachments and photos
Default:
- supported from early releases because they matter in service work.

### 20. Language
Default:
- English for repository docs and internal naming,
- Russian-ready user-facing copy.

### 21. Outside connection failure
Default:
- manual fallback must exist.

### 22. Customer approval before extra paid work
Default:
- required unless the line is a small pre-approved diagnostic item or the business later defines a controlled exception.

### 23. Closed work orders
Default:
- remain visible in history and should not be silently rewritten.

### 24. Role overlap
Default:
- one person may hold multiple roles.

### 25. Owner reporting depth
Default:
- lightweight operational and management reporting only.

### 26. Meaningful change verification
Default:
- every meaningful slice must be verifiably runnable and end-to-end testable by Codex.

### 27. State tracking
Default:
- `STATUS.md` and `PLANS.md` are living project files and should be maintained continuously.

### 28. Temporary validation domains
Default:
- temporary DNS-friendly hostnames such as nip.io-style or equivalent services are acceptable for non-production validation when needed.

### 29. Environment count
Default:
- at least one durable runnable environment is expected;
- extra preview-like environments are optional when available.

### 30. Manual operations
Default:
- avoid undocumented manual click-ops;
- prefer repeatable repository-defined operations.

### 31. Evidence capture
Default:
- UI, deployment, or verification changes should produce reviewable evidence.

## Escalation rule

If a new question appears:
1. prefer the narrowest safe default,
2. write the chosen default down,
3. and only escalate if the issue is truly blocking or high-risk.
