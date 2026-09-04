# Plan: Railway Crossing Gate

Feature track per `spec.md`. A new placable `crossing-gate` track piece:
straight rail with road strip, crossbuck + two swinging barrier gates,
blinking lantern (active any time; idle at night), real bundled bell
sound, winter snow cap. Phase 1 is logic-bearing (TDD per `workflow.md`):
piece type, pure proximity state machine, save round-trip. Phase 2 is
asset + audio + scene animation. Phase 3 closes with e2e, docs, and
final gates.

## Phase 1 — Core: Crossing Piece, Proximity Semantics & Save (TDD)

- [x] Task: Add the `crossing-gate` piece type (tests first in
  `pieces.test.ts`, `save.test.ts`, `drawer.test.ts`)
  - [x] `PIECE_TYPES` gains `'crossing-gate'`; `BASE_ENDPOINTS` =
        `['north', 'south']` (straight through-road)
  - [x] Terrain rule: dry land only (ghost red over water, via existing
        `validatePlacement`)
  - [x] Save round-trip: snapshot containing a crossing-gate; pre-feature
        snapshots load unchanged; no version bump
  - [x] Catalog ripple: `drawer.ts` Rails tab entry; renderer placeholder
        maps (→ straight GLB until Phase 2); hand-drawn SVG icon in
        `ui/app.ts`
  - **Notes:** Red phase = 9 failing tests across 5 files (terrain tests
    passed pre-implementation — rules are type-agnostic). Green commits:
    `28cfeac` (catalog + drawer + icon + renderer placeholder maps),
    `16a4cc7` (terrain, ride, additive-save coverage). TDD gotcha: the
    new pathing loop test initially used an E-W straight on the west
    side — fixed to N-S (`rotation 0`).
- [x] Task: Pure proximity state machine in `src/core/crossings.ts`
  (TDD: `crossings.test.ts`)
  - [x] Per-crossing states: idle → closing → active(gates closed) →
        lifting → idle; eased timings as pure data
  - [x] Warning distance (approach) and exit distance (cleared) per
        crossing; multiple trains on one crossing's line don't flap the
        gate (gate stays closed until the *last* train clears)
  - [x] Crossings are independent; up to 4 concurrent trains handled;
        state is runtime-derived only — never serialized
  - **Notes:** `1838b83`. Constants (cells): warning 2.25, hold 2.25,
    exit 1.25, occupy 0.75; closing 0.6 s, lifting 0.8 s. No-flap: once
    down, `hold` distance (≥ exit) keeps gates closed until the last
    train clears; re-close guard during lifting at ≤ exit distance.
    Pure + allocation-light (one motion object per step).
- [x] Task: Ride/pathing coverage — crossing rides as a plain straight
  (extend `pathing.test.ts` if the existing rail-crossing type shares
  code)
  - [x] Trains roll through at normal speed; wagons/crates follow; no
        pause, no slowdown
  - **Notes:** Covered in `16a4cc7`: 8-piece closed loop with a
    crossing-gate rides closed; step `from/to` = the gate's endpoints;
    entry/exit heights 0 (flat).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Notes:** Gates at `1838b83`: Vitest 613/613 across 36 files,
    `tsc --noEmit` clean, `biome check src` clean. Manual verification
    deferred to Phase 2 (visuals/audio land there; core-only phase has
    no scene output).
- [checkpoint: 1838b83]

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
