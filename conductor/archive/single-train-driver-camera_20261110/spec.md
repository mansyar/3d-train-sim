# Single Train and Driver Camera — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.

## Overview

Tiny Tracks currently rides one train per connected track, up to four at once. This track changes that to **exactly one train at a time**: the train appears on the longest looped track — or, when no looped track exists, on the longest track — and re-picks on each ▶ press or world change, never swapping mid-ride. It also adds a **driver-perspective camera** (eye at the cab, looking forward along the track) as the third stop in the existing 🎥 cycle, so a toddler can ride *in* the train instead of only watching it.

## Problem / Motivation

Multiple concurrent trains arose from the shipped `every-layout-rides` track (one per component, cap 4). For the target 2–4 year-old, several trains divide attention and complicate the camera (🎥 was hidden under two rides). A single train is calmer, matches "the train is always autonomous" as one companion, and makes the chase camera unambiguous. The driver view gives the most delightful payoff of the core loop — seeing the track the child just built rush past — which the exterior chase camera cannot provide.

This deliberately diverges from the shipped roadmap's Phase 2 (clarity audit first). The user has chosen this over the roadmap; the roadmap is not blocked, just deferred.

## Goals & Success Metrics

- **Goal:** One train only, chosen by the loop-then-longest rule, with a driver-perspective camera in the 🎥 cycle.
- **Metric:** `ridingCount() === 1` whenever riding with ≥1 non-empty component; selection unit tests prove the loop-then-longest rule with tie-breaks; driver view renders from the cab forward; full e2e suite green with the single-train camera journey replacing the two-loops journey.

## Scope

### In Scope

- Single-train selection: longest looped (`path.closed`) component wins; if none, longest component wins; ties broken by existing deterministic ranking (piece count then cell-key anchor, matching `selectRideComponents` ordering).
- Re-pick on ▶ / world change only; an active ride never swaps mid-loop.
- Cap change in `selectRideComponents` call sites and ride layer (`src/state/ride.ts`, `src/core/pathing.ts`, `src/core/park-spot.ts` if affected).
- Driver-perspective camera: eye at cab position, look forward along the train's heading; locomotive body not in frame (or minimal hood hint).
- 🎥 cycle becomes Overview → Chase → Driver, visible whenever ≥1 train rides (≥1 threshold replaces ≥2); hidden under reduced motion as today.
- Update e2e that asserts multi-train: replace the two-disjoint-loops journey with a single-train + driver-view journey; update any `ridingTrainCount === 2` witnesses.
- Doc sync: `conductor/product.md` core loop, V1 scope, and shipped-roadmap note for multi-train; `README.md` if it repeats the multi-train promise (only if currently worded that way).

### Out of Scope

- Driving mode: the child still never drives. Driver view is a camera only — no steering, throttle, or controls.
- Changing locomotive selection, wagon presets, cargo, switches, station stops, or ride motion.
- Changing which locomotive kind rides (still `world.train()`).
- Multi-train as an opt-in/parent-gate toggle.
- New track pieces, locomotives, or audio.
- Reduced-motion behaviour change (driver/chase views remain unavailable under reduced motion, fixed overview stays).

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | When riding with ≥1 connected component, exactly one `RideState` is active (`rides().length === 1`). | must |
| FR-2 | The active ride is the component with the most pieces among those with `path.closed === true`. If no component is closed, the active ride is the component with the most pieces overall. Ties broken by the existing deterministic order (cell-key anchor ascending). | must |
| FR-3 | Selection is re-evaluated on each `startAll()` (▶) and on world change; a running ride's component is never swapped mid-ride — mid-ride edits keep today's scoped soft-stop behaviour. | must |
| FR-4 | The 🎥 cycle is Overview → Chase → Driver (left-to-right order), wrapping; the driver view places the camera at the locomotive cab eye position and looks forward along the train's current heading. | must |
| FR-5 | The 🎥 button is visible whenever ≥1 train rides (replaces the ≥2 rule) and remains hidden when idle and under reduced motion. | must |
| FR-6 | Stopping (⏹) returns the camera to the overview; starting again re-films the chase view. | should |
| FR-7 | The parked opener train (pre-▶) is unaffected. | must |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | 60 FPS preserved on mid tablets; driver view adds no per-frame allocation beyond existing camera lerp. |
| NFR-2 | No reading required: driver view enters/exits only via the icon-only 🎥 button. |
| NFR-3 | No new runtime network request, dependency, or save-format change (saves stay additive, no version bump). |
| NFR-4 | Coverage gate 80% on `src/core` + `src/state` still met; selection logic is logic-bearing and TDD'd. |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | Unit test: with components [long open 10 pieces, short closed 4 pieces], the selected ride is the short closed one. | FR-2 |
| AC-2 | Unit test: with components [open 8, open 5] (no closed), the selected ride is the 8-piece one; tie in piece count selects the smaller anchor deterministically regardless of input order. | FR-2 |
| AC-3 | Unit test: `startAll()` over 3 components yields `rides().length === 1` and `fleet.ridingCount() === 1`. | FR-1 |
| AC-4 | E2E: two disjoint loops yield one riding train; 🎥 appears (≥1 rule); taps cycle chase → driver (camera near cab, looks along heading) → overview → wrap. | FR-4, FR-5 |
| AC-5 | E2E: no looped track (single open line) rides the open line; stop returns to overview. | FR-2, FR-6 |
| AC-6 | Full e2e matrix green; no `ridingTrainCount === 2` witness remains. | FR-1 |

## Edge Cases

- **Empty world:** no rides, no train, 🎥 hidden, ▶ dimmed (existing behaviour).
- **Single piece:** rides as today (open path shuttles back).
- **Tie between two closed loops of equal length:** smaller-anchor wins deterministically.
- **Driver view at a station pause / dead-end shuttle reversal:** camera keeps tracking cab position and heading (no snap; eased lerp as today).
- **Tunnel on the best track:** driver view passes through the tunnel (existing occlusion behaviour acceptable).
- **Curve/bridge at lap wrap:** camera position derives from the rig model already posed by ride motion — no separate path math.
- **Reduced motion:** fixed overview; 🎥 hidden; driver view unreachable (consistent with chase).
- **Mid-ride edit removing the best track:** today's scoped soft-stop ends the ride; next ▶ re-picks per the rule.

## Dependencies

- **Tracks:** none (diverges from roadmap Phase 2 `clarity-audit_20261110`; that track remains unstarted and unblocked).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** "Longest" means most track pieces (`pieceIds.length`), matching today's `selectRideComponents` ranking — not geometric length or world-space distance.
- **Assumption:** "Looped" means `path.closed === true` from the existing solver (`src/core/pathing.ts`).
- **Assumption:** Cab eye position is derived from the locomotive model (a fixed offset above/forward of the model origin); exact offset tuned at implementation, verified visually.
- **Assumption:** Removing multi-train also removes/updates its e2e witnesses and the `ridingTrainCount` multi-train assertions rather than keeping them skipped.

## References

- `src/core/pathing.ts` — `selectRideComponents`, `RideComponent`, `TrainPath.closed`
- `src/state/ride.ts` — `RideController` (start/stop, scoped edits)
- `src/scene/film-camera.ts` — chase/overview camera and 🎥 cycle
- `src/ui/ride-controls.ts` — 🎥 visibility rule
- `src/scene/train-fleet.ts` — rigs/`ridingCount()` and the parked opener
- `conductor/product.md` — core loop and V1 scope lines that this track supersedes
