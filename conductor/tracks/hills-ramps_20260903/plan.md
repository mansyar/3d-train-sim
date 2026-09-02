# Plan: Hills & Ramps (Elevation)

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`); Phase 2 is assets + scene riding (Blender recipe,
renderer mount, ride/camera height) verified by smoke tests and manual
verification; Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Hill Pieces & Height Profiles (TDD)

- [x] Task: Add the three hill piece types (tests first in `pieces.test.ts`,
      `track-graph.test.ts`, `save.test.ts`, `drawer.test.ts`) [cd76450]
  - [x] `PIECE_TYPES` gains `'slope-up' | 'hill' | 'slope-down'`;
        `BASE_ENDPOINTS` = `['north','south']` each (mirror the straight at
        all 4 rotations)
  - [x] Terrain rule: dry land only (default branch — assert
        ghost-red-over-water via `validatePlacement`)
  - [x] Save round-trip: snapshot containing all three types; pre-hill
        snapshots load unchanged; no version bump
  - [x] Catalog ripple: `drawer.ts` rails tab holds 8 pieces; renderer
        placeholder maps (`BASE_YAW`/`KIT_ANCHORS`/`PIECE_URLS` → straight
        GLB until Phase 2); `ui/app.ts` labels + 3 hand-drawn SVG icons
        (rising slope, crowned hill, falling slope)

  Notes:
  - TDD: 8 new tests written first, confirmed red (8 failed / 404 passed),
    then implemented to green (412/412 passing). The terrain-rule tests
    passed immediately because `terrainErrorFor`'s default branch already
    treats every non-bridge piece as dry-land-only — kept as regression
    guards per spec.
  - Kit GLB measurement (node script over POSITION accessors) confirmed the
    spec's H ≈ 1.1: `railroad-straight-hill-complete` tops at y = 1.100,
    `hill-beginning` at 1.071 vs the straight's 0.1 rail crown; module spans
    4 units (z 0..4), 1.0 wide. H = 1.1 will be calibrated in elevation.ts.
  - Files: `src/core/pieces.ts`, `src/core/drawer.ts`, `src/core/pieces.test.ts`,
    `src/core/track-graph.test.ts`, `src/core/save.test.ts`,
    `src/core/drawer.test.ts`, `src/scene/track-renderer.ts`, `src/ui/app.ts`.
  - Gates: Biome clean, `tsc --noEmit` clean, coverage: pieces 100%,
    drawer 100%, track-graph 100%, save 98.3% lines.
- [x] Task: New pure module `src/core/elevation.ts` (TDD: `elevation.test.ts`) [e933bc3]
  - [x] `heightAt(type, t)`: piecewise-linear profiles from the measured
        GLB geometry — `slope-up` 0→H, `hill` constant H, `slope-down` H→0;
        every existing type flat 0; H calibrated to the kit rail line
        (≈1.1)
  - [x] Pure + total: no three.js, deterministic, direction handled by
        per-piece progress (rotation-agnostic)

  Notes:
  - TDD: 26 tests written first (red: module missing), then implemented
    (438/438 suite green). Gates clean; `elevation.ts` 100% coverage.
  - Measured GLB rail-line profiles (vertex slicing, rail band |x| ≤ 0.4):
    hill-beginning climbs 0.100 → 1.071, hill-complete 0.100 → 1.100,
    hill-end 0.250 → 1.100, bump-up 0.100 → 0.599 → 0.100 — the kit's
    "complete" is a ramp, not a plateau, so the plateau `hill` profile is
    defined by this module per spec and the GLB→type mounting decision
    (which asset stands in for the crest) is deferred to Phase 2's render
    check, with the auto-blend covering any residual joint mismatch.
  - API refinement: `rideHeightAt(span, t)` / `stepHeights(span)` /
    `easedHeightAt(prevExitHeight, span, t)` carry the step's rotation and
    entry edge in a `RideSpan` so direction (forward vs. reversed riding)
    stays deterministic inside the module rather than in every caller.
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
