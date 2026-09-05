# Implementation Plan: River Life Expansion

**Track:** `river-life-expansion_20260905` · **Branch:** `track/river-life-expansion_20260905` · **Spec:** [spec.md](spec.md)

## Phase 1 — Core Catalog & Water Placement (TDD)

- [ ] Task: Frog catalog entry in `src/core/scenery.ts` (logic-bearing — TDD)
  - - [ ] **Red:** extend `scenery.test.ts` — `frog` is a `SCENERY_KINDS` member, category `critter`, url `/assets/nature-kit/frog.glb`, voice `ribbit-frog`, aria "Frog", scale & lift defined
  - - [ ] **Green:** add `frog` to `SCENERY_KINDS` + every per-kind record (`SCENERY_URLS`, `SCENERY_CATEGORIES_BY_KIND`, `SCENERY_SCALES`, `SCENERY_LIFTS`, `SCENERY_ARIA`, `SCENERY_VOICES`)
- [ ] Task: Floating-scenery water rule in `src/state/world.ts` (logic-bearing — TDD)
  - - [ ] **Red:** `world.test.ts` — `placeScenery('frog', waterCell)` → `'placed'`; `placeScenery('tree', waterCell)` → `'water'`; same pair for `relocateScenery`
  - - [ ] **Green:** add `sceneryFloats(kind)` helper in `src/core/scenery.ts` (only `frog` → true) and gate the two `isWater` checks (`placeScenery`, `relocateScenery`)
- [ ] Task: UI ghost validity + drawer icon (glue — acceptance criteria in plan)
  - - [ ] `src/ui/app.ts` scenery-validity check permits `frog` on water cells; ghost green/red language unchanged otherwise
  - - [ ] inline-SVG lily-pad-frog icon added to the critter tab icons
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Blender Assets

- [ ] Task: Barge recipe `scripts/blender-barge.py` → `public/assets/train-kit/barge.glb` (non-logic — render is the acceptance test)
  - - [ ] Author chunky toy barge (hull, deck crates, little paddle wheel), sized to pass under the trestle bridge clearance; named-node contract (`barge_hull`, `barge_wheel`), named Principled double-sided materials
  - - [ ] Camera-render fit checks against the kit scale; export by selection (`export_yup=True`); verify GLB node/material names + size (< ~150 KB)
- [ ] Task: Frog recipe `scripts/blender-frog.py` → `public/assets/nature-kit/frog.glb` (non-logic — render is the acceptance test)
  - - [ ] Author frog sitting on a lily pad (named nodes `frog_body`, `frog_pad`), kit-style green/yellow palette
  - - [ ] Render checks, export, verify names + size
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Scene & Audio Wiring

- [ ] Task: Barge module `src/scene/barge.ts` (modeled on `duck.ts`; glue — manual verification)
  - - [ ] Load `barge.glb`; drift `riverDriftPath()` ping-pong at ~0.15 cells/s; gentle bob; face travel direction
  - - [ ] Mood handling: night pause at `BEDTIME_NIGHT 0.6`, frozen at shared `FROZEN_SNOW 0.5`; bob never stops
  - - [ ] Zero per-frame allocations; wire into `init-scene.ts` update loop + `dispose()`
- [ ] Task: Frog rendering & float level (glue — manual verification)
  - - [ ] Scenery GLB pipeline renders `frog` via `SCENERY_URLS`; on water cells the pad rests at the water-surface level instead of the ground lift
  - - [ ] Track placed frogs in `critter-life.ts` with the `ribbit-frog` voice (hops, rain/bedtime rules come free)
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
