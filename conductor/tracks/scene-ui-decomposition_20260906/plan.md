# Plan — Scene/UI Decomposition (`scene-ui-decomposition_20260906`)

Refactor roadmap: split the two monoliths into focused modules with zero
behavior change. Non-logic work throughout — per `workflow.md`, tasks carry
observable acceptance criteria verified by the gates + e2e suite + manual
verification, not unit tests. Every task ends with a plan note + commit
(workflow steps 8–11).

## Phase A — Scene Split (`init-scene.ts` → orchestrator + modules) [checkpoint: b3c3827]

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
- [x] Task: Extract ride & train wiring `02e2ae8`
  - [x] Ride-motion updates, station pauses
  - [x] Cargo/confetti/steam triggers, crossings, switch flips, chug pacing

  Notes:
  - New `src/scene/train-fleet.ts` (493 lines): `TrainRig`, rigs/spares
    registries, loco/wagon/crate template loading, `createRig`/
    `swapRigKind`/`dressRigWagons`/`syncRigs`/`nearestSpareTo`, the
    chug-pause + tunnel sets (`syncChugSoftened` → `rideAudio.setPaused`),
    station dings/bump crests, the per-frame rig loop (motion, puffs,
    cargo pops, crossing-spot pool, per-train chug beats), and the world
    subscription for kind/preset changes — all moved verbatim.
  - Fleet breaching the ~400-line target triggered the planned cargo
    split: new `src/scene/rig-cargo.ts` (117 lines) owns the wagon
    cargo cycle (crate template + attach, pop-in, load/deliver at stops,
    confetti burst) behind a `RigCargo` interface; the fleet holds only
    `cargo: RigCargo` and `TrainRig` satisfies `CargoRig` structurally.
  - Orchestrator keeps camera-owned state (`filmed`, `syncFilmed`,
    `cycleFilmTarget`) and delegates: `filmedRig()` → `fleet.rigFor`,
    chug voice/`trainPace` → `filmedRig() ?? fleet.primary()`,
    `tootWhistle` → `filmedRig() ?? fleet.nearest()` + `fleet.inTunnel`,
    crossings → `fleet.crossingSpots()` (preallocated 4-slot pool,
    zero-alloc view), HUD witnesses → `fleet.wagonCount()/
    ridingCount()` and `update()`'s return (visible puff count).
  - Placeholder-crate retirement moved behind an `onFirstTrain()`
    callback (orchestrator removes `crate.mesh` + nulls `spinTarget`);
    rides subscription order preserved (syncFilmed → fleet.sync →
    setEmitting → listeners).
  - Note: the first write of the two new modules was lost to an
    environment restart; both were recreated identically and gates
    re-run green — no drift.
  - Files: `src/scene/train-fleet.ts` (new), `src/scene/rig-cargo.ts`
    (new), `src/scene/init-scene.ts` (954 → 488 lines).
  - Gates: biome ✓ · tsc ✓ · 676/676 tests pass.
- [x] Task: Extract camera wiring `dece9bd`
  - [x] Follow-camera targeting, 🎥 cycle state, attract drift

  Notes:
  - New `src/scene/film-camera.ts` (154 lines): the filmed-target state and
    its sticky sync, the 🎥 cycle, `frameOverview()` (tall-viewport pull-back),
    the follow-camera glide (FOLLOW_OFFSET/CAMERA_EASE now module-private),
    and the attract drift — `createAttractCamera` moved inside the module,
    driven by the idle clock through new `enterIdle()`/`exitIdle()` hooks.
  - Orchestrator keeps the renderer/aspect resize and delegates: frame tick
    calls `filmCamera.update(dt)` last (order preserved); chug voice,
    `trainPace`, and `tootWhistle` read `filmCamera.filmedRig()`; the
    SceneHandle's `cycleFilmTarget`/`filmedAnchor` proxy to the module.
    The camera's initial overview pose is now set by the module at
    construction (before the first resize).
  - Wiring order preserved: rides subscription still runs film sync →
    fleet sync → setEmitting → listeners; attract chirp gating (riding +
    night) stays in the orchestrator.
  - Files: `src/scene/film-camera.ts` (new), `src/scene/init-scene.ts`
    (488 → 389 lines).
  - Gates: biome ✓ · tsc ✓ · 676/676 tests pass.
- [x] Task: Extract frame-loop wiring `8f332aa`
  - [x] Spin-loop suspend/resume, visibility handling
  - [x] Perf/quality tier application, render-scale blit

  Notes:
  - New `src/scene/lifecycle.ts` (83 lines): owns the spin RAF loop with its
    frame gate (perf sample → quality tier → applier update → perf HUD →
    scene choreography) and the closing render-scale blit, plus the
    visibility controller (hidden tab ⇒ suspend loop + perf pause + host
    `onPause` hook; visible ⇒ resume). Dispose stops the loop and drops the
    listener — the orchestrator's dispose now starts with
    `lifecycle.dispose()`.
  - The orchestrator keeps only the subsystem choreography in `onFrame`
    (ambience → fleet → chug voice → confetti → critters → crossings →
    delight → duck → barge → portal glow → camera — order verbatim), and
    the audio/attract side effects in `onPause`/`onResume` hooks.
  - Files: `src/scene/lifecycle.ts` (new), `src/scene/init-scene.ts`
    (389 → 369 lines).
  - Gates: biome ✓ · tsc ✓ · 676/676 tests pass.
- [x] Task: Light cleanup `b3c3827`
  - [x] Dedupe repeated wiring, rename unclear locals

  Notes:
  - `basePixelRatio` local: `Math.min(devicePixelRatio, MAX_PIXEL_RATIO)` was
    computed twice (renderer + quality applier) — now once, shared.
  - `startAttractTimer()` helper: the attract-interval wiring was written
    twice (setup + visibility resume) — now one helper; pause/dispose still
    `clearInterval` directly.
  - `starSpot` in the frame tick: the primary rig's meadow position was read
    three times (critters, duck, portal glow) — now one `{x, z} | null`
    shared spot (also removes a per-frame allocation for the portal glow).
  - Behavior-neutral; no renames needed — the extracted modules left the
    orchestrator's locals clear.
  - Files: `src/scene/init-scene.ts` (369 → 375 lines; net +6 from helper
    docs/comments).
  - Gates: biome ✓ · tsc ✓ · 676/676 tests pass.
  - Dead-code sweep (grep-verified): none found. Every helper that moved or
    stayed kept a live consumer — `spin-loop` → lifecycle, `attract-camera`
    → film-camera, `dispose-object` → barge/rig-cargo/track-renderer/
    train-fleet, `headlight` → day-ambience/init-scene/train-fleet,
    `load-locomotive`/`load-wagons`/`ride-motion` (incl. `parkFollowersBehind`)/
    `steam-puff-emitter` → train-fleet, `placeholder-crate` → init-scene,
    `wagonSlots`/`wagonPresetUrls` → train-fleet + tests. Biome's
    noUnusedVariables pass over all 141 files is also clean.
  - [x] Remove only move-orphaned code (grep-verified); document dead-code
        findings in plan notes
- [x] Task: Gates + e2e `b3c3827`
  - [x] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` +
        `CI=true pnpm test` + full Playwright suite green
  - [x] No `src/core/`/`src/state/` diffs; no e2e assertion changes

  Notes:
  - Gates: biome ✓ (141 files) · tsc ✓ · vitest 676/676 ✓ · Playwright
    121/121 ✓ (tablet + phone + prod projects, 9.6 min).
  - e2e run 1 collapsed with 97 × "Could not connect to server" — the
    documented shared-dev-server failure mode (playwright.config.ts note);
    a single-test probe was green, and rerun 2 passed all 121 with no
    connection errors. Transient, no code or config change made.
  - `git diff main...HEAD -- src/core src/state e2e` is empty — Phase A
    touched only `src/scene/` and `conductor/`, as the refactor requires.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  Notes:
  - Takeover re-verification (original session was lost to an environment
    restart; a duplicate implementer was stopped by the user; this session
    re-ran every gate itself on the untouched tree at `3acf5eb`):
    biome ✓ (141 files) · `tsc --noEmit` ✓ · `CI=true pnpm test` 676/676 ✓ ·
    Playwright **121/121 ✓** in one clean uncontended run (9.3 min — no
    connection errors, no page crashes; the earlier 5-failure runs were
    contention artifacts of two overlapping suites, reproduced-and-cleared).
    `git diff main...HEAD -- src/core src/state e2e` still empty.
  - Coverage check: every changed file across the phase
    (`git diff e4a02e5..HEAD --name-only`) lives in `src/scene/` —
    non-logic per workflow.md; no new logic tests required.
  - Known deviation candidate: `init-scene.ts` orchestrator is 375 lines
    vs the spec's soft ~300 cap (modules all < 400). Raised to the user at
    this checkpoint for accept-or-trim decision.
  - Verification Report (2026-09-06):
    - Automated: biome ✓ (141 files) · `tsc --noEmit` ✓ · `CI=true pnpm
      test` 676/676 ✓ · Playwright 121/121 ✓ (single clean run, 9.3 min).
    - Manual checklist (boot <5s, build/ride/cargo/crossings/whistle,
      day-night + weather, river life, camera cycle, tab hide/resume,
      parent gate + mute, `?perf=debug`) — approved by the user via
      structured question; checkpoint closed.
    - Deviation: `init-scene.ts` at 375 lines vs the spec's soft ~300
      orchestrator cap — accepted and documented by the user; all
      extracted modules remain under 400 lines.
  - Phase A complete. Last functional commit: `b3c3827`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — UI Split (`app.ts` → wiring shell + flat `src/ui/` modules)

- [~] Task: Map extraction boundaries
  - [x] Categorize all 1,238 lines of `app.ts` into target modules
  - [ ] Record the module map as a note under this task
  Notes:
  - Full verbatim read of `src/ui/app.ts` (1,238 non-blank / ~1,299 total
    lines). Target modules (flat under `src/ui/`, all markup moved
    verbatim — e2e selectors depend on exact classes/data attributes):
    1. `toy-icons.ts` (~395): `isPieceKind`, `PIECE_LABELS`,
       `SCENERY_ICONS` (11), `PIECE_ICONS` (17), `toySlot` builder.
       Pure catalogs, zero behavior.
    2. `toy-drawer.ts` (~120): tab strip/panels builders, `showTab`,
       tab clicks, toy-slot pointerdown → beginDrag, cap dimming.
    3. `toy-drag.ts` (~330): drag/press state, `canPlaceAt`, ghost,
       rotate tap + bounce, ✕ chip, trash zone, ping/wobble-return,
       `endDrag`, window pointermove/up/cancel + `R` key, `overToolbarAt`.
    4. `ride-controls.ts` (~190): `RIDE_ICONS`, ride toggle + `refreshRide`,
       ride-ready invitation (pulse/pop via `closesLoop`), undo, 🎺
       whistle, 🎥 film toggle.
    5. `train-picker.ts` (~115): train drawer + loco row + wagon row DOM,
       refresh pressed states, selection click handler, world subs.
    6. `parent-gate.ts` (~150): hold/confirm gate, preset tray, mute.
    7. `app.ts` (~200 target): `AppOptions` (public facade, unchanged),
       frame template, canvas, dev grid toggle, window activity/dismiss
       listeners, and all module wiring.
  - Shared-state decisions (mirrors the scene's explicit-context rule):
    `riding` is owned by app.ts and passed as an accessor; ride-controls
    reports changes via a callback (its ride-mode handler currently
    reaches into drawers/chip/undo — app.ts composes those calls).
    `prefersStill` is sampled once in app.ts and passed explicitly.
    Drawer coordination (`setDrawer` toggles toys + trains): toy-drawer
    exposes toys open/close, train-picker exposes train drawer open/close,
    app.ts composes the one-drawer-at-a-time rule — no cross-module reach.
  - No `src/core`/`src/state` changes planned; UI is non-logic per
    workflow.md, so verification stays gates + e2e.
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
