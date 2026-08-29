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
- [x] Task: Implement the station stop in ride motion
  - [x] Gentle deceleration, ~2s pause with happy ding-ding, smooth re-acceleration
  - [x] Works on loops and shuttles; multiple stations each stop once; no retrigger mid-stop
  - Notes: Pure stop planner `src/core/station-stops.ts` maps each station to
    the first path step it touches (8-neighbourhood; a station on the path's
    own cell wins over diagonal touches) — TDD, 9 tests, 100% coverage.
    `ride-motion.ts` consumes it: crossing a stop point snaps the train to
    the cell midpoint, eases it down (shared STOP_EASE), rests 2 s with the
    chug softened via the existing pause channel, then eases back up. Stops
    are owed once per pass — loop wraps and shuttle end-flips re-arm them;
    two stations sharing one cell are served in a single stop. `init-scene`
    rings the ding-ding (two dings, 350 ms apart; late blips skip after
    teardown). E2E: loop + station ride stays riding past the stop with a
    clean console (10/10 pass). Files: `src/core/station-stops.ts` (+test),
    `src/scene/ride-motion.ts`, `src/scene/init-scene.ts`, `e2e/smoke.spec.ts`.
    Commit `a3fca82`.
  - In-flight refinement (`51c98a4`): the first cut froze the train at the
    stop point — spec FR4 wants a gentle deceleration. Braking now begins
    `BRAKE_DISTANCE` (≈0.66 units, the distance the shared ease covers)
    before the station cell, whichever way the train travels; the train
    coasts in under the existing ease, rests 2 s, and rolls out on the same
    ease. Brake points clamp to the path ends so stations beside the first
    or last cell still stop the train; a ride stopped mid-brake cancels
    cleanly (no orphan ding or stuck pause), and `beginRide` always starts
    at full voice. Re-verified: Biome + tsc clean, 175/175 unit tests,
    station-stops 100% coverage, Playwright 10/10.
  - In-flight refinement (`7ab71dc`): the stop point now sits at the point
    on the rails closest to the station centre (new pure
    `closestPointFraction` for lines and arcs; `stationStopSteps` returns
    the station cell and prefers the edge-touching step over a diagonal
    one), so the train rests AT the station rather than at the entry to
    its cell. Re-verified: Biome + tsc clean, 180/180 unit tests,
    station-stops 100% coverage, Playwright 10/10.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 4 (scene: placement, critter life, station stop)

- Automated: Biome clean, `tsc --noEmit` clean, Vitest 180/180 pass;
  coverage: `station-stops.ts` 100% stmts/branches/lines, `critter-life.ts`
  covered via unit tests, `save.ts` 97.7% lines. Playwright e2e 10/10
  (tablet viewport, incl. "riding a loop with a station stops at it and
  rolls on cleanly").
- Manual verification: dev server on tablet — train decelerates gently and
  stops beside the station at the closest rails point (not the cell entry),
  double ding-ding, ~2 s rest, smooth re-acceleration; works on loops and
  shuttles; two stations each stop once; stopping mid-brake cancels cleanly
  (no orphan ding, no stuck pause). User confirmed 2026-08-29.
- [checkpoint: 9968455]

## Phase 5 — Tabbed Drawer UI and End-to-End Coverage

- [x] Task: Implement tabbed toybox drawer (Rails / Nature / Town / Critters)
  - Acceptance criteria (non-logic): drawer closed at boot; 🛤️/🌳 slots open
    the toybox on the Rails/Nature tab; tabs are icon-only, ≥64px, obvious
    active state, tap switching; one drawer open at a time; rails tab
    behavior identical to the old track drawer.
  - [x] Icon-only tabs, ≥64px targets, obvious active state, tap (or swipe) switching
  - [x] Preserve one-drawer-open-at-a-time and existing rails behavior exactly

  - **In-flight refinement (`07abde1`, user feedback during phase
    verification):** the 🛤️ and 🌳 rail toggles were redundant — both opened
    the same tabbed drawer. Joined into a single 🧸 **Toybox** toggle that
    opens the drawer on the last-visited tab (Rails first) and closes it on
    a second tap; tabs inside the drawer do the switching. The toybox rail
    is now: 🧸 toys · 🚂 trains · 🎺 · ▶ · 🔊 · 🗑️. E2E updated (2 toy
    slots; walkthrough opens on Rails, then walks Nature/Town/Critters).

  Notes:
  - Pure model committed earlier (`557fc71`): `src/core/drawer.ts` derives the
    four tabs from the piece + scenery catalogs; 7 unit tests.
  - UI wiring (`61d7671`): `.toy-drawer` replaces the separate track/scenery
    drawers — one `role="tablist"` strip (🛤️ 🌳 🏠 🐾) + one panel per tab,
    chunky `.drawer-tab` buttons (64px+ icons, `.is-active` pop), drag-to-place
    slots unchanged per kind. Interaction (user-confirmed): 🛤️/🌳 rail slots
    open the toybox on their tab, switch tabs while open, close on a second
    tap of the active tab's slot; tapping the active tab inside the drawer
    closes the whole drawer (no empty tab-strip state); drawer starts closed.
  - **Bug fixed during verification:** the in-flight wiring crashed at module
    init (`Cannot access 'PIECE_ICONS' before initialization`) — `tabPanels`
    rendered before the icon tables were declared. Moved `PIECE_ICONS` above
    `toySlot`; boot restored (all 10 e2e were failing, now 10/10 pass).
- [x] Task: Extend e2e and unit coverage
  - [x] Unit: drawer model/grouping logic
  - [x] Playwright: tabbed drawer walkthrough, place a critter + station, start ride, assert no console errors

  Notes:
  - Unit coverage for the pure drawer model shipped with the model itself
    (`557fc71`, 7 tests in `src/core/drawer.test.ts`).
  - New e2e `tabbed toybox walkthrough` (`0605725`): boots with the drawer
    closed, opens via 🌳 on Nature, walks Town and Critters tabs asserting
    `aria-pressed`/panel visibility and slot counts, drag-places a sheep
    (Critters tab) and a station (Town tab), verifies both in the world
    store, builds a collision-free 2×2 corner loop through the dev handle,
    starts a ride, asserts it keeps rolling, zero console errors and zero
    external requests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 5 (tabbed drawer UI + e2e coverage)

- Automated: Biome clean, `tsc --noEmit` clean, Vitest 187/187 pass,
  Playwright e2e 11/11 pass (tablet viewport) including the new
  "tabbed toybox walkthrough: place a critter and a station, then ride"
  (drawer closed at boot, tab walk with aria-pressed assertions, drag-place
  sheep + station, collision-free loop, ride keeps rolling, zero console
  errors, zero external requests).
- Manual verification (tablet / touch emulation): drawer starts closed; 🧸
  opens on the last-visited tab (Rails first); tabs switch panels; active
  tab tap closes the drawer; second 🧸 tap closes; drag-place works from
  every tab; rails dragging unchanged. User confirmed 2026-08-29 ("yes"),
  including the joined-toggle refinement (`07abde1`).
- [checkpoint: 07abde1]

## Definition of Done

- [x] All implementation to specification; no fail states
- [x] Unit tests written and passing (logic-bearing code) — 187/187
- [x] Coverage meets requirements for logic-bearing modules — scenery 100% lines/branches, world 97%, save 97.7% lines, drawer unit-tested
- [x] Documentation complete — implementation notes, save-compat notes, kit sourcing + Blender prep notes in `plan.md`
- [x] Biome and typecheck gates clean
- [x] Works beautifully on tablets — manual touch verification confirmed 2026-08-29
- [x] Implementation notes added to `plan.md`
- [x] Changes committed with proper message
