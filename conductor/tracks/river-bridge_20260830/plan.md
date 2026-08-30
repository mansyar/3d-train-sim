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
- [ ] Task: The duck — drift, bob, train-reactive wiggle
  - Criteria: drifts the S-curve path, bobs gently; tail-wiggle when a riding train passes near (critter-life mood pipeline); paddles happily in rain; off-duty at night (bedtime gate); frozen surface = stands down
- [ ] Task: River babble ambience
  - Criteria: whisper-quiet synthesized babble; fades in only near the water; mute-respecting; suspends with hidden tab (ambience-audio pattern); lazy AudioContext
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E, polish & docs
- [ ] Task: Playwright e2e (fresh servers — verify ports 5199/5198 free first)
  - Bridge placement rules (valid on water / invalid on grass) · pre-river world migration e2e · console-clean long-run with river active · no external requests
- [ ] Task: Visual & perf pass — overview-camera pixel sampling of water day/night/ice states; tablet FPS floor intact
- [ ] Task: Update `product.md` roadmap (mark River & Bridge shipped; tunnels/elevation remain)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
