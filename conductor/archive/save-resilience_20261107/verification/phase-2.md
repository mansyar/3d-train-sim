# Phase 2 — Two-slot atomic persistence — Verification

- **Track:** save-resilience_20261107
- **Phase:** 2 — Two-slot atomic persistence
- **Date:** 2026-11-07
- **Branch:** `fix/save-resilience_20261107`
- **Base commit:** `8014eabf4e9f1407a5b40ca38aac21cd47bb5512`
- **Head commit (verified):** `f5d61f1c148a75ab7f3b53e0c47190f8a304e113`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| red step | `pnpm test` | 1 | 11 new storage tests failed for the expected reasons; 766 other tests passed |
| static | `pnpm exec biome check .` (first leg of `pnpm check`) | 0 | 160 files checked; no findings |
| static | `pnpm exec tsc --noEmit` (second leg of `pnpm check`) | 0 | No type errors |
| unit | `pnpm test` (third leg of `pnpm check`) | 0 | 41 files, 777 tests passed |
| phase verification | `pnpm check` | 0 | Biome, typecheck, and the full Vitest suite passed |
| coverage | `pnpm test:coverage` | 0 | 97.25% statements / 90.84% branches / 98.03% functions / 99.42% lines (80% gate met); `src/state/persistence.ts` 91.37% statements, 73.07% branches, 83.33% functions, 94.44% lines |

### Red step (test-first)

The storage tests were written and run before the implementation:

```text
$ pnpm test
× loads null when storage is empty or unavailable
× reports a clean snapshot after one read
× reports a salvaged snapshot with its dropped counts
× restores the previous snapshot when current is unreadable
× restores a salvaged previous snapshot with its counts
× falls back to fresh when both slots are unreadable or missing
× promotes the prior current snapshot into previous in one transaction
× writes only current on the first save
× after two saves previous holds the state before the last change
× never promotes an unreadable current into previous
× keeps the recovered world as the previous baseline after a restore

Tests  11 failed | 766 passed (777)
```

The failures were exactly the missing behaviour: `loadWorldRecovery is not a
function`, no `db.transaction` call on save, and no `previous` slot after two
saves. After the implementation the same suite exits `0` with 777 passing.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | With an unreadable current and a valid previous, the previous world loads with status `restored`. | `persistence.test.ts` → "restores the previous snapshot when current is unreadable"; "restores a salvaged previous snapshot with its counts" | pass |
| AC-4 | After two consecutive saves, the previous slot holds the state before the last change; an interrupted write leaves a consistent pair. | `persistence.test.ts` → "after two saves previous holds the state before the last change"; "promotes the prior current snapshot into previous in one transaction". The pair is written in one `readwrite` transaction, so IndexedDB commits both or neither; the mock cannot simulate a mid-commit abort, so atomicity rests on the single-transaction shape asserted by `transaction('worlds', 'readwrite')` and `tx.done`. | pass |
| AC-5 | After a recovery, the next save promotes the recovered world into previous — never the corrupt payload. | `persistence.test.ts` → "keeps the recovered world as the previous baseline after a restore"; "never promotes an unreadable current into previous" | pass |

Requirement coverage: FR-3 (fallback to `previous`) / FR-4 (one transaction,
prior current promoted) / FR-5 (unreadable prior never promoted) / NFR-2 (at
most two puts per save) / NFR-3 (only `current` and `previous` exist) / NFR-4
(all 777 tests, coverage gate met) / NFR-5 (read-count budget below).

## NFR-5 read-count observation

- A clean boot performs **one** `db.get` (`current`); the fallback adds a
  second read only when `current` is missing or unreadable. Both paths are
  asserted directly (`expect(db.get).toHaveBeenCalledTimes(1)` and `...2`), and
  the loader never exceeds two.
- No timing measurement is claimed here. The added work on the happy path is a
  single `parseWorldSnapshot` call over the already-read payload, so it is a
  parse cost, not an extra IndexedDB round trip. The extra round trip only
  occurs on a damaged save, which is the exceptional path NFR-5 budgets for.
- Observation for Phase 3: `src/main.ts` currently calls `loadWorldSnapshot()`
  twice in `import.meta.env.DEV` (hydration and the `__tinyTracksReady` probe).
  That doubles the dev-only read count; production performs one boot read. The
  duplicate call is outside this phase's `Touches` and is left for Phase 3.

## Tests added or updated

- Replaced the flat `get`/`put` mock with an IndexedDB stand-in whose single
  `worlds` store is shared by `db.get` and the transaction's
  `store.get` / `store.put` / `done`.
- Clean current: status `clean`, zero counts, one read.
- Salvaged current: status `salvaged` with dropped counts, raw payload kept.
- Unreadable current + valid previous: status `restored`, previous payload,
  two reads.
- Unreadable current + salvaged previous: status `restored` with counts.
- Both slots unreadable/missing: status `fresh`, `snapshot: null`, no throw;
  a rejected `openDB` also yields `fresh`.
- First save writes only `current`; a later save writes the prior `current`
  into `previous` and the new snapshot into `current` in one transaction.
- Two saves leave `previous` at the state before the last change and only two
  keys in storage.
- An unreadable prior is never promoted; `previous` keeps the last good world.
- Save failures (open rejection and a throwing `transaction`) resolve without
  throwing.

## Evidence paths

- `src/state/persistence.ts` — `PREVIOUS_KEY`, `loadWorldRecovery`,
  `WorldRecovery`/`WorldRecoveryStatus`, `loadWorldSnapshot` wrapper,
  transactional `saveWorldSnapshot`
- `src/state/persistence.test.ts` — storage harness and the recovery/save tests
- `conductor/tracks/save-resilience_20261107/verification/phase-2.md`

## Deviations

None. Only the two files in `Touches` changed.

## Notes

- `DATABASE_VERSION` stays `1`; `previous` is a second key in the existing
  key-value store, so no migration is needed.
- `loadWorldSnapshot()` is now a wrapper over `loadWorldRecovery().snapshot`,
  so `src/main.ts` compiles and behaves unchanged until Phase 3 switches it to
  the status-aware loader.
- A salvaged `current` still wins over `previous`: salvaging keeps every valid
  entry and matches Phase 1's stated policy. `previous` is only consulted when
  `current` is structurally unreadable.
- When `current` is unreadable but `previous` is good, the save path leaves
  `previous` untouched rather than rewriting it with the recovered bytes — the
  backup already *is* the recovered world, so one save writes one put.
- The only uncovered lines in `persistence.ts` are the pre-existing upgrade
  callback (`db.objectStoreNames.contains`) and defaulted watcher parameters,
  none of which this phase touched.
- `src/main.ts`, `src/core/save.ts`, and all UI files were left untouched;
  boot wiring remains Phase 3's.

## Primary verification

- **Command:** `pnpm check`
- **Exit code:** 0
- **Result:** Biome checked 160 files with no findings, `tsc --noEmit` reported
  no errors, and Vitest passed 41 files / 777 tests.
- **Tree:** `git status --porcelain` clean before verification (evidence file
  committed after the code commits).
- **Diff:** `8014eab..HEAD` touched only `src/state/persistence.ts`,
  `src/state/persistence.test.ts`, and this evidence file — inside `Touches`.
- **Diff review:** one `readwrite` transaction per save; promotion is skipped
  for an unreadable prior; `current` is always written; boot reads two keys at
  most; all storage paths are total.
