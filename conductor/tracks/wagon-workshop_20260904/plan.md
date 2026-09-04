# Plan: Wagon Workshop

Confirmed `spec.md`: per-train consists, 4 pair presets
(Classic lumber+box default · Coal duo · Tank duo · Container
red+blue), wagon row in the train drawer, purely cosmetic cargo,
persisted per-train via an additive save field.

Methodology per `workflow.md`: TDD (Red → Green → Refactor →
Coverage) for all logic-bearing code (`src/core/`, `src/state/`);
observable acceptance criteria + Playwright smoke for scene/UI.

## Phase 1 - Core: Consist Model & Persistence (TDD)

- [ ] Task: Wagon preset type + per-train consist state (logic)
  - [ ] Write failing tests: preset union (classic/coal/tank/container), per-train mapping defaulting to classic, unknown-input forgiveness
  - [ ] Implement minimum pure model in `src/core/` to green
  - [ ] Refactor for clarity; rerun tests
  - [ ] Verify coverage >80% for new core code
- [ ] Task: Save round-trip + persistence (logic)
  - [ ] Write failing tests: additive field serializes per-train, pre-workshop saves load as classic, workshop worlds round-trip, corrupt/unknown preset forgives to classic
  - [ ] Implement `src/core/save.ts` additive shape (no version bump) + `src/state/` wiring to green
  - [ ] Refactor; rerun tests
  - [ ] Verify coverage >80% for new save/state code
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Scene: Chosen Wagons Ride Everything

- [ ] Task: Load preset GLBs and follow the engine (non-logic)
  - [ ] Acceptance: each preset's two GLBs precache and render; consist follows through straights, curves, crossings, bridges, tunnels, hills, switches with today's spacing — no popping, dead-end shuttles included
  - [ ] Implement `load-wagons.ts` preset wiring + precache list
  - [ ] Manual/tablet check per acceptance; PWA precache weight verified against 6MB cap
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Drawer: Icon-Only Wagon Row

- [ ] Task: Wagon row in the train drawer (non-logic)
  - [ ] Acceptance: 4 chunky preset icons under the loco picker, ≥64px targets, one tap applies to the selected loco with pop+ding <100ms (silent when muted), row hidden mid-ride with the drawer, reduced-motion safe, tablet + phone layouts
  - [ ] Implement drawer UI in `src/ui/` (hand SVG icons, parent-facing labels only)
  - [ ] Manual/tablet verification per acceptance
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - E2E, Docs & Final Gates

- [ ] Task: Playwright e2e — workshop flow
  - [ ] Spec: pick Coal preset → ride loop/shuttle/switch → assert consist → reload restores per-train → cargo still loads/delivers → zero external requests, clean console, tablet + phone viewports
- [ ] Task: Docs
  - [ ] `CHANGELOG.md` parent-voice entry; `product.md` roadmap strike ("colors/other variants"); `tech-stack.md` asset list if new GLBs wired
- [ ] Task: Final gates
  - [ ] `pnpm check` green (biome + `tsc --noEmit` + vitest), coverage on new core logic, full Playwright run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
- [ ] Task: Review & archive (`conductor-review`), PR, merge
