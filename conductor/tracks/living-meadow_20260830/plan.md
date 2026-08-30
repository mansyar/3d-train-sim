# Implementation Plan — Living Meadow

**Track ID:** `living-meadow_20260830` · **Branch:** `track/living-meadow`

Workflow: TDD for logic-bearing code (`src/core`, `src/state`), acceptance
criteria + smoke + manual tablet check for scene/audio wiring
(`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Idle Attract Mode

- [x] Task: Idle/attract state machine in `src/core/` (logic — TDD)

- **Expected behavior (unit tests first):**
  - `createAttractClock(thresholdMs, { now, random })` starts in `active`;
    after `thresholdMs` of no `notifyActivity()` it transitions to `idle`.
  - Any `notifyActivity()` resets the timer and returns to `active`.
  - While `idle`, it schedules rare events (randomized 15–45 s, via injected
    RNG) of kind `chirp` — each event carries which critter sound to play.
  - While `active`, no events are produced.
  - A `reducedMotion` flag suppresses the `drift` event kind.
  - All transitions are pure and deterministic under an injected clock/RNG.
- **Commit:** `feat(core): Add idle attract clock state machine`
- **Notes:** New `src/core/attract-clock.ts` (+ `attract-clock.test.ts`).
  Pure module — no DOM/three imports (core boundary rule). The scene and
  audio layers subscribe to its transitions and events. Gates: biome ✅,
  `tsc --noEmit` ✅, new unit tests green.

- [x] Task: Attract camera drift (scene wiring)

- **Acceptance criteria (manual + smoke):**
  - After the clock reports `idle`, the overview camera eases into a very
    slow micro-pan/tilt around the meadow (precomputed parameters; no
    per-frame allocations), amplitude stays inside the meadow, and the
    camera eases back to the normal overview on the first `notifyActivity()`.
  - Reduced motion disables the drift entirely.
  - Drift stops while a ride is running and while a piece is being dragged.
  - `SceneHandle.dispose` removes any listeners/animations added.
- **Commit:** `feat(scene): Drift the overview camera while idle`
- **Notes:** New `src/scene/attract-camera.ts`, driven from
  `init-scene.ts`; reuses the existing camera-ease approach. `notifyActivity`
  is fed by the existing pointer/button handlers in `src/ui/app.ts` (cheapest
  touchpoint: add a scene call in the pointerdown/button paths) and by ride
  start/stop in `init-scene.ts`. Gates: biome ✅, `tsc --noEmit` ✅, unit
  suite stays green, Playwright smoke ✅.

- [ ] Task: Quiet meadow chirps + critter hop (audio/scene wiring)

- **Acceptance criteria (manual + smoke):**
  - On an `idle` chirp event, one critter sound plays at low volume
    (reuse `oink-pig` / `baa-sheep` / `woof-pug` voices, each ≤ 0.5) and the
    corresponding critter does its hop animation.
  - Chirps respect the global mute instantly.
  - No chirp fires while a ride is running; frequency is rare (15–45 s).
- **Commit:** `feat(audio): Chirp quietly during idle attract`
- **Notes:** `audio-controller.ts` gains a quiet chirp path (volume-capped,
  mute-checked); `critter-life.ts` exposes a `hop()` trigger. Wiring in
  `init-scene.ts` subscribes to the attract clock. Gates: biome ✅,
  `tsc --noEmit` ✅, Playwright smoke ✅.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- Verify acceptance criteria manually (tablet + desktop) and via the
  Playwright smoke suite; record results and checkpoint commit in the plan.

## Phase 2: Whistle Steam Burst

- [ ] Task: Steam puff on whistle (scene wiring)

- **Acceptance criteria (manual + smoke):**
  - Pressing the Whistle button emits a burst of 2–4 puffs at the
    locomotive's chimney position, using the existing 16-pool steam-puff
    emitter.
  - Puffs dissipate and recycle; no per-frame allocations added.
  - The chimney anchor comes from the loaded model (existing kit anchor
    conventions in `track-renderer.ts` / `load-locomotive.ts`), not a
    hard-coded guess.
- **Commit:** `feat(scene): Puff steam at the chimney on whistle`
- **Notes:** Expose `whistlePuff()` on `SceneHandle` (or reuse an existing
  puff API); `app.ts` whistle handler calls it. `steam-puff-emitter.ts`
  already owns the pool — extend, don't duplicate. Gates: biome ✅,
  `tsc --noEmit` ✅, Playwright smoke ✅.

- [ ] Task: E2E coverage for whistle burst

- Extend `e2e/smoke.spec.ts` (or the steam-puff lifecycle spec) to press the
  Whistle button and assert a puff appears (dev handles expose the live
  scene). Assert zero console errors.
- **Commit:** `test(e2e): Cover whistle steam burst`

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Tab-Hide Pause

- [ ] Task: Visibility pause controller (logic — TDD)

- **Expected behavior (unit tests first):**
  - `createVisibilityController({ isHidden, onChange })` maps document
    visibility to pause state: hidden → `paused`, visible → `resumed`.
  - On entering `paused`, it notifies `onPause`; on `resumed`, notifies
    `onResume`. Transition callbacks are invoked exactly once per change
    (no duplicate/raced events).
- **Commit:** `feat(core): Add visibility pause controller`
- **Notes:** New `src/core/visibility-controller.ts` (+ test). Pure mapping —
  the DOM listener itself lives in the scene/audio wiring layer. Gates:
  biome ✅, `tsc --noEmit` ✅, new unit tests green.

- [ ] Task: Suspend chug + timers when hidden (audio wiring)

- **Acceptance criteria (manual):**
  - On hidden, the chug loop pauses (not fades to zero — actually stops
    playing); the chug beat clock stops.
  - On visible, the chug resumes at the correct beat phase; the ride
    continues from the exact same position; no lingering audio while hidden.
- **Commit:** `feat(audio): Suspend chug when the tab is hidden`
- **Notes:** `howler-voice.ts` / `audio-controller.ts` gain `suspend()` /
  `resume()` on the chug handle (stop vs. pause of the Howl), and the beat
  clock is stopped/restarted (`startChugBeatClock` / `stopChugBeatClock`
  already exist). The ride controller (`state/ride.ts`) must survive the
  pause — verify no wall-clock drift in position. Gates: biome ✅,
  `tsc --noEmit` ✅.

- [ ] Task: Stop/start render loop when hidden (scene wiring)

- **Acceptance criteria (manual):**
  - Hidden: the RAF render loop stops entirely; attract drift and critter
    updates pause with it.
  - Visible: exactly one fresh frame renders immediately, then the loop
    resumes; no flicker or torn frame.
- **Commit:** `feat(scene): Pause the render loop while hidden`
- **Notes:** `init-scene.ts` owns the render loop — gate RAF on the
  visibility controller; `attract-camera` and `critter-life` updates are
  skipped while paused. Reduced-motion single-frame behavior unchanged.
  Gates: biome ✅, `tsc --noEmit` ✅.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- Full manual pass: ride, hide tab, background audio check, resume; Playwright
  smoke; record in plan.

## Phase 4: Track Verification (Refer to workflow.md)

- Full gates: `pnpm check` (biome + `tsc --noEmit` + unit suite) and the
  Playwright smoke suite, zero console errors.
- Manual tablet pass of all three acceptance criteria; record results.
