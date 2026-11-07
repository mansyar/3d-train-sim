# Renderer Decomposition — Specification

> **Stable IDs:** `FR`, `NFR` and `AC` identifiers are permanent. Do not renumber.
> Withdraw an item by marking it `Withdrawn` instead of deleting it.

## Overview

Split `src/scene/track-renderer.ts` (1,263 lines, one factory holding around forty closures) into
six modules with one responsibility each, behind a facade whose signature and returned interface
are unchanged. Move the pure grid math into `src/core/` so it can be tested directly and so the UI
stops importing types out of `src/scene`.

## Problem / Motivation

Every new piece type is an edit to a single 1,263-line file that mixes asset URLs, GLB loading,
placement diffing, raycasting, ghost preview, switch tweening, crossing choreography, critter
animation and the music box. Unit coverage on it is **1.56%**, so a mistake is caught only by
Playwright or by a child. `src/scene/init-scene.ts` calls into it through roughly thirty-five
methods, which makes the file the de-facto scene API as well as the biggest single body of code in
the project.

Two smaller signals point at the same seam damage:

- `src/ui/app.ts` and `src/ui/toy-drag.ts` import `PickedItem` from `src/scene`, so the UI layer
  depends on the renderer just to name a hit result.
- `conductor/product.md` ranks this track as the largest debt item before v1.0, ahead of the
  toddler-first clarity work.

The cost is not hypothetical: adding a piece type means finding, in one file, the URL table, the
anchor table, the yaw table, the apply path, the snow shells, the picking tolerance and whatever
ambient actor shares the same group — and each of those has a different reason to change.

## Goals & Success Metrics

- **Goal:** no scene module over 500 lines, no new module over 400.
  **Metric:** `track-renderer.ts` at or under 200 lines (facade only); each of the six new modules
  at or under 400.
- **Goal:** zero behaviour change. **Metric:** identical `TrackRenderer` member set and types,
  identical debug-probe values, the named spec for each phase green on tablet and phone, and every
  existing spec green at integration.
- **Goal:** make the grid testable.
  **Metric:** `src/core/meadow-grid.ts` at 80%+ coverage with colocated tests.

## Scope

### In Scope

- Extract six modules: catalogue, placement, ghost, picking, crossings, ambience.
- Move `cellToWorld`, `PickedItem` and the derived cell size to `src/core/meadow-grid.ts`.
- Keep `cellToScreen` in the scene as a projection wrapper over the core math.
- Repoint the four scene importers and the two UI type imports.
- Update the folder map in `conductor/tech-stack.md`.

### Out of Scope

- Any change to rendered geometry, materials, timing, tween durations or frame order.
- Renaming or regrouping the `TrackRenderer` methods.
- Adding piece types, scenery or gameplay.
- Splitting `src/scene/init-scene.ts`.
- New e2e assertions about appearance, and screenshot baselines.
- Bundle-size work.
- Any `src/core` change beyond the new grid module.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | `src/scene/track-renderer.ts` becomes a facade of at most 200 lines: `startTrackRenderer`, the re-exported symbols, and delegation only. `startTrackRenderer(scene, camera, canvas, world, audio)` keeps its exact signature; `TrackRenderer` keeps every member with identical types. | must |
| FR-2 | `src/scene/track-catalog.ts` holds the data tables: `PIECE_URLS`, `HILL_SNOW_URLS`, `KIT_ANCHORS`, `KIT_MODULE_UNITS`, `BASE_YAW`/`baseYawOf`, `DELIGHT_CAPS` and the `isPiece` guard. Data only: no loading, no scene mutation. | must |
| FR-3 | `src/core/meadow-grid.ts` exports `cellToWorld`, `PickedItem` and the derived cell size, and imports nothing from `three` or `src/scene`. `cellToScreen` stays in the scene as a wrapper that projects through the camera using the core math. | must |
| FR-4 | `src/scene/track-placement.ts` owns the loader, `templates`/`rendered`/`tracked`, `apply`, `reconcile`, pop-in, tunnel portals, station crates, hill snow, `setPieceVisible` and the subscription to `world`. | must |
| FR-5 | `src/scene/track-ghost.ts` owns the grid lines and the ghost preview: `beginGhost`, `moveGhost`, `endGhost`, the tint materials and `setGridVisible`. | must |
| FR-6 | `src/scene/track-picking.ts` owns the raycaster, the ground plane, `cellFromPoint`, `pickPiece`, and the `cellToScreen` wrapper. | must |
| FR-7 | `src/scene/track-crossings.ts` owns crossing registration, `updateCrossings`, gate poses, switch blade and lever state, the bell flag and crossing snow. | must |
| FR-8 | `src/scene/track-ambience.ts` owns critters, delight toys, the music box and the three snow toggles. | must |
| FR-9 | Every module is constructed once by the facade and receives its dependencies explicitly. No module-level mutable state, matching the `SceneContext` rule. | must |
| FR-10 | The UI imports `PickedItem` from `src/core/meadow-grid`, so no file under `src/ui` imports from `src/scene`. | must |
| FR-11 | The debug probes the e2e suite reads keep working through the facade: `switchPose`, `crossingPhases`, `bellRinging`, `musicBoxProbe`, `delightBalloonDrift`, `wagonCount`, `ridingTrainCount`, `trainPace`. | must |
| FR-12 | `conductor/tech-stack.md`'s folder map lists the seven files and what each owns. | should |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | No new runtime dependency, and the built gzip size grows by no more than 2 KB. |
| NFR-2 | The unit test count never drops; the only additions are the new grid and import-graph tests. |
| NFR-3 | The `pnpm check` gate (biome, `tsc --noEmit`, 80% coverage on `src/core` + `src/state`) passes at every phase boundary. |
| NFR-4 | Frame order is unchanged: `dayAmbience → fleet → audio → confetti → critters → crossings → delight → musicBox → duck → barge → portalGlow → filmCamera`. Each module keeps its own tick method so the order stays visible in `init-scene`. |
| NFR-5 | The ambient-FPS spec still clears its floor, and no per-frame allocation is introduced. |
| NFR-6 | No asset, GLB or other `public/` file changes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | Line counts: `track-renderer.ts` at most 200, every new scene module at most 400. | FR-1–FR-8 |
| AC-2 | `TrackRenderer`'s member set and types are identical to the pre-track version, proven by `tsc --noEmit` against an unchanged `init-scene.ts` and by diffing the interface block against the base commit. | FR-1 |
| AC-3 | `src/core/meadow-grid.ts` has colocated tests covering cell to world for all 16×16 cells, and coverage of at least 80%. | FR-3 |
| AC-4 | `rg "from '../scene/" src/ui` matches nothing. | FR-10 |
| AC-5 | The named spec for each phase passes on both tablet and phone: `tunnel`, `switch-slip`, `switches`, `crossing-gate`, `delight-toys`, `music-box`, `cargo`, plus `smoke`, `undo` and `ride-toybox-flow` where the phase touches dragging. | FR-4–FR-8 |
| AC-6 | A full `pnpm exec playwright test` at integration reports the same spec count as before the track, with no new failures. | NFR-4 |
| AC-7 | `pnpm build` reports the same precache entry count and a gzip delta of at most 2 KB. | NFR-1 |
| AC-8 | No scene module reaches into another's internals; a small import-graph test asserts the allowed directions. | FR-9 |
| AC-9 | The e2e specs that read debug probes pass unmodified, and the probe values have the same shapes. | FR-11 |

## Edge Cases

- **Ordering hazard:** `apply` and `reconcile` must run from the single `world.subscribe` before any
  module reads `tracked`. That subscription belongs to placement, and the facade must construct
  placement before crossings.
- **Shared-looking state:** `hillSnow`, `tunnelSnow`, `crossingSnow` and `delightSnow` are separate
  booleans today. Each moves with its owning module rather than into a shared bag.
- **Disposal:** `dispose()` must reach every module in reverse construction order, or GLB and line
  geometries leak across the e2e reload tests.
- **Late binding:** `init-scene` builds the renderer before the fleet exists, so crossings receive
  train positions per tick and never at construction.
- **Reduced motion:** read once at construction today; preserved as-is rather than re-read per frame.
- **Type-only cycles:** `cellToScreen` needs the camera that `SceneContext` holds, so picking must
  take the camera as an argument rather than importing the context.

## Dependencies

- **Tracks:** none blocking. `save-resilience` (#65), `world-portability` (#66),
  `runtime-guarantees` (#67) and `deps-guardrails` (#68) are merged on `main @ f880530`.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the six-way split is achievable without touching `src/state` or `src/core/save.ts`.
  The only core change is the new grid module.
- **Assumption:** `cellToWorld` uses no camera and no scene constant other than `GROUND_SIZE` and
  `MEADOW_CELLS`, so it is genuinely portable to core. If Phase 1 finds a hidden dependency, it is
  recorded as a deviation rather than expanding scope.
- **Assumption:** e2e is the parity authority, so no screenshot baselines are added.

## References

- `conductor/product.md` — roadmap row `renderer-decomposition_20261108`.
- `conductor/tech-stack.md` — folder structure and the `src/core` purity rule.
- `conductor/archive/save-resilience_20261107/plan.md` — the phase-contract style used here.
- `e2e/README.md` — stability rules and the two-failure rerun convention.
