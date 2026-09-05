# Plan: Locomotive Fleet Expansion

Confirmed `spec.md`: 3 new engines (`express` / `freight` / `bullet` from
already-vendored GLBs), scrollable 6-engine picker, new pace personalities
reusing existing whistles, additive save.

Methodology per `workflow.md`: TDD (Red → Green → Refactor → Coverage) for all
logic-bearing code (`src/core/`, `src/state/`); observable acceptance criteria +
Playwright smoke for scene/UI.

## Phase 1 - Core: Fleet Catalog & Persistence (TDD)

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

## Phase 2 - Scene: New Engines Ride Everything (non-logic)

- [ ] Task: Puff offsets + scene wiring (non-logic)
  - [ ] Acceptance: all 6 engines load and ride loops/shuttles/hills/tunnels/switches; each puffs from its chimney/roof; ride cap and 🎥 cycling work with 6 kinds
  - [ ] Implement `scene/steam-puff-emitter.ts` `FALLBACK_OFFSETS` entries; confirm lazy template loading in `init-scene.ts` scales to the wider fleet
  - [ ] Manual/tablet check per acceptance
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Picker: Scrollable 6-Engine Row (UI)

- [ ] Task: Picker becomes a horizontally scrollable row (non-logic)
  - [ ] Acceptance: 6 identical chunky buttons, ≥64px targets, horizontal scroll on ≥360px phones, no pagination/text; pressed state + selection sound unchanged; reduced-motion safe
  - [ ] Implement CSS/wiring in `src/ui/app.ts`
  - [ ] Manual/tablet verification per acceptance
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - E2E, Docs & Final Gates

- [ ] Task: Playwright e2e — fleet flow
  - [ ] Spec: pick each new engine → ride → reload restores choice → wagon workshop still per-train → zero external requests, clean console, tablet + phone viewports
- [ ] Task: Docs
  - [ ] `CHANGELOG.md` parent-voice entry; `product.md` fleet description update
- [ ] Task: Final gates
  - [ ] `pnpm check` green (biome + `tsc --noEmit` + vitest); coverage on new core logic; full Playwright run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
- [ ] Task: Review & archive (`conductor-review`), PR, merge
