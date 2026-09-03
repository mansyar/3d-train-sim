# Plan — Starter Railway Magic

**Track:** `starter-railway_20260903` · **Spec:** `spec.md` · **Branch:** `track/starter-railway_20260903`

Execution follows `conductor/workflow.md`: logic-bearing code
(`src/core/`, `src/state/`) is TDD'd (failing tests → green → refactor,
>80% coverage on new logic); UI/scene glue records observable acceptance
criteria and is verified by smoke tests + manual tablet checks. Every phase
ends with the workflow's Phase Verification & Checkpoint protocol.

## Phase 1 — Preset builders (pure core)

- [ ] Task: Failing tests for `src/core/starters.ts`
  - [ ] Three builders return `WorldData` (pieces, scenery, train `steam`, deliveries `{}`)
  - [ ] Every layout is a closed loop (assert via `track-graph` connectivity) and rideable in one tap
  - [ ] Dry-land rule: no `terrainErrorFor` / `isWater` violations except `bridge` pieces on water
  - [ ] Budgets: ≤ ~20 toys, 16×16 bounds, no hills/switches/tunnels, exactly 1+ station where specified
- [ ] Task: Implement builders to green (minimum code, no three.js imports)
  - [ ] Cozy Oval, Station Village, River Crossing builders + `cozyOval()` default export for boot
- [ ] Task: Refactor + coverage
  - [ ] `CI=true pnpm test -- --coverage` — >80% on `src/core/starters.ts`
  - [ ] `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Undoable replace (state)

- [ ] Task: Failing tests for world-store preset replace
  - [ ] Applying a preset is ONE mutation and arms single-undo
  - [ ] Undo restores pieces, scenery, selected train, and deliveries exactly
  - [ ] Gallery hydration clears prior pending-undo (same single-inverse rule as `hydrate()`)
  - [ ] `reset()` still returns an empty meadow with `steam` selected
- [ ] Task: Implement replace to green (minimum code in `src/state/world.ts`)
- [ ] Task: Refactor + coverage
  - [ ] `CI=true pnpm test -- --coverage` — >80% on new `src/state/` logic
  - [ ] `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Boot seed + parent-gated gallery (UI glue)

- [ ] Task: Record observable acceptance criteria in this plan before implementing
  - [ ] Null snapshot → Cozy Oval hydrated, saved, ▶ rides instantly with pulse + ding
  - [ ] Picker reachable only inside the gate's armed-confirm step; 3 icon-only choices, ≥64px targets
  - [ ] Gallery apply → undo chip appears; one ↩️ restores prior build
  - [ ] Reset → empty; mute → silent; reduced-motion → still
- [ ] Task: Wire `main.ts` first-run seed (null snapshot → starter hydrate; never overwrite existing snapshots)
- [ ] Task: Extend the parent gate in `src/ui/app.ts` with the icon-only preset picker + apply path
- [ ] Task: Smoke + manual tablet verification of the recorded criteria
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E + gates

- [ ] Task: Playwright specs (`e2e/starter-railway.spec.ts`)
  - [ ] Fresh boot (empty IDB) shows the oval and rides with a clean console
  - [ ] Each gallery preset applies behind the gate and rides
  - [ ] Apply → undo restores the prior world; reload persists; reset empties
  - [ ] Zero external requests; tablet + phone viewports
- [ ] Task: Full local gates green
  - [ ] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test` + Playwright
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
