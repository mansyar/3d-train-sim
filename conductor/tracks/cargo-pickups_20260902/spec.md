# Spec: Station Cargo Pickups

## Overview

The two cargo wagons every locomotive pulls become working freight cars. At
each station stop, empty wagons visibly load a chunky toy crate; at the next
stop, loaded wagons deliver — crates pop off in a confetti burst and the
destination station's cargo platform permanently gains one delivered crate.
Delivered crates persist in the save (capped at 8 per station), so the meadow
slowly fills with the child's deliveries: the game literally celebrates their
layouts' work. The station model is expanded and polished via a deterministic
Blender recipe with toggleable crate slots. Pure watching — no interaction, no
UI, no new sounds.

**Type:** Feature · **Builds on:** station-stops, ride-motion pause
choreography, wagons, save (versioned migration), Blender asset pipeline
(`scripts/blender-tunnel.py` precedent).

## Functional Requirements

1. **Alternate-every-stop cycle.** At every existing station pause (~2s,
   unchanged duration): if the wagons are empty they load (crates appear); if
   loaded they unload and deliver. No first-station bookkeeping — the cycle
   alternates naturally, including single-station tracks (load, next lap
   deliver, same station).
2. **Wagon crates.** Each wagon carries a dedicated chunky crate mesh (bright
   toy-crate look, readable at tablet distance), anchored to the existing
   wagon model, shown/hidden by visibility toggle with a gentle scale pop-in
   on load. Trains on routes with no station never show crates.
3. **Delivery effect.** On unload: crates leave the wagons and a small
   confetti burst plays at the station; the delivery station's platform gains
   one crate.
4. **Expanded station model.** New Blender-authored 1-cell station
   (`scripts/blender-station.py`, re-runnable, real render checks; GLB
   exported with the same conventions as the tunnel): polished station with
   an integrated cargo platform and 8 named, individually toggleable crate
   slots. Station keeps its current drawer icon, label, placement, and scale
   contract; existing placed stations swap to the new model.
5. **Persistence.** Snapshot version bump; per-station delivered-count rides
   in the save (missing counts migrate to 0). Relocating a station keeps its
   count; removing it drops it; parent-gated full reset clears all counts.
   Cap of 8 crates per station — deliveries past the cap still celebrate but
   add nothing.
6. **Save round-trip.** Counts survive reload; older saves load with zero
   counts and no errors.

## Non-Functional Requirements

- **Zero-alloc frame path:** crate toggling is visibility/scale only on state
  change (never per-frame); confetti is a small pooled/instanced burst with
  capped lifetime, skipped under reduced motion (crate pop-in likewise
  reduces to an instant toggle).
- **No new audio:** the existing station ding-ding carries the moment; mute
  behavior untouched.
- **Pure logic in `src/core`** (stop-cycle state machine, save migration) with
  Vitest TDD; scene wiring in `src/scene`; e2e smoke covers the
  pickup→delivery moment and save round-trip.

## Acceptance Criteria

1. A train on a route touching ≥1 station loads crates at its first stop and
   delivers at the next, alternating every stop thereafter.
2. A delivered crate appears on the destination station's platform and
   persists across page reload.
3. The 8-crate cap holds; extra deliveries celebrate without adding crates.
4. A single-station track alternates load/unload at that station across laps.
5. Trains with no station on their route show no crates and behave exactly as
   today.
6. Save round-trip preserves counts; pre-track saves migrate cleanly to zero
   counts.
7. Reduced motion: no confetti, no pop-in animation — crates still toggle.
8. Full local gate suite passes; new Playwright smoke asserts the
   pickup→delivery moment.

## Out of Scope

- Tap/touch interaction with cargo, cargo inventory UI, multiple cargo types
  or colors per train kind
- 2-cell station footprint or new scenery types
- New sound effects; changes to station pause duration
- Track-graph, pathing, or placement-rule changes
