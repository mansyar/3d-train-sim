# Phase R1 Verification — Recalibrate FPS floor against GitHub CI

- **Track:** `perf-budget_20261111` (Performance Budget)
- **Phase:** R1 — Review fix round 1 (CI calibration)
- **Date:** 2026-11-18
- **Branch:** `feat/perf-budget_20261111`
- **Brief phase base commit:** `59a7c32`
- **Actual HEAD at phase start:** `9fb2bb9` (`conductor(plan): Mark Phase R1 as in progress`)
  — the primary added this state commit after the brief was written; it is a
  Conductor-state-only commit and is not part of this fix.
- **Head commit (code):** `6d91178` (`fix(perf): recalibrate FPS floor to 2.5 ticks/s from GitHub CI samples`)
- **Head commit (evidence):** this file, committed immediately after `6d91178`.

## Result

**verified** — `FPS_FLOOR_TICKS_PER_SECOND` was recalibrated from the local
software-rendered floor of 15 to the GitHub-CI-derived floor of 2.5, and the
low-tick negative proof was updated from 14.9 to 2.4 so it still proves a value
below the new floor fails. The exact verification command passed verbatim
(exit 0; 4/4 tests green; both negative-proof messages witnessed). No code,
test, or verification failure is outstanding and there are no blockers.

## CI failure excerpt (authoritative, from GitHub Actions)

PR #81, run `44283047563`:

- `Gate · e2e shard 1/2` failed after 10m5s. The live test
  `e2e/perf-budget.spec.ts:78` reported
  `Error: frame ticks/second 2.649006622516556 below floor 15` and the
  observation spec recorded `ticks/second samples: 2.79, 2.74, 2.72`.
  The interactive mark was healthy (`1969 ms < 5000 ms`). The two
  negative-proof tests passed.
- `Gate · audit`, `Gate · biome + typecheck`, and `Gate · vitest` all passed.

Conclusion: the floor of 15 was calibrated from local software-rendered samples
(15.49–27.40), but the authoritative GitHub CI software renderer sustains only
~2.65–2.79 ticks/s. Spec edge case "GitHub CI slower than local `CI=1`
observations: any lower sample triggers a fix round rather than a waived gate"
applies; this is that fix round.

## Calibration — six GitHub CI samples (FR-4, NFR-5, AC-4)

All samples are from run `44283047563`, shard 1/2. Per the brief, these are the
authoritative CI numbers; no local number is substituted for them.

| # | Sample source | ticks/second |
| --- | --- | --- |
| 1 | Observation spec (12 systems, ~2.1 s window) | 2.79 |
| 2 | Observation spec (12 systems, ~2.1 s window) | 2.74 |
| 3 | Observation spec (12 systems, ~2.1 s window) | 2.72 |
| 4 | Live hard-gate spec (the 2.65 sample failed the old floor) | 2.65 |
| 5 | Live hard-gate spec | 2.71 |
| 6 | Live hard-gate spec | 2.67 |

| Statistic | Value |
| --- | --- |
| Minimum | 2.65 |
| Maximum | 2.79 |
| Mean | 2.7133 |
| Population σ | 0.0457 |
| `min − 2σ` | `2.65 − 0.0914 = 2.5586` |
| Chosen floor (`FPS_FLOOR_TICKS_PER_SECOND`) | **2.5** (2.5586 rounded down) |
| Headroom (min → floor) | `2.65 − 2.5 = 0.15` ticks/s (~5.7% on the minimum sample) |

The new floor is not a waiver: it still catches a frozen loop (0 ticks/s) and a
>50% regression (≈1.3 ticks/s), and it is recalibrated against the spec's
authoritative CI environment.

## Before / after diff — `e2e/perf-budget.spec.ts`

Floor constant and derivation comment:

```diff
- * frame loop cannot sustain the calibrated ticks/second floor. The floor comes
- * from Phase 1 samples recorded in
- * `conductor/tracks/perf-budget_20261111/verification/phase-1.md`.
+ * frame loop cannot sustain the calibrated ticks/second floor. The floor is
+ * recalibrated against GitHub CI samples recorded in
+ * `conductor/tracks/perf-budget_20261111/verification/phase-R1.md`.
...
- * Floor derived from six Phase 1 ticks/second samples: min 20.70, population
- * σ 2.49; `min − 2σ = 20.70 − 4.99 = 15.71`, rounded down to a clean 15. Raw
- * samples and derivation live in `verification/phase-1.md` (and phase-2.md).
+ * Floor derived from six GitHub CI ticks/second samples (run 44283047563,
+ * shard 1/2): observation 2.79, 2.74, 2.72; hard-gate 2.65, 2.71, 2.67.
+ * min 2.65, mean 2.7133, population σ 0.0457;
+ * `min − 2σ = 2.65 − 0.0914 = 2.5586`, rounded down to 2.5. Headroom on the
+ * minimum sample is 0.15 ticks/s (~5.7%). The old floor of 15 was calibrated
+ * from local software-rendered samples; authoritative GitHub CI software
+ * rendering sustains only ~2.65–2.79. Raw samples live in `verification/phase-R1.md`.
 */
-const FPS_FLOOR_TICKS_PER_SECOND = 15;
+const FPS_FLOOR_TICKS_PER_SECOND = 2.5;
```

Low-tick negative proof:

```diff
 test('a deliberately low tick count fails the FPS assertion @ci', () => {
-  const input: BudgetInput = { markMs: 1000, ticksPerSecond: 14.9 };
-  const expected = `frame ticks/second 14.9 below floor ${FPS_FLOOR_TICKS_PER_SECOND}`;
+  const input: BudgetInput = { markMs: 1000, ticksPerSecond: 2.4 };
+  const expected = `frame ticks/second 2.4 below floor ${FPS_FLOOR_TICKS_PER_SECOND}`;
```

Summary: old floor `15` → new `2.5`; old negative `14.9` → new `2.4`. The
interactive-mark assertion, the late-mark negative proof, the sampling
window/count (`SAMPLE_WINDOW_MS = 2000`, `SAMPLE_COUNT = 3`) and the shared
`assertBudget` helper's behavior were not touched. The top-of-file doc comment
was updated only so it no longer falsely states the floor comes from
`phase-1.md`.

## Commands

| Layer | Exact command | Exit code | Summary |
| --- | --- | --- | --- |
| Full verification (exact, verbatim) | `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 0 | All three stages green; `4 passed (10.7s)` on `[tablet]`. |
| check | `pnpm check` (Biome + tsc + vitest) | 0 | Biome 197 files, no fixes/errors; `tsc --noEmit` clean; 57 files / 1009 tests passed. |
| build | `pnpm build` | 0 | Vite 8.3.6, 115 modules, `dist/` regenerated (178 precache entries). Only pre-existing config-loader / chunk-size warnings. |
| Playwright | `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 0 | 4 passed: 1 frame-contract + 3 perf-budget, all `[tablet]`. |

The exact command was executed verbatim in a local shell without `CI` set.
Per the project Windows note (`conductor/workflow.md`), the `check` script omits
`CI=true` and `vitest run` is single-run regardless of environment. Web servers
were started by Playwright's `webServer` config on ports 5199/5198.

### Live ticks/second values (exact verification run)

| Sample | ticks/second | Systems | Elapsed (s) | Tick progress |
| --- | --- | --- | --- | --- |
| 1 | 26.36 | 12 | 2.011 | 636 |
| 2 | 27.13 | 12 | 2.027 | 660 |
| 3 | 30.97 | 12 | 2.002 | 744 |

All three local samples clear the new floor; the local software renderer is much
faster than GitHub CI, which is why the floor is calibrated from the authoritative
CI samples above rather than these local values. Interactive mark
`startTime = 1100 ms` (≤ 5000 ms budget). Recorded to stdout and to the
`perf-budget-hard-gate` JSON attachment
(`{ markMs, markLimitMs, floorTicksPerSecond, ticksPerSecond }`).

Playwright stdout (verbatim, relevant lines):

```
interactive mark startTime: 1100 ms (budget <= 5000 ms)
frame tick sample 1: 26.36 ticks/s (12 systems, 2.011 s, 636 tick progress)
frame tick sample 2: 27.13 ticks/s (12 systems, 2.027 s, 660 tick progress)
frame tick sample 3: 30.97 ticks/s (12 systems, 2.002 s, 744 tick progress)
FPS floor: 2.5 ticks/second
ticks/second samples: 26.36, 27.13, 30.97
late-mark negative run threw: interactive mark startTime 5001 ms exceeds 5000 ms budget
low-tick negative run threw: frame ticks/second 2.4 below floor 2.5
```

### Negative-run proof messages (FR-5, AC-5, AC-6)

Both failure paths are demonstrated through the same pure `assertBudget`
helper used by the live test, and each proof passes as a regression test:

- Late mark (unchanged), synthetic `markMs = 5001`, `ticksPerSecond = 25` →
  exact thrown message: `interactive mark startTime 5001 ms exceeds 5000 ms budget`.
- Low tick count (updated), synthetic `ticksPerSecond = 2.4`, `markMs = 1000`
  → exact thrown message: `frame ticks/second 2.4 below floor 2.5`.

## Acceptance criteria (R1 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 | FPS floor derived from ≥3 observed samples with min/headroom; no invented value. | Six GitHub CI samples; min 2.65, `min − 2σ = 2.5586` → floor 2.5; 0.15 ticks/s (~5.7%) headroom. | pass |
| FR-5 | Both assertions hard-fail; negative runs prove the failure path. | Both negative proofs pass and log exact messages; floor constant drives both live assertion and proof. | pass |
| NFR-5 | Verification records raw samples and floor derivation for reproduction. | Six samples + statistics recorded above; derivation also in the constant's JSDoc. | pass |
| AC-4 | ≥3 raw tick/second samples and derived floor with headroom recorded. | Six raw samples, σ 0.0457, `min − 2σ = 2.5586` → 2.5, 0.15 ticks/s headroom. | pass |
| AC-5 | Deliberately low tick count makes the FPS assertion fail; negative run recorded. | `assertBudget({ markMs: 1000, ticksPerSecond: 2.4 })` throws `frame ticks/second 2.4 below floor 2.5`; proof test passed and message logged above. | pass |
| AC-6 | Deliberately late mark makes the interactive assertion fail; negative run recorded. | `assertBudget({ markMs: 5001, ticksPerSecond: 25 })` throws `interactive mark startTime 5001 ms exceeds 5000 ms budget`; proof test passed and message logged above. | pass |

## Evidence paths

- `e2e/perf-budget.spec.ts` — recalibrated constant `2.5`, updated derivation
  comment, updated low-tick negative proof `2.4`; interactive-mark assertion,
  late-mark proof, sampling window/count and `assertBudget` behavior unchanged.
- This report — CI failure excerpt, six samples, statistics, before/after diff,
  exact command output, AC coverage and scope statement.
- Prior evidence retained for context: `verification/phase-1.md`,
  `verification/phase-2.md`, `verification/integrated.md`.

## Scope statement

No source/UI/config/dependency change; production-safe. The R1 diff touches only
`e2e/perf-budget.spec.ts` and this evidence file. No runtime behavior, quality
threshold (`PERF_HEALTHY_FPS` / `PERF_STRAINED_FPS`), quality controller, kid UI,
parent gate, viewport, zoom, a11y, storage key, telemetry, network call, import
or dependency was changed. The dev-only interactive mark is untouched.

## Out-of-scope note — shard 2/2

`Gate · e2e shard 2/2` of run `44283047563` failed after 43s during browser
install with apt errors (`Unable to locate package fonts-tlwg-loma-otf`,
`Package 'fonts-freefont-ttf' has no installation candidate`). This is a runner/
infrastructure failure unrelated to this diff and is explicitly out of scope
for this fix; it was not attempted or changed here.

## Deviations / notes

- **No deviations from `Touches`.** Only `e2e/perf-budget.spec.ts` and this
  evidence file were changed in R1.
- **Brief base vs. actual HEAD.** The brief cites phase base `59a7c32`; the
  actual HEAD at phase start was `9fb2bb9` (Conductor-state-only commit adding
  the R1 "in progress" marker). This is recorded above and is not part of the fix.
- **No local numbers substituted for CI calibration.** The six calibration
  values and statistics are the authoritative GitHub CI samples from the brief.
  The local verification run's higher values are reported separately and
  transparently as verification output, not as calibration input.
- **Manual-device frame-rate feel remains human-only (NFR-4).** The CI floor is
  a software-renderer regression guard, never a claim of real-device proof.

## Primary verification

- Clean worktree; diff `9fb2bb9f3ae1453cc69d5c3489c62d43ec6f2f78..HEAD` =
  exactly `e2e/perf-budget.spec.ts` and this evidence file; reported commits
  `6d91178`, `5da2d9b` matched `git log`; no merges.
- Re-ran exact verification with `CI=1` on final HEAD `5da2d9b`:
  `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts`
  → exit 0. Biome 197 files clean, tsc clean, 57 files / 1009 tests, Vite + PWA
  build (178 precache entries), Playwright 4 passed in 10.4 s.
- Live mark 990 ms; local tick samples 27.60 / 28.34 / 32.11 (all above the new
  floor). Both negative proofs reproduced exactly: `interactive mark startTime
  5001 ms exceeds 5000 ms budget` and `frame ticks/second 2.4 below floor 2.5`.
- The six authoritative GitHub CI samples are unchanged as calibration input;
  the higher local values are verification output only. No deviation from
  Touches; FR-4, FR-5, NFR-5, AC-4, AC-5 and AC-6 satisfied.
