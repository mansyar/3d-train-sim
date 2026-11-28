# Phase 1 verification — Length model + fit rule

- **Track:** `20261128-longer-trains`
- **Phase:** 1 (Length model + fit rule) — P1.T1, P1.T2, P1.T3
- **Date:** 2026-11-28
- **Branch:** `feat/20261128-longer-trains`
- **Result:** **verified** — TDD Red → Green confirmed; `pnpm check` exits 0.

## Commands run

| # | Command | Intent | Exit | Result |
|---|---------|--------|------|--------|
| 1 | `pnpm check` | **RED** — new tests written before implementation | 1 | Biome clean (228 files); `tsc --noEmit` failed with `TS2305` (missing `DEFAULT_WAGON_COUNT`, `MAX_WAGON_COUNT`, `defaultWagonOutfits`, `consistFitsLoop`, `trainLength`), `TS2339` (missing `WorldStore.wagonCount/setWagonCount/wagonOutfits/selectWagonOutfit`, missing snapshot/data fields), `TS2554` (serializeWorld expected 2–10 args, got 12). |
| 2 | `pnpm test` | **RED** — runtime failures with the new tests only | 1 | `src/core/save.test.ts` 89 tests / 5 failed; `src/state/world.test.ts` 100 tests / 15 failed; **20 failed, 1100 passed (1120)**. Sample errors: `expected undefined to be 2`, `TypeError: store.setWagonCount is not a function`, `TypeError: trainLength is not a function`, `TypeError: consistFitsLoop is not a function`, `expected undefined to deeply equal ['classic','coal','tank',…]`. |
| 3 | `pnpm check` | **GREEN, first attempt** | 1 | One type error in a new test: `TS2322: Type 'string[]' is not assignable to type 'readonly ("classic"｜"coal"｜"container"｜"tank")[]'` at `save.test.ts:1536`. |
| 4 | `pnpm check` | **GREEN, fix 1** | 1 | One assertion mismatch: `world.test.ts:1108` expected `false` from `setWagonCount('diesel','three')`; the implemented "invalid → fall back to 2" rule correctly returns `true` when the current count was 1. Corrected the test expectation, not the model. |
| 5 | `pnpm check` | **GREEN, final** | **0** | Biome clean (228 files); `tsc --noEmit` clean; **63 test files passed, 1121 tests passed**. |
| 6 | `pnpm test:coverage` | Configured coverage gate | 0 | All 63 files / 1121 tests pass. Coverage: statements **97.23%**, branches **91.98%**, functions **97.31%**, lines **98.94%** (gate is 80% on `src/core` + `src/state`). `save.ts` 95.02/94.7/100/99.33; `world.ts` 94.82/85.43/97.18/97.26. |

A targeted `pnpm exec vitest run src/state/world.test.ts src/core/save.test.ts` was denied by the
sandbox permission policy; RED was confirmed with the permitted `pnpm check` / `pnpm test`
commands instead, so no verification gap remains.

## Acceptance criteria

| Ref | Requirement | Evidence |
|-----|-------------|----------|
| P1.T1 / FR-2 | `wagonCount(train)` + clamped `setWagonCount(train, count)` for all six locos | Uniform count stored once in `createWorldStore`; `resolveWagonCount` clamps finite numbers into 1..4 and falls back to 2 otherwise. Tests cover default 2 for all six locos, grow 2→3→4, fifth-grow no-op, unchanged-count no-op, clamp at 0/-3/99, invalid `'three'`/`NaN`, single notify per real change. |
| FR-7 | Hard gate keeps one-wagon margin to grow | `consistFitsLoop(pathLength, wagonCount)` = `pathLength >= trainLength(count) + 1`, where `trainLength = 1 loco + 1 unit/wagon`. Boundary tests: `4@2` fits, `3.9@2` does not; `5@3` fits, `4@3` does not; `6@4` fits, `5@4` does not. Non-finite inputs return `false`. Pure: no track or pathing module touched. |
| A1 / A3 | Length + outfits travel with the world snapshot | `WorldSnapshot.wagonCount?` / `wagonOutfits?` appended; `serializeWorld` writes them only when non-default; `parseWorldSnapshot` reads them forgivingly and omits defaults so legacy snapshots and existing shape assertions stay byte-identical. Round-trip test serialises → JSON → deserialises a 4-wagon mixed-outfit consist. |
| A4 | Per-wagon outfits, mix-and-match, additive and safe | Fixed four-slot `WagonPreset[]` rack (`defaultWagonOutfits`, `resolveWagonOutfits`, `resolveWagonCount` in `src/core/save.ts`); `selectWagonOutfit` dresses one slot, rejects out-of-range slots, falls back to classic for unknown presets, returns defensive copies, and survives shrink. `hydrate`, `importWorld`, and `applyPreset`/undo carry the new state. Corrupt inputs (`'four'`, `null`, `NaN`, `{}`, `true`, non-array outfits, `['coal','rocket',null,7,'tank']`, `__proto__`/`constructor` keys) never throw and never poison the rack. |
| FR-4 (storage only) | Portable export carries the new fields | `buildExport` passes count/outfits into `serializeWorld`; a test asserts both survive a JSON round trip through `buildExport`. |
| Scope | No unrelated behaviour changed | All pre-existing tests kept their exact shapes: new fields are omitted when default. `reset()` is deliberately unchanged — Phase 5 owns reset semantics. |

## Files changed

- `src/core/save.ts` — length constants + forgiving readers + additive snapshot fields.
- `src/state/world.ts` — pure length/fit functions + uniform count and per-wagon outfit store state.
- `src/core/portable.ts` — **deviation** (see below).
- `src/core/save.test.ts` — additive snapshot, round-trip, portable-export and corruption tests.
- `src/state/world.test.ts` — length model, fit gate, outfit store and undo/hydrate tests.

## Deviations

- `src/core/portable.ts` — outside the brief's `Touches`, but required by A3/FR-4: `PortableWorld`
  is declared there and `buildExport` is the only path that writes a portable file. The change is
  additive (two optional fields, two extra trailing `serializeWorld` arguments) and cannot alter
  exports that omit them.

## Primary verification (independent, 2026-11-28)

- Tree vs phase_base `c51aa37` matches Touches plus the one declared deviation:
  `M src/core/save.ts`, `M src/state/world.ts`, `M src/core/portable.ts`
  (deviation), `M src/core/save.test.ts`, `M src/state/world.test.ts`, plus the
  new evidence file. No other files touched.
- Deviation accepted: `portable.ts` diff is additive-only (two optional
  `PortableWorld` fields, two extra trailing `serializeWorld` args); required
  by A3/FR-4 since `buildExport` is the only portable writer.
- `pnpm check` re-run by the primary: exit 0 — biome 228 files clean, tsc
  clean, 63 files / 1121 tests passed.
- AC check: FR-1 (uniform 1..4 count, default 2), FR-8 (pure fit with
  one-wagon margin, boundary-tested), A1/A3 (additive snapshot, omitted when
  default, forgiving readers), A4 (fixed four-slot outfit rack, mix-and-match,
  `__proto__`-safe), FR-4 storage half (portable round-trip) — all covered by
  the evidence above. No scope deviation beyond the accepted deviation.

## Notes for the primary

- One uniform count is stored for all six locomotives; the `train` argument is kept on the store
  API for symmetry with `consistFor`/`selectConsist` and for the later UI wiring.
- The outfit rack is a fixed four-slot array so growing/shrinking never loses a dressing; only
  slots `< wagonLength` are selectable.
- `serializeWorld` gained two optional trailing parameters, so all existing callers are unaffected.
- Phase 4 must wire `snapshotOf` (in `src/state/persistence.ts`) and the grow/shrink taps; this
  phase intentionally stops at the pure model + storage.
- No commits were made, per the primary's instruction; the working tree is ready for review.
