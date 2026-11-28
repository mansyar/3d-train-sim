# Phase 4 verification — Expression: paint/sticker liveries

Date: 2026-11-28 · Branch: `feat/20261128-expression-liveries` · No commit created.

## Scope touched

- `src/scene/liveries/stickers.ts` (new): four preallocated camera-facing sprites per vehicle, shared procedural canvas textures, transform-only pop tick, witness, disposal.
- `src/scene/train-fleet.ts`: binds/syncs loco + wagon sticker sprites on build, kind swap, wagon re-dress and store notifications; one ding per stamp via the Phase 3 `createLiveryAudio(audio).reward('stamp')` (audio module reused, not duplicated); restore clears decals; ticks pops in `update(dt)`; extends the DEV `window.__tinyTracksLivery` witness with `stickers(id)`; disposes bindings/textures at teardown.
- `src/ui/train-picker.ts`: sticker tap arms only (`data-armed`, `aria-pressed`), tapping an engine/wagon in the drawer stamps the armed shape and disarms; paint/restore disarm; tally is store-driven.
- `e2e/liveries-stickers.spec.ts` (new): four tablet tests covering arm-then-stamp, eviction cap, restore-to-stock, reduced motion.

## TDD evidence

1. RED — wrote the spec first; `pnpm exec playwright test e2e/liveries-stickers.spec.ts` failed 4/4 because `window.__tinyTracksLivery.stickers` did not exist (20s waitForFunction timeouts).
2. GREEN — implemented the four files above. Final runs:

| Command | Result |
| --- | --- |
| `pnpm exec playwright test e2e/liveries-stickers.spec.ts` | 4 passed (19.2s), exit 0 |
| `pnpm check` | biome clean; tsc clean; vitest 63 files / 1091 tests passed, exit 0 |

Fix cycles after RED: two. First fixed Biome formatting/import order and a value-vs-type `Sprite` import; second fixed witness anchor slicing and restore-to-stock clearing.

## Observations / open question

`pnpm exec playwright test e2e/liveries-drawer.spec.ts` (extra diagnostic, not a phase gate): 2 passed, 2 failed. Both failures assert the old direct-stamp interaction — an immediate `data-sticker-count` increment on a sticker tap (lines ~99 and ~132). Phase 4's brief requires arm-then-stamp, so that spec needs its sticker section updated by the primary (it is outside this phase's Touches and was deliberately not edited).

Console output contains the pre-existing WebKit `blob:` access-control noise filter and THREE PCFSoftShadowMap deprecation warning; the new spec's `watchConsoleErrors` assertions pass with an empty error list.

`git status --short` after implementation: modified `src/scene/train-fleet.ts`, `src/ui/train-picker.ts`; untracked `src/scene/liveries/`, `e2e/liveries-stickers.spec.ts`.

## Primary verification (independent, 2026-11-28)

- Tree vs Touches: working tree holds exactly `M src/scene/train-fleet.ts`,
  `M src/ui/train-picker.ts`, `M e2e/liveries-drawer.spec.ts` (contract alignment,
  see below), new `src/scene/liveries/stickers.ts`, `e2e/liveries-stickers.spec.ts`,
  and this evidence file. No other files.
- `pnpm check` re-run by the primary: exit 0.
- `pnpm exec playwright test e2e/liveries-stickers.spec.ts` re-run by the primary
  (inside the combined run below): 4 passed.
- Contract alignment: Phase 4 implements the approved FR-3 arm-then-stamp
  interaction, which broke 2 assertions in Phase 2's `e2e/liveries-drawer.spec.ts`
  (confirmed: 2 failed / 2 passed). The primary updated that spec to the approved
  contract — sticker tap asserts `data-armed` + unchanged count, engine-slot tap
  stamps and clears the armed state; the fifth-stamp cap and restore assertions
  now stamp via the slot tap. Combined re-run
  `e2e/liveries-drawer.spec.ts e2e/liveries-stickers.spec.ts`: exit 0, 8 passed.
- AC check: P4.T1 covers FR-3 + AC-3 (oldest-first eviction, capped count) with
  NFR-6 (preallocated sprites, subscription sync); P4.T2 covers FR-5 + AC-4
  (restore → stock, zero stickers); P4.T3 covers NFR-3 + AC-6 (reduced-motion
  final state, no animation frames).
- Decision: ACCEPT.
