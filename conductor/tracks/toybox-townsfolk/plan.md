# Implementation Plan — Toybox Townsfolk

**Track ID:** `toybox-townsfolk`  
**Spec:** `conductor/tracks/toybox-townsfolk/spec.md`

## Phase 1 — Expanded Toy Catalog and World State (TDD)

- [ ] Task: TDD — Red: extend the scenery catalog tests for the new toy kinds
  - [ ] Assert the catalog exposes station + 2 house variants (Town) and 2–3 critters (Critters) alongside tree/bush/rock
  - [ ] Assert every kind has a local GLB URL, aria label, scale, and lift
  - [ ] Assert new kinds obey one-toy-per-cell and the single global cap in the world store
  - [ ] Assert critters expose a stable chirp id and a category (nature/town/critter) for drawer grouping
- [ ] Task: TDD — Red: extend world-store tests for category grouping
  - [ ] Assert placed items retain their kind and category through placement/relocation/removal
  - [ ] Assert existing placement rules (occupied, out-of-bounds, capacity) apply unchanged to new kinds
- [ ] Task: Implement the pure toy catalog extensions and category data
- [ ] Task: Refactor catalog code for clarity without changing behavior
- [ ] Task: Verify >80% coverage for new logic-bearing catalog/state code
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Save/Load Compatibility (TDD)

- [ ] Task: TDD — Red: extend save tests for new scenery kinds
  - [ ] Assert round trips preserve placed town/critter items
  - [ ] Assert legacy snapshots without the new kinds load unchanged
  - [ ] Assert unknown kind identifiers restore safely without losing other data
- [ ] Task: Implement version-compatible save/deserialize for the new kinds
- [ ] Task: Verify >80% coverage for changed save/persistence logic
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Assets: Blender Prep and Vendoring

- [ ] Task: Download Kenney Fantasy Town Kit and Kenney Animal Pack (CC0) and record provenance/licenses
- [ ] Task: Prep each new GLB in Blender: scale to meadow cell size, origin at base, orientation verified via viewport screenshots
- [ ] Task: Vendor the prepped GLBs under `public/assets/` and wire the catalog URLs
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
