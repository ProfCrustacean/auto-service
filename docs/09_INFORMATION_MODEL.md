# 09 — Information Model

## Purpose

This file describes the first-pass information model in business terms.

It does not prescribe storage shape. It defines the facts the product must be able to represent.

## Entity list

### Customer
Minimum facts:
- full name,
- phone,
- optional messaging handle,
- optional notes,
- history of visits.

### Vehicle
Minimum facts:
- make,
- model,
- year if known,
- plate number,
- VIN if known,
- engine or trim if useful,
- mileage if known,
- customer association,
- service history.

### Employee
Minimum facts:
- name,
- role,
- active or inactive state,
- working schedule if used,
- and visibility in assignment views.

### Bay
Minimum facts:
- name or number,
- active or inactive state,
- and scheduling visibility.

### Appointment
Minimum facts:
- customer,
- vehicle,
- requested service or complaint,
- planned date and time,
- expected duration,
- planned bay if known,
- planned responsible person if known,
- status,
- source of booking,
- and notes.

### Work Order
Minimum facts:
- visible number,
- vehicle,
- customer snapshot,
- creation moment,
- current status,
- assigned bay,
- assigned responsible person,
- complaint,
- findings,
- internal notes,
- customer-facing notes,
- money totals,
- and closure moment.

### Labor Line
Minimum facts:
- description,
- quantity or expected duration,
- sell price,
- approval state,
- completion state,
- and performer link where relevant.

### Parts Request
Minimum facts:
- requested item name,
- optional part number,
- quantity,
- linked work order,
- requester,
- urgency,
- current state,
- and replacement relationship if applicable.

### Purchased Part
Minimum facts:
- supplier reference,
- purchased item name,
- purchased quantity,
- purchase cost,
- receive state,
- return state,
- and linkage to the work order and request.

### Sold Part Line
Minimum facts:
- customer-facing item name,
- quantity,
- sell price,
- linked purchased part if known,
- and cancellation or return state.

### Payment
Minimum facts:
- work order,
- amount,
- payment type,
- payment method,
- recorded moment,
- recorded by whom,
- and optional comment.

### Note and Attachment
Minimum facts:
- linked object,
- author,
- moment,
- content or file reference,
- and visibility level if needed.

### Status History
Minimum facts:
- object,
- previous state,
- new state,
- moment,
- actor,
- and optional reason.

## Relationship rules

- one customer can relate to many vehicles;
- one vehicle can have many work orders over time;
- one appointment may lead to one work order, or none;
- one work order can contain many labor lines;
- one work order can contain many parts lines;
- one work order can have many payments;
- one work order can have many notes and attachments;
- one parts request can lead to zero, one, or many purchase actions.

## Search rules

The product should support fast lookup by:
- phone,
- customer name,
- plate number,
- VIN,
- work order number,
- and recent activity.

## Snapshot rule

Important business documents should preserve visible snapshots of customer-facing facts at the time of service so history still makes sense after later profile edits.
