# Phase 2 Verification — Calibrated FPS floor and hard gate

- **Track:** `perf-budget_20261111` (Performance Budget)
- **Phase:** 2 — Calibrated FPS floor and hard gate
- **Date:** 2026-11-18
- **Branch:** `feat/perf-budget_20261111`
- **Phase base commit:** `8312b5fc484ba81180f15ed457f69e59dabe0aaa`
- **Head commit (code):** `7685ea6` (`test(perf): add calibrated FPS floor hard gate and negative proofs`)
- **Head commit (evidence):** this file is committed immediately after the code
  commit `7685ea6`, in a dedicated evidence commit by the primary/subagent flow.

## Result

**verified** — All Phase 2 work is implemented, the exact verification command
passed verbatim (exit 0, 4/4 tests green, both negative paths witnessed), and the
primary ran the supplementary `CI=1` confirmation with the same command (exit 0,
4/4 green). No code, test, or verification failure is outstanding and there are
no blockers.

## Calibration (FR-4, NFR-5, AC-4)

Six raw ticks/second observations from Phase 1 (three subagent, three primary
`CI=1`), plus derived statistics:

| # | Sample source | ticks/second |
| --- | --- | --- |
| 1 | Phase 1 subagent | 27.40 |
| 2 | Phase 1 subagent | 20.70 |
| 3 | Phase 1 subagent | 26.79 |
| 4 | Phase 1 primary (`CI=1`) | 23.81 |
| 5 | Phase 1 primary (`CI=1`) | 21.81 |
| 6 | Phase 1 primary (`CI=1`) | 25.76 |

| Statistic | Value |
| --- | --- |
| Minimum | 20.70 |
| Maximum | 27.40 |
| Mean | 24.38 |
| Population σ | 2.49 |
| `min − 2σ` | `20.70 − 4.99 = 15.71` |
| Chosen floor (`FPS_FLOOR_TICKS_PER_SECOND`) | **15** (15.71 rounded down to a clean integer) |
| Headroom (min → floor) | `20.70 − 15 = 5.70` ticks/second (~27.5% above the floor) |

The conservative all-sample minimum (20.70) is used rather than the
`CI=1`-only minimum (21.81). GitHub CI remains the authority; any lower sample
triggers a fix round, not a waiver. Frame cadence is computed from the twelve
`frameSystems()` tick counters as
`(sum(end.ticks) − sum(start.ticks)) / systemCount / elapsedSeconds`, with both
reads at the same point in a `requestAnimationFrame` callback.

## Commands

| Layer | Exact command | Exit code | Summary |
| --- | --- | --- | --- |
| Full verification (exact, verbatim) | `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 0 | All three stages green; `4 passed (11.5s)` on `[tablet]`. |
| check | `pnpm check` (Biome + tsc + vitest) | 0 | Biome 197 files, no fixes/errors; `tsc --noEmit` clean; 57 files / 1009 tests passed. |
| build | `pnpm build` | 0 | Vite 8.3.6, 115 modules, `dist/` regenerated (178 precache entries). Only pre-existing config-loader / chunk-size warnings. |
| Playwright | `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 0 | 4 passed: 1 frame-contract + 3 perf-budget, all `[tablet]`. |
| CI confirmation (supplementary, primary-run) | `$env:CI='1'; pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 0 | Primary set `CI=1` in the environment and ran the exact command unchanged: Biome 197 files, 57 files / 1009 tests, Vite build + 178-entry PWA precache, `4 passed (12.4s)` on `[tablet]`. |

**Environments:** the exact command was executed verbatim in a local shell
without `CI` set, and the primary re-ran the same command with `CI=1` set in the
environment. Web servers were started by Playwright's `webServer` config on
ports 5199/5198.

### Live ticks/second values (exact verification run)

| Sample | ticks/second | Systems | Elapsed (s) | Tick progress |
| --- | --- | --- | --- | --- |
| 1 | 20.70 | 12 | 2.029 | 504 |
| 2 | 21.49 | 12 | 2.001 | 516 |
| 3 | 25.54 | 12 | 2.036 | 624 |

All three samples ≥ 15 ticks/second floor. Interactive mark `startTime = 1358 ms`
(≤ 5000 ms budget). Recorded to stdout and to the `perf-budget-hard-gate` JSON
attachment (`{ markMs, markLimitMs, floorTicksPerSecond, ticksPerSecond }`).

Playwright stdout (verbatim, relevant lines):

```
interactive mark startTime: 1358 ms (budget <= 5000 ms)
frame tick sample 1: 20.70 ticks/s (12 systems, 2.029 s, 504 tick progress)
frame tick sample 2: 21.49 ticks/s (12 systems, 2.001 s, 516 tick progress)
frame tick sample 3: 25.54 ticks/s (12 systems, 2.036 s, 624 tick progress)
FPS floor: 15 ticks/second
ticks/second samples: 20.70, 21.49, 25.54
late-mark negative run threw: interactive mark startTime 5001 ms exceeds 5000 ms budget
low-tick negative run threw: frame ticks/second 14.9 below floor 15
```

### Primary `CI=1` confirmation values

The primary re-ran the unchanged command with `CI=1` set in the environment
(verbatim handoff in the phase brief). All three samples clear the floor:

| Sample | ticks/second | Systems | Elapsed (s) | Tick progress |
| --- | --- | --- | --- | --- |
| 1 | 21.62 | 12 | 2.035 | 528 |
| 2 | 22.40 | 12 | 2.009 | 540 |
| 3 | 25.65 | 12 | 2.027 | 624 |

Interactive mark `startTime = 1312 ms` (≤ 5000 ms). Both negative proofs threw
the same exact messages as the non-`CI` run, and all 4 tests passed in 12.4 s.

### Negative-run proof messages (FR-5, AC-5, AC-6)

Both failure paths are demonstrated through the same pure `assertBudget`
helper used by the live test, and each proof passes as a regression test:

- Late mark, synthetic `markMs = 5001`, `ticksPerSecond = 25` → exact thrown
  message: `interactive mark startTime 5001 ms exceeds 5000 ms budget`.
- Low tick count, synthetic `ticksPerSecond = 14.9`, `markMs = 1000` → exact
  thrown message: `frame ticks/second 14.9 below floor 15`.

## Acceptance criteria (Phase 2 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | At least three raw tick/second samples and the derived floor with headroom recorded in evidence. | Six raw samples above; σ 2.49; `min − 2σ = 15.71` → floor 15; 5.70 ticks/s (~27.5%) headroom. | pass |
| AC-5 | A deliberately low tick count makes the FPS assertion fail; negative run recorded. | `assertBudget({ markMs: 1000, ticksPerSecond: 14.9 })` throws `frame ticks/second 14.9 below floor 15`; proof test passed and message logged above. | pass |
| AC-6 | A deliberately late mark makes the interactive assertion fail; negative run recorded. | `assertBudget({ markMs: 5001, ticksPerSecond: 25 })` throws `interactive mark startTime 5001 ms exceeds 5000 ms budget`; proof test passed and message logged above. | pass |
| AC-7 | Full verification matrix is green on the final branch. | Exact command exit 0 (`4 passed (11.5s)`); primary `CI=1` re-run exit 0 (`4 passed (12.4s)`); `pnpm check` (197 files, 1009 unit tests) and `pnpm build` green in both runs. | pass |
| AC-8 | Diff contains no production/player-facing change, telemetry, new key, or dependency change. | Phase 2 diff is only `e2e/perf-budget.spec.ts` + this evidence file. No source, config, dependency, quality-threshold, kid-UI, parent-gate, viewport or a11y change. | pass |
| AC-9 | Spec and evidence explicitly leave manual-device frame-rate feel to the human check. | The hard-gate spec header and this evidence state that the CI floor is a software-renderer regression guard, not real-device proof; manual-device feel remains human-only (NFR-4). | pass |

## Evidence paths

- `e2e/perf-budget.spec.ts` — new `@ci` tablet hard gate: mark ≤ 5000 ms, three
  ~2 s `frameSystems()` tick samples ≥ floor 15, fail-closed guards, pure
  `assertBudget` helper, and two passing negative-proof tests.
- `conductor/tracks/perf-budget_20261111/verification/phase-1.md` — source of the
  six raw samples and the calibration input.
- `conductor/tracks/perf-budget_20261111/verification/phase-2.md` — this report.
- Playwright stdout and the `perf-budget-hard-gate` JSON attachment recorded by
  `test.info().attach` in the passing run.

## Deviations / notes

- **No deviations from `Touches`.** Only `e2e/perf-budget.spec.ts` and this
  evidence file were changed in Phase 2.
- **No production or dependency change.** `PERF_HEALTHY_FPS`, `PERF_STRAINED_FPS`,
  the quality controller, kid UI, parent gate, viewport, zoom, a11y, storage keys
  and telemetry are untouched. No new import, network call, or production API.
- **Manual-device frame-rate feel remains human-only (NFR-4, AC-9).** The CI
  floor is a software-renderer regression guard, never a claim of real-device
  proof.
- **Production absence of the mark was already proven in Phase 1** (literal grep
  of `dist/` returned 0 matches); Phase 2 adds no new mark and does not re-litigate
  that check.
- **Fail-closed:** the live test rejects a missing dev scene handle, zero frame
  systems, non-positive elapsed time, zero tick progress, and a missing/duplicate
  or invalid interactive mark — none can pass vacuously.
- **Floor is fixed by the brief** (`min − 2σ = 15.71` rounded down to 15); no
  alternate floor was invented and no source constant was changed.

## Primary verification

- Worktree clean before verification; `git diff --name-only
  8312b5fc484ba81180f15ed457f69e59dabe0aaa..HEAD` = `e2e/perf-budget.spec.ts`
  and this evidence file, exactly the phase Touches. Commits in range were
  `7685ea6`, `e17cdad` and `85539a5`, matching the subagent report; no merge
  commits.
- Re-ran the exact verification command with `CI=1` on final head `85539a5`:
  `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts`
  → exit 0. Biome 197 files no fixes, tsc clean, 57 files / 1009 tests, Vite +
  PWA build green (178 precache entries), 4 passed on `[tablet]` in 13.7 s.
- Final `CI=1` live values: mark 1779 ms; ticks/s 17.34, 15.49, 20.94 (12
  systems, ~2.0 s windows, tick progress 420 / 372 / 504). The second sample
  (15.49) is the lowest observation so far and came within 0.49 ticks/s of the
  floor; it still passed. Per the spec assumption, GitHub CI remains the
  authority and any lower sample triggers a fix round rather than a waiver. This
  risk is recorded for review and the PR; no floor was changed reactively.
- Both negative proof messages reproduced again:
  `interactive mark startTime 5001 ms exceeds 5000 ms budget` and
  `frame ticks/second 14.9 below floor 15`.
- AC-4 through AC-9 all satisfied. Deviation accepted: none.

