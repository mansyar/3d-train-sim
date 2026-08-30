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

- [x] Task: Multi-ride controller in `src/state/ride.ts` (logic — TDD) `6e12dc5`

  - **Expected behavior (unit tests first):**
    - Registry of rides keyed by component; `startAll()` starts one ride per
      selected component; `mode()` is `riding` while ≥1 ride is active.
    - A world edit soft-stops only the ride whose component contains the
      edited piece; others are untouched.
    - ▶ re-press re-solves and starts missing rides; beyond-cap components
      stay idle; ⏹ stops all rides.
  - **Commit:** `feat(state): Run one ride per track component`

  - **Notes:**
    - `RideState` now carries the component's `anchor` and `pieceIds`; the
      registry is keyed by anchor, ranked most pieces first.
    - Edits are scoped by diffing pieces: a ride soft-stops only when an
      edited piece is in its component or its component's membership
      changed; scenery placement and train-kind switches never stop rides
      (R3, R4). `start()`/`stop()` remain as ▶/⏹ aliases of
      `startAll()`/`stopAll()` for the scene.
    - 10 new tests; suite 246 passing. Coverage: `ride.ts` 100% statements.
      `ride-motion.ts` + `ride-audio.test.ts` adapted to the new listener
      signature (`b533b1d`).

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

- [x] Task: Train-kind swap applies to all trains (scene wiring) `5fab1af`

  - **Acceptance criteria (manual + smoke):** choosing a different
    locomotive in the 🚂 drawer swaps every train's model mid-ride; rides
    continue smoothly; save format unchanged.
  - **Commit:** `feat(scene): Swap all locomotives on train-kind change`

  - **Notes:**
    - `RideMotion.setModel(next)` re-targets the swapped locomotive and
      re-poses it (wagons included) at the train's live path distance — no
      restart, no progress loss.
    - `swapRigKind` replaces each rig's model + steam emitter in place
      (wagons are shared across kinds and stay put); rigs remember their
      `kind`, and late-arriving assets complete any swap that was still
      waiting. Save format untouched.
    - Gates: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [x] Task: Shared chug audio (audio wiring) `6e12dc5`+`380adc6`

  - **Acceptance criteria (manual + smoke):** exactly one chug loop while
    any train rides; it stops only when the last ride ends; whistles and
    station dings fire per-train; mute silences everything instantly.
  - **Commit:** `feat(audio): Share one chug loop across trains`

  - **Notes:**
    - Already satisfied by the multi-ride architecture — no new code:
      `bindRideAudio` keys the single chug loop to `ride.mode()`, which is
      `riding` while ≥1 ride is active and `idle` only when the last ride
      ends (task 1). Station dings fire per rig (`onStationDing` per rig's
      motion, task 2); the whistle one-shot fires per 🎺 press (filmed-train
      targeting lands in Phase 3). The shared chug softens only when EVERY
      riding train is paused (`pausedRigs` aggregation, task 2). Mute is
      instant and total via the audio controller's `setGlobalMute`.
    - Gates re-verified: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `6e12dc5..8d704c3`

  - **Automated gates:** `CI=true pnpm test` — 246/246 passing · Biome clean ·
    `tsc --noEmit` clean · coverage: `ride.ts` 100% statements.
  - **Manual verification (user-confirmed ✅):** user built two disjoint
    loops in the running app — two trains ride, one per loop, each with
    its own wagons and steam; the initial parked train rolls onto the
    track instead of lingering (fix `8d704c3`: ride assignment reuses
    parked spares first); 🚂 kind swaps replace every train's model in
    place mid-ride without restarts.
  - **Checkpoint SHA:** `8d704c3` (last functional commit of Phase 2).

## Phase 3: Camera Cycling & Whistle (UI + scene + e2e)

- [x] Task: Chase-target selector (scene wiring) `37c2983`

  - **Acceptance criteria (manual + smoke):** camera lerps toward the
    currently-filmed train; starting a second ride does NOT move the camera;
    when the filmed train stops, the target falls to the next riding train
    (or overview if none).
  - **Commit:** `feat(scene): Select chase target among riding trains`

  - **Notes:**
    - `FilmedTarget` ('train' by anchor | 'overview') is sticky: a running
      ride keeps the camera even as more trains join; a filmed train that
      stops hands the camera to the highest-ranked remaining ride, or eases
      home to the overview when the last ride ends. `syncFilmed` runs on
      every ride change; the 🎥 cycle button (task 2) will drive the same
      state. Critters and whistle stay on the primary until their tasks.
    - Gates: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [x] Task: 🎥 camera-cycle button (UI wiring) `cfbe2e7`

  - **Acceptance criteria (manual + smoke):** button joins the toolbar next
    to 🎺 (≥64px, high contrast), visible only while ≥2 rides run; each tap
    cycles filmed train → next train → overview → wrap; hidden under
    reduced motion; instant press feedback (scale-bounce + click).
  - **Commit:** `feat(ui): Add camera-cycle button for multi-train rides`

  - **Notes:**
    - Scene: `cycleFilmTarget()` cycles filmed train → next train (ride
      order) → overview → wrap; `subscribeFilmCount` pushes the active ride
      count to the UI on every ride change.
    - `syncFilmed` now keeps an overview the kid chose with 🎥 sticky across
      later ride starts (only an idle→riding transition re-takes a train).
    - UI: 🎥 joins the rail next to 🎺 (72px, toy-orange, press bounce,
      `audio.click()`), `hidden` while <2 rides ride, and
      `display: none` under `prefers-reduced-motion`. `main.ts` wires both
      late-bound (the scene binds after the app mounts).
    - Gates: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [x] Task: Whistle targets the filmed train (audio/scene wiring) `85bfa5c`

  - **Acceptance criteria (manual + smoke):** 🎺 whistles + puffs on the
    filmed train; filming the overview → nearest train answers.
  - **Commit:** `feat(audio): Whistle the filmed train`

  - **Notes:**
    - `whistlePuff` bursts steam on the filmed rig; filming the overview,
      the riding train nearest to the meadow's heart (the overview camera's
      look-at point) answers. The toot sound itself stays the selected
      kind's one-shot; the per-train voice is the steam at its chimney.
      No-op before any train rides (unchanged).
    - Gates: 246/246 tests · `tsc --noEmit` clean · Biome clean.

- [x] Task: E2E smoke coverage `558f827`+`a34a98f`

  - Extend `e2e/smoke.spec.ts`: build two disjoint loops via dev handles →
    assert two trains ride; 🎥 appears and cycles targets; assert zero
    console errors and zero external requests.
  - **Commit:** `test(e2e): Cover multi-train ride and camera cycle`

  - **Notes:**
    - New tablet smoke test: two disjoint loops → `ridingTrainCount() === 2`
      while riding; 🎥 appears only with ≥2 rides; each tap cycles filmed
      anchor → second train → overview (null) → wrap; zero console errors,
      zero external requests.
    - Scene gained two debug probes matching the wagon/puff pattern:
      `ridingTrainCount()` and `filmedAnchor()`.
    - Found and fixed a real wiring bug the test flushed out: `main.ts`
      registered film-count listeners before the scene existed, so they
      silently attached to nothing — listeners now queue and replay into
      the scene once it binds.
    - Note for future runs: `playwright.config.ts` reuses running servers
      outside CI; a stale dev server served old modules and failed the test
      once. `CI=true` (fresh servers) is the reliable way to run e2e here.
    - Full-suite review fixes (`a34a98f`) — the full e2e run (39 tests,
      tablet + phone + prod) flushed out three multi-train regressions:
      1. The parked opener train was built before wagon templates arrived
         and never received its wagons; wagon templates are now indexed by
         slot and late arrivals rebuild any rig's wagon line in pulling
         order.
      2. The pre-ride whistle had no target: `whistlePuff` now falls back
         filmed rig → nearest riding train → the parked opener train, and
         the spin loop ticks parked spares' emitters so their puffs render.
      3. The UI's ▶/⏹ face was driven by guessing from world edits, so a
         mid-ride 🚂 swap flipped it to ▶ while trains kept rolling. The
         scene now pushes the real ride mode (`subscribeRideMode`, with the
         same queue-and-replay wiring in `main.ts`), and the world-edit
         subscription only refreshes the empty-meadow dim.
    - Cargo-wagons test updated to spec R3: switching trains mid-ride keeps
      the ride running (`is-riding` persists; wagons stay coupled).
    - Final run: 39/39 e2e (tablet, phone, prod) · 246/246 unit ·
      `tsc --noEmit` clean · Biome clean.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `37c2983..53d90d8`

  - **Automated gates:** `CI=true pnpm test` — 246/246 passing · Biome clean ·
    `tsc --noEmit` clean · e2e 39/39 (tablet, phone, prod; fresh servers).
  - **Manual verification (user-confirmed ✅):** two disjoint loops ride two
    trains; 🎥 appears at ≥2 rides and cycles filmed train → next train →
    overview → wrap; 🎺 puffs on the filmed train (nearest answers from the
    overview, the parked opener before any ride); a stopped loop's train
    eases out and parks, and ⏹ → ▶ resumes the train already on the loop
    from where it sits (amendment `53d90d8`: ride assignment prefers the
    nearest spare so two trains never gather on one loop).
  - **Checkpoint SHA:** `53d90d8` (last functional commit of Phase 3).
