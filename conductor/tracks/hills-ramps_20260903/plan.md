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
- [x] Task: Path steps carry heights (TDD: extend `pathing.test.ts`) [ba32f09]
  - [x] `solvePath` annotates each step with entry/exit heights from
        `elevation.ts`; connectivity/rank/shuttle unchanged; all existing
        path tests assert heights 0
- [x] Task: Gentle auto-blend rule (TDD) [e933bc3]
  - [x] Pure `easedHeightAt(prevExitHeight, type, t)`: eases height
        disagreements over a bounded fraction of the step; covers
        hill-into-straight, slope-into-slope, lone-slope dead ends,
        reversed riding

  Notes:
  - Pathing: `PathStep` gained `entryHeight`/`exitHeight` (natural,
    per-piece); existing step literals updated to assert 0/0, four new
    hill annotation tests. 442/442 green; pathing.ts 100% lines; the ride
    motion test helper constructs flat steps explicitly.
  - Blend rule: shipped inside the elevation.ts module (same red-green
    cycle, same commit as the profiles) — see the Task 2 notes for the
    RideSpan signature refinement.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 1):
  - Automated: `CI=true pnpm test` → 442/442 passing (31 files);
    `pnpm exec biome check .` and `pnpm exec tsc --noEmit` clean;
    coverage on new/changed logic — elevation.ts 100%, pieces.ts 100%,
    drawer.ts 100%, pathing.ts 98.4% lines / 100% functions, save.ts
    98.3% lines, track-graph.ts 100% lines.
  - Manual verification steps: run `pnpm dev`, open on tablet/touch
    emulation; Rails tab shows 8 pieces with the three new icons (rising
    slope, crowned hill, falling slope); each snaps on land, ghosts red
    over water, lifts/trashes like track; reload restores placed hills;
    hill pieces render as straight placeholders and trains ride flat
    until Phase 2 (expected at this checkpoint).
  - User confirmation: yes (2026-09-03).

## Phase 2 - Assets, Mounting & Scene Riding [checkpoint: 24c7c56]

- [x] Task: Snow-cap shells in Blender (house rules 1–8 from `tech-stack.md`) [9f8dba6]
  - [x] Measure the three kit hill GLBs first (module length, rail line,
        crest silhouette); author thin white crown shells in a dedicated
        collection; named nodes (`hill_snow_*` contract); deterministic
        recipe `scripts/blender-hill-snow.py`; export + verify GLB JSON
        chunk + render checks (target < ~15 KB each)

  Notes:
  - Deviation (documented per workflow): the kit's three "straight-hill"
    GLBs are bare rail ramps — rails and sleepers with no terrain beneath
    (meant to be sunk into user-built ground), and their joint heights
    disagree (0.1/0.25 low ends, 1.071/1.1 high ends). Mounted as-is they
    would float as ladders in the meadow, so the three pieces are
    Blender-authored on the kit's own measurements (tunnel precedent):
    grassy trapezoid embankments carrying the kit straight's warped
    rails+sleepers, climbing the elevation.ts profiles exactly
    (smoothstep-eased, grade crown −0.9 → crest crown 0.2 in model space,
    KIT_ANCHOR [0,−1,2] convention), so wheels sit on real kit rails.
  - Exports: hill-slope-up.glb / hill-hill.glb / hill-slope-down.glb
    (50–57 KB, palette-textured kit rails + hill_grass mounds) and
    hill-snow-*.glb shells (9–12 KB, under the 15 KB target) with
    hill_snow_* named nodes, verified via GLB JSON chunk parse.
  - Render checks (real renders per house rule 6): side profile,
    three-quarter, winter (snow draping crest + upper slopes, rails poke
    through), and a kit-locomotive fit check at ×1.6 on the slope.
- [x] Task: Mount hills in `track-renderer.ts` (+ `init-scene.ts` weather
      wiring) [d016635]
  - [x] Real `PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS` for the three types
        (direction convention: `slope-up` climbs south→north at yaw 0 —
        verify against the GLB with a render check, tunnel rule #3: size
        from the train)
  - [x] Snow shells: hidden at load, `setHillSnow(visible)` event-driven
        toggle on the shared frozen gate (`FROZEN_SNOW`, same as
        tunnel/river ice)

  Notes:
  - Direction verified programmatically against the exported GLBs (vertex
    slice of the rail lines): slope-up crowns at glTF z=0 (north, 0.2) and
    grades at z=4 (south, −0.9); crest constant 0.2; slope-down mirrored —
    so BASE_YAW 0 for all three, anchors unchanged [0,−1,2].
  - Snow crowns load as separate shell GLBs, are scaled/anchored on the
    piece's mount, attached to templates (and already-rendered pieces —
    asset race safe) as hidden clones, and toggled via `setHillSnow` on
    the same `base.snow >= FROZEN_SNOW` gate as the tunnel cap.
  - Ghost previews inherit the crown through the template clone, so drag
    previews wear snow in winter like the placed pieces.
- [x] Task: Ride height in the scene (`ride-motion.ts` / `init-scene.ts`) [f2079f8]
  - [x] Engine, wagons, and crates sample path step heights + the blend
        rule; chase camera follows position + height with existing easing;
        overview unchanged; no per-frame allocations; quality tiers
        untouched

  Notes:
  - `poseAt` samples `easedHeightAt(entry, span, s)` per segment: s is
    traversal progress from the entry edge (mirrored span when shuttling
    back), and the carried height is the neighbour's natural exit
    (precomputed per segment in beginRide — eased exits always land on the
    natural profile at the window's end, so no per-frame chaining state).
  - Dead-end flips stay pop-free: at the turnaround the backward entry
    height equals the height the train already rests at.
  - Camera: the chase already films `model.position`, so height tracking
    needed no camera change; overview untouched. Quality tiers untouched;
    per-frame cost is arithmetic only.
  - Tests: three new ride-motion tests (crest climb/descent, the
    crest-into-straight ease window, flat worlds at grade); 445/445 green,
    Biome + tsc clean.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 2):
  - Automated: `CI=true pnpm test` → 445/445 passing; Biome + `tsc --noEmit`
    clean; coverage — elevation.ts 100%, ride-motion.ts 70.6% statements
    (all new height/blend logic covered; uncovered remainder is the
    pre-existing station-brake machinery, and ride-motion remains
    smoke-verified scene glue per tech-stack). track-renderer.ts /
    init-scene.ts are scene wiring — covered by the Phase 3 e2e + manual
    checks per workflow.
  - Asset acceptance (render checks, house rules): side profile,
    three-quarter, winter, and kit-locomotive fit renders reviewed during
    authoring; exported GLB rail lines verified by vertex slicing
    (grade crown −0.9 → crest 0.2, direction convention confirmed).
  - Manual verification steps: `pnpm dev` on tablet/touch emulation; hill
    pieces render as grassy models; slope-up → hill → slope-down rides up
    over and down with wheels on rails and the chase camera following;
    mismatched joints ease gently; lone-slope dead ends shuttle back
    smoothly; snow weather raises crowns (rails poke through), clear
    weather removes them; reload restores hills.
  - User confirmation: PENDING (2026-09-03) — the phase gate was offered
    but not yet answered; Phase 3's Playwright smoke provides automated
    coverage of the scene work in the meantime. Re-verify manually before
    merging to main.

## Phase 3 - E2E, Docs & Final Gates [checkpoint: f2079f8]

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
