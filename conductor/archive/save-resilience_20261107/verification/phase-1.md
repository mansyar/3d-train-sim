# Phase 1 — Forgiving snapshot parsing — Verification

- **Track:** save-resilience_20261107
- **Phase:** 1 — Forgiving snapshot parsing
- **Date:** 2026-11-07
- **Branch:** `fix/save-resilience_20261107`
- **Base commit:** `83c8fea48dad16ca68e46c04f572a02d3c27423f`
- **Head commit (verified):** `0020f6d198fbd95418fad0b1ebc0ce43dd2aac31`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm exec biome check .` (first leg of `pnpm check`) | 0 | 160 files checked; no findings |
| static | `pnpm exec tsc --noEmit` (second leg of `pnpm check`) | 0 | No type errors |
| unit | `pnpm test` (third leg of `pnpm check`) | 0 | 41 files, 767 tests passed |
| phase verification | `pnpm check` | 0 | Biome, typecheck, and the full Vitest suite passed |
| coverage | `pnpm test:coverage` | 0 | 97.22% statements / 90.99% branches / 98.02% functions / 99.41% lines (80% gate met); `src/core/save.ts` 93.75% statements, 93.02% branches |

### Red step (test-first)

Before the fix, the regression test alone was run through `pnpm check`:
exit `1`, `src/core/save.test.ts` `1 failed | 757 passed`. The test expected the
ten valid pieces from a v3 payload containing one malformed piece and received
`[]`, reproducing the all-or-nothing bug. After the fix, the same command exits
`0` with 767 passing tests.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | A v3 snapshot with 10 valid pieces and 1 malformed piece loads 10 pieces with 1 dropped and status `salvaged`. | `save.test.ts` → "salvages the valid pieces from a v3 snapshot with one malformed entry" | pass |
| AC-2 | Two pieces on the same cell keep the first, drop the second, and count one duplicate. | `save.test.ts` → "keeps the first claimant of a duplicated cell and counts the later ones"; "keeps the first claimant of a duplicated cell and drops the rest" | pass |
| AC-6 | Status and counts are observable in tests for all four statuses. | Parse layer exposes `clean` / `salvaged` / `unreadable` with `droppedPieces`, `droppedScenery`, `droppedDuplicates`; all three are asserted in `save.test.ts`. `restored` / `fresh` are the Phase 2 persistence mapping (per plan) and are not produced by this layer. | pass (phase scope) |
| AC-8 | Both slots corrupt or absent → starter meadow, no thrown error, status `fresh`. | `save.test.ts` → "reserves unreadable for structurally broken snapshots" proves an empty world with status `unreadable` and no throw; Phase 2 maps unreadable to `fresh`. | pass (phase scope) |
| AC-9 | v1, v2, and v3 fixtures each load to their expected world with status `clean`. | `save.test.ts` → "loads v1, v2, and v3 fixtures to their expected worlds with status clean" | pass |

Requirement coverage: FR-1 (per-entry pieces) / FR-2 (keep-first duplicates) /
FR-6 (status + dropped counts) / FR-8 (unreadable snapshot stays harmless) /
FR-9 (v1–v3 fixtures) / NFR-1 (totality/fuzz) all map to the tests above and to
the fuzz test "never throws and always reports a defined status for hostile
input".

## Tests added or updated

- Regression: malformed v3 entry returns the ten valid pieces, `salvaged`, and
  one dropped piece.
- Empty `pieces`/`scenery` is a valid `clean` world.
- Structurally broken payloads are `unreadable` with zero dropped counts.
- Keep-first duplicate cells (pieces before scenery) and duplicate piece ids.
- Capacity overflow keeps `MAX_PIECES` accepted entries and counts the rest;
  pieces win the shared capacity over scenery.
- Invalid scenery is filtered while valid scenery is kept.
- v1/v2/v3 fixtures load clean.
- Seeded fuzz over 250 hostile JSON-shaped values plus primitives, symbols, and
  bigints: no throw and a defined status every time.
- Updated the former duplicate-cell and over-capacity rejection tests to the
  salvage expectations, and renamed the v1 broken-piece test to match.

## Evidence paths

- `src/core/save.ts` — `parseWorldSnapshot` and the `deserializeWorld` wrapper
- `src/core/save.test.ts` — recovery, duplicate, capacity, fixture, and fuzz tests
- `conductor/tracks/save-resilience_20261107/verification/phase-1.md`

## Deviations

None. Only the two files in `Touches` changed.

## Notes

- The shared capacity (`MAX_PIECES`, 64) now applies to accepted entries, so
  malformed and duplicate entries cannot consume a slot that a valid later
  entry needs.
- `droppedDuplicates` counts both duplicate cell claims and duplicate piece
  ids; each dropped entry is counted once.
- `deserializeWorld` remains exported and is now a thin wrapper over
  `parseWorldSnapshot(value).world`; its `WorldData` shape and valid-input
  behavior are unchanged.
- `SNAPSHOT_VERSION` and the v1→v2 river migration were not touched.
- The only uncovered line in `save.ts` (93.75% statements) is the pre-existing
  out-of-bounds branch in `parseCell`.

## Primary verification

- **Command:** `pnpm check`
- **Exit code:** 0
- **Result:** Biome checked 160 files with no findings, `tsc --noEmit` reported
  no errors, and Vitest passed 41 files / 767 tests.
- **Tree:** `git status --porcelain` clean before verification.
- **Diff:** `83c8fea..HEAD` touched only `src/core/save.ts`,
  `src/core/save.test.ts`, and this evidence file — inside `Touches`.
- **Diff review:** capacity is checked before push and only accepted entries
  consume a slot; duplicate detection runs before insert; `deserializeWorld`
  keeps its `WorldData` contract; `SNAPSHOT_VERSION` and the v1 migration are
  untouched.

