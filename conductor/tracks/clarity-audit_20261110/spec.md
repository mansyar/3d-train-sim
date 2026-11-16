# Clarity Audit — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore delivers the observation scaffold for Phase 2 (Toddler First): an
observation protocol, a report template, and a comparison artifact that records
the current-state baseline for Tiny Tracks v0.12.0. Three children aged 2–4 are
observed by a parent; the resulting timings and ranked friction points will
guide the remaining Phase-2 tracks. This track prepares and documents the
instrument; it does not perform the observations or change player-facing code.

## Problem / Motivation

The product roadmap sets a v1.0 ship gate — three of three children ride
unassisted in under 60 seconds and one unassisted session lasts 10+ minutes —
but there is no structured way to capture, score, and compare those sessions.
`progressive-disclosure_20261110` shipped before this audit, so no pre-feature
baseline exists; its evidence deliberately recorded the field definitions and
cohort instead of inventing numbers. Without a stable protocol and comparison
artifact, later Phase-2 decisions (progressive disclosure follow-ups,
onboarding, accessibility, performance) would rest on anecdote rather than
observed behavior.

## Goals & Success Metrics

- **Goal:** A parent can run three consistent, privacy-safe observation sessions
  and record a reusable baseline with ranked friction points.
- **Metric:** Protocol, report template, and comparison artifact each pass an
  automated completeness check (required headings and columns present; no
  invented numeric results); findings are attributable to the imported field
  definitions; `pnpm check` remains green because no app code changes.

## Scope

### In Scope

- Observation protocol: cohort, consent, environment, session steps, clock
  rules, interruption handling, and the 20-minute cap.
- Report template: one record per child, explicit "not measured" state for
  unrun sessions, friction tags and ranked top five.
- Comparison artifact: current-state v0.12.0 baseline columns left empty and
  labelled "awaiting observation", with the imported field definitions and
  their source cited.
- Product roadmap doc sync: a Shipped marker on the `clarity-audit_20261110`
  row.

### Out of Scope

- Conducting the real toddler sessions (parent supplies notes later).
- Any player-facing feature, telemetry, analytics, network calls, or changes to
  the app's privacy posture.
- Photos, video, audio, names, or other identifying child data.
- Changing product guidelines or opening a separate permanent audit doc.
- Retroactive pre-feature baseline numbers — none were recorded and none are
  invented.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The protocol specifies a cohort of three children aged 2–4, parent consent, a repeatable session flow, and what a parent does on interruption or disagreement. | must |
| FR-2 | The protocol defines time-to-first-ride as app open/wake → first successful ride, and unassisted session length as first self-directed placement → disengage or adult help, capped at 20 minutes. | must |
| FR-3 | The report template has one record per child with fields for both clocked measures, an explicit "not measured" state, and a place for observer notes. | must |
| FR-4 | The report template records friction points by affected-child count and severity and ranks the top five by count, then severity. | must |
| FR-5 | The comparison artifact defines the v0.12.0 current-state baseline, cites the field definitions imported from `progressive-disclosure_20261110`, and leaves all measured values empty and labelled "awaiting observation". | must |
| FR-6 | The protocol and report forbid recordings and identifying details; notes are anonymous and stay on the device / in the track. | must |
| FR-7 | `conductor/product.md` marks this track Shipped and points to the track artifacts. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Phase verification is artifact-only: deterministic completeness checks assert required headings, columns and pending states; no unit tests are invented for prose. |
| NFR-2 | No app code, telemetry, network calls, or privacy-guideline changes; `pnpm check` stays green. |
| NFR-3 | Every acceptance criterion traces to an FR ID; IDs remain stable after approval. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `protocol.md` contains the 3-child 2–4 cohort, consent rules, session steps, both clock definitions, the 20-minute cap, and interruption handling. | FR-1, FR-2 |
| AC-2 | `report.md` has three per-child rows with both measure fields and an explicit "not measured" state; no sample or invented numbers appear in result cells. | FR-3, FR-6 |
| AC-3 | `report.md` has a friction table with count, severity and ranked top-five slots, and documents count-then-severity ordering. | FR-4 |
| AC-4 | `comparison.md` cites Progressive Disclosure's audit-comparison notes as the source, states v0.12.0 as the current-state baseline, and marks every value "awaiting observation". | FR-5 |
| AC-5 | `conductor/product.md` roadmap row carries a Shipped marker and links to the track artifacts. | FR-7 |
| AC-6 | A deterministic artifact check passes; `pnpm check` exits 0; every AC maps to an FR. | NFR-1, NFR-2, NFR-3 |

## Edge Cases

- A child never starts a ride within 20 minutes → record the cap value and
  note the blocker; do not extrapolate a first-ride time.
- An adult intervenes during a session → stop the unassisted clock at that
  moment; tag the interruption as friction.
- A sibling or another device interrupts → discard that timing, note the
  reason, and repeat once with the same protocol if possible.
- Consent is withdrawn mid-session → stop observing, delete the notes from
  that session, and mark the row "not measured".
- Observation data is not yet available → all result cells stay "awaiting
  observation"; no baseline is claimed as measured.
- A later track compares against this baseline → it must reuse the same cohort
  definition and clock rules rather than redefining them.
- Device or app failure during a session → record as friction, not as a child
  failure; the app has no fail states.

## Dependencies

- **Tracks:** none. `progressive-disclosure_20261110` is merged (PR #75) and
  its notes are imported as data, not as a blocking dependency.
- **External:** three children aged 2–4 and a parent observer. No services,
  credentials, APIs, or network access.

## Open Questions & Assumptions

- **Assumption:** v0.12.0 is the current-state baseline because the
  pre-feature numbers for the v1.0 gate were never captured; no retrospective
  values are asserted.
- **Assumption:** the v1.0 gate figures (3/3 children under 60 seconds, one
  10+ minute session) come from `conductor/product.md` and remain the reference
  thresholds.
- **Assumption:** parent consent covers observation of the observer's own
  children; notes are anonymous and no media is retained.
- **Question (deferred to data collection):** which device and physical setup
  each child uses; the protocol records it rather than fixing it here.

## References

- `conductor/product.md` — Phase 2 roadmap and v1.0 ship gate.
- `conductor/product-guidelines.md` — privacy and no-fail-states principles.
- `conductor/archive/progressive-disclosure_20261110/verification/phase-3.md`
  — "Audit-comparison notes" (imported field definitions, cohort, and the
  instruction not to invent numbers).
