# Implementation Plan — Every Layout Rides

**Track ID:** `every-layout-rides_20260830` · **Branch:** `track/every-layout-rides`

Workflow: TDD for logic-bearing code (`src/core`, `src/state`), acceptance
criteria + smoke + manual tablet check for scene/audio/UI wiring
(`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Multi-Component Pathing (core — TDD)

- [ ] Task: Per-component path solving in `src/core/pathing.ts` (logic — TDD)

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

- [ ] Task: Ride-component selection with cap (logic — TDD)

  - **Expected behavior (unit tests first):**
    - `selectRideComponents(components, cap = 4)` ranks components (most
      pieces first, cell-key tiebreak) and returns at most `cap`.
    - Deterministic under any input order; ≤ cap components → all selected;
      zero → `[]`.
  - **Commit:** `feat(core): Rank components and cap concurrent rides`

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Multi-Train Ride (state + scene + audio)

- [ ] Task: Multi-ride controller in `src/state/ride.ts` (logic — TDD)

  - **Expected behavior (unit tests first):**
    - Registry of rides keyed by component; `startAll()` starts one ride per
      selected component; `mode()` is `riding` while ≥1 ride is active.
    - A world edit soft-stops only the ride whose component contains the
      edited piece; others are untouched.
    - ▶ re-press re-solves and starts missing rides; beyond-cap components
      stay idle; ⏹ stops all rides.
  - **Commit:** `feat(state): Run one ride per track component`

- [ ] Task: Spawn and render multiple trains (scene wiring)

  - **Acceptance criteria (manual + smoke):** one locomotive + wagons +
    steam emitter per riding component, pooled/reused across ▶ presses;
    ▶ with two loops visibly launches two trains; no per-frame allocations;
    60 FPS holds with 4 trains in the tablet viewport.
  - **Commit:** `feat(scene): Spawn a train per riding component`

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
