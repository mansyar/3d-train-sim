# Spec — Double-Slip Switch

## Overview

The meadow's switchyard gains its most magical junction: a **double-slip
switch** (`switch-slip`) — the last named item on the product roadmap
(`conductor/product.md`, "Still roadmap: double-slip pieces"). One grid tile
where two roads cross with two diagonal shortcuts; a train entering from
**any** of the four sides can exit **straight across**, or take a
**quarter-turn diagonal to the right or left**. Every pass cycles the route,
and the wooden signal lever always points at the road the train will take
next — the same trustworthy cause-and-effect language the three-way switch
already speaks.

## Functional Requirements

- **FR1 — Catalog:** New track piece `switch-slip` in `src/core/pieces.ts`;
  4 endpoints (N/E/S/W, crossing-style connectivity — connects on all sides,
  all rotations). Placed from the **Adventure** tab (`src/core/drawer.ts`),
  after the existing switches.
- **FR2 — Routing (`src/core/switches.ts`):** `routeSwitch` extended for type
  `switch-slip`: from any entry, cycle **straight → right → left** per pass.
  **One alternation counter per piece** (not per entry), session-only, never
  serialized (existing switches convention, spec FR8 of switchyard).
- **FR3 — Pathing (`src/core/pathing.ts`):** `walkAlternating` handles the
  slip: 4-end connectivity with 3 route choices; step-cap fallback to the
  frozen walk as with the 3-way; dead-end shuttling and multi-train
  components unaffected.
- **FR4 — Asset:** New Blender recipe `scripts/blender-switch-slip.py` →
  `public/assets/train-kit/switch-slip.glb` (via the `threejs-blender-asset`
  skill). Node contract: `switch_blades` (flipped by the scene, 3 poses) +
  `switch_lever` (steel arm swings to point at the chosen road, same tween).
  Authored on the 4-unit kit module mount so rails meet neighbours flush;
  export ≤ ~150 KB. **No snow cap** (parity with the other switches).
- **FR5 — Renderer (`src/scene/track-renderer.ts`):** `PIECE_URLS` /
  `BASE_YAW` / `KIT_ANCHORS` entries; blade flip + lever swing wired to the
  routing counter; dev/e2e witnesses (`switchPose` extension) exposing the
  current road.
- **FR6 — Saves additive:** No snapshot version bump; old worlds open
  unchanged; the slip serializes like any piece (id/cell/rotation; counters
  session-only).
- **FR7 — Reduced motion:** Blade/lever tweens freeze under reduced motion
  (shared frozen gate); route choice still applies.

## Acceptance Criteria

1. Placing a `switch-slip` connects on all four sides; ghost preview tints
   red over water/occupied cells like other pieces.
2. A train riding through takes straight, then right, then left, then
   straight again on successive passes; the lever points at the upcoming road
   and blades flip in the same tween.
3. Reloading mid-layout preserves the piece and its rotation; old saves
   (v1–v3) load untouched.
4. Reduced motion freezes blade/lever motion.
5. E2E spec places the slip, rides ≥3 passes through both diagonals and the
   straight, asserts clean console; unit tests cover routing (mod-3 cycle,
   all 4 entries, cap fallback) at >80% on new core code.
6. `pnpm biome check .`, `tsc --noEmit`, full Vitest and Playwright suites
   pass.

## Out of Scope

- Single-slip/scissors variants beyond this one piece; any new drawer tabs;
  snow caps on switches; changes to save versioning; other roadmap items
  (e.g. wagon builder).
- Docs included per standard switchyard scope: roadmap retirement in
  `conductor/product.md` + CHANGELOG `[Unreleased]` entry land with this
  track.
