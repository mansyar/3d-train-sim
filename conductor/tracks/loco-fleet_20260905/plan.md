# Plan: Locomotive Fleet Expansion

Confirmed `spec.md`: 3 new engines (`express` / `freight` / `bullet` from
already-vendored GLBs), scrollable 6-engine picker, new pace personalities
reusing existing whistles, additive save.

Methodology per `workflow.md`: TDD (Red → Green → Refactor → Coverage) for all
logic-bearing code (`src/core/`, `src/state/`); observable acceptance criteria +
Playwright smoke for scene/UI.

## Phase 1 - Core: Fleet Catalog & Persistence (TDD) [checkpoint: 760694b]

**Verification Report (Phase 1)**
- Changed files since prev checkpoint (`aec47d1`): plan.md, core/{trains,pace,wagons,whistle-profiles}.ts + tests, core/save.test.ts, state/world.ts — every logic-bearing file has tests.
- `pnpm exec biome check src` clean; `tsc --noEmit` clean; `CI=true pnpm test --coverage` → 664/664 passing.
- Coverage on new/changed logic: trains.ts 100%, pace.ts 92.3%, save.ts 91.6%, wagons.ts 100% (>80% gate met).
- Manual verification confirmed by user (2026-09-05): 6 engines ride with family whistles, personalities visible on hills, choice persists across reload, old worlds load, console clean.

- [x] Task: Extend `TRAIN_KINDS` + definitions (logic)
  - [x] Write failing tests: `express`/`freight`/`bullet` in `TRAIN_KINDS`; `modelUrl`/`aria`/`whistle` per kind; icon SVG present; whistle reuses existing profiles
  - [x] Implement in `src/core/trains.ts` to green (inline SVGs matching toy-palette style)
  - [x] Refactor for clarity; rerun tests
  - [x] Verify coverage >80% for new core code
- [x] Task: Pace personalities (logic)
  - [x] Write failing tests: `personalityPace` for 3 new kinds (express brisk, freight steady, bullet quickest); exhaustive `Record` compiles
  - [x] Implement in `src/core/pace.ts` to green
  - [x] Refactor; rerun; coverage >80%

  Notes: Red confirmed first (3 catalog failures, 2 pace failures). New kinds:
  `express` (train-locomotive-b.glb, orange boiler + green cab icon), `freight`
  (train-diesel-box-a.glb, brown hood + orange nose icon), `bullet`
  (train-electric-bullet-a.glb, cream bullet + orange stripe icon). Whistles
  reused: express→whistle-steam, freight→whistle-diesel, bullet→whistle-tram.
  Personalities: freight 0.85 < steam 0.9 < tram 1.0 < express 1.05 < diesel
  1.2 < bullet 1.3. The exhaustive `FALLBACK_OFFSETS` map in
  `scene/steam-puff-emitter.ts` had to gain the 3 entries for `tsc` to pass —
  mechanical compile fix staged for the Phase 2 scene commit; visual puff
  verification stays in Phase 2. Commits: `625f3d2` (catalog),
  `f3fb901` (pace). Coverage: trains.ts 100%, pace.ts 92.3%.
- [x] Task: Save round-trip with new kinds (logic) `efe8f54`
  - [x] Write failing tests: snapshot with `train: 'bullet'` round-trips; pre-fleet saves (v1/v2/v3) still load → steam default; invalid kind forgives to steam
  - [x] Implement `src/core/save.ts` additive widening (no version bump) to green
  - [x] Refactor; rerun; coverage >80%

  Notes: The full-suite gate exposed the whole widening cascade in one red
  run: `wagons.ts` defaultConsist, `whistle-profiles.ts` rates (new engines
  inherit family rates), and `state/world.ts` readConsist all compile-enforced
  — widened in commit `efe8f54`. Root cause of the ~26 test failures:
  `isClassicConsist` iterates all 6 TRAIN_KINDS while defaultConsist still had
  3, so all-classic snapshots wrongly emitted a consist. `save.ts` itself
  needed zero changes (fully TRAIN_KINDS-generic); the new fleet tests (bullet
  + coal-consist round-trip, express on all-classic, pre-fleet snapshot →
  steam) passed immediately after the map widening, validating the additive
  design. No save version bump. Coverage: save.ts 91.6%, wagons.ts 100%.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Scene: New Engines Ride Everything (non-logic) [checkpoint: cadff4b]

**Verification Report (Phase 2)**
- Changed files since prev checkpoint (`86b086c`): scene/steam-puff-emitter.ts (+3 offset entries), e2e/smoke.spec.ts (fleet count 3→6), plan.md. No logic-bearing changes.
- Playwright smoke spec: 40/40 passing after the boot-count fix (2 viewports × 20 tests) — clean console, zero external requests, all 6 GLBs load locally.
- Manual verification confirmed by user (2026-09-05): engine swaps in place, puffs and whistle voices correct per family, 🎥 cycling and wagon workshop behave with 6 kinds.

- [x] Task: Puff offsets + scene wiring (non-logic) `069c110`
  - [x] Acceptance: all 6 engines load and ride loops/shuttles/hills/tunnels/switches; each puffs from its chimney/roof; ride cap and 🎥 cycling work with 6 kinds
  - [x] Implement `scene/steam-puff-emitter.ts` `FALLBACK_OFFSETS` entries; confirm lazy template loading in `init-scene.ts` scales to the wider fleet
  - [x] Manual/tablet check per acceptance

  Notes: `init-scene.ts` needed zero changes — everything is TRAIN_KINDS-generic
  (template Map, preload loop, swapRigKind, syncRigs). Finding: templates
  precache for ALL kinds at startup (already true for 3 kinds) — kept, it
  guarantees instant engine swaps; clones share geometry, ride cap 4 bounds
  live rigs. Puff offsets: express [0,3.2,0], freight [0,2.8,0], bullet [0,3,0]
  (chimney-position fallbacks; findChimney overrides where names match).
  `load-locomotive.ts` generic. Playwright: full smoke spec 38/40 → the 2
  boot failures were a hardcoded `.train-slot` count of 3 → updated to 6,
  now 2/2 pass (clean console, zero external requests, all 6 GLBs load).
  Known Phase 4 follow-ups: smoke "cover the fleet" loop (line ~675) and
  wagon-workshop consist reads still reference 3 kinds.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Picker: Scrollable 6-Engine Row (UI) [checkpoint: a65681d]

**Verification Report (Phase 3)**
- Changed files since prev checkpoint (`3a2e6ac`): src/ui/app.ts (loco-row wrapper), src/style.css (.loco-row scroll styles), plan.md. No logic-bearing changes.
- Gates: biome/tsc clean; 664/664 unit tests; Playwright smoke 40/40; hill-pace + wagon-workshop 12/12 with retries (1 pre-existing flake under parallel load, green on retry).
- Manual verification confirmed by user (2026-09-05): 6 buttons in one scrollable row on phone/tablet, swipe-on-gaps scrolling, taps select instantly, pressed state + wagon row unchanged.

- [x] Task: Picker becomes a horizontally scrollable row (non-logic) `a65681d`
  - [x] Acceptance: 6 identical chunky buttons, ≥64px targets, horizontal scroll on ≥360px phones, no pagination/text; pressed state + selection sound unchanged; reduced-motion safe
  - [x] Implement CSS/wiring in `src/ui/app.ts`
  - [x] Manual/tablet verification per acceptance

  Notes: New `div.loco-row` wrapper (role=group, aria-label Locomotives) inside
  the train drawer; `.train-slot` buttons unchanged (≥72px targets, delegation
  + aria sync untouched — both use `[data-train]` queries on the drawer).
  CSS mirrors the proven `.drawer-panel` scroll row (flex, overflow-x auto,
  touch-action pan-x, thin scrollbar); `.train-drawer` keeps wrapping so the
  wagon row sits below. No animation added — reduced-motion safe by design.
  Gates: biome/tsc clean, 664 unit tests, smoke 40/40, hill-pace +
  wagon-workshop 12/12 with retries (one flaky pace test under parallel load,
  green on retry — pre-existing).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - E2E, Docs & Final Gates [checkpoint: b011afe]

- [x] Task: Playwright e2e — fleet flow `a6d1095`
  - [x] Spec: pick each new engine → ride → reload restores choice → wagon workshop still per-train → zero external requests, clean console, tablet + phone viewports

  Notes: New `e2e/fleet.spec.ts` — cycles express/freight/bullet with a toot
  each, reloads, asserts bullet restored, then origin-scoped external-request
  and console checks (tablet + phone). First draft failed on `blob:` URLs
  being counted as external — switched to the house `new URL(url).origin`
  filter from smoke.spec. smoke.spec "cover the fleet" loop widened to all
  6 kinds.
- [x] Task: Docs `b011afe`
  - [x] `CHANGELOG.md` parent-voice entry; `product.md` fleet description update

  Notes: CHANGELOG [Unreleased] Added entry (six-engine shed, personalities,
  swipeable row, per-train outfits, offline/no downloads). product.md: three
  → six locomotives in pitch, How-to-play, and core behaviors; scope bullet
  marked shipped under the wagons line.
- [x] Task: Final gates `a6d1095`
  - [x] `pnpm check` green (biome + `tsc --noEmit` + vitest); coverage on new core logic; full Playwright run

  Notes: biome 129 files clean, tsc clean, 664/664 unit passing. Full
  Playwright run: 113/113 passing (10.1m), incl. the new fleet spec on both
  viewports. Gate met.

**Verification Report (Phase 4)**
- Changed files since prev checkpoint (`a65681d`): e2e/fleet.spec.ts (new), e2e/smoke.spec.ts (6-kind fleet loop), CHANGELOG.md, conductor/product.md, plan.md. No logic-bearing changes.
- Final gates all green: biome check (129 files), `tsc --noEmit`, 664/664 unit tests, full Playwright suite 113/113 (10.1m) across tablet + phone — clean console, zero external requests throughout.
- Coverage on new core logic (Phase 1): trains.ts 100%, pace.ts 92.3%, save.ts 91.6%, wagons.ts 100%.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
- [ ] Task: Review & archive (`conductor-review`), PR, merge
