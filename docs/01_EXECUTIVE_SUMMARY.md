# 01 — Executive Summary

## Product in one sentence

Build a custom front-office and workshop operations system for a small independent auto service, focused on scheduling, work orders, vehicle history, parts ordered for a job, payment recording, and lightweight management reporting.

## Project in one sentence

Build the repository so Codex can take it from empty or partially built state to a validated, deployable, and maintainable operating system for the service with minimal human intervention.

## Business context

The business is a single-location auto service in Saransk, Russia. It operates with:
- 2 service bays / lifts,
- 1 owner who is also a working technician,
- 2 mechanics,
- 1 electrician,
- parts usually purchased for a specific vehicle or repair,
- and simplified accounting outside the product.

## Why build a custom product

The main reason is control over workflow and integrations.

Existing market products are considered too restrictive or too closed for affordable integration work. The business wants one system that fits its actual operational flow instead of adapting itself to rigid software.

## Final product goal

The service should be able to run daily operations through one main system where every car goes through a visible and controlled flow:
1. appointment or walk-in intake,
2. customer and vehicle identification,
3. work order creation,
4. diagnosis and approval,
5. parts request and ordering,
6. repair execution in a specific bay by assigned people,
7. payment and release,
8. history and reporting.

Nothing important should depend on memory, chat history, scattered spreadsheets, or verbal coordination alone.

## Final project goal

Codex should be able to:
- understand the repository from in-repo context,
- plan substantial work without hidden assumptions,
- bootstrap or update environments from repository instructions,
- deploy changes,
- validate changes through automated and end-to-end checks,
- capture evidence,
- and keep project state current in the repository.

## What success looks like

The product is successful when:
- the front desk can see today’s and this week’s load by bay and by employee;
- every active vehicle has a clear current status;
- all work and parts are tied to work orders;
- waiting-for-parts cars are easy to track;
- payment status is always visible;
- the owner can see basic operational and money metrics without manual spreadsheet assembly;
- and external integrations can be added without bending the core workflow.

The project is successful when:
- Codex can make progress from a fresh run without hidden human memory,
- every meaningful iteration is end-to-end testable by Codex,
- deployment and update steps are repeatable,
- and the repo stays legible and self-operable over time.

## Product principle

This is a narrow custom system for one real service location first.

It is not meant to become a universal product by default.
