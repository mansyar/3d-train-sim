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

## Phase 3 — Boot seed + parent-gated gallery (UI glue) — complete

- [x] Task: Record observable acceptance criteria in this plan before implementing (confirmed by user 2026-09-03)
  - [x] Null snapshot → Cozy Oval hydrated, saved, ▶ rides instantly with pulse + ding
  - [x] Picker reachable only inside the gate's armed-confirm step; 3 icon-only choices, ≥64px targets
  - [x] Gallery apply → undo chip appears; one ↩️ restores prior build
  - [x] Reset → empty; mute → silent; reduced-motion → still
- [x] Task: Wire `main.ts` first-run seed (null snapshot → starter hydrate; never overwrite existing snapshots) [SHA: 402575f]
- [x] Task: Extend the parent gate in `src/ui/app.ts` with the icon-only preset picker + apply path [SHA: 402575f]
- [x] Task: Smoke + manual tablet verification of the recorded criteria (smoke e2e green 2026-09-03; user confirmed all good on tablet 2026-09-03)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

> Notes (Phase 3, code SHA 402575f): `main.ts` hydrates `cozyOval()` on null snapshot + one explicit `saveWorldSnapshot(serializeWorld(...))` (the watcher only saves on later notifications). Gate tray: 3 icon-only buttons ≥64px reusing existing SVG icons, visible only in the armed-confirm step; pick → `disarmConfirm()` → `applyPreset()` → ding; the existing undo subscription shows the ↩️ chip. `reset()` path untouched (still empties). Fall-out fixed: fixed-layout specs now start from `clearMeadow(page)` (`e2e/helpers.ts`); smoke 40/40, switches 4/4, hills/tunnel/undo/ride-toybox/cargo/river/prod/phone-shell green (2 earlier failures were env flakes — WebGL-null/goto-timeout — passing on retry; switches `toBe(3)` was a real count assertion, fixed).
>
> Bug fix 2026-09-03 [cf3f244]: gallery presets 2/3 rendered disconnected — root cause in the scene layer, not the layouts. `track-renderer.apply()` reused the cloned mesh for a known id without checking kind, and preset builders reuse ids (`piece-1..N`) across presets — so a corner mesh got reposed as a straight etc. Fixed: `apply()` now drops + re-clones the mesh when the kind differs (tracked via `model.userData.renderedKind`; stale switch-blade tweens cleared). Verified: store data was always correct (exact builder output), the train's own solver sees one closed ride per preset (now locked in `starters.test.ts` via `rideComponentsOf`: 1 component, closed, steps == pieces), and post-fix tablet screenshots show all three loops fully connected with correct scenery. Pre-existing wart noticed, NOT fixed (out of scope): the parked spare train sits at world origin, which is river water — visible on every fresh boot, before and after this track.
>
> Verification Report (Phase 3 — user sign-off 2026-09-03): automated — `tsc` clean, `biome` clean, unit 34 files / 519 tests green, smoke 40/40, switches 4/4, hills/tunnel/undo/ride-toybox/cargo/river/prod/phone-shell green; manual — user confirmed on tablet that all three gallery presets render fully connected, ride, apply behind the gate, undo restores, and reset empties.
> Checkpoint SHA: `1cf56589dc3711e396a94cdf1068d0e4751fc47a`

## Phase 4 — E2E + gates — complete

- [x] Task: Playwright specs (`e2e/starter-railway.spec.ts`) [SHA: 6ed720d]
  - [x] Fresh boot (empty IDB) shows the oval and rides with a clean console
  - [x] Each gallery preset applies behind the gate and rides
  - [x] Apply → undo restores the prior world; reload persists; reset empties
  - [x] Zero external requests; tablet + phone viewports
- [x] Task: Full local gates green
  - [x] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test` + Playwright
- [x] Task: Phase Verification & Checkpoint (user sign-off 2026-09-04; SHA `83714f37206fedd734da7cd11a4227b641a2f934`)

> Notes (Phase 4, code SHA 6ed720d): 3 specs × tablet + phone (6/6 green). Helpers: `boot()` wipes IDB for the first-run path, `openGallery()` holds the gate (retries ×3 — shader-compile jank after reload can delay the 2 s arm timer past release), `rideForAWhile()` uses the `.ride-toggle.is-riding` class (the dev handle is the raw store: flat `pieces()`/`scenery()`, boot flag `__tinyTracksReady`). E2E lessons applied from existing suites: `test.setTimeout(120_000)` (cargo precedent), `gate.click({ force: true })` (armed gate pulses by design). Gates 2026-09-04: `biome check .` clean, `tsc` clean, unit 34 files green, `starter-railway` 6/6, `smoke` 40/40 (two earlier failures — tablet parent-gate hold, phone fps — were load flakes: both pass on rerun, parent-gate 1/1 in isolation).
>
> Verification Report (Phase 4): scope since Phase 3 checkpoint `5a23e46` is one new file, `e2e/starter-railway.spec.ts` — no `src/` changes. Automated: all gates above green. Manual: none required beyond the Phase 3 tablet sign-off (same behaviors, now automated).
> Checkpoint SHA: `83714f37206fedd734da7cd11a4227b641a2f934` (user sign-off 2026-09-04; code `6ed720d` + plan `83714f3`).
