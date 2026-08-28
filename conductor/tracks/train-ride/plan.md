# Implementation Plan — Train Ride (Autonomous Locomotive)

**Track ID:** `train-ride`
**Spec:** `conductor/tracks/train-ride/spec.md`

## Phase 1 — Path Solver (src/core/pathing.ts, TDD) [checkpoint: 5f4557b]

- Verification Report:
  - Confirmed 2026-08-28: `pnpm check` green (Biome 28 files, `tsc --noEmit`, Vitest 44/44); `vitest run --coverage` → pathing.ts 97.4% stmts / 86.4% branch / 100% lines & funcs (>80% bar).

- [x] Task: TDD — Red: failing unit tests for closed-loop traversal (order of pieces, entry/exit edges, deterministic output) — 4849721
  - Notes:
    - `src/core/pathing.test.ts`: 2×2 corner loop (traversal order, per-step endpoint/continuity/wrap checks), 8-piece rectangle, determinism (same input + reversed array order → identical traversal).
    - Red witnessed live: `Cannot find module './pathing'` (existing 35 tests unaffected).
- [x] Task: TDD — Green: implement `solvePath` minimum code; loop closes back on itself — 4849721
  - Notes:
    - `src/core/pathing.ts`: `solvePath(pieces) → { steps: PathStep[], closed }`. Ends grouped by boundary key; partner maps; components are simple paths/cycles (degree ≤ 2). Deterministic component/start rule = smallest `cellKey`, immune to array order. Dead-end entries ride inward from their open end; cycles enter via lower-key end.
    - Exports `neighbourOf`/`boundaryKey` from `track-graph.ts` (was private) instead of duplicating geometry helpers.
    - Biome's `noNonNullAssertion` rule forbids `!` — solver + tests use `if (!x) throw` guards per the project convention from 7793414.
    - Two fixture bugs found during Green: NW corner needs rot 90 (not 180) for an east+south join; east–west straights need rot 90 (base is north+south). Solver logic was correct in both cases.
    - Full gate green: Biome 28 files ✓, tsc ✓, Vitest 38/38.
- [x] Task: TDD — Red→Green: dead-end reversal (pause + reverse), single-piece shuttle, empty/1-piece totals, no-failure guarantee — bb09b70
  - Notes:
    - `pathing.test.ts` open-layout suite: 2-piece line, L-shaped path through a corner, lone-piece shuttle, empty meadow no-op, deterministic component choice with two disjoint tracks, dead-end spur traversal. Red witnessed live before the Green fix.
    - One real solver gap fixed: lone pieces (degree 0) hit the cycle branch and threw — start rules now treat `degreeOf < 2` as an open ride (enter via lower-key end, exit the other).
    - Two fixture geometry bugs corrected along the way (solver was right both times): NW corners need rot 90 for east+south joins; an elbow turning south needs rot 180, since north = −y in this grid.
    - Reversal *motion* (pause, reverse direction) is the ride layer's job in Phase 2 — the solver hands it `steps + closed`, and the ride layer shuttles open paths back and forth.
- [x] Task: Verify coverage >80% on `src/core/pathing.ts` — bb09b70
  - Notes:
    - `vitest run --coverage`: pathing.ts 97.4% stmts / 86.4% branch / 100% lines & funcs. Bar cleared.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Ride State + Train Motion (src/state, src/scene) [checkpoint: d1bfa81]

- Verification Report: Confirmed 2026-08-28: `pnpm check` green; `vitest run --coverage` → ride.ts 100% stmts/branch/lines/funcs (55/55 tests); pathing.ts ≥80% retained. Visual ride walkthrough deferred to Phase 3's manual verification (UI trigger ▶ lands there).

- [x] Task: TDD — Red→Green: ride state machine in `src/state/` (idle ⇄ riding; gentle stop on world mutation during ride) — d776a8e
  - Notes:
    - `src/state/ride.ts`: `createRideController(world)` — `mode()`, `ride()` (`{ path, direction }`), `start()` (solves live layout, refuses empty meadow), `stop()` (keeps last path for the camera), `subscribe()`.
    - Gentle stop: the controller subscribes to the world; any piece mutation while riding flips to idle and notifies. The scene layer eases the motion out.
    - Red witnessed live (`Cannot find module './ride'`); 9 tests covering idle start, loop solve, empty-meadow refusal, place/remove mid-ride auto-stop, re-solve after edit, listener notifications + unsubscribe.
    - Full gates green: Biome ✓, tsc ✓, Vitest 53/53.
- [x] Task: Scene: locomotive follows solved path (position + yaw interpolation, constant gentle speed, no per-frame allocations) — 8457bdf
  - Notes:
    - `src/scene/ride-motion.ts`: builds line/arc segments once per ride start (straight = edge-midpoint lerp; corner = quarter-arc pivoting on the cell centre, matching the corner model anchoring), then advances a scalar distance each frame. No per-frame allocations — pose is written straight into `model.position`/`rotation.y`.
    - Closed loops wrap forever; open layouts pause 0.9s at the dead end, then shuttle back (travel direction flips the facing, not the position).
    - Mid-ride edits ease the train to a standstill over 0.6s exactly where it stopped ("a toy left on the track"); a new ride re-solves and restarts.
    - `spin-loop.ts` now accepts a nullable spin target (showcase spin pauses once the ride owns the locomotive) and an `onFrame(dt)` hook; reduced-motion still renders a single static frame.
    - `init-scene.ts` creates the ride controller and exposes `startRide()`/`stopRide()` on `SceneHandle` (UI trigger lands in Phase 3 — visual ride verification therefore happens at the Phase 3 checkpoint walkthrough).
    - `MODEL_YAW_OFFSET = π` is a first guess at the Kenney locomotive's authored facing; to be confirmed during the Phase 3/4 tablet walkthrough.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Go/Stop Trigger + Follow Camera (src/ui, src/scene)

- [x] Task: UI: chunky icon-only ▶/⏹ toggle, dims when meadow is empty, ≥64px touch target — e625b9b

  Notes: `.ride-toggle` joins the toybox rail (margin-left:auto groups it with the trash bin, which loses its own auto margin). 72px round green button with SVG ▶/⏹ icons; `is-riding` flips it amber. Tracks its own `riding` flag: set true only on a successful `startRide()` (empty meadow refused via return false), reset on ⏹ tap AND on any world subscription fire (mid-ride edits gently stop the ride, so the button follows). Dimming (`is-dimmed` + disabled) only when empty AND not riding — a train easing to a stop keeps its ⏹ face. aria-label swaps 'Ride the train' / 'Stop the train'. `main.ts` passes late-bound `startRide`/`stopRide` like the other scene callbacks.

- [x] Task: Scene: follow-camera trails the locomotive, eases back to overview on stop; honors `prefers-reduced-motion` — b78bc2e

  Notes: `updateCamera(dt)` runs in the spin-loop's `onFrame` after `rideUpdate`. Riding: desired position = locomotive position + FOLLOW_OFFSET (0, 9, 11) world-relative chase; look target = locomotive. Idle: desired = OVERVIEW_POSITION/LOOK (0, 52, 44 → origin). Both eased via exponential lerp (`1 − e^(−2.5·dt)`), so stop → smooth glide home with no snap. `prefers-reduced-motion`: camera never moves (fixed overview), and the spin loop already renders a single static frame. Chunk split needed since desired/camLook vectors live in the init-scene closure (scene glue — no unit tests per workflow; visual verification at the Phase 3 checkpoint).

- [x] Task: Fix — track pieces rendered with gaps between cells (found during checkpoint walkthrough) — 90a0812

  Notes: fa7620f had moved the corner anchor to `[0,-1,0]` on the belief the kit arc centre sits at the GLB origin — it doesn't. Measured the actual GLB geometry by parsing POSITION accessors: `railroad-corner-small.glb` is a quarter-arc with centre at model `(-2, 0)`, radius 2, ends at `(0, 0)` (tangent +z) and `(-2, 2)` (tangent x), confirmed by end-cap centroids `[0,0,0]`/`[-2,2]` and cap-plane normals. Correct anchoring: `KIT_ANCHORS.corner = [-2,-1,0]` (arc centre → cell centre, bed bottom `y=-1` → ground, matching the straight's authored `y∈[-1,-0.9]`), and `BASE_YAW.corner = π/2` (unrotated ends sit east/south of the centre; +90° swings them onto the graph's north/east base edges — both the old `π` yaw and the fa7620f anchor were wrong; the pre-fa7620f render only looked joined because its anchor pushed the arc centre outside the cell, bulging the wrong way). Radius `2·scale = CELL/2` exactly matches ride-motion's cell-centred arc segments. Verified in-browser: placed pieces via a dev-only `window.__tinyTracksWorld` handle (`src/main.ts`, `import.meta.env.DEV`), screenshotted via Playwright (iPad Mini viewport), and pixel-checked the render — projected each junction/mid-arc through the overview camera and asserted rail presence: corner-east-end meets straight-west-end flush (continuous rail band across the boundary, no gap), N–S straight chain continuous across cells, every arc bulges on the predicted side. Temp harness spec + screenshot deleted; dev hook kept for Phase 4 E2E.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E + Full Verification

- [ ] Task: Extend Playwright smoke: place pieces → press ▶ → train moves; console clean, zero external requests
- [ ] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Manual tablet walkthrough (build loop, press ▶, watch ride, ⏹ camera ease-back)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(appended per task as implementation proceeds)
