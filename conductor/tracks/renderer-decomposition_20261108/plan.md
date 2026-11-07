# Renderer Decomposition — Implementation Plan

> **Branch:** `refactor/renderer-decomposition_20261108`
> **Base:** `main` @ `f880530d411420dd7077a0917c215a1a00d04d5f`
>
> **Phase state:** a phase is `pending`, `in_progress`, `verified`, `failed` or `blocked`.
> Only the primary agent writes this file.

Every phase removes code from `src/scene/track-renderer.ts`, so the facade shrinks continuously and
no phase ends with that file larger than it started. `track-renderer.ts` appears in every phase's
`Touches` by design: the phases are sequential and every other file belongs to exactly one phase.

## Phase 1: Core grid and the catalogue

- **Goal:** `cellToWorld`, `cellSize` and `PickedItem` are pure and unit-tested in
  `src/core/meadow-grid.ts`; no file under `src/ui` imports from `src/scene`; the data tables live
  in `src/scene/track-catalog.ts` with no loader and no scene mutation.
- **Depends on:** none
- **Covers:** FR-2, FR-3, FR-10, AC-3, AC-4
- **Touches:** `src/core/meadow-grid.ts`, `src/core/meadow-grid.test.ts`,
  `src/scene/track-catalog.ts`, `src/scene/track-renderer.ts`, `src/scene/ground.ts`,
  `src/scene/init-scene.ts`, `src/scene/park-pose.ts`,
  `src/scene/ride-motion.ts`, `src/scene/train-fleet.ts`, `src/scene/scene-context.ts`,
  `src/ui/app.ts`, `src/ui/toy-drag.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts`
- **Status:** verified

- [x] **P1.T1: Move the grid math into core, test first** — covers: FR-3, AC-3
  - [x] P1.T1.1: Write `src/core/meadow-grid.test.ts` first: cell to world for the four corners and
        the centre, every cell in one axis, negative and out-of-range cells, and `PickedItem`
        construction for both kinds. Confirm it fails because the module does not exist.
  - [x] P1.T1.2: Move `cellToWorld`, the `CELL_SIZE` derivation and `PickedItem` into
        `src/core/meadow-grid.ts`, importing only `GROUND_SIZE`, `MEADOW_CELLS` and the core types.
        Re-export nothing from `src/scene`.
- [x] **P1.T2: Repoint every importer** — covers: FR-10, AC-4
  - [x] P1.T2.1: Point `park-pose.ts`, `ride-motion.ts`, `train-fleet.ts`, `scene-context.ts` and
        the two UI files at the new home; keep `cellToScreen` exported from the renderer for now.
  - [x] P1.T2.2: Show `rg "from '../scene/" src/ui` returns nothing, and that `tsc --noEmit` still
        accepts the unchanged `init-scene.ts`.
- [x] **P1.T3: Extract the catalogue** — covers: FR-2
  - [x] P1.T3.1: Create `src/scene/track-catalog.ts` holding `PIECE_URLS`, `HILL_SNOW_URLS`,
        `KIT_ANCHORS`, `KIT_MODULE_UNITS`, `BASE_YAW`/`baseYawOf`, `DELIGHT_CAPS` and `isPiece`,
        moved verbatim.
  - [x] P1.T3.2: Import them in `track-renderer.ts`; assert nothing was reordered or renamed by
        diffing the moved blocks against the base commit.

**Result:** verified
**Checkpoint:** 69e4d48
**Evidence:** conductor/tracks/renderer-decomposition_20261108/verification/phase-1.md
**Deviations:** `src/scene/ground.ts` had to import and re-export `GROUND_SIZE`, because the value
lived in a three.js module and core may not import scene code; `src/scene/init-scene.ts` also had to
be repointed because it imported `cellToWorld` and `PickedItem`; both were added to `Touches` before
the phase ran. The local smoke run failed both ambient-FPS assertions once on throughput and passed
40/40 on the identical rerun, which is the documented verdict in `e2e/README.md`.

## Phase 2: Placement

- **Goal:** the loader, the placement maps, `apply`, `reconcile`, pop-in, tunnel portals, station
  crates, hill snow and `setPieceVisible` live in `src/scene/track-placement.ts`, and the single
  `world.subscribe` moved with them.
- **Depends on:** Phase 1
- **Covers:** FR-4, AC-5
- **Touches:** `src/scene/track-placement.ts`, `src/scene/track-renderer.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/tunnel.spec.ts e2e/cargo.spec.ts`
- **Status:** verified

- [x] **P2.T1: Move loading and reconciliation** — covers: FR-4
  - [x] P2.T1.1: Create `track-placement.ts` as a factory taking the scene, world and audio; move
        `templates`, `rendered`, `tracked`, `loader`, `apply`, `reconcile` and the pop-in queue.
  - [x] P2.T1.2: Move the `world.subscribe` into the factory and return its unsubscribe for
        disposal; the facade must construct placement before anything that reads `tracked`.
- [x] **P2.T2: Move the piece-specific decoration** — covers: FR-4
  - [x] P2.T2.1: Move `syncTunnelPortals`, `syncStationCrates`, `attachHillSnow`/`setHillSnow` and
        `setPieceVisible`.
  - [x] P2.T2.2: Prove ordering with the tunnel and cargo specs, which exercise portals, crates and
        reload restoration.

**Result:** verified
**Checkpoint:** cd7f804
**Evidence:** conductor/tracks/renderer-decomposition_20261108/verification/phase-2.md
**Deviations:** the factory takes `scene`, `world`, `reducedMotion` and the hooks rather than `audio`,
because no moved line touches audio; `advancedEdge` became a module-level export so the resident
`setSwitchRoad` can share it; `onItemAttached` receives the model once instead of the original's two
`rendered.get` reads, and `popOut` reads placement's own `disposed` flag because both were set by the
same facade dispose. None of these change behaviour, and all are recorded in the evidence file.

## Phase 3: Ghost and grid

- **Goal:** the drag preview, its tinting, its pop animation and the grid lines live in
  `src/scene/track-ghost.ts`.
- **Depends on:** Phase 2
- **Covers:** FR-5, AC-5
- **Touches:** `src/scene/track-ghost.ts`, `src/scene/track-renderer.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts`
- **Status:** verified

- [x] **P3.T1: Move the grid lines** — covers: FR-5
  - [x] P3.T1.1: Move `gridLines`, its material and geometries, and `setGridVisible`; keep the
        dev-only visibility default identical.
- [x] **P3.T2: Move the ghost preview** — covers: FR-5
  - [x] P3.T2.1: Move `ghost`, `ghostTint`, the valid/blocked colours, `spawnGhost`, `tintGhost`,
        `beginGhost`, `moveGhost` and `endGhost`.
  - [x] P3.T2.2: Confirm the ghost still reads the catalogue through its own import, not through
        placement.

**Result:** verified
**Checkpoint:** bff61e5
**Evidence:** conductor/tracks/renderer-decomposition_20261108/verification/phase-3.md
**Deviations:** none. The dev-only grid default was already owned by `src/ui/app.ts` and
`src/main.ts`, so the phase only had to preserve `gridLines.visible = false`; the ghost takes
placement's `templates` as a `ReadonlyMap` and still yields no preview for a kind that has not
loaded. The AC-5 specs failed once on the ambient-FPS throughput sample (phone) and passed 2/2 when
run alone.

## Phase 4: Picking

- **Goal:** raycasting, the ground plane, `cellFromPoint`, `pickPiece` and the `cellToScreen`
  projection wrapper live in `src/scene/track-picking.ts`.
- **Depends on:** Phase 3
- **Covers:** FR-6, AC-5
- **Touches:** `src/scene/track-picking.ts`, `src/scene/track-renderer.ts`
- **Verification:** `pnpm check` and
  `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts`
- **Status:** in_progress

- [ ] **P4.T1: Move the raycast picking** — covers: FR-6
  - [ ] P4.T1.1: Move `raycaster`, `pointerNdc`, `groundPlane`, `groundHit`, `cellFromPoint` and
        `pickPiece`; the hit test must keep reading `rendered`/`tracked` through the placement
        handle rather than a copy.
- [ ] **P4.T2: Move the screen projection** — covers: FR-6
  - [ ] P4.T2.1: Move `cellToScreen` as a thin wrapper that projects the core world point through
        the camera passed at construction.

## Phase 5: Crossings and switches

- **Goal:** gate choreography, the bell flag, crossing snow, switch blade and lever state, their
  tweens and `setSwitchRoad` live in `src/scene/track-crossings.ts`, with probe values unchanged.
- **Depends on:** Phase 4
- **Covers:** FR-7, AC-5, AC-9
- **Touches:** `src/scene/track-crossings.ts`, `src/scene/track-renderer.ts`
- **Verification:** `pnpm check` and
  `pnpm exec playwright test e2e/crossing-gate.spec.ts e2e/switches.spec.ts e2e/switch-slip.spec.ts`
- **Status:** pending

- [ ] **P5.T1: Move crossing choreography** — covers: FR-7
  - [ ] P5.T1.1: Move `crossingMotions`, `crossingParts`, `trackCrossing`, `updateCrossings`,
        the train pool/view buffers, `crossingBell`, `setCrossingSnow` and the gate constants.
- [ ] **P5.T2: Move switch poses** — covers: FR-7, AC-9
  - [ ] P5.T2.1: Move `SWITCH_POSES`, `SLIP_BLADES`, `SLIP_LEVERS`, `LEVER_*_Y`, the blade tween
        queue and `setSwitchRoad`; keep `switchPose` and `crossingPhases` returning the same shapes.

## Phase 6: Ambience, facade, docs

- **Goal:** critters, delight toys, the music box and the three snow toggles live in
  `src/scene/track-ambience.ts`; `track-renderer.ts` is a facade within its line budget; the folder
  map records the new module layout.
- **Depends on:** Phase 5
- **Covers:** FR-1, FR-8, FR-9, FR-12, AC-1, AC-2, AC-8
- **Touches:** `src/scene/track-ambience.ts`, `src/scene/track-renderer.ts`,
  `src/core/import-graph.test.ts`, `conductor/tech-stack.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/delight-toys.spec.ts e2e/music-box.spec.ts`
- **Status:** pending

- [ ] **P6.T1: Move critters** — covers: FR-8
  - [ ] P6.T1.1: Move `critterLife`, `animatedCritters`, `syncCritterAnimations`, `updateCritters`
        and `hopCritter`.
- [ ] **P6.T2: Move delight and the music box** — covers: FR-8
  - [ ] P6.T2.1: Move the delight motion, `delightSnow`/`setDelightSnow`/`delightBalloonDrift`, the
        music box scene and voice, `updateMusicBox`, `suspendMusicBox`/`resumeMusicBox` and
        `musicBoxProbe`, plus `tunnelSnow`/`setTunnelSnow` with placement's owner noted.
- [ ] **P6.T3: Prove the shape and record it** — covers: FR-1, FR-9, FR-12, AC-1, AC-2, AC-8
  - [ ] P6.T3.1: Record line counts and diff the `TrackRenderer` interface block against `f880530`,
        proving the member set and types are unchanged.
  - [ ] P6.T3.2: Add `src/core/import-graph.test.ts` asserting the allowed import directions: UI
        imports no scene module, ambience imports no placement internals, no module reaches another
        module's private state.
  - [ ] P6.T3.3: Update the folder map in `conductor/tech-stack.md` with the seven files and their
        ownership.

<!-- The primary agent appends, in place of this comment:
**Result:** verified | failed | blocked
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/renderer-decomposition_20261108/verification/phase-<n>.md
-->

<!-- If `conductor-review` finds issues it appends a phase with its own contract:
## Phase R1: Review Fixes
- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
