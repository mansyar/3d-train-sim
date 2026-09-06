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
- [ ] Task: Define `SceneContext` + thin orchestrator shell
  - [ ] Create `src/scene/scene-context.ts`: one type carrying shared refs
        (scene, camera, renderer, audio, state stores, ride controller, frame
        loop handle) — explicitly passed, no singletons
  - [ ] `init-scene.ts` becomes the assembler that builds the context and
        hands it to subsystems
- [ ] Task: Extract environment & day-night wiring
  - [ ] Sky palette application, lights/shadow updates, weather cross-fade
  - [ ] Fireflies, window glow, portal glow, headlight, snow caps
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
