# Longer trains — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Every locomotive can grow from its base wagon pair to a four-wagon consist: a `+` slot in the wagon row appends wagons, each wagon can wear its own preset outfit, and the extra wagons work cargo like the base pair. Length is capped by what fits the current loop, persists across reloads, and clears on world reset.

## Problem / Motivation

Parent feedback (RM-005 origin) asks for longer trains: children build bigger loops and want bigger consists to run on them, but today every loco is fixed at exactly two wagons. If unsolved, the most-requested solo-loop extension stays missing while Phase 3 depth work continues elsewhere.

## Goals & Success Metrics

- **Goal:** The child can grow any locomotive to up to 4 wagons, mix outfits per wagon, and run full cargo on the lengthened consist.
- **Metric:** Green static/unit/e2e gates plus screenshots of a 4-wagon mixed-outfit consist riding (no invented numbers, no human observation).

## Scope

### In Scope

- Free add-a-wagon via a `+` slot in the wagon row, max 4 wagons, uniform across all six locos
- Per-wagon outfits via select-wagon-then-tap-preset; tap-last-wagon to remove
- Loop-fit gating of `+` (dimmed when the loop can't fit another wagon)
- Full cargo participation for extra wagons
- Persistence of length + outfits; world reset clears to the pair

### Out of Scope

- Per-train length settings (uniform rule only)
- 5+ wagons, new wagon models, new presets
- Shared Play, new pieces/locos, portable-export format changes

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The wagon row shows an icon-only `+` slot; tapping it appends one wagon to the selected loco's consist until the cap | must |
| FR-2 | Maximum 4 wagons per locomotive, uniform across all six locos | must |
| FR-3 | The `+` slot is dimmed and untappable while the current loop path cannot fit another wagon, and re-enables when the loop grows | must |
| FR-4 | Tapping a wagon selects it; tapping a preset dresses the selected wagon; with no wagon selected a preset tap dresses the base pair (legacy behavior); extra wagons otherwise keep their outfits | must |
| FR-5 | Tapping the last wagon of a lengthened consist removes it | must |
| FR-6 | Extra wagons load and deliver station cargo exactly like the base pair | must |
| FR-7 | Consist length and per-wagon outfits persist in the world snapshot, reload byte-identically, and clear back to the base pair on full world reset | must |
| FR-8 | Shortening the loop below the current consist length keeps all wagons (overlap allowed; never silently destroy the child's train) | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | All new controls are icon-only with ≥64px targets (Toddler Test) |
| NFR-2 | No new dependencies or downloaded assets; extra wagons reuse the existing pooled wagon actors |
| NFR-3 | Train-follow performance unchanged: no per-frame allocations from the longer consist |
| NFR-4 | Save changes are additive and salvage-safe; length travels with the world snapshot including portable export |
| NFR-5 | Under reduced motion, add/remove land in their final state with no animation frames |
| NFR-6 | No fail states anywhere: dimmed `+`, kept wagons, silent no-ops — never an error a child can hit |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Tapping `+` grows a consist to 4 wagons; a 5th tap is a silent no-op | FR-1, FR-2 |
| AC-2 | Two wagons in one consist show different preset outfits via select + preset | FR-4 |
| AC-3 | Tapping the last wagon removes it; world reset restores the base pair | FR-5, FR-7 |
| AC-4 | On a loop too short for another wagon `+` is dimmed; extending the loop re-enables it | FR-3 |
| AC-5 | Reload restores length + outfits byte-identically | FR-7 |
| AC-6 | Crates load and deliver from wagons 3 and 4 in a station run | FR-6 |
| AC-7 | Unit plus e2e green on tablet/phone with screenshots of a 4-wagon mixed consist | NFR-1 – NFR-6 |

## Edge Cases

- 4-wagon consist shuttling on a dead-end path: wagons follow the path in both directions
- Switch thrown while the consist straddles it: consist follows the resolved path, no derail/fail state
- Rapid taps on `+`: idempotent, exactly 4 wagons max, no duplicate actors
- Offline / PWA: no new precache entries (no new assets per NFR-2)
- Reduced motion: add/remove/select land in the final resting state
- Portable export carries length + outfits with the world (per A3)

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption A1:** Preset tap with a wagon selected dresses that wagon; with no selection it dresses the base pair (legacy). Extra wagons otherwise untouched.
- **Assumption A2:** Add/remove reuses the existing reward voice (soft pop/knock); no new audio motifs.
- **Assumption A3:** Length + outfits travel with the world snapshot including portable export (the build itself, not preferences).
- **Assumption A4:** "Fits" = current consist length + one wagon margin versus measured loop path length, recomputed on track edits and train selection.
- **Assumption A5:** The `+` slot is ≥64px icon-only; its dimmed state reuses the existing disabled styling.

## References

- RM-005 (roadmap; origin: informal parent feedback)
- `conductor/product.md` Phase 3 (solo-loop depth) and Anti-roadmap
- `src/state/world.ts` (wagon preset pairs), `src/ui/train-picker.ts` (wagon row)
