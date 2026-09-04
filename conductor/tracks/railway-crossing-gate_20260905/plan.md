# Plan: Railway Crossing Gate

Feature track per `spec.md`. A new placable `crossing-gate` track piece:
straight rail with road strip, crossbuck + two swinging barrier gates,
blinking lantern (active any time; idle at night), real bundled bell
sound, winter snow cap. Phase 1 is logic-bearing (TDD per `workflow.md`):
piece type, pure proximity state machine, save round-trip. Phase 2 is
asset + audio + scene animation. Phase 3 closes with e2e, docs, and
final gates.

## Phase 1 — Core: Crossing Piece, Proximity Semantics & Save (TDD)

- [ ] Task: Add the `crossing-gate` piece type (tests first in
  `pieces.test.ts`, `save.test.ts`, `drawer.test.ts`)
  - [ ] `PIECE_TYPES` gains `'crossing-gate'`; `BASE_ENDPOINTS` =
        `['north', 'south']` (straight through-road)
  - [ ] Terrain rule: dry land only (ghost red over water, via existing
        `validatePlacement`)
  - [ ] Save round-trip: snapshot containing a crossing-gate; pre-feature
        snapshots load unchanged; no version bump
  - [ ] Catalog ripple: `drawer.ts` Rails tab entry; renderer placeholder
        maps (→ straight GLB until Phase 2); hand-drawn SVG icon in
        `ui/app.ts`
- [ ] Task: Pure proximity state machine in `src/core/crossings.ts`
  (TDD: `crossings.test.ts`)
  - [ ] Per-crossing states: idle → closing → active(gates closed) →
        lifting → idle; eased timings as pure data
  - [ ] Warning distance (approach) and exit distance (cleared) per
        crossing; multiple trains on one crossing's line don't flap the
        gate (gate stays closed until the *last* train clears)
  - [ ] Crossings are independent; up to 4 concurrent trains handled;
        state is runtime-derived only — never serialized
- [ ] Task: Ride/pathing coverage — crossing rides as a plain straight
  (extend `pathing.test.ts` if the existing rail-crossing type shares
  code)
  - [ ] Trains roll through at normal speed; wagons/crates follow; no
        pause, no slowdown
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Asset, Sound & Scene Animation

- [ ] Task: Crossing asset in Blender (house rules from `tech-stack.md`)
  — `scripts/blender-crossing-gate.py`
  - [ ] Straight from the kit + road strip + crossbuck post; named node
        contract `crossing_gates` (two barrier arms) + `crossing_lantern`;
        winter snow-cap variant; deterministic recipe; export + verify
        GLB (target ≤ ~60 KB)
- [ ] Task: Source & bundle the bell sound
  - [ ] Real railroad-crossing bell recording (CC0/public-domain
        preferred), softened + volume-capped; `public/audio/CREDITS.md`
        updated if attribution required; documented synthesized fallback
        if no suitable real recording is found; fully local
- [ ] Task: Scene wiring & animation (acceptance-criteria verified; no
  unit tests for glue)
  - [ ] Gate swing tween driven by the Phase 1 state machine;
        squash-and-stretch on close/lift; instant snap under
        `prefers-reduced-motion`; event-driven, no per-frame cost outside
        tweens
  - [ ] Lantern blinks red while active (day or night); soft idle blink
        at night only (reuse window-glow/portal-glow patterns)
  - [ ] Bell plays on closing, rings while active, stops on clear;
        mute-respecting and instant; snow cap applies in winter
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — E2E, Docs & Wrap-Up

- [ ] Task: `e2e/crossing-gate.spec.ts` (touch-emulated tablet viewport,
  no console errors)
  - [ ] Place a crossing from the Rails tab on dry land; red ghost over
        water; snap works
  - [ ] Train approach → gates close + lantern blinks + bell; after pass
        → gates lift; reload restores the placed crossing; night/winter
        variants render (following existing e2e hooks for
        time-of-day/weather)
- [ ] Task: Docs — `CHANGELOG.md` (Unreleased) parent-friendly note;
  `product.md` feature mention; `e2e/README.md` if the suite shape
  changes
- [ ] Task: Final gates — `biome check`, `tsc --noEmit`, full Vitest
  suite, Playwright suite; Phase Verification & Checkpoint (Refer to
  workflow.md)
