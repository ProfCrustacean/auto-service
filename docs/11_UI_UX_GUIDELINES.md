# 11 — UI / UX Guidelines

## Design intent

The product should feel fast, clear, and low-ceremony for a busy service environment.

The team should be able to answer common questions in a few seconds:
- who is booked now,
- what is waiting,
- which cars need parts,
- what is ready,
- what is overdue,
- and what is still unpaid.

## Main experience goals

1. Fast daily planning.
2. Minimal repeated typing.
3. High visibility of current state.
4. Easy switching between customer, vehicle, appointment, and work order.
5. Clear money visibility without accountant-style complexity.

## Key screens

### Daily board
Must show:
- time,
- bays,
- assigned people,
- current and planned jobs,
- blockers,
- and simple status cues.

### Weekly planning view
Must show:
- future load by bay,
- future load by person,
- and obvious overbooking or underbooking.

### Customer and vehicle record
Must show:
- basic profile,
- recent history,
- open jobs,
- and easy entry into a new appointment or work order.

### Work order detail
Must show:
- complaint,
- status,
- assigned people,
- labor,
- parts,
- notes,
- photos,
- payments,
- and next action.

### Waiting-for-parts queue
Must make it easy to answer:
- what is missing,
- for which car,
- from which supplier action,
- and what can move again today.

### Ready-for-pickup queue
Must make it easy to answer:
- what is done,
- what is owed,
- and who should be contacted.

## Interaction rules

- important states should be readable at a glance;
- searches should be forgiving and fast;
- the most common actions should be one or two steps away;
- editing money or sensitive status should be explicit;
- historical context should be easy to reach without cluttering the main path.
- owner-facing dispatch board should avoid duplicate control surfaces:
  - no duplicate metric strips above the board when lane context is already visible in calendar rows,
  - no secondary manual scheduling controls outside the calendar for slot/duration changes.
  - scheduling board should use vertical resource time-grid (time top-to-bottom, resources as lanes),
  - queue assignment should be drag-and-drop into the calendar only (no fallback manual assign buttons).

## Language rule

User-facing text should be ready for Russian-speaking staff from the beginning.

Internal naming, docs, and product reasoning may remain in English.
