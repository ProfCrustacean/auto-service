# 12 — Reporting and Metrics

## Purpose

Reporting should help run the service, not imitate formal accounting.

The first reporting layer should answer:
- how loaded are we,
- what is blocked,
- what earned money,
- what is still unpaid,
- and where time is being lost.

## Core reports for the initial useful release

### 1. Today’s load
Should show:
- jobs by bay,
- jobs by employee,
- planned vs active work,
- and free capacity.

### 2. This week’s load
Should show:
- future appointments,
- bay occupancy,
- employee occupancy,
- and obvious overload or gaps.

### 3. Active jobs by status
Should show counts and lists for:
- waiting for diagnosis,
- waiting for approval,
- waiting for parts,
- in progress,
- paused,
- ready for pickup.

### 4. Waiting-for-parts report
Should show:
- work order,
- vehicle,
- requested items,
- current request state,
- supplier-side state if known,
- and how long the job has been blocked.

### 5. Revenue split
Should show:
- labor revenue,
- parts revenue,
- total revenue,
- and completed jobs count
for the selected period.

### 6. Average ticket
Default formula:
- total completed sales value
- divided by count of completed work orders
for the selected period.

### 7. Gross margin by work order
Default formula:
- labor sold
- plus parts sold
- minus purchased part cost
- minus direct outside service cost if any.

### 8. Outstanding balances
Should show:
- open work orders with unpaid balance,
- partially paid completed orders,
- and ready-for-pickup jobs that still require payment.

### 9. Basic productivity view
Should show:
- completed work orders count by person,
- labor sold by person where meaningful,
- and assignment load.

## Reporting rules

1. Reports should use explicit date ranges.
2. Reports should distinguish labor and parts.
3. Reports should preserve history even if names or prices change later.
4. Reports should be operationally understandable by the owner without spreadsheet reconstruction.

## Explicit non-goal

Reports in this product are management and operations reports, not formal accounting reports.
