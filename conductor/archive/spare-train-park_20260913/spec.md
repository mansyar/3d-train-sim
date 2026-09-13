# Spec — Spare Train Park Spot Fix (`spare-train-park_20260913`)

**Type:** Bug (scene boot) · **Branch:** `track/spare-train-park_20260913`

## Overview

The pre-ride "opening train" — the spare the toddler meets on every fresh boot
— is cloned with no position and rests at world origin. Origin is the middle
of the river (between cells (7,7) and (8,8) of the 16×16 meadow; `GROUND_SIZE`
60, `CELL_SIZE` 3.75), so the train, its wagons, and the loading placeholder
crate visibly sit in water.

**Root cause (diagnosed 2026-09-13):** `train-fleet.ts` `syncRigs` creates the
opener (`createRig()`) when no ride is active and no spare exists;
`createRig` clones the locomotive at the model's authored origin (0, 0, 0)
with no parking logic. The creation trigger (a locomotive/wagon template load)
can even race world hydration — the fleet's world listener early-returns on
unchanged train/consist, so nothing re-parks the spare once it exists.

This track gives the opener a deterministic, dry, rail-aligned parking spot
near the meadow heart, chosen from the world's largest ride, and moves the
placeholder crate to the same spot. Ride logic, adoption order, and the
"spares rest where they stopped" rule stay untouched.

## Functional Requirements

### FR1 — Park-spot chooser (pure core)

A pure `src/core/` chooser picks the spot from the loaded world,
deterministically:

1. **Rails first:** take the world's largest ride component (most pieces — the
   ride ▶ adopts first when ranked). Prefer steps whose piece cell is dry
   (not water). Among preferred steps, pick the one whose cell center is
   nearest the meadow heart (world origin; distance in cell units).
   Deterministic tie-break.
2. If that component has no dry step, bridge/wet steps stay eligible (still
   on rails).
3. **No rideable component:** the nearest dry meadow cell to the heart.

The result describes the spot: `rails` (piece + entry/exit edges) or `land`
(cell).

### FR2 — The spare parks on the rails

When the fleet creates the pre-ride spare (before the first ▶), it is posed at
the chooser's spot: on-rail point at the step's entry-edge midpoint, heading
along the step's travel direction (the same pose math the ride uses), wagons
parked behind. The spot lies on the adopted ride's own path, so pressing ▶
rolls the train on with no visible snap.

### FR3 — Placeholder crate follows

The spinning loading crate is created at the same spot (it currently spawns at
origin), so crate→train handoff happens in one place and nothing floats in the
river on slow loads. First-train retirement is unchanged.

### FR4 — Everything else unchanged

Ride ranking/adoption, edit scoping, camera framing, save format, and
"spares rest where they stopped" are untouched. The spare still spawns once
per session under the existing condition; no re-parking after creation (no
movement on starter swaps or track edits). To make the spawn reliable, opener
creation waits for the world's first change (boot hydration) before choosing
a spot.

## Non-Functional Requirements

- Deterministic, no RNG, stable under input order (core module style).
- Pure logic with colocated Vitest tests (TDD); zero per-frame cost (chosen
  once at creation).
- No new UI, gestures, audio, or assets; bundle and 60 FPS guardrails
  unaffected.
- The opening toy must meet the toddler near the meadow heart (the overview
  camera's target) on every starter.

## Acceptance Criteria

- **AC1:** Fresh boot (empty storage) shows the pre-ride spare on dry
  ground/rails — never in water — on all four starter presets;
  screenshot-verified.
- **AC2:** The spot is a rail point of the largest ride, dry when possible,
  nearest the heart on that ride; unit tests lock the chooser rules and
  fallbacks.
- **AC3:** Pressing ▶ adopts the parked spare with no visible pop — first-frame
  position continuity below the test threshold (e2e probe assertion).
- **AC4:** Empty saved world (no pieces at boot): the spare rests on dry land
  near the heart.
- **AC5:** Placeholder crate appears at the same spot; still replaced on the
  first train.
- **AC6:** `pnpm check` green; full Playwright suite green; no ride or save
  behavior changes.

## Out of Scope

- Re-parking idle spares after world edits or starter swaps (creation-time
  only).
- Ride adoption/ranking changes, camera changes, river/meadow geometry
  changes.
- Moving the meadow heart or the overview look-at.
- Placeholder crate art or timing changes beyond its position.
