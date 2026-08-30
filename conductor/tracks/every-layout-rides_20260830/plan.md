# Implementation Plan — Every Layout Rides

**Track ID:** `every-layout-rides_20260830` · **Branch:** `track/every-layout-rides`

Workflow: TDD for logic-bearing code (`src/core`, `src/state`), acceptance
criteria + smoke + manual tablet check for scene/audio/UI wiring
(`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Multi-Component Pathing (core — TDD)

- [x] Task: Per-component path solving in `src/core/pathing.ts` (logic — TDD) `0794f75`

  - **Expected behavior (unit tests first):**
    - `solveRidePaths(pieces)` returns one `TrainPath` per connected
      component; each component rides the existing deterministic walk.
    - Empty world → `[]`; single component → same output as today's
      `solvePath` (behavior preserved for current layouts).
    - Two disjoint loops → two closed paths; loop + open tail → one closed,
      one open; lone piece → one open path.
    - Crossing with an unridden side branch still yields one straight-through
      path (documented limitation, unchanged).
  - **Commit:** `feat(core): Solve a ride path per connected component`

  - **Notes:**
    - Refactored `pathing.ts` into reusable pieces: `buildGraph`
      (connectivity), `collectComponents` (flood-fill), and
      `walkComponent` (the unchanged deterministic walk). `solveRidePaths`
      walks every component; `solvePath` is now `solveRidePaths(...)[0]` —
      identical single-train behavior, now defined as "first of many".
    - Paths are ordered by each component's smallest cell key; anchors are
      unique (one piece per cell), so output never depends on array order.
    - 7 new tests; suite 231 passing. Coverage: `pathing.ts` 98.24%
      statements / 100% lines. Biome + `tsc --noEmit` clean.

- [x] Task: Ride-component selection with cap (logic — TDD) `cd4a642`

  - **Expected behavior (unit tests first):**
    - `selectRideComponents(components, cap = 4)` ranks components (most
      pieces first, cell-key tiebreak) and returns at most `cap`.
    - Deterministic under any input order; ≤ cap components → all selected;
      zero → `[]`.
  - **Commit:** `feat(core): Rank components and cap concurrent rides`

  - **Notes:**
    - Introduced `RideComponent` (`pieceIds`, `path`, `anchor`) — piece
      membership for scoped mid-ride edits, the ride path, and the unique
      smallest-cell anchor for deterministic ranking. `rideComponentsOf`
      builds components; `solveRidePaths` now maps its paths.
    - Ranking: most pieces first, anchor (cell-key) tiebreak; default cap 4.
    - 6 new tests; suite 237 passing. Coverage: `pathing.ts` 98.33%
      statements / 100% lines. Biome + `tsc --noEmit` clean.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `2dc6077..cd4a642`

  - **Automated gates:** `CI=true pnpm test` — 237/237 passing · Biome clean ·
    `tsc --noEmit` clean · coverage: `pathing.ts` 98.33% statements.
  - **Manual verification (user-confirmed ✅):** user built two disjoint loops
    in the running app and observed one train riding — expected at this
    checkpoint, since `src/state/ride.ts` still solves only the single
    chosen component; multi-train behavior lands in Phase 2.
  - **Checkpoint SHA:** `cd4a642` (last functional commit of Phase 1).

- [~] Task: Multi-ride controller in `src/state/ride.ts` (logic — TDD)

  - **Expected behavior (unit tests first):**
    - Registry of rides keyed by component; `startAll()` starts one ride per
      selected component; `mode()` is `riding` while ≥1 ride is active.
    - A world edit soft-stops only the ride whose component contains the
      edited piece; others are untouched.
    - ▶ re-press re-solves and starts missing rides; beyond-cap components
      stay idle; ⏹ stops all rides.
  - **Commit:** `feat(state): Run one ride per track component`

- [x] Task: Spawn and render multiple trains (scene wiring) `380adc6`

  - **Acceptance criteria (manual + smoke):** one locomotive + wagons +
    steam emitter per riding component, pooled/reused across ▶ presses;
    ▶ with two loops visibly launches two trains; no per-frame allocations;
    60 FPS holds with 4 trains in the tablet viewport.
  - **Commit:** `feat(scene): Spawn a train per riding component`

  - **Notes:**
    - `ride-motion.ts` now serves one train per motion: `createRideMotion`
      takes a state getter (`getState: () => RideState | null`) and a public
      `begin(state)`; the internal controller subscription is gone.
    - `init-scene.ts` keeps a rig pool (`rigs` keyed by ride anchor + spare
      rigs). A ride-subscription sync builds one rig (locomotive clone +
      per-rig wagon clones + per-rig steam emitter) per riding component,
      re-begins only when the ride's state object changed (running trains
      keep progress), and parks freed rigs where they stopped. Wagons are
      loaded once as templates and cloned per rig; the chug softens only
      when every riding train is paused.
    - Camera, critter proximity, whistle puffs, and puff counts follow the
      primary (largest) active ride; the chug beat emits puffs on all
      riding trains. Train-kind changes rebuild all rigs (rides restart at
      path start — the smooth in-place swap is task 3).
    - Gates: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [ ] Task: Train-kind swap applies to all trains (scene wiring)

  - **Acceptance criteria (manual + smoke):** choosing a different
    locomotive in the 🚂 drawer swaps every train's model mid-ride; rides
    continue smoothly; save format unchanged.
  - **Commit:** `feat(scene): Swap all locomotives on train-kind change`

- [ ] Task: Shared chug audio (audio wiring)

  - **Acceptance criteria (manual + smoke):** exactly one chug loop while
    any train rides; it stops only when the last ride ends; whistles and
    station dings fire per-train; mute silences everything instantly.
  - **Commit:** `feat(audio): Share one chug loop across trains`

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Camera Cycling & Whistle (UI + scene + e2e)

- [ ] Task: Chase-target selector (scene wiring)

  - **Acceptance criteria (manual + smoke):** camera lerps toward the
    currently-filmed train; starting a second ride does NOT move the camera;
    when the filmed train stops, the target falls to the next riding train
    (or overview if none).
  - **Commit:** `feat(scene): Select chase target among riding trains`

- [ ] Task: 🎥 camera-cycle button (UI wiring)

  - **Acceptance criteria (manual + smoke):** button joins the toolbar next
    to 🎺 (≥64px, high contrast), visible only while ≥2 rides run; each tap
    cycles filmed train → next train → overview → wrap; hidden under
    reduced motion; instant press feedback (scale-bounce + click).
  - **Commit:** `feat(ui): Add camera-cycle button for multi-train rides`

- [ ] Task: Whistle targets the filmed train (audio/scene wiring)

  - **Acceptance criteria (manual + smoke):** 🎺 whistles + puffs on the
    filmed train; filming the overview → nearest train answers.
  - **Commit:** `feat(audio): Whistle the filmed train`

- [ ] Task: E2E smoke coverage

  - Extend `e2e/smoke.spec.ts`: build two disjoint loops via dev handles →
    assert two trains ride; 🎥 appears and cycles targets; assert zero
    console errors and zero external requests.
  - **Commit:** `test(e2e): Cover multi-train ride and camera cycle`

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
