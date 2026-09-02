# Plan: Hills & Ramps (Elevation)

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`); Phase 2 is assets + scene riding (Blender recipe,
renderer mount, ride/camera height) verified by smoke tests and manual
verification; Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Hill Pieces & Height Profiles (TDD)

- [ ] Task: Add the three hill piece types (tests first in `pieces.test.ts`,
      `track-graph.test.ts`, `save.test.ts`, `drawer.test.ts`)
  - [ ] `PIECE_TYPES` gains `'slope-up' | 'hill' | 'slope-down'`;
        `BASE_ENDPOINTS` = `['north','south']` each (mirror the straight at
        all 4 rotations)
  - [ ] Terrain rule: dry land only (default branch — assert
        ghost-red-over-water via `validatePlacement`)
  - [ ] Save round-trip: snapshot containing all three types; pre-hill
        snapshots load unchanged; no version bump
  - [ ] Catalog ripple: `drawer.ts` rails tab holds 8 pieces; renderer
        placeholder maps (`BASE_YAW`/`KIT_ANCHORS`/`PIECE_URLS` → straight
        GLB until Phase 2); `ui/app.ts` labels + 3 hand-drawn SVG icons
        (rising slope, crowned hill, falling slope)
- [ ] Task: New pure module `src/core/elevation.ts` (TDD: `elevation.test.ts`)
  - [ ] `heightAt(type, t)`: piecewise-linear profiles from the measured
        GLB geometry — `slope-up` 0→H, `hill` constant H, `slope-down` H→0;
        every existing type flat 0; H calibrated to the kit rail line
        (≈1.1)
  - [ ] Pure + total: no three.js, deterministic, direction handled by
        per-piece progress (rotation-agnostic)
- [ ] Task: Path steps carry heights (TDD: extend `pathing.test.ts`)
  - [ ] `solvePath` annotates each step with entry/exit heights from
        `elevation.ts`; connectivity/rank/shuttle unchanged; all existing
        path tests assert heights 0
- [ ] Task: Gentle auto-blend rule (TDD)
  - [ ] Pure `easedHeightAt(prevExitHeight, type, t)`: eases height
        disagreements over a bounded fraction of the step; covers
        hill-into-straight, slope-into-slope, lone-slope dead ends,
        reversed riding
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Assets, Mounting & Scene Riding

- [ ] Task: Snow-cap shells in Blender (house rules 1–8 from `tech-stack.md`)
  - [ ] Measure the three kit hill GLBs first (module length, rail line,
        crest silhouette); author thin white crown shells in a dedicated
        collection; named nodes (`hill_snow_*` contract); deterministic
        recipe `scripts/blender-hill-snow.py`; export + verify GLB JSON
        chunk + render checks (target < ~15 KB each)
- [ ] Task: Mount hills in `track-renderer.ts` (+ `init-scene.ts` weather
      wiring)
  - [ ] Real `PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS` for the three types
        (direction convention: `slope-up` climbs south→north at yaw 0 —
        verify against the GLB with a render check, tunnel rule #3: size
        from the train)
  - [ ] Snow shells: hidden at load, `setHillSnow(visible)` event-driven
        toggle on the shared frozen gate (`FROZEN_SNOW`, same as
        tunnel/river ice)
- [ ] Task: Ride height in the scene (`ride-motion.ts` / `init-scene.ts`)
  - [ ] Engine, wagons, and crates sample path step heights + the blend
        rule; chase camera follows position + height with existing easing;
        overview unchanged; no per-frame allocations; quality tiers
        untouched
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - E2E, Docs & Final Gates

- [ ] Task: Playwright spec `e2e/hills.spec.ts` (mirror `tunnel.spec.ts`:
      place the 3-piece run via `__tinyTracksWorld`, start the train,
      assert GLBs load, clean console)
- [ ] Task: Docs — `CHANGELOG.md` `[Unreleased]` entry (parent-voice);
      `product.md` roadmap: strike elevation, note bumps/corner-ramps
      remain; `tech-stack.md` notes (snow-shell recipe added to the asset
      list)
- [ ] Task: Final gates — `pnpm check`, coverage on new logic (>80%),
      full Playwright suite
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
