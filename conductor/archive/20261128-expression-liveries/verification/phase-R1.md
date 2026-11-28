# Phase R1 evidence — review fix F1

## Goal

Resolve high/blocking review finding F1: the parent-gated full reset must clear
all liveries (spec.md line 94). Two root causes were fixed:

1. `LiveryStore.reset()` cleared `entries` silently, so the scene painter and
   `watchLiveryPersistence` never learned about the clear.
2. `src/main.ts` never called `liveryStore.reset()` on `world.onReset`, so the
   world-subscription save re-persisted the stale liveries after `world.reset()`.

## Task

- R1.T1 — **done**. Reset notifies, reset is wired, no-op reset is proven,
  consist restore is proven consistent. No commit (per brief).

## Files changed

- `src/state/liveries.ts` — `reset()` snapshots the affected ids, clears the
  map, then notifies each id with `stockLivery()` via the existing `notify()`
  listener path. Empty store ⇒ no notifications.
- `src/state/liveries.test.ts` — two new unit tests: affected ids are notified
  with stock; a no-op reset notifies nobody (so the content-equality guard in
  `watchLiveryPersistence` never rewrites storage).
- `src/main.ts` — one wiring line (plus a two-line comment):
  `world.onReset(() => liveryStore.reset())` registered immediately after the
  install-hint reset wiring, so the livery watcher persists the cleared
  snapshot last.
- `e2e/liveries-reset.spec.ts` — NEW. Two integration tests:
  1. Paint + sticker a consist, confirm scene/store/storage, reset through the
     dev handle (`__tinyTracksWorld.reset()`, same path as the gate's confirm
     in `e2e/insights.spec.ts`), then assert scene back to stock, store
     snapshot empty, storage holds no liveries, and a reload still boots stock.
  2. Consist restore: store and scene agree after `data-restore`.

## TDD record (Red → Green)

RED (before the fix):

- `pnpm exec playwright test e2e/liveries-reset.spec.ts` — test 1 failed with
  `steam:loco back to stock / expected null / received "#3f9bd8"`; test 2
  already passed (consist restore was consistent as-is, so no production change
  was made for it).
- `pnpm check` — failed at `notifies every affected vehicle with the stock
  livery on reset`: `expected "vi.fn()" to be called 2 times, but got 0 times`.
  (An initial Biome failure in the new spec — unused helper and formatting —
  was corrected before this run.)

GREEN (after the fix):

- `pnpm exec playwright test e2e/liveries-reset.spec.ts` — 2 passed.
- `pnpm check` — Biome clean, `tsc --noEmit` clean, 63 test files / 1098 tests
  passed.

One test-only correction was needed after the first Green run: the persisted
`preferences.liveries` key is absent (not `{}`) when cleared, so the storage
helper now normalises a missing record to `{}`. No production code changed for
it.

## Verification commands + exit codes

| Command | Exit code |
| --- | --- |
| `pnpm exec playwright test e2e/liveries-reset.spec.ts` | 0 (2 passed) |
| `pnpm check` | 0 (biome + tsc + 1098 vitest tests) |

## Deviations

None. Only the four permitted files were modified (plus this evidence file).

## Open questions

None. The reviewer's consist-as-one-vehicle question was decided as intended:
the new consist-restore test passes without any production change.

## Primary verification

The primary independently verified the fix on the final working tree:

- `git status --short` shows only the four Touch files plus this evidence file;
  `git diff --stat` is 35 insertions across `main.ts` (+3), `liveries.ts` (+2),
  `liveries.test.ts` (+30), plus the new spec.
- `pnpm check` re-run by the primary: exit 0 — 63 test files / 1098 tests
  passed, Biome and tsc clean.
- `pnpm exec playwright test e2e/liveries-reset.spec.ts --project=tablet`
  re-run by the primary: 2 passed (only pre-existing THREE shadow-map
  deprecation warnings, no console errors).
- Accepted: no commit or scope deviation; the `main.ts` comment correctly
  describes the handler order (livery reset registered after the world save, so
  the cleared snapshot persists last).
