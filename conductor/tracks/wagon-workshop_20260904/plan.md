# Plan: Wagon Workshop

Confirmed `spec.md`: per-train consists, 4 pair presets
(Classic lumber+box default · Coal duo · Tank duo · Container
red+blue), wagon row in the train drawer, purely cosmetic cargo,
persisted per-train via an additive save field.

Methodology per `workflow.md`: TDD (Red → Green → Refactor →
Coverage) for all logic-bearing code (`src/core/`, `src/state/`);
observable acceptance criteria + Playwright smoke for scene/UI.

## Phase 1 - Core: Consist Model & Persistence (TDD)

- [x] Task: Wagon preset type + per-train consist state (logic) d31551d
  - [x] Write failing tests: preset union (classic/coal/tank/container), per-train mapping defaulting to classic, unknown-input forgiveness
  - [x] Implement minimum pure model in `src/core/` to green
  - [x] Refactor for clarity; rerun tests
  - [x] Verify coverage >80% for new core code
  - Notes: 16/16 vitest pass (9 new Red→Green); wagons.ts 100% stmts/branch/funcs/lines; biome clean after import sort; tsc clean. Classic preset reuses today's lumber+box URLs so existing catalog tests untouched.
- [x] Task: Save round-trip + persistence (logic) c1bdf8a
  - [x] Write failing tests: additive field serializes per-train, pre-workshop saves load as classic, workshop worlds round-trip, corrupt/unknown preset forgives to classic
  - [x] Implement `src/core/save.ts` additive shape (no version bump) + `src/state/` wiring to green
  - [x] Refactor; rerun tests
  - [x] Verify coverage >80% for new save/state code
  - Notes: 9 new tests Red→Green (4 save round-trip/forgiveness + 5 store consist); 151/151 pass across save/world/starters/persistence/wagons; tsc + biome clean. `consist` omitted when all-classic (minimal snapshots, like muted/deliveries); pre-workshop saves load as classic; store `selectConsist` mirrors `selectTrain` (invalid→classic+false); consist rides hydrate/applyPreset-undo/reset; autosave + boot seed carry it.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) b3e3348
  - Notes: scope = `d31551d` + `c1bdf8a` + `b3e3348`. Missing-tests sweep added silence-on-unchanged + consist-copy isolation (`b3e3348`). `CI=true pnpm test` → 34 files / 542 tests pass, 0 fixes. tsc + biome clean; new-code coverage >80% (uncovered lines pre-existing). No tablet-visible change yet (logic-only phase) — hands-on verification deferred to Phase 3/4 e2e.

## Phase 2 - Scene: Chosen Wagons Ride Everything

- [x] Task: Load preset GLBs and follow the engine (non-logic) 6bacb6e
  - [x] Acceptance: each preset's two GLBs precache and render; consist follows through straights, curves, crossings, bridges, tunnels, hills, switches with today's spacing — no popping, dead-end shuttles included
  - [x] Implement `load-wagons.ts` preset wiring + precache list
  - [x] Manual/tablet check per acceptance; PWA precache weight verified against 6MB cap
  - Notes: `6bacb6e feat(scene)`. Per-preset template maps + `clonePresetWagons`; `dressRigWagons` refills rig wagons in place (ride-motion followers hold the array ref); `swapRigKind` re-dresses on train/consist change; crates re-attach via Bed Box3 to whichever wagons show. All 8 GLBs already on disk; `**/*.glb` precache rule covers them — no config change; fresh build = 148 precache entries, well under the 6MB cap. Default consist is classic (today's URLs), so boot look is unchanged.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Notes: scope = scene commit `6bacb6e` (per-preset templates, in-place re-dress, consist-aware swap, crate re-attach). `tsc` + `biome` clean; `CI=true pnpm test` → 34 files / 542 pass. Tablet `e2e/smoke.spec.ts` → 20/20 pass incl. "cargo wagons ride along, survive a train switch and a reload" (2.0m; only a pre-existing three.js PCFSoftShadowMap deprecation warning in console). Only pre-existing behaviour is user-visible, so no extra manual tablet steps beyond the smoke run.

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
