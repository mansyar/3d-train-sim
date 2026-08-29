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

## Phase 3 — Assets: Blender Prep and Vendoring [checkpoint: 4e11fe3]

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
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 3 (assets)

- Automated: Biome clean, `tsc --noEmit` clean, Vitest 162/162 pass,
  Playwright e2e 9/9 pass (tablet viewport, incl. scenery drag-place and
  reload-autosave). All six new GLBs additionally verified via headless
  Blender renders + vision analysis (scale ≈ 1 unit/cell, origin at base,
  orientation, no defects).
- Manual verification: dev server on tablet — all 9 toys visible in the
  scenery drawer after the drawer fix (`4e11fe3`); houses/cottage/station
  place chunky and flat on the meadow; critters sit low beside the rails;
  world autosaves and reloads with the new toys intact.
- User confirmed 2026-08-29 ("all working").
- [checkpoint: 4e11fe3]

## Phase 4 — Scene: Placement, Critter Life, Station Stop

- [x] Task: Extend scenery rendering to load and dispose the new models safely
  - Notes: No code change needed — `track-renderer.ts` is already generic
    over `SCENERY_KINDS` (template load → clone → place, plus pop-out
    removal). Verified:
    - Loading: all 9 templates load on boot (e2e "drag-placing scenery
      decorates the meadow" + manual placement of every new kind, user
      confirmed 2026-08-29); a failed/unavailable GLB is a silent no-op and
      the world keeps working.
    - Disposal: late arrivals after teardown hit the `disposed` guard and
      deep-dispose immediately; `dispose()` deep-disposes every template
      (placed clones share template geometry/materials, so template dispose
      covers them).
- [x] Task: Implement procedural critter animation
  - Notes: New `src/scene/critter-life.ts` holds per-critter state (resting
    transform, random breathe phase, hop timer, cooldown) and writes motion
    straight onto each model's transform — zero allocations per frame.
  - [x] Subtle idle breathe/bob (~1–2% scale sway) using the shared tick pattern
    - Wired through the spin-loop's `onFrame` (which reduced-motion users
      never enter — they keep a single static frame, per product guidelines).
  - [x] Hop with squash-and-stretch when the train passes within ~1–2 cells
    - Trigger radius 1.5 cells (squared-distance check), fires only while the
      ride is active (a parked train reports null — hops read as passing, not
      presence), 2.5 s cooldown per critter prevents retrigger buzz. Hop:
      20% anticipation squash → sine bounce with stretch up / squash wide.
  - [x] No per-frame allocations; cheap for N critters; dispose cleanly
    - Scalar math only; roster synced in reconcile (event-driven, not per
      frame); `dispose()` clears the roster; renderer dispose covers models.
    - Files: `src/scene/critter-life.ts` (new), `track-renderer.ts`
      (roster sync + `updateCritters` API), `init-scene.ts` (feeds the
      riding locomotive's position). Commit `b782609`.
- [x] Task: Implement per-critter chirp audio via the existing Howler voice system (mute-respecting, volume-capped)
  - Notes: `audio-controller.chirp(voice)` plays a one-shot, silent while
    muted; `howler-voice` registers the three catalog voices
    (`oink-pig`/`baa-sheep`/`woof-pug`) at 0.5 volume so a hop chorus never
    clips over the chug; `critter-life` fires the critter's voice exactly
    when a hop starts (cooldown-gated, like the hop itself); renderer +
    init-scene thread the controller in. **Assets:** three short CC0/CC-BY
    clips vendored as ogg+mp3 (sheep baa from Wikimedia Commons CC0, dog
    bark from Freesound CC0, pig oink from Freesound CC-BY 4.0 — attributed
    in `public/audio/CREDITS.md`). Tests: +4 (chirp plays, mute silences,
    unmute speaks, volume-capped registration). Files: `audio-controller.ts`,
    `howler-voice.ts`, `critter-life.ts`, `track-renderer.ts`, `init-scene.ts`,
    `public/audio/{baa-sheep,oink-pig,woof-pug}.{ogg,mp3}`, `CREDITS.md`.
    Commit `8b39df6`.
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
