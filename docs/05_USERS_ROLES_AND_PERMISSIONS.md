# 05 — Users, Roles, and Permissions

## Role model

Roles are based on real work responsibilities, not on theoretical corporate structure.

A single person may hold more than one role.

## Main roles

### Owner / Administrator
Purpose:
- overall control of the service.

Can:
- see everything,
- change prices,
- approve or reverse sensitive actions,
- view all reports,
- manage employees, bays, and rules,
- and handle exceptions.

### Front Desk / Service Advisor
Purpose:
- intake, communication, planning, and closure.

Can:
- create and edit appointments,
- create and edit customers and vehicles,
- create and update work orders,
- record approvals,
- record payments,
- and view operational reports.

Should not:
- change protected settings,
- change historical money records without permission,
- or override sensitive decisions without a reason.

### Technician
Purpose:
- execute work and record findings.

Can:
- view assigned and relevant work orders,
- add notes and photos,
- mark findings,
- mark work steps complete,
- request parts,
- and update technical progress.

Should not by default:
- edit protected prices,
- close money-related records,
- or change high-level business settings.

### Parts Operator
Purpose:
- manage parts under jobs.

Can:
- view parts requests,
- create and update supplier-side orders,
- record received parts,
- record replacements and returns,
- and view parts-related queues and reports.

### Read-Only Observer
Purpose:
- accountant, partner, or reviewer who needs visibility but not editing power.

Can:
- view selected records and reports.

Cannot:
- change operational data.

## Permission principles

1. Sensitive money actions should be limited.
2. Sensitive price changes should be limited.
3. Status changes should be visible in history.
4. The system should support role overlap without confusion.
5. Permissions should follow real operations, not formal titles.

## Practical default

In the first release, it is acceptable if the owner has broad rights and other roles are simpler, as long as the boundaries around money and protected changes are clear.
