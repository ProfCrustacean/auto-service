# 07 — Core Workflows

## 1. Appointment booking

Typical path:
1. identify or create customer,
2. identify or create vehicle,
3. select requested service or problem description,
4. choose date, time, bay, and responsible person,
5. record expected duration,
6. save appointment,
7. make the appointment visible on the board.

## 2. Walk-in intake

Typical path:
1. identify or create customer,
2. identify or create vehicle,
3. record complaint,
4. decide whether the car can be accepted now,
5. place it into the active flow,
6. create work order or same-day visit record,
7. assign bay and responsible person when known.

## 3. Diagnosis and estimate

Typical path:
1. start diagnosis,
2. record findings,
3. add or revise labor lines,
4. add needed parts,
5. produce an estimate,
6. mark approval state,
7. move the job to the next appropriate status.

## 4. Parts request and ordering

Typical path:
1. technician or front desk marks a needed part,
2. a parts request is created under the work order,
3. the request may become one or more supplier-side purchase actions,
4. parts arrival is recorded,
5. the work order becomes ready for continuation,
6. substitutions, shortages, or returns remain visible.

## 5. Repair execution

Typical path:
1. assign or confirm bay,
2. assign or confirm responsible person,
3. perform work,
4. add notes and photos as needed,
5. mark completed labor items,
6. keep the work order status accurate.

## 6. Payment and release

Typical path:
1. confirm final work order content,
2. record payment or remaining balance,
3. mark the car ready for pickup or handed over,
4. close the work order when operationally complete.

## 7. Reopen or correction flow

Typical path:
1. identify the completed work order,
2. open a controlled correction path,
3. preserve history,
4. avoid silent deletion or overwrite of important money and parts facts.

## Operational queues that must always exist

At minimum the system must be able to show:
- today’s schedule,
- active jobs,
- waiting for approval,
- waiting for parts,
- paused jobs,
- ready for pickup,
- and recently completed jobs.

## Workflow principle

No real car should be “nowhere”.

If a vehicle is physically in the service or is expected today, it should be visible in a meaningful state.
