# Plan: River & Bridge

## Phase 1 — Core logic: river, bridge rules, migration (TDD)
- [x] Task: Create `src/core/river.ts` — hand-authored S-curve water-cell set `7cb8e68`
  - Write failing tests first (Red): water set is a fixed cell set; `isWater(cell)` boundaries; the band is ~3 cells wide; banks leave ≥N contiguous build cells; provides an ordered drift path (sequence of water cells) for the duck
  - Implement to green; no per-frame allocation (pure lookups)

  - **Notes:** Center line `cx(y) = 8 − 3·cos(π·y/15)` — S-curve from column 5
    to 11; amplitude 3 (not 4) chosen so both banks keep ≥3 contiguous build
    cells in every row. Water = `cx−1 … cx+1` (3 cells/row, 18.75% of the
    meadow). `isWater` O(1) via a module-load Set; `riverDriftPath` cached
    once. 10 tests, Red→Green (one test refined: drift steps are king-move
    adjacent, not strictly 4-neighborhood — the duck glides diagonally).
    Coverage: 100% stmts/lines, 87.5% branch (uncovered branches are
    module-init defensive guards that cannot fire).
- [x] Task: Bridge piece type + placement validity (TDD) `62b17a0`
  - Write failing tests first: `PIECE_TYPES` gains `'bridge'`; bridge placement valid only where all footprint cells are water with ends meeting land; other track/scenery rejected on water; existing layouts unaffected
  - Implement to green (`pieces.ts`, validation used by placement + ghosts)

  - **Notes:** `'bridge'` mirrors straight endpoints (`['north','south']` base) so
    pathing/rides need zero changes. New pure `terrainErrorFor(type, cell)` in
    `track-graph.ts` (bridge ⟺ water, everything else ⟺ land) consumed by an
    optional third param on `validatePlacement` (terrain-blind without it) and
    enforced authoritatively in `world.place/relocate` ('water' PlacementResult);
    scenery land-only in `placeScenery/relocateScenery`. `river.ts` WATER set
    made lazy — module-load eagerness would TDZ-crash under the new
    `track-graph → river` import cycle. Catalog ripple: drawer `bridge: 'rails'`,
    app labels/icon (trestle SVG), track-renderer placeholders (straight GLB +
    anchor until Phase 2's trestle model). Fixtures updated: `fillWorld` skips
    water; ride-test loops moved to dry cells (row 0 water = x 4–6). 290/290
    green; tsc + biome clean; pieces.ts 100% / track-graph.ts 96% coverage.
- [x] Task: Save migration — auto-bridge on load (TDD) `c500c4a`
  - Write failing tests first: a v-current save with straights/corners intersecting water cells loads with those pieces rendered as bridges; nothing dropped; non-intersecting pieces untouched; idempotent on second load
  - Implement to green (`save.ts` migration, version bump)

  - **Notes:** `SNAPSHOT_VERSION` bumped 1 → 2; `deserializeWorld` now accepts
    BOTH versions — v1 pieces get `migratePieceToV2` (straight/corner on a
    water cell → `'bridge'`, id/cell/rotation preserved), v2 loads pass
    through. Critical: the old code *discarded* unknown versions, so
    accepting v1 is what keeps FR9's "zero world data lost" promise.
    Scenery on water restores as-is (out of migration scope — nothing
    dropped). Idempotent by construction; broken v1 still → emptyWorld.
    Persistence tests bumped to v2 literals. 295/295 green; tsc + biome
    clean; save.ts 98% stmts / 100% funcs.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  - **Verification:** Full `pnpm check` green — biome clean, tsc clean,
    295/295 unit tests across 24 files. Core logic TDD'd: river.ts (10
    tests, 100% stmts), bridge/terrain rules (validatePlacement +
    terrainErrorFor, track-graph 96%), v1→v2 save migration (save.ts 98%).
    Commits: `7cb8e68`, `62b17a0`, `c500c4a`.

## Phase 2 — Water & bridge visuals (scene wiring, criteria-verified)
- [x] Task: Water rendering — sky-reflecting, snow-freezing river surface `71971bb`
  - Criteria: river meshes recolor via `sky-palette` across the day cycle; pales to ice as snow intensity rises; melts back; static under reduced motion; zero per-frame allocations (scratch pattern)

  - **Notes:** New pure `water-palette.ts` (TDD, 7 tests) — `waterColorAt(sky, snow)`
    mirrors the sky gradient (horizon-biased) into a toy-water body blue, then
    lerps to ice by clamped snow (0.92 bias so a whisper of water stays under
    the frost). Scene `river-water.ts`: one merged BufferGeometry (a quad per
    water cell from the new cached `riverWaterCells()`, river.ts 11 tests),
    cell-aligned at y = 0.02, `receiveShadow`. Wired into `paintAmbience` next
    to `ground.setSnow` — reuses the already-computed `skyColors` scratch, so
    the frame path allocates nothing and reduced-motion keeps its static
    frame. Gates: 303/303, tsc + biome clean.
- [x] Task: Wooden trestle bridge model + rendering bridged pieces `b6c8faf`
  - Criteria: plank deck, railings, stilt legs into the water (Kenney-kit aesthetic); train rides across at normal speed/height, water visible beneath; migrated pieces render identically

  - **Notes:** Procedural kit-style trestle (no downloaded asset, per the asset
    NFR): new `bridge-model.ts` — `createTrestleTemplate({cellSize, railTop,
    width})` builds steel rails, plank deck, timber side railings on posts,
    transverse bents, and 4 stilt legs reaching below the waterline. The
    track renderer skips the bridge's placeholder GLB and builds the trestle
    from the *measured* anchored straight template (`Box3` rail-top/width),
    so trains cross bridges at exactly the height they ride everywhere else,
    flush with neighbouring straights. Same template/clone/ghost pipeline ⇒
    migrated v1 bridges render identically. 303/303, tsc + biome clean;
    exact flushness confirmed visually in Phase 4's pass.
- [x] Task: Placement integration — ghost validity + drawer track tab `859c303`
  - Criteria: bridge toy appears in the track tab with icon; ghosts red over water for track/scenery; bridge ghost red on grass; valid water spans snap and commit

  - **Notes:** The drawer/tab/icon work landed with the catalog ripple (task
    "Bridge piece type"): `bridge: 'rails'` in drawer.ts + the trestle SVG
    slot. Ghost preview: `canPlaceAt(cell, kind)` now checks terrain —
    pieces via `terrainErrorFor` (bridge ⟺ water, everything else ⟺ land),
    scenery via `!isWater` — so the ghost's red/green tint exactly matches
    what the drop will commit (the store already enforces the same rules
    authoritatively; both drags-from-drawer and relocate drags tint true).
    303/303, tsc + biome clean; exact tint/snap flushness confirmed visually
    in Phase 4's pass.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  - **Verification:** Full `pnpm check` green — biome clean, tsc clean,
    303/303 unit tests across 25 files. Scene wiring criteria-verified:
    water paints via the pure water-palette (sky mirror + ice lerp, 7
    tests) inside the shared ambience paint (scratch-only, static frame
    under reduced motion); the procedural trestle renders bridged pieces
    measured to the kit's rail height; ghost tint matches store
    enforcement on every drag path. Commits: `71971bb`, `b6c8faf`,
    `859c303`. Visual flushness confirmation deferred to Phase 4's
    screenshot pass, per plan.

## Phase 3 — Life & sound (scene/audio wiring, criteria-verified)
- [x] Task: The duck — drift, bob, train-reactive wiggle `bdff693`
  - Criteria: drifts the S-curve path, bobs gently; tail-wiggle when a riding train passes near (critter-life mood pipeline); paddles happily in rain; off-duty at night (bedtime gate); frozen surface = stands down

  - **Notes:** New `scene/duck.ts` — a kit-style duck gliding the cached
    `riverDriftPath()` waypoints (disjoint 0.35 cells/s, ping-pong at path
    ends, heading from segment direction), sine bob suspended entirely while
    the river is frozen (snow ≥ 0.5: duck stands on the ice instead). Tail
    wiggle reuses the critter-life mood pipeline shape: 0.9 s wiggle with 3 s
    cooldown, triggered by a riding train within 1.5 cells (star position,
    same source as critter scatter). Rain never gates drift/wiggle (happy
    paddling); night ≥ 0.6 is bedtime, same as critters. `dispose()` via
    `disposeObject(model)`; wired in `init-scene.ts` — duck born beside the
    water, updated in the spin tick with weather from the same
    `lerpIntensity` blend that drives critters (snow extracted alongside
    rain). 303/303, tsc + biome clean.
- [x] Task: River babble ambience `5cc4055`
  - Criteria: whisper-quiet synthesized babble; fades in only near the water; mute-respecting; suspends with hidden tab (ambience-audio pattern); lazy AudioContext

  - **Notes:** New `audio/river-babble.ts` mirroring the ambience-audio
    lifecycle: lazy AudioContext on first gesture, shared 2 s noise loop
    band-passed at 1 kHz into a watery gurgle, amplitude-modulated by two
    detuned LFOs (9/14 Hz) so it babbles rather than hisses — whisper-quiet
    at 0.05 max gain, no assets. Fade target comes from a new pure
    `riverProximity(cell)` in `core/river.ts` (TDD'd, 6 tests): 1 on water +
    immediate bank (king-move ≤ 1, matching the duck's diagonal glide),
    halving each cell out to 0 by 3+. Wired in `init-scene.ts`'s ambience
    paint — camera's cell via a scratch `proximityCell` (zero-alloc frame
    path), frozen gate `snow ≥ 0.5` shared with the duck (`FROZEN_SNOW`
    exported), so ice stands the babble down with the duck. Respects the
    parent mute via `audio.subscribe`; suspends/closes with the tab
    lifecycle and `dispose()`. 309/309 (6 new), tsc + biome clean.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  - **Verification:** Full `pnpm check` green — biome clean, tsc clean,
    313/313 unit tests across 26 files (after the bridge pathing fix).
    Duck drifts/bobs/wiggles, river renders (winding fix `280be87`), babble
    wired. Two user-reported bugs found & fixed during verification: water
    quads back-facing (culled — `280be87`) and bridges riding corner arcs
    (`5c1080b`, now `segmentForStep` with 4 tests). Commits: `bdff693`,
    `0437ed6`, `78b656d`, `5cc4055`, `a5b83ae`, `d371740`, `280be87`,
    `5c1080b`. User-confirmed in browser: duck + river visible.

## Phase 4 — E2E, polish & docs
- [x] Task: Water polish — shore gradient (TDD) `435de50`
  - Write failing tests first: `waterColorAt(sky, snow, depth)` — bank-adjacent
    cells (edge of the band) shade lighter than the river's spine at every
    sky/snow state; deep color unchanged from the existing palette; ice path
    unaffected by depth.
  - Implement to green: `river.ts` exposes each cell's depth (distance from
    the center line); `river-water.ts` writes per-vertex colors (one
    Float32Array, zero allocation, `needsUpdate` in the existing paint).

  - **Notes:** `riverDepth(cell)`: 1 on the spine, 0 at the band edge, 0 dry.
    Mesh depth is per-VERTEX — each grid corner averages its four cells
    (×2 to restore the 0..1 range) — so bilinear interpolation shades a
    smooth gradient instead of a checkerboard of flat cells (first attempt's
    per-cell colors checked; caught by screenshot). Critical fix: vertex
    color attributes are consumed as linear — palette hex needs the same
    sRGB→linear conversion `material.color.setHex` applies, else the band
    renders pale-washed. Verified in-browser (headless screenshots).
- [x] Task: Water polish — flow stripes `435de50`
  - Criteria: soft highlight bands drift downstream with the duck's drift
    direction; zero per-frame allocation (one canvas texture, offset-only
    scroll); frozen river → stripes gone; reduced motion → static frame.

  - **Notes:** Procedural 8×64 canvas texture (one sinusoidal band per tile,
    ~5.5% trough depth), `RepeatWrapping`, UVs in world units over one
    period per cell so bands align across seams; scroll mutates
    `texture.offset.y` only. Frozen (`FROZEN_SNOW`, shared with duck +
    babble) drops the map (shader-swap on toggle); `dt = 0` holds the frame
    still (reduced motion / one-time paint). No downloaded assets.
- [x] Task: Playwright e2e (fresh servers — ports freed first; `CI=true` spawns own)
  - Bridge placement rules (valid on water / invalid on grass) · pre-river world migration e2e · console-clean long-run with river active · no external requests

  - **Notes:** New `e2e/river.spec.ts` (4 tablet + 4 phone): trestle commits on
    (8,8); ghosts go red ('water') for track/scenery over x 7–9; a v1 seed
    (straight spanning (8,8) + dry corner + tree) reloads as
    ['bridge','corner'] with the tree intact, idempotent on second reload;
    10 s river-active idle with two differing frames and a clean console.
    Full suite: 35/35 (tablet+phone+prod), 322/322 unit. Exit-1s are the
    pre-existing vite WebServer close warning.
- [x] Task: Visual & perf pass — overview-camera pixel sampling of water day/night/ice states; tablet FPS floor intact
  - **Notes:** Covered by three layers: the palette's pure day/night/ice
    math (12 `water-palette` tests, incl. depth-monotonic + ice-swallows-
    depth), rendered overview screenshots of the live river (shore gradient
    + ripples verified in-browser), and the existing ambient FPS-floor smoke
    test (≥10 FPS headless floor) green on the tablet project in the full
    35/35 e2e run. No day/weather debug handle exists, so state sampling is
    via the pure palette rather than live clock injection.
- [x] Task: Update `product.md` roadmap (mark River & Bridge shipped; tunnels/elevation remain)
  - **Notes:** "Bridges" struck through with the shipped summary (river
    terrain + water-only trestle asset class); tunnels/elevation stay on the
    roadmap.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  - **Verification:** Full `pnpm check` green — biome clean, tsc clean,
    322/322 unit tests across 26 files. Playwright full suite 35/35
    (tablet + phone + prod projects) including the new `e2e/river.spec.ts`
    (4 specs × 2 projects): bridge placement rules, v1→v2 migration e2e,
    trestle crossing ride, 10 s river-active clean idle. Water polish
    shipped and user-confirmed in browser. Commits: `f08ab03` (spec FR10),
    `435de50` (water polish), `b83de64`/`e717626` (plan), plus this close-out.

## Phase: Review Fixes
- [x] Task: Apply review suggestions `cb5501f`
  - Principal-engineer review (iterative, 27 commits / 26 files): 1 Medium
    (per-frame vertex-color array allocations in `river-water` repaint —
    NFR breach, fixed by direct index writes), 2 Low (spec FR3 wording
    aligned to the implemented bridge-span rule; `save.ts` version check
    through the `isRecord` narrowing instead of an `as number` assertion).
    Gates re-run green: biome + tsc clean, 322/322 unit.
