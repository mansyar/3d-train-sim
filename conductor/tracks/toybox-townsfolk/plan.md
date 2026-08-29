# Implementation Plan — Toybox Townsfolk

**Track ID:** `toybox-townsfolk`  
**Spec:** `conductor/tracks/toybox-townsfolk/spec.md`

## Phase 1 — Expanded Toy Catalog and World State (TDD) [checkpoint: d5eac90]

- [x] Task: TDD — Red: extend the scenery catalog tests for the new toy kinds
  - [x] Assert the catalog exposes station + 2 house variants (Town) and 2–3 critters (Critters) alongside tree/bush/rock
  - [x] Assert every kind has a local GLB URL, aria label, scale, and lift
  - [x] Assert new kinds obey one-toy-per-cell and the single global cap in the world store
  - [x] Assert critters expose a stable chirp id and a category (nature/town/critter) for drawer grouping
  - Notes: Rewrote `src/core/scenery.test.ts` around a nine-toy catalog (nature/town/critter) and added a `world store toy categories` suite to `src/state/world.test.ts`. Red run: 7 failures in `scenery.test.ts` (missing kinds, `SCENERY_CATEGORIES`, `sceneryCategory`, `sceneryVoice`), confirming the tests exercise new behavior.
- [x] Task: TDD — Red: extend world-store tests for category grouping
  - [x] Assert placed items retain their kind and category through placement/relocation/removal
  - [x] Assert existing placement rules (occupied, out-of-bounds, capacity) apply unchanged to new kinds
  - Notes: Red run confirmed the new world-store suite passes against the current generic placement rules (the store is kind-agnostic); the catalog becomes the single source of category truth.
- [x] Task: Implement the pure toy catalog extensions and category data
  - Notes: `src/core/scenery.ts` now holds a nine-toy catalog across three drawer groups (nature/town/critter) with per-kind URL, category, scale, lift, aria, and critter voice data. Commit `d5eac90`.
- [x] Task: Refactor catalog code for clarity without changing behavior
  - Notes: Dropped an unused `SCENERY_CATEGORIES` import from the test; catalog kept table-driven, matching the existing trains.ts pattern. Biome + `tsc --noEmit` clean.
- [x] Task: Verify >80% coverage for new logic-bearing catalog/state code
  - Notes: Coverage run: `scenery.ts` 100% lines/branches, `world.ts` 97% — full suite 159 tests green.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: Biome, `tsc --noEmit`, and the full Vitest suite (159 tests) pass; `scenery.ts` 100%, `world.ts` 97% coverage.
  - Manual verification: user confirmed 2026-08-29 — phase is catalog/state-only (new GLBs not yet vendored), app behavior unchanged.

## Phase 2 — Save/Load Compatibility (TDD) [checkpoint: a860120]

- [x] Task: TDD — Red: extend save tests for new scenery kinds
  - [x] Assert round trips preserve placed town/critter items
  - [x] Assert legacy snapshots without the new kinds load unchanged
  - [x] Assert unknown kind identifiers restore safely without losing other data
  - Notes: Extended `src/core/save.test.ts`: town/critter round trip, V1-kinds legacy load, and an unknown-kind tolerance test (Red: 1 failure — the old code discarded the whole world). Also refreshed the stale "unknown kinds" fixture that used `house` (now a real kind) to `dragon`.
- [x] Task: Implement version-compatible save/deserialize for the new kinds
  - Notes: `src/core/save.ts` already validated kinds against the widened catalog; the real change is tolerance — unknown scenery kinds now drop to the drawer while the rest of the world restores (pieces stay strict; duplicate-cell check runs on what remains). Commit `a860120`.
- [x] Task: Verify >80% coverage for changed save/persistence logic
  - Notes: Coverage: `save.ts` 88.9% stmts / 97.7% lines; full suite 162 tests green; Biome + `tsc --noEmit` clean.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: Biome, `tsc --noEmit`, and the full Vitest suite (162 tests) pass; `save.ts` 97.7% lines.
  - Manual verification: user confirmed 2026-08-29 — save format is backward compatible; no user-visible change this phase.
  - [checkpoint: a860120]

## Phase 3 — Assets: Blender Prep and Vendoring

- [x] Task: Download Kenney Fantasy Town Kit and Kenney Animal Pack (CC0) and record provenance/licenses
  - Notes: **Deviation (documented in spec.md Decisions):** the Kenney "Animal Pack" is 2D icons only (PNG/SVG, no 3D) — grounded replacement: **Quaternius Farm Animal Pack** (CC0, 7 animated animals; picking Sheep, Pig, Pug), fetched via Google Drive with its License.txt. Fantasy Town Kit 2.0 downloaded from kenney.nl (CC0, License.txt vendored). Kits: `public/assets/quaternius-farm/`, `public/assets/fantasy-town-kit/`.
- [x] Task: Prep each new GLB in Blender: scale to meadow cell size, origin at base, orientation verified via viewport screenshots
  - Notes: All six GLBs verified via headless Blender renders + vision analysis:
    1–3 unit scale (1 unit ≈ 1 meadow cell), origin at base, front faces
    toward +X (station/house/cottage) or left-facing (critters), no floating
    parts or distortion. **Bug found & fixed:** the critter GLBs' materials
    had `alphaMode: MASK` with `baseColorFactor` alpha = 0 — invisible under
    three.js GLTFLoader's alphaTest. Restored alpha = 1 / OPAQUE via a JSON
    chunk patch (BIN geometry untouched); re-rendered and re-verified.
    Files: `public/assets/quaternius-farm/{pig,sheep,pug}.glb` (prep + alpha
    fix), `public/assets/fantasy-town-kit/{station,house,cottage}.glb`
    (prep verified). Commit `d01ea0b`.
- [x] Task: Vendor the prepped GLBs under `public/assets/` and wire the catalog URLs
  - Notes: Done in commit `f59784c` (kits vendored with License.txt files,
    catalog URLs wired in `src/core/scenery.ts`, catalog/save tests updated)
    and cleaned up in `05e1f45` (removed stray duplicate GLBs from the
    assets root). Nine-toy catalog: nature (tree/bush/rock), town
    (house/cottage/station), critters (sheep/pig/pug).
  - In-flight refinement (`4e11fe3`): the scenery drawer HTML hardcoded only
    tree/bush/rock, so the new toys were invisible in the toybox. The drawer
    now builds one slot per catalog kind (emoji stand-ins until Phase 5's
    tabbed drawer with GLB thumbnails).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Scene: Placement, Critter Life, Station Stop

- [ ] Task: Extend scenery rendering to load and dispose the new models safely
- [ ] Task: Implement procedural critter animation
  - [ ] Subtle idle breathe/bob (~1–2% scale sway) using the shared tick pattern
  - [ ] Hop with squash-and-stretch when the train passes within ~1–2 cells
  - [ ] No per-frame allocations; cheap for N critters; dispose cleanly
- [ ] Task: Implement per-critter chirp audio via the existing Howler voice system (mute-respecting, volume-capped)
- [ ] Task: Implement the station stop in ride motion
  - [ ] Gentle deceleration, ~2s pause with happy ding-ding, smooth re-acceleration
  - [ ] Works on loops and shuttles; multiple stations each stop once; no retrigger mid-stop
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Tabbed Drawer UI and End-to-End Coverage

- [ ] Task: Implement tabbed toybox drawer (Rails / Nature / Town / Critters)
  - [ ] Icon-only tabs, ≥64px targets, obvious active state, tap (or swipe) switching
  - [ ] Preserve one-drawer-open-at-a-time and existing rails behavior exactly
- [ ] Task: Extend e2e and unit coverage
  - [ ] Unit: drawer model/grouping logic
  - [ ] Playwright: tabbed drawer walkthrough, place a critter + station, start ride, assert no console errors
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Definition of Done

- [ ] All implementation to specification; no fail states
- [ ] Unit tests written and passing (logic-bearing code)
- [ ] Coverage meets requirements for logic-bearing modules
- [ ] Documentation complete
- [ ] Biome and typecheck gates clean
- [ ] Works beautifully on tablets
- [ ] Implementation notes added to `plan.md`
- [ ] Changes committed with proper message
