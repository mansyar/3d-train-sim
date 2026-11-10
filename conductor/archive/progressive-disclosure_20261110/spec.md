# Progressive Disclosure — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

First-run toddlers see a basics-only toybox (Rails tab, Adventure minus
three-way / double-slip, Town minus station, plus Nature and Critters). Three
completed rides unlock the advanced tier — `switch-3way`, `switch-slip`, and
the cargo loop (`station`) — with an icon-only bounce-and-ding celebration. No
reading, no fail states, no data loss.

## Problem / Motivation

The toybox shows all ~19 piece types plus scenery at once. For a 2–4 year-old
non-reader with a short attention span, the three-way junction, double-slip,
and cargo loop are choice overload on minute one: they raise time-to-first-ride
and cut unassisted session length. If unsolved, the v1.0 Toddler Test
(3/3 kids to first ride unassisted in 60 s, one 10+ minute session) stays
out of reach.

## Goals & Success Metrics

- **Goal:** Shrink first-run choice to basics; reveal advanced pieces only
  after the child proves loop mastery (3 rides).
- **Metric:** Measured improvement over the `clarity-audit_20261110` baseline —
  time-to-first-ride and unassisted session length, same cohort or same
  protocol; v1.0 gate is 3/3 kids first ride <60 s plus one 10+ min session.
- **Metric:** Zero data-loss incidents across the audit; all six CI gates green.

## Scope

### In Scope

- Basics tier on fresh install: full Rails tab (`straight`, `corner`,
  `crossing`, `crossing-gate`, hill/bump run), Adventure minus `switch-3way`
  / `switch-slip` (`bridge`, `tunnel`, `slope-up`, `hill`, `slope-down`,
  `switch`, `switch-mirror`), Town minus `station`, full Nature + Critters.
- Advanced tier: `switch-3way`, `switch-slip`, `station` (the cargo loop gate).
- Ride-count unlock: the 3rd completed ride triggers the unlock.
- Unlock persists in the autosaved world; survives reload; parent-gated full
  reset clears it.
- Grandfather: any pre-tier world already containing an advanced piece
  auto-unlocks with all pieces kept.
- Icon-only unlock celebration: tab bounce + happy ding, mute-respecting,
  still under reduced motion, tap feedback <100 ms.

### Out of Scope

- No new track piece types (anti-roadmap: none before the clarity audit).
- No text labels, instructions, coach marks, or tutorial overlays — icon-only.
- No analytics, telemetry, accounts, or network calls.
- No driving mode, scoring, timers, or levels.
- No changes to train motion, pathing, cargo rules, or camera behavior.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Fresh install (no save, no unlock flag) shows basics tier only. | must |
| FR-2 | Advanced kinds (`switch-3way`, `switch-slip`, `station`) are hidden from the drawer while locked. | must |
| FR-3 | The 3rd completed ride triggers the unlock (ride = ▶ run with train moving, ended by ⏹ or ride completion). | must |
| FR-4 | Unlock state persists in the world save and survives reload. | must |
| FR-5 | A world that already contains an advanced piece auto-unlocks on load with every piece kept. | must |
| FR-6 | Unlock reveals with an icon-only celebration (bounce + ding); respects mute and reduced motion; every tap still answers <100 ms. | must |
| FR-7 | Parent-gated full reset clears the unlock flag back to basics tier. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No frame-rate or cold-start regression: 60 FPS mid tablets, interactive <5 s; `src/core` + `src/state` coverage stays ≥80%. |
| NFR-2 | Privacy: ride counter + unlock flag never leave the device (IndexedDB world only, airplane-mode functional, no network requests). |
| NFR-3 | Accessibility: no reading required; visible focus states kept; reduced-motion path (static reveal, no bounce) required. |
| NFR-4 | Reliability: malformed or pre-tier saves load under the save-resilience salvage rules; an advanced piece is never deleted by this track. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Fresh profile: drawer shows zero `switch-3way` / `switch-slip` / `station` slots. | FR-1, FR-2 |
| AC-2 | After 3 completed rides, advanced slots appear without reload. | FR-3, FR-2 |
| AC-3 | Reload after unlock keeps advanced slots; parent reset removes them. | FR-4, FR-7 |
| AC-4 | Loading a legacy world containing `switch-3way` keeps the piece and shows the advanced tier. | FR-5 |
| AC-5 | Unlock moment: bounce + ding with sound on; silent static reveal with mute on or reduced motion; no console errors. | FR-6 |
| AC-6 | Full suite green (`pnpm check`, coverage gate, e2e disclosure spec, build) with no new runtime network requests. | NFR-1, NFR-2 |

## Edge Cases

- Legacy save with advanced piece placed but drawer code predates flag → unlock on load (FR-5), never delete.
- Unlock mid-ride (3rd ride completes while riding) → reveal applies at ride end / next drawer open, never interrupts the train.
- Mute on / reduced motion on → static reveal, no ding, no bounce.
- Airplane mode / offline → counter + flag work fully local.
- `MAX_PIECES` (64) cap dimming still applies independently of tier gating.
- Undo (↩️) never removes the unlock; only parent reset clears it.
- Reinstall / cleared storage → back to basics tier (flag is world-scoped, not device-scoped).

## Dependencies

- **Tracks:** `clarity-audit_20261110` must merge first — its baseline numbers are the comparison this track is measured against. Hard dependency.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Basics = Rails full + Adventure minus 3way/slip + Town minus station; Nature + Critters always visible. Approved in spec interview.
- **Assumption:** Ride = ▶ run with the train moving, ended by ⏹ or natural ride end; pause/resume does not double-count.
- **Assumption:** `station` is the cargo-loop gate (cargo loads only at stations per `cargo-pickups_20260902`).
- **Assumption:** Unlock threshold is exactly 3 completed rides (interview decision).
- **Question:** Does the clarity audit change the threshold or the tier split? If so, this spec amends via a new FR (never renumber).

## References

- `conductor/product.md` — Phase 2 roadmap line for `progressive-disclosure_20261110`
- `conductor/product-guidelines.md` — no reading, no fail states, instant feedback, parent-gated destruction
- `src/core/drawer.ts` — `DRAWER_TABS`, `TAB_FOR_KIND` (Basics ride Rails; big tricks ride Adventure)
- `src/ui/toy-drawer.ts`, `src/ui/toy-icons.ts` — drawer UI + piece catalogs
- `conductor/archive/cargo-pickups_20260902/` — station-gated cargo rules
- `conductor/archive/switchyard_20260913/`, `conductor/archive/double-slip-switch_20260930/` — advanced pieces
