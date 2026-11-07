# Phase R1 verification — renderer decomposition (review fixes)

Track: `renderer-decomposition_20261108`
Branch: `refactor/renderer-decomposition_20261108`
Phase base: `a1ae0d59d87f62c2f88ab503c864f325422700f1`
Date: 2026-11-07

## Commits

- `aead57c` `refactor(scene): Latch the placement hooks until the facade is wired` (F1 / R1.T1)
- `a9df236` `test(core): Hold the seven scene modules to their line budgets` (F2 / R1.T2)
- `c636f52` `test(core): Sweep every meadow cell in the grid transform test` (F3 / R1.T3)
- `b8e52a9` `refactor(scene): Dispose the renderer modules in reverse construction order` (F4 / R1.T4)
- `3351db2` `refactor(scene): Move the yaw edge helper into the catalogue and state the real import edges` (F5 / R1.T5)

## Verification command (run exactly as briefed)

### `pnpm check`

Exit code: 0 — Biome clean (184 files), `tsc --noEmit` clean, vitest
`50 files passed / 883 tests` (881 before this phase; +2 new tests: the
line-budget table test and the 256-cell sweep).

No Playwright run was started in this phase, per the brief: the primary's
integrated behaviour run owns AC-5/AC-6.

## Task results

| Task | Finding | Change | Evidence |
|---|---|---|---|
| R1.T1 | F1 | `hooksReady` latch in `src/scene/track-renderer.ts`: every placement hook (`onPieceTemplate`, `onSceneryTemplate`, `onModelReplaced`, `onModelRemoved`, `onModelAdded`, `onItemAttached`, `afterSync`) returns early until the flag flips after `startTrackCrossings` returns; comment states why (async asset callbacks today, synchronous reconcile must not crash construction) | `git show aead57c`, `tsc --noEmit` |
| R1.T2 | F2 | `LINE_BUDGETS` + `lineCount` in `src/core/import-graph.test.ts`, one table test that names every offender with count and budget; table keys pinned to `TRACK_MODULES` | `git show a9df236`; red demo below |
| R1.T3 | F3 | 16 × 16 `x`/`y` sweep in `src/core/meadow-grid.test.ts`, asserting the formula and counting 256 cells (`MEADOW_CELLS ** 2`) | `git show c636f52`; red demo below |
| R1.T4 | F4 | `dispose()` sets `disposed` first, then `crossings → ambience → ghost → placement`; standalone `ghost.endGhost()` dropped (`track-ghost.ts` `dispose()` already calls `endGhost()`); ambience already released critter life, delight motion, music-box scene and voice exactly once through its own `dispose()`, so no change there | `git show b8e52a9` |
| R1.T5 | F5 | `advancedEdge` moved verbatim to `src/scene/track-catalog.ts` (imports `nextEdge`/`Edge` from core); placement and crossings import it from the catalogue; allowlist reasons reworded to the real edges; `track-picking.ts` header now says it reads the **tracked** map only, through a type-only import of the placement handle | `git show 3351db2`; import-graph test green |
| R1.T6 | F6 | Canonical counts recorded below, measured by the budget test itself | this file |

## Test-first evidence

### R1.T2 — the budget guard bites

After the table test was green, `'track-renderer'` was temporarily set to
`100` and the suite re-run. It failed:

```
FAIL  src/core/import-graph.test.ts > scene module line budgets > holds the facade and its six modules to their AC-1 budgets
AssertionError: expected [ Array(1) ] to deeply equal []

+ [
+   "track-renderer.ts is 194 lines, over its 100-line budget",
+ ]
```

The budget was restored to `200` immediately. (194 is the count at that
moment; the final tree measures 193 because the T4 `disposed` flag moved up
next to the latch and one blank line went with it. Both numbers use the same
metric.)

### R1.T3 — the sweep bites

The formula is affine, so the new sweep is green against the current
implementation. To show it is not vacuous, the implementation was
temporarily perturbed (`cell.x + 0.5` → `cell.x + 0.5001`) and the suite
re-run; five `cellToWorld` tests failed, including:

```
FAIL  src/core/meadow-grid.test.ts > cellToWorld > maps every one of the 16 × 16 cells by the same formula
AssertionError: expected { x: -28.124625, z: -28.125 } to deeply equal { x: -28.125, z: -28.125 }
```

The perturbation was reverted before the R1.T3 commit (`git status` clean
before each commit).

### R1.T1 — test gap, stated plainly

No unit test was added. A placement stub that invokes a hook synchronously
needs a WebGL/DOM harness (three.js `Scene`, `GLTFLoader`, `matchMedia`,
`requestAnimationFrame`) that this repo does not have; per the brief, the
gap is recorded here instead of building one. The latch is structural and is
covered by `tsc --noEmit` plus the existing Playwright smoke specs at
integration.

## Canonical line counts (AC-1)

Metric, exactly as implemented and commented in
`src/core/import-graph.test.ts`:

```
content.replace(/\n$/, '').split('\n').length
```

i.e. lines as split by `\n` on a trimmed trailing newline, so the number does
not depend on whether an editor wrote a final newline. Measured at
`3351db2` by temporarily setting every budget to `1` and reading the failure
message (restored to the real budgets in the same commit):

| Module | Lines | Budget |
|---|---:|---:|
| `src/scene/track-renderer.ts` | 193 | ≤ 200 |
| `src/scene/track-placement.ts` | 394 | ≤ 400 |
| `src/scene/track-crossings.ts` | **400** | ≤ 400 |
| `src/scene/track-ambience.ts` | 221 | ≤ 400 |
| `src/scene/track-ghost.ts` | 176 | ≤ 400 |
| `src/scene/track-picking.ts` | 119 | ≤ 400 |
| `src/scene/track-catalog.ts` | 199 | ≤ 400 |

`track-crossings.ts` sits exactly on the cap, so any further edit to it
fails `pnpm check` until a line is removed — that is the gate doing its job.

**Why the documents disagreed.** The previous counts in `plan.md` (158/210)
and the phase file were measured by hand with different tools (file reader,
`Measure-Object -Line`, editors that do or do not count a final newline), so
`track-renderer.ts` read 158, 167 and 194 across three documents. That manual
measurement has been replaced by the assertion above; the numbers in this
table are the canonical ones for the track and should be the only counts
quoted from here on.

## Deviations

None. No file outside the brief's Touches was modified; `conductor/**` was
touched only for this evidence file.

## Notes for the primary

- **Do not re-run the phase locally with Playwright** — the brief reserved
  the behaviour suite for the primary's integrated verification.
- **Behaviour to watch:** the latch and the dispose reorder are the only
  runtime changes. The `hooksReady` early returns can only skip a reaction
  that would fire *during* construction (impossible with async GLTF loads);
  dispose now tears down crossings before placement, matching the spec's
  reverse-order edge case, and `ghost.dispose()` still ends the ghost exactly
  once.
- **F5 was a clean move:** `advancedEdge` was a pure helper over `nextEdge`
  with no closure over placement state, so no deviation was needed.
- **Suggested evidence to quote:** the canonical table above replaces the
  manual table in the phase-6 file; `plan.md`'s 158/210 should be corrected to
  193 and 221 (and the six-module table refreshed from the counts above) when
  the primary syncs Conductor state.
