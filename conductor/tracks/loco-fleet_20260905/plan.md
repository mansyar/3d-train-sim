# Plan: Locomotive Fleet Expansion

Confirmed `spec.md`: 3 new engines (`express` / `freight` / `bullet` from
already-vendored GLBs), scrollable 6-engine picker, new pace personalities
reusing existing whistles, additive save.

Methodology per `workflow.md`: TDD (Red → Green → Refactor → Coverage) for all
logic-bearing code (`src/core/`, `src/state/`); observable acceptance criteria +
Playwright smoke for scene/UI.

## Phase 1 - Core: Fleet Catalog & Persistence (TDD)

- [ ] Task: Extend `TRAIN_KINDS` + definitions (logic)
  - [ ] Write failing tests: `express`/`freight`/`bullet` in `TRAIN_KINDS`; `modelUrl`/`aria`/`whistle` per kind; icon SVG present; whistle reuses existing profiles
  - [ ] Implement in `src/core/trains.ts` to green (inline SVGs matching toy-palette style)
  - [ ] Refactor for clarity; rerun tests
  - [ ] Verify coverage >80% for new core code
- [ ] Task: Pace personalities (logic)
  - [ ] Write failing tests: `personalityPace` for 3 new kinds (express brisk, freight steady, bullet quickest); exhaustive `Record` compiles
  - [ ] Implement in `src/core/pace.ts` to green
  - [ ] Refactor; rerun; coverage >80%
- [ ] Task: Save round-trip with new kinds (logic)
  - [ ] Write failing tests: snapshot with `train: 'bullet'` round-trips; pre-fleet saves (v1/v2/v3) still load → steam default; invalid kind forgives to steam
  - [ ] Implement `src/core/save.ts` additive widening (no version bump) to green
  - [ ] Refactor; rerun; coverage >80%
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
