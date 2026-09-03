# Plan — Starter Railway Magic

**Track:** `starter-railway_20260903` · **Spec:** `spec.md` · **Branch:** `track/starter-railway_20260903`

Execution follows `conductor/workflow.md`: logic-bearing code
(`src/core/`, `src/state/`) is TDD'd (failing tests → green → refactor,
>80% coverage on new logic); UI/scene glue records observable acceptance
criteria and is verified by smoke tests + manual tablet checks. Every phase
ends with the workflow's Phase Verification & Checkpoint protocol.

## Phase 1 — Preset builders (pure core) [checkpoint: 227f3cb273d4b4e66d4e55d8eae3fce195857ec0]

- Verification Report: automated `pnpm test` → 34 files / 515 tests green, 100% coverage on `src/core/starters.ts`, `tsc` + `biome` clean. Manual: app boots unchanged (no UI wiring yet — correct), no console errors. User confirmed 2026-09-03.

- [x] Task: Failing tests for `src/core/starters.ts` (`d05664f`)
  - [x] Three builders return `WorldData` (pieces, scenery, train `steam`, deliveries `{}`)
  - [x] Every layout is a closed loop (assert via `track-graph` connectivity) and rideable in one tap
  - [x] Dry-land rule: no `terrainErrorFor` / `isWater` violations except `bridge` pieces on water
  - [x] Budgets: ≤ ~20 toys, 16×16 bounds, no hills/switches/tunnels, exactly 1+ station where specified
  - Notes: Wrote `src/core/starters.test.ts` (7 tests, shared `expectValidStarter` invariant helper) before the module existed; suite failed with "Cannot find module './starters'" (Red). One real bug caught pre-implementation review: none — Red was import-only as expected.
- [x] Task: Implement builders to green (minimum code, no three.js imports) (`d05664f`)
  - [x] Cozy Oval, Station Village, River Crossing builders + `cozyOval()` default export for boot
  - Notes: Created `src/core/starters.ts` — three pure builders + `STARTER_PRESETS` gallery list. Cozy Oval: 10-piece west-bank oval + station/2 trees/house (14 toys). Station Village: 14-piece loop + station/house/cottage/pig/sheep (19 toys). River Crossing: 18-piece loop crossing water twice on 6 trestle bridges + station/tree (20 toys). Deviation from spec FR2 ("1–2 trestle bridges"): the 3-wide river band forces ≥3 bridges per crossing, so two crossings need 6 — still "trestle bridges", spec wording was aspirational. Fixed one layout bug during Green: village pig at (5,4) sat in row-4 water (band is cx6±1 there); moved to (2,8). Files: created `src/core/starters.ts`, `src/core/starters.test.ts`. Why: pure-core presets keep scene/persistence decoupled; deterministic `piece-N`/`scenery-N` ids keep the store's `nextId` advancing after hydrate.
- [x] Task: Refactor + coverage (`d05664f`)
  - [x] `CI=true pnpm test -- --coverage` — >80% on `src/core/starters.ts`
  - [x] `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean
  - Notes: No refactor needed — builders already minimal via shared `rail`/`decor` helpers. Coverage 100% stmts/branch/funcs/lines on `starters.ts`. `tsc --noEmit` clean; `biome check --write` fixed import order + formatting only, tests still 7/7 after.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Undoable replace (state) [checkpoint: 738794c058dea249d711165badfa75cef5fe3e75]

- Verification Report: automated `pnpm test` → 34 files / 519 tests green; `world.ts` 94.25% lines. Manual: app boots/behaves unchanged (no UI wiring yet — correct), no console errors. User confirmed 2026-09-03.

- Notes: `WorldStore.applyPreset(data)` swaps pieces/scenery/train/deliveries as ONE mutation (single notify → one autosave write) and arms single-undo with an exact snapshot restore (replacing any in-progress edit undo, like `hydrate()`). Red: 4 new tests failed (`applyPreset is not a function`); Green: 66/66 in `world.test.ts`. Coverage: `world.ts` 94.25% lines, `starters.ts` 100%. `tsc` + `biome` clean.
- [x] Task: Failing tests for world-store preset replace [0f8e4fe]
  - [x] Applying a preset is ONE mutation and arms single-undo
  - [x] Undo restores pieces, scenery, selected train, and deliveries exactly
  - [x] Gallery hydration clears prior pending-undo (same single-inverse rule as `hydrate()`)
  - [x] `reset()` still returns an empty meadow with `steam` selected
- [x] Task: Implement replace to green (minimum code in `src/state/world.ts`) [0f8e4fe]
- [x] Task: Refactor + coverage
  - [x] `CI=true pnpm test -- --coverage` — >80% on new `src/state/` logic
  - [x] `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Boot seed + parent-gated gallery (UI glue)

- [x] Task: Record observable acceptance criteria in this plan before implementing (confirmed by user 2026-09-03)
  - [ ] Null snapshot → Cozy Oval hydrated, saved, ▶ rides instantly with pulse + ding
  - [ ] Picker reachable only inside the gate's armed-confirm step; 3 icon-only choices, ≥64px targets
  - [ ] Gallery apply → undo chip appears; one ↩️ restores prior build
  - [ ] Reset → empty; mute → silent; reduced-motion → still
- [x] Task: Wire `main.ts` first-run seed (null snapshot → starter hydrate; never overwrite existing snapshots) [SHA: 402575f]
- [x] Task: Extend the parent gate in `src/ui/app.ts` with the icon-only preset picker + apply path [SHA: 402575f]
- [~] Task: Smoke + manual tablet verification of the recorded criteria (smoke e2e green 2026-09-03; tablet checklist awaiting user confirm)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

> Notes (Phase 3, code SHA 402575f): `main.ts` hydrates `cozyOval()` on null snapshot + one explicit `saveWorldSnapshot(serializeWorld(...))` (the watcher only saves on later notifications). Gate tray: 3 icon-only buttons ≥64px reusing existing SVG icons, visible only in the armed-confirm step; pick → `disarmConfirm()` → `applyPreset()` → ding; the existing undo subscription shows the ↩️ chip. `reset()` path untouched (still empties). Fall-out fixed: fixed-layout specs now start from `clearMeadow(page)` (`e2e/helpers.ts`); smoke 40/40, switches 4/4, hills/tunnel/undo/ride-toybox/cargo/river/prod/phone-shell green (2 earlier failures were env flakes — WebGL-null/goto-timeout — passing on retry; switches `toBe(3)` was a real count assertion, fixed).

## Phase 4 — E2E + gates

- [ ] Task: Playwright specs (`e2e/starter-railway.spec.ts`)
  - [ ] Fresh boot (empty IDB) shows the oval and rides with a clean console
  - [ ] Each gallery preset applies behind the gate and rides
  - [ ] Apply → undo restores the prior world; reload persists; reset empties
  - [ ] Zero external requests; tablet + phone viewports
- [ ] Task: Full local gates green
  - [ ] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test` + Playwright
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
