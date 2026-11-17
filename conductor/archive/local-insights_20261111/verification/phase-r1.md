# Phase R1 Evidence — Review Fixes

- **Track:** `local-insights_20261111` (Local Insights)
- **Phase:** R1 — Review fixes (one round; max two allowed)
- **Date:** 2026-11-17
- **Branch:** `feat/local-insights_20261111`
- **Phase base (HEAD before fixes):** `75c813e09a9d1ed25c35e593310e118f110b2526`
- **Head commit (last fix commit):** `8c8b18be7b1e61e17c85895e055a588aebcfda8d`
- **Result:** verified — all three review findings (F1 Medium, F2 Medium, F3 Low) resolved; both configured commands pass with no assertion weakened.

## Summary

The reviewer's three findings are addressed without any change to storage
mechanism, privacy posture, or the `InsightsView` contract:

- **F1** — Both database helpers' v2 `upgrade` closures are now exercised
  directly. Each test file captures the callback from the mocked `openDB`'s
  third argument, asserts it opens `tiny-tracks` at version 2, and drives it
  against a tiny fake DB for empty / v1-shaped / already-migrated states.
- **F2** — The Playwright journey now simulates a genuine `visibilitychange →
  hidden` with real DOM semantics, waits for the IndexedDB write, reloads,
  re-arms and proves the completed session carries over without raising
  `Unexpected closes`. A comment in `endInsights()` records why the hidden
  transition is the reliable persist point and why the later unload hooks are
  deduplicated. No localStorage, beacon, new store, or network call was added.
- **F3** — `formatLongestSession` moved from a local closure in `main.ts` into
  pure `src/core/insights.ts`, with singular/plural wording for both units and
  exact-text tests. `main.ts` imports it; `InsightsView` is unchanged.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 1 | First attempt: TypeScript could not see `makeDb` from the new migration `describe` in `src/state/persistence.test.ts` (that helper is scoped inside a different `describe`). |
| static + unit | `pnpm check` | 0 | After replacing the out-of-scope stub with a local `dbStub()`: Biome checked 191 files clean; `tsc --noEmit` clean; Vitest 56 files / 988 tests passed (up from 975: +13 new tests). |
| e2e | `pnpm exec playwright test e2e/insights.spec.ts` | 0 | `ok 1 [tablet] › e2e\insights.spec.ts:62:1 … (19.4s)`; 1 passed (29.7s). The new clean-hide → reload step passed on the first run. |

Both configured commands were run exactly as written. No check was attempted
after a second failed iteration of either command; only `pnpm check` failed
once and was fixed on its first retry.

## Findings-to-changes table

| Finding | Concrete change | Evidence |
| --- | --- | --- |
| F1 (Medium) — untested v2 `upgrade` callback | `src/state/insights-store.test.ts` and `src/state/persistence.test.ts` each add a `v2 database migration` suite. `capturedUpgrade()` reads `openDB` call args `[0]`/`[1]`/`[2].upgrade`; four tests assert name `tiny-tracks`, version `2`, presence of the callback, both stores on an empty DB, only `insights` on a v1 DB with `worlds`, and no writes on a repeat invocation once both exist. A `makeUpgradeDb()` fake implements `objectStoreNames.contains` + `createObjectStore`; no dependency added. Triggered via `await loadInsights()` / `await loadWorldRecovery()`; `mockReset()` in `beforeEach` matches existing style. | `pnpm check` exit 0, 988/988 tests (4 new tests per file = +8). Commit `a08d4c9`. |
| F2 (Medium) — final session / clean-exit write on unload | `e2e/insights.spec.ts` gains a step after the reload assertion: it captures `uncleanExits` and the sessions text, redefines `document.visibilityState` to `'hidden'` with `Object.defineProperty(…, { configurable: true, value: 'hidden' })` and dispatches `visibilitychange`, waits 400 ms, reloads, waits for ready and re-arms via `holdGate()`, then asserts `uncleanExits` is unchanged, the session count rose by exactly one, and `longestSession` is no longer `No sessions yet.`. `src/main.ts` `endInsights()` now documents that `visibilitychange → hidden` is the reliable early persist point and that `pagehide`/`beforeunload` calls are deduplicated by the `running` guard. | Playwright exit 0 (`ok 1 … (19.4s)`, 1 passed). No localStorage, network beacon, new store or counter added. Commits `8c8b18b` (e2e) and `d0dc6a7` (comment). |
| F3 (Low) — plural wording | `src/core/insights.ts` exports `formatLongestSession(ms: number): string` with `1 minute` / `1 second` singulars, plural otherwise, and the `No sessions yet.` fallback. `src/core/insights.test.ts` adds exact-text assertions for 90 s (`1 minute 30 seconds.`), 60 s (`1 minute.`), 61 s (`1 minute 1 second.`), 1 s (`1 second.`), 30 s (`30 seconds.`) and 0 / negative / NaN / Infinity. `src/main.ts` imports the helper and the local copy is deleted. | `pnpm check` exit 0, 988/988 tests (+5 new tests). `InsightsView` untouched. Commit `d0dc6a7`. |

## Evidence paths

- `src/state/insights-store.test.ts` — `makeUpgradeDb()` / `capturedUpgrade()` helpers and the `v2 database migration` suite.
- `src/state/persistence.test.ts` — the same helpers and suite, driven through `loadWorldRecovery()` with a local `dbStub()`.
- `src/core/insights.ts` — exported pure `formatLongestSession()`.
- `src/core/insights.test.ts` — singular/plural and fallback exact-text cases.
- `src/main.ts` — imports the shared formatter, removes the local copy, documents the clean-hide persist point in `endInsights()`.
- `e2e/insights.spec.ts` — clean-hide → reload step appended to the gated-panel journey.
- Task commits: `a08d4c9` — `test(state): cover the v2 dual-store upgrade callback`; `d0dc6a7` — `fix(insights): pluralize longest-session wording and document clean-hide persist`; `8c8b18b` — `test(e2e): prove a clean hide keeps the final session without an unclean exit`.

## Deviations

- None. All six code/test files are inside the brief's `Touches`; the only
  additional file written is this phase's evidence report.

## Notes

- The e2e assertion labelled "sessions is no longer `No sessions yet.`" in the
  brief maps to the `longestSession` row: that is the only panel value produced
  by `formatLongestSession()` and therefore the only row whose text can be the
  `No sessions yet.` fallback. The `sessions` row always renders a plain
  integer, so the step also asserts the count rises by exactly one to prove
  the completed session was written before the reload.
- The migration tests assert idempotency by invoking the captured callback
  twice against the same fake: the second call must create no stores.
- The 13 new tests raised the suite from 975 to 988; no existing assertion was
  relaxed and no coverage gate or lint rule was changed.
- `plan.md` was already marked `in_progress` by the primary before this phase
  began; it was deliberately left untouched and excluded from all commits.
- This report is committed separately from the task commits as phase evidence.

## Primary verification (4.7)

- **Date:** 2026-11-17
- **Checkpoint:** `9fc1c54` (no squash — active goal prohibits `reset`; all four range commits were reported by the executor)
- Tree status: clean before primary state edits; diff `75c813e..9fc1c54` limited to the six R1 code/test files plus this evidence file (in bounds).
- `pnpm check` re-run by primary: exit 0 (Biome clean, tsc clean, Vitest 56 files / 988 tests).
- `pnpm exec playwright test e2e/insights.spec.ts` re-run by primary: exit 0 — `ok 1 [tablet] ... (28.8s)`, 1 passed (51.8s).
- F1 verified: both database helpers' `upgrade` callbacks are invoked by tests covering empty, v1 and idempotent states.
- F2 verified: clean `visibilitychange → hidden`, reload and re-arm keeps `Unexpected closes` unchanged and carries the completed session over; no new local or network storage added.
- F3 verified: `formatLongestSession()` is exported from pure core code with singular/plural exact-text tests; `main.ts` no longer holds a private copy.
- Deviations: none.
