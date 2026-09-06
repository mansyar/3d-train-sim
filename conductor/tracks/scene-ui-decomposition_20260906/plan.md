# Plan — Scene/UI Decomposition (`scene-ui-decomposition_20260906`)

Refactor roadmap: split the two monoliths into focused modules with zero
behavior change. Non-logic work throughout — per `workflow.md`, tasks carry
observable acceptance criteria verified by the gates + e2e suite + manual
verification, not unit tests. Every task ends with a plan note + commit
(workflow steps 8–11).

## Phase A — Scene Split (`init-scene.ts` → orchestrator + modules)

- [x] Task: Map extraction boundaries (`2e10a0d`)
  - [x] Categorize all 1,057 lines of `init-scene.ts` into target modules
  - [x] Record the module map as a note under this task before any code moves

  Notes:
  - Actual size: 1,108 lines (1,057 non-blank). Module map (each target
    < ~400 lines; orchestrator < ~300):
    - `scene-context.ts` (~60) — `SceneContext` type: renderer, scene,
      camera, canvas, world, audio, tracks handle, lights, qualityApplier,
      renderScale, reducedMotion. Explicitly passed; no singletons.
    - `day-ambience.ts` (~150) — day/weather clocks, `paintAmbience` (sky,
      lights, window/headlight night, weather particles, snow gates, water,
      ambience, babble, fireflies), portal cache + glow update.
    - `train-fleet.ts` (~420) — `TrainRig`, rigs/spares, loco/wagon/crate
      template loading, `createRig`, `swapRigKind`, `dressRigWagons`,
      `syncRigs`, `nearestSpareTo`, chug pause/tunnel sets, cargo cycle
      (crate attach/pop/deliver + confetti). Largest module — if it breaches
      ~400 lines on extraction, split the cargo cycle into `rig-cargo.ts`.
    - `film-camera.ts` (~170) — filmed-target state, `syncFilmed`,
      `cycleFilmTarget`, film-count & ride-mode listener sets,
      `updateCamera` ease, `frameOverview`/`resize`.
    - `lifecycle.ts` (~80) — visibility controller wiring (suspend/resume
      fan-out to spin loop, audio, ambience, babble, perf, attract timer).
    - `init-scene.ts` (orchestrator, ~280) — renderer/scene/camera creation,
      subsystem construction, frame-tick composition calling each
      subsystem's `update`, `SceneHandle` facade, dispose fan-out.
  - Interdependence notes: the frame tick is the only place subsystems
    interleave — it stays in the orchestrator and calls `fleet.update(dt)`,
    `ambience.update(dt)`, `camera.update(dt)`, etc. `train-fleet` needs the
    audio (dings/whistle), confetti, tracks handle (switch roads), and cell
    mapping — all read via `SceneContext`; no mutable sharing beyond what
    exists today.
- [x] Task: Define `SceneContext` + thin orchestrator shell (`abf811f`)
  - [x] Create `src/scene/scene-context.ts`: one type carrying shared refs
        (scene, camera, renderer, audio, state stores, ride controller, frame
        loop handle) — explicitly passed, no singletons
  - [x] `init-scene.ts` becomes the assembler that builds the context and
        hands it to subsystems

  Notes:
  - `scene-context.ts` (41 lines): renderer, scene, camera, canvas, world,
    audio, tracks, lights, qualityApplier, renderScale, reducedMotion — all
    explicitly passed, no singletons. (Ride controller + confetti join when
    the fleet module consumes them; the frame loop stays owned by the
    orchestrator and is handed to subsystems as a suspend/resume pair.)
  - `init-scene.ts` now builds the context once and the quality-trim callback
    + render-blit path already read from it (`context.qualityApplier.apply`,
    `context.renderScale.render`); the `reducedMotion` sample was hoisted
    above the guardrail block so the context is complete at build time.
  - Gates: biome clean, `tsc --noEmit` clean, 676/676 unit tests green.
- [x] Task: Extract environment & day-night wiring `ce18fd4`
  - [x] Sky palette application, lights/shadow updates, weather cross-fade
  - [x] Fireflies, window glow, portal glow, headlight, snow caps

  Notes:
  - New `src/scene/day-ambience.ts` (193 lines): day/weather clocks,
    `paint()` (sky palette, lights, window glow, headlights, weather
    particles + quality-scaled bed, snow gates on tunnel/hill/crossing/
    delight/ground, river water, ambience, babble proximity, fireflies),
    `tick()`, `nightFactor()`/`weather()` accessors, portal cache
    (world-subscribed rebuild) + `updatePortalGlow()`, and a fan-out
    `dispose()` — all state moved verbatim from `init-scene.ts`.
  - `init-scene.ts` (1,108 → 954 lines) now creates the module with
    `{ context, headlights, ambience, babble, ground }` and calls
    `dayAmbience.tick()/paint(dt)/nightFactor()/weather()/
    updatePortalGlow(star)` at the exact old call sites; the chirp gate,
    critter mood, and barge/duck mood reads are unchanged. The portal
    cache unsubscribe moved into the module's dispose.
  - Divergence caught & fixed during extraction: the first cut returned
    the shared `intensity` scratch from `weather()`, but `paint()` only
    writes that scratch during a cross-fade — a no-blend frame would
    have read stale values (`intensityOf` returns a shared constant).
    `weather()` now recomputes the live bed on read (zero-alloc: blend
    path reuses the scratch, no-blend path returns the shared constant),
    matching the pre-extraction critter path. Visible consumers only
    read `.rain`/`.snow`, so no behavior change either way.
  - Files: `src/scene/day-ambience.ts` (new), `src/scene/init-scene.ts`.
  - Gates: biome ✓ · tsc ✓ · 676/676 tests pass.
- [ ] Task: Extract ride & train wiring
  - [ ] Ride-motion updates, station pauses
  - [ ] Cargo/confetti/steam triggers, crossings, switch flips, chug pacing
- [ ] Task: Extract camera wiring
  - [ ] Follow-camera targeting, 🎥 cycle state, attract drift
- [ ] Task: Extract frame-loop wiring
  - [ ] Spin-loop suspend/resume, visibility handling
  - [ ] Perf/quality tier application, render-scale blit
- [ ] Task: Light cleanup
  - [ ] Dedupe repeated wiring, rename unclear locals
  - [ ] Remove only move-orphaned code (grep-verified); document dead-code
        findings in plan notes
- [ ] Task: Gates + e2e
  - [ ] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` +
        `CI=true pnpm test` + full Playwright suite green
  - [ ] No `src/core/`/`src/state/` diffs; no e2e assertion changes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — UI Split (`app.ts` → wiring shell + flat `src/ui/` modules)

- [ ] Task: Map extraction boundaries
  - [ ] Categorize all 1,238 lines of `app.ts` into target modules
  - [ ] Record the module map as a note under this task
- [ ] Task: Extract toybox drawer
  - [ ] Tab bar, toy slots, drag/chip placement, trash bin
- [ ] Task: Extract ride controls
  - [ ] ▶/⏹ invitation + pulse, ↩️ undo, 🎺 whistle, 🎥 cycle button
- [ ] Task: Extract train picker & wagon workshop row
  - [ ] Selection persistence hooks
- [ ] Task: Extract parent gate & starter gallery
  - [ ] Press-and-hold, confirm tray, starter presets, version display,
        mute toggle
- [ ] Task: Light cleanup
  - [ ] Same conservative dead-code rule; document findings
- [ ] Task: Gates + e2e
  - [ ] Same gate set, full Playwright suite green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Docs & Final Verification

- [ ] Task: Update `conductor/tech-stack.md`
  - [ ] Folder-structure section: new `src/ui/` modules, `scene-context.ts`
- [ ] Task: Final full gates + manual tablet checklist
  - [ ] Build/decorate/ride, camera cycle, whistle, mute, parent-gate reset,
        starter swap — confirm byte-identical behavior
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(task notes appended under their tasks as work completes)
