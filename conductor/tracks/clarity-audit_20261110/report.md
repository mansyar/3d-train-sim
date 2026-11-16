# Session Report Template — Clarity Audit

> Structured template for recording the three observation sessions. This is an
> empty instrument: every measured cell stays **not measured** until a parent
> observes a real session. No sample or invented numbers appear in any result
> cell. Clock definitions are imported verbatim from `protocol.md` §4 so a
> later comparison reuses them unchanged.

## Scope and privacy (FR-6)

- Observe **three children aged 2–4**, referred to only as **child 1**, **child 2**, and **child 3**.
- All notes are anonymous, descriptive, and non-identifying. No names, birthdates, photos, video, or audio.
- **No recordings are made or retained.** Notes stay on the device / in this track only; nothing is transmitted.
- If consent is withdrawn mid-session: stop observing, delete that session's notes, and mark the row **not measured**. Do not reconstruct or estimate a missing timing.
- If a measure cannot be taken, mark it **not measured** and note why — never invent a number.
- Device or app failure is recorded as friction, never as a child failure (the app has no fail states).

## Clock definitions (imported from `protocol.md` §4, reuse unchanged)

- **time-to-first-ride** (§4.1): start at app **open/wake**; stop at the first successful ride — the train visibly chugging around the child's track. Compared against the v1.0 gate figure of three of three children unassisted within 60 seconds.
- **unassisted session length** (§4.2): start at the child's first self-directed placement; stop at disengagement or any adult help; **cap at 20 minutes** (record 20:00 and note that the cap was reached — do not extrapolate). Compared against the v1.0 gate figure of one 10+ minute unassisted session.

## Per-child session records (FR-3, FR-6)

One row per child. Both measures have an explicit **not measured** state; leave
each result cell as **not measured** until a real session is timed. The setup
column records context only (device, browser, PWA?, starting state) — it is not
a measurement result and holds no invented values.

| Child | Setup (device / browser / PWA / starting state) | time-to-first-ride (§4.1) | unassisted session length (§4.2, 20:00 cap) | Observer notes (anonymous) |
| --- | --- | --- | --- | --- |
| child 1 | not yet observed | not measured | not measured | — |
| child 2 | not yet observed | not measured | not measured | — |
| child 3 | not yet observed | not measured | not measured | — |

## Ranked friction points (FR-4)

Record each distinct friction point once with the number of affected children
and its severity. Order the top five by **affected-child count first, then
severity**: a friction point affecting more children always ranks ahead of one
affecting fewer, regardless of severity; severity breaks ties between points
with an equal count. Severity is a qualitative tag (low / medium / high), not
an invented number. All slots stay **not measured** until observations exist.

| Rank | Friction point (tag) | Affected-child count | Severity | Observer notes |
| --- | --- | --- | --- | --- |
| 1 | — | not measured | not measured | — |
| 2 | — | not measured | not measured | — |
| 3 | — | not measured | not measured | — |
| 4 | — | not measured | not measured | — |
| 5 | — | not measured | not measured | — |

## Traceability (NFR-3)

| Criterion | Requirement | Satisfied by |
| --- | --- | --- |
| AC-2 | Three per-child rows with both measures and an explicit "not measured" state; no sample or invented numbers in result cells | Per-child session records above |
| AC-3 | Friction table with count, severity, ranked top-five slots, and documented count-then-severity ordering | Ranked friction points above |
| FR-3 | One record per child, both clocked measures, "not measured" state, observer notes | Per-child session records above |
| FR-4 | Friction by affected-child count and severity, ranked top five by count then severity | Ranked friction points above |
| FR-6 | No recordings or identifying details; anonymous notes stay on device / in track | Scope and privacy above |
