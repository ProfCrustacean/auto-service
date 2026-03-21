# 06 — Domain Model and Rules

## Core domain idea

The product revolves around a vehicle visit.

A visit may start from an appointment or a walk-in and may produce one or more work orders over time, but each active repair job must be traceable and visible.

## Core entities

- Customer
- Vehicle
- Employee
- Bay
- Appointment
- Work Order
- Labor Line
- Parts Line
- Parts Request
- Supplier-Side Order
- Payment
- Note
- Attachment
- Status History

## Rules by entity

### Customer
A customer is the person or business currently interacting with the service.

Rules:
- one customer may have many vehicles;
- one vehicle may have historical association with different customers over time;
- a work order should preserve customer details as they were at the time of service.

### Vehicle
A vehicle is a central operating object.

Rules:
- each work order belongs to one vehicle;
- vehicle history must be easy to retrieve;
- key identifiers should include at least plate number and VIN where available.

### Bay
A bay is a real capacity constraint.

Rules:
- a bay can only host one active planned job in the same time slot unless the service explicitly allows overlap for a specific case;
- a bay assignment may change during the day, but changes should be visible.

### Employee
An employee is a real labor capacity constraint.

Rules:
- an employee can be assigned to multiple jobs only if the service intentionally allows it;
- a primary responsible person should be visible for each work order even when several people contribute.

### Appointment
An appointment is a planned visit, not yet necessarily a real repair order.

Rules:
- appointments can be created without a work order;
- appointments can become work orders later;
- walk-ins may create same-day appointments or skip directly into intake flow;
- cancelled appointments should remain visible in history.

### Work Order
A work order is the main operational record for a repair visit.

Rules:
- every paid job must have a work order;
- every work order belongs to one vehicle;
- a work order may have many labor and parts lines;
- a work order may have deposits, partial payments, and final payment;
- a closed work order should remain immutable except for controlled correction flow.

## Status model

Recommended work order status families:
- draft,
- waiting for diagnosis,
- waiting for customer approval,
- waiting for parts,
- scheduled,
- in progress,
- paused,
- ready for pickup,
- completed,
- cancelled.

Rules:
- status names must be explicit and understandable to non-technical staff;
- status changes must be recorded in history;
- money-sensitive or completion-sensitive transitions should be controlled;
- the front desk must always be able to answer “what is happening with this car right now?”

## Labor lines

Rules:
- labor lines may be planned, revised, approved, completed, or cancelled;
- the system should support revised estimates after diagnosis;
- labor sold and labor completed are related but not always identical.

## Parts lines and parts requests

Rules:
- parts sold to the customer and parts purchased from suppliers are related but should not be treated as the same thing;
- the system must preserve purchase-side and sale-side meaning separately;
- one requested part may lead to replacement by another part;
- returns and cancellations must remain visible.

## Payments

Rules:
- payments may be deposit, partial, or final;
- one work order may have multiple payments;
- outstanding balance must always be visible;
- money records should have controlled edit rules.

## Reporting rule for gross margin

Default gross margin per work order:
- labor sold
- plus parts sold
- minus purchased part cost
- minus direct outside service cost if any.

Do not include:
- rent,
- salaries,
- utilities,
- or broad overhead inside work-order gross margin by default.

## Audit rule

Price overrides, sensitive status changes, money edits, and key parts substitutions should be traceable in history.
