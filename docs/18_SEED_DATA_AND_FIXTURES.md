# 18 — Seed Data and Fixtures

## Purpose

The product should begin with realistic sample data so the owner can review real flows quickly.

## Sample service structure

### Bays
1. Bay 1
2. Bay 2

### Employees
1. Ivan Petrov — owner / administrator / lead technician
2. Aleksei Sokolov — mechanic
3. Sergei Kuznetsov — mechanic
4. Dmitrii Orlov — electrician

## Sample customers

1. Elena Smirnova — phone +7 927 100 10 10
2. Pavel Ivanov — phone +7 927 200 20 20
3. OOO Volga Trade — phone +7 927 300 30 30
4. Marina Kozlova — phone +7 927 400 40 40

## Sample vehicles

1. Kia Rio, plate A123AA13, VIN available
2. Toyota Camry, plate B456BB13, VIN available
3. Lada Vesta, plate C789CC13, VIN available
4. Ford Focus, plate E321EE13, VIN available

## Sample scenario set

### Scenario 1 — Upcoming appointment
- customer: Elena Smirnova
- vehicle: Kia Rio
- complaint: front suspension knock
- planned for tomorrow morning
- assigned bay: Bay 1
- assigned primary person: Aleksei Sokolov

### Scenario 2 — Walk-in diagnosis
- customer: Pavel Ivanov
- vehicle: Lada Vesta
- complaint: charging issue / battery warning
- same-day intake
- primary person: Dmitrii Orlov
- status: waiting for diagnosis

### Scenario 3 — Waiting for parts
- customer: Marina Kozlova
- vehicle: Ford Focus
- work order exists
- diagnosis complete
- one suspension part requested
- supplier-side purchase action created
- one substitution example is present (original position replaced by received alternative)
- status: waiting for parts

### Scenario 4 — In progress
- customer: Elena Smirnova
- vehicle: Kia Rio
- work order approved
- one labor line complete
- one labor line still in progress
- status: in progress

### Scenario 5 — Ready for pickup with balance state
- customer: OOO Volga Trade
- vehicle: Toyota Camry
- work complete
- payment partly recorded
- status: ready for pickup
- outstanding balance visible

### Scenario 6 — Completed history
- an older completed work order exists for each vehicle
- visible in history with labor, parts, and payment summary

## Sample labor lines

Use a small realistic set such as:
- front strut replacement,
- stabilizer link replacement,
- charging system diagnosis,
- alternator removal / install,
- brake pad replacement,
- oil service,
- wheel alignment referral if used.

## Sample part lines

Use a small realistic set such as:
- stabilizer link,
- front strut,
- top mount,
- voltage regulator,
- alternator belt,
- brake pads,
- oil filter.

## Sample statuses to seed

Appointments:
- booked,
- confirmed,
- arrived,
- cancelled,
- no-show.

Work orders:
- draft,
- waiting for diagnosis,
- waiting for approval,
- waiting for parts,
- scheduled,
- in progress,
- paused,
- ready for pickup,
- completed,
- cancelled.

## Review goal

A human owner should be able to open the product with seed data and immediately understand:
- what is booked,
- what is active,
- what is blocked,
- what is ready,
- and what the product is meant to manage.
