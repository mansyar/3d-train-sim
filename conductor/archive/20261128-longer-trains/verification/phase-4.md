# Phase 4 verification — Per-wagon dress + persistence

Track: `20261128-longer-trains` · Phase: 4 · Date: 2026-11-28 · Executor: subagent (no commits; working tree left for primary verification)

## TDD — Red first

The mandatory unit assertions were added to `src/state/persistence.test.ts` **before** any production code was changed. Three tests were written:

1. `carries wagon count and per-wagon outfits into world-mutation saves` — count 4, slots 1=`coal`, 2=`tank`; expects the saved snapshot to carry `wagonCount: 4` and `wagonOutfits: ['classic','coal','tank','classic']`.
2. `does not rewrite storage when a consist tap changes nothing` — after one real save, a no-op `setWagonCount('steam', 2)` and a no-op dress of an already-classic slot must not trigger a second save.
3. `resets the consist to a paired pair of classic wagons` — `onReset` exactly once, save exactly once, count 2, all-classic rack, classic pair preset, and the default fields omitted from the saved snapshot.

Command: `pnpm check` (runs `vitest run`)
Exit code: **1**

RED output summary:

```
 Test Files  1 failed | 62 passed (63)
      Tests  2 failed | 1122 passed (1124)

FAIL  src/state/persistence.test.ts > ... > carries wagon count and per-wagon outfits into world-mutation saves
AssertionError: expected { version: 3, train: 'steam', pieces: [straight], scenery: [] }
  to match object { wagonCount: 4, wagonOutfits: [ 'classic', 'coal', 'tank', 'classic' ] }
  // the snapshot carried neither field

FAIL  src/state/persistence.test.ts > ... > resets the consist to a paired pair of classic wagons
AssertionError: expected 4 to be 2  // reset left the wagon count at 4
```

The third test (`does not rewrite storage...`) already passed at RED — the intended guard was absent but no *extra* save was produced by those particular no-ops before `snapshotOf` saw the wagon fields. It is retained as the regression guard for the Green implementation.

A targeted `pnpm exec vitest run src/state/persistence.test.ts` was denied by the shell permission policy; it was **not retried or worked around**. `pnpm check` runs the full Vitest suite and supplied the Red/Green signal.

## Green implementation

- `src/state/world.ts` — `reset()` now also sets `wagonLength = DEFAULT_WAGON_COUNT` and `wagonOutfits = defaultWagonOutfits()` alongside `consist = defaultConsist()`, inside the single existing `notify()` mutation. Reset listeners still fire exactly once.
- `src/state/persistence.ts` — `WorldReader` gained `wagonCount(train)` and `wagonOutfits(train)`; `snapshotOf()` passes both to `serializeWorld(...)`, so the consist rides in the same single snapshot as tracks/liveries. `watchWorldPersistence()` now keeps `lastPersisted = JSON.stringify(snapshot)` and returns early when a notification would write a byte-identical snapshot.
- `src/main.ts` — **intentionally unchanged.** Boot already hydrates (`world.hydrate(data)`) and restores mute / day phase / install hint / liveries *before* attaching all five watchers, so wagon count and outfits restore before any watcher can rewrite storage. No second store, no second watcher, no polling were introduced.
- `src/scene/train-fleet.ts` — DEV-only witness addition: `consistWitness.rigs()[].wagons[].bodyHex = paintHex(wagon)`, so the A5 cross-feature mechanic can be asserted against actual scene materials.

Command: `pnpm check`
Exit code: **0**

```
Checked 231 files in 396ms. No fixes applied.
 Test Files  63 passed (63)
      Tests  1124 passed (1124)
```

Command: `pnpm exec playwright test e2e/longer-trains-persist.spec.ts`
Exit code: **0**

```
Running 3 tests using 1 worker
  ok 1 [tablet] ... a wagon chip selects its slot for dressing and the pair dress survives reload (8.0s)
  ok 2 [tablet] ... the parent reset returns to two classic wagons and clears the saved consist (7.0s)
  ok 3 [tablet] ... A5: extras inherit loco paint, new wagons spawn stock, and sticker flow is unchanged (5.4s)

  3 passed (26.2s)
```

All three e2e tests call `watchConsoleErrors(page)` from `e2e/helpers.ts` and finish with `expect(errors, ...).toEqual([])`. **Zero page console errors / page errors** is therefore part of each pass. The Vite `configLoader: 'native'` and `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` lines are WebServer warnings, not browser console errors; `watchConsoleErrors` filters only the allowlisted WebKit `blob:` fetch noise and never filters `pageerror`.

## Tests

### Unit (mandatory Red→Green, `src/state/persistence.test.ts`)

- Consist length and per-wagon rack are serialized into the saved snapshot.
- A no-op consist tap does not cause a storage rewrite (content-equality guard).
- Reset returns count 2 / all-classic rack / classic pair preset, notifies reset listeners once, saves once, and omits `wagonCount`, `wagonOutfits`, and `consist` from the persisted snapshot.

### E2E (`e2e/longer-trains-persist.spec.ts`, 3 tests)

1. **P4.T1 + byte-identical reload proof** — two `+` taps grow the consist to four; chip 1 + `coal`, chip 2 + `tank` dress only those slots while the pair preset stays `classic`. Store is `{ count: 4, outfits: ['classic','coal','tank','classic'], preset: 'classic' }`; the scene witness agrees; the real IDB `current` snapshot carries both fields; after `page.reload()` both store and per-wagon scene state (`preset` and `bodyHex`) are byte-identical. Note: the last wagon chip *unhitches* rather than selects, so interior chips are used to keep four wagons.
2. **Reset to pair + persisted clear** — set a `container` pair, four wagons, `coal`/`tank` slot dresses; wait for both scene and storage; hold the parent gate and give the required second confirm tap; assert count 2, all-classic rack, classic pair preset in the store and scene, and `wagonCount`, `wagonOutfits`, `consist` all `undefined` in the IDB snapshot.
3. **A5 cross-feature contract** (below).

## A5 livery cross-feature mechanic — explicit choice

Phase 3 already made extras inherit the locomotive's paint and stickers through `applyLiveryToRig` in `src/scene/train-fleet.ts`. Phase 4 **keeps that scene-side mechanic unchanged** and records it as the chosen cross-feature contract:

- No silent migration: painting or stamping the loco never writes a paint or sticker into any stored per-wagon outfit slot. `wagonOutfits` stays an all-classic rack for new wagons.
- Sticker arm-then-stamp is unchanged: a shape is armed in the drawer and lands only when a drawer vehicle is tapped. The loco stamp is reflected on the consist by the existing scene binding, but no extra sticker entry is created for a wagon and no second stamp is recorded on the tapped loco.
- New wagons spawn with stock `classic` outfits; the scene then paints them with the loco's current paint and (when they have none of their own) the loco's stickers.
- Evidence: the A5 test paints the loco `cherry` (`#e8553f`), stamps `star`, adds two wagons, and asserts all four wagons' witness `bodyHex === '#e8553f'`, all four presets remain `classic`, the loco visible sticker set and stamp count are unchanged, and the lead wagon's visible sticker set / anchors are unchanged. (The witness's `stamps` counter is an animation-play counter: a re-dressed wagon mesh starts a fresh binding, so only the visible sticker set is compared for wagons.)

## Deviations

| File | Reason |
|---|---|
| `src/state/persistence.test.ts` | The brief's Touches list omits it, but mandatory TDD Red→Green unit assertions require a home; it is the existing persistence unit-test file. |
| `src/scene/train-fleet.ts` | Outside the brief's Touches; a 3-line DEV-only `bodyHex` field on the existing `consistWitness` was the minimal change needed to assert the A5 extra-inheritance mechanic against actual scene materials. No production dress/paint logic changed. |

`src/main.ts` is in the brief's Touches but was not edited: restoring before watchers attach is already satisfied by the existing boot order, and a gratuitous rewrite was avoided.

## Commands run (chronological)

| # | Command | Exit |
|---|---|---|
| 1 | `pnpm check` — RED (2 of 1124 tests failed: missing persisted wagon fields; reset count 4 instead of 2) | 1 |
| 2 | `pnpm exec vitest run src/state/persistence.test.ts` — permission denied; not retried | denied |
| 3 | `pnpm check` — GREEN after `world.ts` / `persistence.ts` edits (1124 passed) | 0 |
| 4 | `pnpm check` — Biome formatting feedback on new e2e spec (2 locations) | 1 |
| 5 | `pnpm check` — formatting fixed; TS2322 in `waitReady` (`Promise<JSHandle<boolean>>`) | 1 |
| 6 | `pnpm check` — `waitReady` wrapped in an `async` block with `await` | 0 |
| 7 | `pnpm exec playwright test e2e/longer-trains-persist.spec.ts` — first run: 1 passed, 3 failed (last-chip unhitch, container pair expectation, volatile sticker frame count) | 1 |
| 8 | `pnpm check` — after e2e assertion fixes | 0 |
| 9 | `pnpm exec playwright test e2e/longer-trains-persist.spec.ts` — second run: 1 passed, 2 failed (parent-gate hold click suppressed; re-dressed wagon stamp counter reset) | 1 |
| 10 | `pnpm check` — after second round of e2e fixes | 0 |
| 11 | `pnpm exec playwright test e2e/longer-trains-persist.spec.ts` — final: 3 passed, zero console errors | 0 |
| 12 | `git status --short` | 0 |
| 13 | `git diff --stat` | 0 |

Fix-attempt budget: the first failed e2e run received one fix round, the second failed e2e run received the second and final fix round; the final run passed.

## Working tree at hand-off

```
 M src/scene/train-fleet.ts
 M src/state/persistence.test.ts
 M src/state/persistence.ts
 M src/state/world.ts
?? e2e/longer-trains-persist.spec.ts
```

`git diff --stat`: 4 tracked files changed, 81 insertions, 3 deletions; new e2e file untracked. **No commits created.**

## Primary verification (independent re-run, 2026-11-28)

- Tree vs `phase_base c7e5a3c` holds only the four modified files plus the new
  spec and this evidence file — matches. `src/ui/train-picker.ts` untouched:
  ACCEPTED, not a gap — Phase 2 already routes preset taps through
  `selectWagonOutfit` when a chip is selected (`train-picker.ts` lines
  398–401), and the P4.T1 reload test proves the end-to-end path.
- `src/main.ts` untouched: ACCEPTED — boot already restores before watchers
  attach; no gratuitous edit needed.
- Deviations ACCEPTED: `src/state/persistence.test.ts` (mandatory TDD home)
  and the 3-line DEV-only `bodyHex` witness in `src/scene/train-fleet.ts`
  (A5 scene proof, deleted on dispose with the existing witness).
- `pnpm check` re-run: exit 0 — 63 files / 1124 tests passed.
- `pnpm exec playwright test e2e/longer-trains-persist.spec.ts` re-run:
  exit 0 — 3 passed (tablet), zero console errors via the spec gates.
- A5 choice recorded: extras inherit loco paint/stickers scene-side, no silent
  migration into outfit slots, arm-then-stamp unchanged, new wagons spawn
  stock. `classic`-as-sentinel limitation carried forward unchanged.
