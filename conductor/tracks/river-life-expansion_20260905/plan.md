# Implementation Plan: River Life Expansion

**Track:** `river-life-expansion_20260905` · **Branch:** `track/river-life-expansion_20260905` · **Spec:** [spec.md](spec.md)

## Phase 1 — Core Catalog & Water Placement (TDD) [checkpoint: b0593e5]

- [x] Task: Frog catalog entry in `src/core/scenery.ts` (logic-bearing — TDD) `c325a79`
  - - [x] **Red:** extend `scenery.test.ts` — `frog` is a `SCENERY_KINDS` member, category `critter`, url `/assets/nature-kit/frog.glb`, voice `ribbit-frog`, aria "Frog", scale & lift defined
  - - [x] **Green:** add `frog` to `SCENERY_KINDS` + every per-kind record (`SCENERY_URLS`, `SCENERY_CATEGORIES_BY_KIND`, `SCENERY_SCALES`, `SCENERY_LIFTS`, `SCENERY_ARIA`, `SCENERY_VOICES`)
  - Notes:
    - TDD: 5 failing tests written first (catalog membership, category, url, voice, ribbit id), confirmed Red, then implemented Green. `scenery.ts` at 100% coverage.
    - Typecheck forced two consumer records to learn about `frog`: `TAB_FOR_KIND` in `core/drawer.ts` (critter tab) and `SCENERY_ICONS` in `ui/app.ts` (inline lily-pad-frog SVG in the established icon style). `drawer.test.ts` critter-tab expectation updated to `['pig','sheep','pug','frog']`.
    - Files: `src/core/scenery.ts`, `src/core/scenery.test.ts`, `src/core/drawer.ts`, `src/core/drawer.test.ts`, `src/ui/app.ts`.
    - Gates: biome ✓ · tsc ✓ · 652 tests pass (full suite, coverage run).
- [x] Task: Floating-scenery water rule in `src/state/world.ts` (logic-bearing — TDD) `71ce7cb`
  - - [x] **Red:** `world.test.ts` — `placeScenery('frog', waterCell)` → `'placed'`; `placeScenery('tree', waterCell)` → `'water'`; same pair for `relocateScenery`
  - - [x] **Green:** add `sceneryFloats(kind)` helper in `src/core/scenery.ts` (only `frog` → true) and gate the two `isWater` checks (`placeScenery`, `relocateScenery`)
  - Notes:
    - TDD: two failing tests first — `sceneryFloats` catalog helper ("floats only the frog") and the world-store float rule ("lets the frog float on the water", covering place + bank↔water relocation). Confirmed Red, then Green.
    - `placeScenery`/`relocateScenery` now read `if (isWater(cell) && !sceneryFloats(...)) return 'water'` — tree and all other toys still refused on water (existing tests unchanged and passing).
    - Files: `src/core/scenery.ts`, `src/core/scenery.test.ts`, `src/state/world.ts`, `src/state/world.test.ts`.
    - Gates: biome ✓ · tsc ✓ · 654 tests pass.
- [x] Task: UI ghost validity + drawer icon (glue — acceptance criteria in plan) `b0593e5`
  - - [x] `src/ui/app.ts` scenery-validity check permits `frog` on water cells; ghost green/red language unchanged otherwise
  - - [x] inline-SVG lily-pad-frog icon added to the critter tab icons
  - Notes:
    - `canPlaceAt` in `ui/app.ts` now reads `!isWater(cell) || sceneryFloats(kind)` for scenery — the single-source rule from core, ghost tints green over the river for the frog only.
    - The lily-pad-frog icon landed in Task 1.1 (required for typecheck of `SCENERY_ICONS`).
    - Acceptance criteria (manual, deferred to Phase checkpoint): frog button visible on Critter tab; dragging frog over river shows a green ghost and commits; tree over river stays red.
    - Gates: biome ✓ · tsc ✓ · 654 tests pass.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-09-05): automated `pnpm check` green —
    biome clean, `tsc --noEmit` clean, 654/654 vitest pass. Coverage on
    phase logic: `scenery.ts` 100%, `drawer.ts` 100% stmts, `world.ts`
    96% — above the 80% target. All changed logic-bearing files have
    test files; `ui/app.ts` is glue (acceptance criteria below). Manual
    (user confirmed 2026-09-05): frog button visible on Critter tab;
    frog over river → green ghost + commits; other scenery (tree) over
    river stays red + refused; frog commits on grass too; undo/trash
    work as for other scenery.

## Phase 2 — Blender Assets [checkpoint: 5156f8c]

- [x] Task: Barge recipe `scripts/blender-barge.py` → `public/assets/train-kit/barge.glb` (non-logic — render is the acceptance test) `beb8b1d`
  - - [x] Author chunky toy barge (hull, deck crates, little paddle wheel), sized to pass under the trestle bridge clearance; named-node contract (`barge_hull`, `barge_wheel`), named Principled double-sided materials
  - - [x] Camera-render fit checks against the kit scale; export by selection (`export_yup=True`); verify GLB node/material names + size (< ~150 KB)
  - Notes:
    - **Deviation (user-approved 2026-09-05, "low-profile barge, duck precedent"):** the trestle deck sits essentially AT the waterline — measured `railroad-straight.glb` crowns at world y ≈ 0.094, so the trestle planks' bottom is ≈ 0.024 and cross-beam bottoms ≈ −0.031 (below water); there is no under-deck gap. The barge therefore passes through bridge cells at water level between the stilt legs, the shipped duck precedent on the same `riverDriftPath()`. Authored low: gunwale +0.17, crate tops ≤ +0.34, half-submerged stern wheel.
    - Contract: the model origin IS the waterline (scene places it at y ≈ 0.02); bow on Blender +y → glTF −z forward (duck convention). Recorded in `tech-stack.md` rule 2.
    - Iterated the paddle wheel against renders (axle stubs + 6 spokes + octagonal rim read as a waterwheel from the game's ~50° camera elevation, `init-scene.ts` OVERVIEW_POSITION (0, 52, 44)); top/side/bridge-pass renders clean.
    - GLB: 28,752 bytes, nodes `barge_hull`/`barge_cargo`/`barge_wheel`, materials `barge_red`/`barge_trim`/`barge_dark`/`barge_crate`/`barge_wheel` — all double-sided Principled.
    - Blender 5.2.0 LTS at `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`, run headless: `blender --background --python scripts/blender-barge.py`.
- [x] Task: Frog recipe `scripts/blender-frog.py` → `public/assets/nature-kit/frog.glb` (non-logic — render is the acceptance test) `5156f8c`
  - - [x] Author frog sitting on a lily pad (named nodes `frog_body`, `frog_pad`), kit-style green/yellow palette
  - - [x] Render checks, export, verify names + size
  - Notes:
    - Calibration from peers: nature-kit GLBs are authored tiny (rock_smallA 0.36 raw → 1.35 world at ×3.75) and the quaternius pig renders 1.16 world tall — the frog lands at ~1.1 (incl. pad), pad Ø ~1.8 world across the 3.75-unit cell.
    - Contract: pad underside at the model origin (land lift 0.01 / water surface in Phase 3); `frog_body` origin parked at the pad-top centre so the critter-life hop moves the body node; bow +y → glTF −z forward.
    - Pad carries the classic wedge notch (boolean slit, rear); kit-style green/yellow via the yellow throat + green body/pad; white googly eyes with dark pupils.
    - Fixed an authored-bug en route: the uvsphere helper scaled radius-1 spheres by 2×half (cube math) — every sphere was double size until corrected to ×half.
    - Renders (front/top/side/scale-vs-pig) pass vision critique; GLB 99,168 bytes with nodes `frog_body`/`frog_pad`, materials `frog_green`/`pad_green`/`frog_yellow`/`frog_white`/`frog_dark`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-09-05): non-logic phase — the render is the
    acceptance test. `barge.glb` (28,752 B, nodes barge_hull/barge_cargo/
    barge_wheel) and `frog.glb` (99,168 B, nodes frog_body/frog_pad) both
    verified via GLB JSON parse + headless-Blender camera renders
    (top/side/bridge-pass, front/top/side/scale-vs-pig) that passed the
    vision critique; the low-profile bridge-pass deviation was
    user-approved before authoring. Automated `pnpm check` green — biome
    clean, `tsc --noEmit` clean, 654/654 vitest pass. User confirmed
    checkpoint 2026-09-05.

## Phase 3 — Scene & Audio Wiring

- [x] Task: Barge module `src/scene/barge.ts` (modeled on `duck.ts`; glue — manual verification) `edd2a77`
  - - [x] Load `barge.glb`; drift `riverDriftPath()` ping-pong at ~0.15 cells/s; gentle bob; face travel direction
  - - [x] Mood handling: night pause at `BEDTIME_NIGHT 0.6`, frozen at shared `FROZEN_SNOW 0.5`; bob never stops
  - - [x] Zero per-frame allocations; wire into `init-scene.ts` update loop + `dispose()`
  - Notes:
    - GLB loaded onto a root group that exists from frame one (spawned at the river's north end) so the barge rests in place while loading; load failure leaves an empty root — the world keeps working, as with the piece loaders.
    - Waterline contract honoured: model origin = water surface, `baseY = 0.02` + bob (0.05 amplitude, 2.6 s period); bow −z faces travel via the duck's `atan2` idiom; wheel node (`barge_wheel`) spins about local x, travel-scaled, engine off at bedtime/frozen.
    - `BEDTIME_NIGHT` exported from `duck.ts` (one-word change) so night/frozen gates stay single-source.
    - Zero per-frame allocations (drift math on the cached path array only); `dispose()` deep-disposes via `disposeObject`.
- [x] Task: Frog rendering & float level (glue — manual verification) `3b0c0dc`
  - - [x] Scenery GLB pipeline renders `frog` via `SCENERY_URLS`; on water cells the pad rests at the water-surface level instead of the ground lift
  - - [x] Track placed frogs in `critter-life.ts` with the `ribbit-frog` voice (hops, rain/bedtime rules come free)
  - Notes:
    - Rendering needed no new pipeline — Phase 1's catalog entry flows through `SCENERY_URLS` → template → clone; critters (including the frog) are tracked by `critter-life.ts` via `sceneryCategory`/`sceneryVoice` in `syncCritterAnimations`.
    - Float level: `apply()` now nudges a floating toy's inner model between `sceneryLift` (land) and the river `SURFACE_LIFT` (water) — the shared surface constant exported from `river-water.ts` (barge now uses it too).
    - Gates: biome ✓ · tsc ✓ · 654 tests pass.
- [ ] Task: Ribbit sound (glue — manual verification)
  - - [ ] Bundle a soft CC0 ribbit; map `ribbit-frog` in the sfx registry; mute-respecting like the other critter voices
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E, Docs & Gates

- [ ] Task: Playwright spec `e2e/river-life.spec.ts` (per `e2e/README.md` conventions)
  - - [ ] Via `__tinyTracksWorld`: place frog on a water cell and a land cell, assert the frog GLB loads and the barge is present, start a ride, assert zero console errors
- [ ] Task: Docs
  - - [ ] Parent-facing `CHANGELOG.md` entry under `## [Unreleased]`
  - - [ ] `product.md` living-meadow/roadmap note (river life shipped)
- [ ] Task: Full gates
  - - [ ] `pnpm check` (biome + tsc + vitest) and the Playwright suite (tablet · phone · prod)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Coverage target >80% on the new logic in `core/scenery.ts` / `state/world.ts`.
- The barge is ambience and intentionally not serialized; saves stay additive (no version bump).
