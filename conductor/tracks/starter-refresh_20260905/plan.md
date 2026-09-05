# Plan — Starter Refresh

**Track:** `starter-refresh_20260905` · **Spec:** `spec.md` (source of truth)

## Phase 1 — Core: builder + consist-preserving apply (TDD)

- [ ] Task 1.1 — Red: `hilltopJunction()` builder tests in `src/core/starters.ts`
  - Closed-loop rideable (one closed component via `rideComponentsOf`), one toy per cell, ≤ ~20 toys.
  - Hill trio present (slope-up / hill / slope-down) + exactly one right-switch on dry land (`terrainErrorFor` / `isWater` clean).
  - Station adjacent to loop on dry land; 2–3 nature/town decor.
- [ ] Task 1.2 — Green: implement `hilltopJunction()` + extend `STARTER_PRESETS` / `StarterPresetId` with 4th entry.
- [ ] Task 1.3 — Red: apply-layer tests — applying ANY preset keeps `train` + per-train `consist`, swaps rails/scenery/deliveries only; undo restores prior world exactly.
  - Sub-task: verify `defaultConsist()` wipe regression is covered (diesel + coal duo survives apply + reload).
- [ ] Task 1.4 — Green: split builders from apply (builders return rails/scenery/deliveries; `src/state/world.ts` carries train/consist forward), keep ONE pending-undo mutation.

> [!NOTE]
> TDD per `workflow.md` — write failing Vitest cases FIRST for logic-bearing files (`src/core/`, `src/state/`), then implement. Notes for future implementers live here in `plan.md`, never in shipped code.

### Phase Verification & Checkpoint — Phase 1

- [ ] PV1.1 — `pnpm vitest run src/core/starters` + `src/state` green, coverage of new logic >80%.
- [ ] PV1.2 — `pnpm check` (biome 2.5.10 + `tsc --noEmit`) green; no new GLB/audio/network/deps.
- [ ] PV1.3 — Quick smoke: dev boot applies 4th builder programmatically → valid loop per pathing rules.
- [ ] Review prior phase before proceeding (flag dead ends / stale assumptions).

## Phase 2 — Glue: gallery pick + e2e + docs

- [ ] Task 2.1 — Gallery: 4th icon-only pick (reuse hill/switch SVG idiom, ≥64px, no text) inside parent-gate armed confirm; reset path untouched (stays EMPTY).
- [ ] Task 2.2 — E2E (extend `e2e/starter-railway.spec.ts`, tablet + phone per `e2e/README.md`):
  - 4th pick applies → counts match → `▶` rides with station pause → reload persists.
  - Consist case: set diesel + coal duo → apply → train/consist preserved → undo restores full prior world.
  - Reset case: reset → empty → reload stays empty.
- [ ] Task 2.3 — Docs: CHANGELOG Unreleased one-liner; `conductor/product.md` starter sentence (4 presets) only if it names the count.

### Phase Verification & Checkpoint — Phase 2 (final gate)

- [ ] PV2.1 — Full `pnpm check` green (biome + typecheck + vitest).
- [ ] PV2.2 — `npx playwright test starter-railway` green tablet + phone; console clean (boot/reload paths).
- [ ] PV2.3 — Manual tablet touch check: gallery pick, ride, undo, reset feel instant (<100ms feedback), no toddler-facing text.
- [ ] Update `conductor/tracks.md` (done → in-progress → done); commit per `workflow.md` (staged commits, atomic messages).
