# Process Hygiene — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Close out Phase 1 by cleaning the Conductor state that accumulated across 67 shipped tracks: give `conductor/tracks.md` a single normalized registry table, and record two deliberate interaction decisions (parent-only long-press and `user-scalable=no`) in `conductor/product-guidelines.md` so they stop looking like violations.

## Problem / Motivation

`conductor/tracks.md` currently mixes statuses (`archived` for the newest 10 rows, `done` for older rows) and appends a second plain-text name list that duplicates the table. A reader cannot tell at a glance whether every archived track is represented, and Phase 2 tools (`conductor-status`) must guess which vocabulary is truth. Separately, `product-guidelines.md` says "no long-press" and `index.html` sets `user-scalable=no` with no note that both are intentional: the parent gate uses a deliberate hold-to-confirm gesture and the viewport is locked to stop toddler pinch-zoom. Without recording them, a future audit can misread them as spec violations.

## Goals & Success Metrics

- **Goal:** One authoritative registry table with a single status vocabulary, plus two recorded intentional decisions.
- **Metric:** `conductor/tracks.md` contains exactly one table, one row per `conductor/archive/` directory, all with status `archived`; `product-guidelines.md` names both exceptions in place.

## Scope

### In Scope
- Rebuild `conductor/tracks.md` as one table covering all archived tracks; normalize status to `archived`; remove the duplicate trailing name list.
- Add the parent-only long-press exception note to `conductor/product-guidelines.md` next to the interaction principle it qualifies.
- Add the `user-scalable=no` intentional-decision note to `conductor/product-guidelines.md`.
- Mark `process-hygiene_20261109` as shipped in the `conductor/product.md` Phase 1 table.

### Out of Scope
- Moving or renaming anything under `conductor/archive/` or `conductor/tracks/`.
- Changing `index.html`, `src/input/parent-gate.ts`, or any product code.
- Backfilling per-track metadata inside archive folders.
- Phase 2 work (clarity audit, progressive disclosure, etc.).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `conductor/tracks.md` contains exactly one registry table with one row per directory under `conductor/archive/` (67 rows at time of writing) | must |
| FR-2 | Every row in the registry table uses the status value `archived`; no `done` statuses remain and the duplicate trailing name list is removed | must |
| FR-3 | `conductor/product-guidelines.md` records the parent-only long-press (hold-to-confirm) gesture as an intentional exception to "no long-press for kids," with rationale | must |
| FR-4 | `conductor/product-guidelines.md` records `user-scalable=no` as an intentional decision, with rationale | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Doc edits only; no product code changes. Verification is `pnpm exec biome check .` plus the row-count check, not the full test suite |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Registry row count equals archive directory count, all statuses `archived`, single table, no duplicate list | FR-1, FR-2 |
| AC-2 | Both exceptions are named in `product-guidelines.md` with rationale | FR-3, FR-4 |
| AC-3 | `product.md` Phase 1 table shows `process-hygiene_20261109` as Shipped | FR-1 |

## Edge Cases

- Archive directory added concurrently mid-track: regenerate the table at implementation time rather than trusting the 67 count from spec time.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** `archived` remains the canonical status word, matching the newest registry rows and `conductor-status` usage.

## References
- `conductor/product.md` Phase 1 roadmap row for `process-hygiene_20261109`
- `conductor/tracks.md` (current mixed-status registry)
- `conductor/product-guidelines.md` principle 5 and parent-gate bullets
- `index.html` viewport meta
- `src/ui/parent-gate.ts`
