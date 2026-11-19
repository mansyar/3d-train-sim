# Phase 1 Verification — Frame-aware slip-road sampling

- **Track:** `switch-e2e-stability_20261119` — Switch E2E Stability and Release v0.14.1
- **Phase:** 1 — Frame-aware slip-road sampling
- **Date:** 2026-11-19
- **Branch:** `fix/switch-e2e-stability_20261119`
- **Phase base:** `e898499f0c55054086e16ff8457f94e068230e21`
- **Implementation head:** `deed0c9` (`fix(e2e): make slip-road sampling frame-aware with regression proof`)
- **Result:** `verified`

## What changed

- `e2e/helpers.ts` — added pure, shared slip-road sampling primitives: `SlipPose`,
  `SlipRoadTables`, `SlipSightings`, `SlipSampleOutcome`, `SlipFrameSource`,
  `createSlipSightings()`, `recordSlipFrame()`, `missingSlipKeys()`,
  `formatSlipFailure()`, `sampleSlipFixedWindow()` (old strategy, kept only for
  the regression), and `sampleSlipRoads()` (frame-driven strategy with a frame
  budget plus a bounded wall-clock safety cap).
- `e2e/switches.spec.ts` — the double-slip assertion now samples once per
  rendered frame (driven by the `frameSystems()` `fleet` tick counter via
  `page.waitForFunction(..., { polling: 'raf' })`) instead of a fixed
  `320 × 400 ms` wall-clock loop. Required keys are unchanged. Failure text now
  appends `frames sampled` and `elapsed ms` (and a `SAFETY CAP REACHED` marker).
  Added an active deterministic regression test proving the old 320-poll window
  misses the east road while the frame-aware sampler sees it.

No production `src/`, `playwright.config.ts`, release docs, or Conductor state
file was modified. The 600-second test timeout and all clean-console /
external-request assertions remain intact.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (phase verification, part 1) | `pnpm check` | 0 | `biome check .` clean (198 files); `tsc --noEmit` clean; `vitest run` 57 files / 1016 tests passed |
| e2e (phase verification, part 2) | `pnpm exec playwright test e2e/switches.spec.ts --repeat-each=3` | 0 | 12 passed (4 tests × 3 repeats) in 3.7m, 2 workers |
| full verification command | `pnpm check && pnpm exec playwright test e2e/switches.spec.ts --repeat-each=3` | 0 | Both parts green end to end |

The exact phase verification command from `plan.md` was run twice during
implementation (first pass found an import-order lint error, second pass found
`noUncheckedIndexedAccess` type errors); both were fixed, and the final run
shown above is green. Two retries were used — within the configured retry
limit of 2.

## Before / after regression output

Captured from the active regression test
(`frame-aware slip sampling sees a road the fixed window misses`) at its final
run. The deterministic slow-frame source shows the straight and west roads from
frame 0 and the east road (lever `-1.571`) only from frame 360 — beyond the old
320-poll window but inside the frame-driven budget. Both strategies consume the
same frame source through the same `recordSlipFrame()` recognition logic.

```text
[slip-regression] before: missing blades: -0.210; missing roads: -1.571; seen blades: 0.000, 0.210; seen roads: 0.000, 1.571; frames sampled: 320; elapsed ms: 1; SAFETY CAP REACHED
[slip-regression] after: all keys seen: blades 0.000, 0.210, -0.210; roads 0.000, 1.571, -1.571; frames sampled: 363; elapsed ms: 2
```

Across all three repeats the `before` line always reported `missing roads:
-1.571` at `frames sampled: 320`, and the `after` line always reported all
three blade and road keys at `frames sampled: 363` with `elapsed ms` of 1–2.
The regression asserts the old sampler is incomplete with exactly
`missingBlades: ['-0.210']`, `missingRoads: ['-1.571']` and the new sampler is
complete, untimed-out, and observed more than 360 frames. It fails immediately
if either sampler diverges, so it is not a tautology.

## Repeated switch-spec results (`--repeat-each=3`)

| # | Test | Result | Duration |
| --- | --- | --- | --- |
| 1–2 | `every switch kind rides every road` (repeats 1, 2) | ok | 1.1m each |
| 8 | `every switch kind rides every road` (repeat 3) | ok | 1.0m |
| 3–4 | `a switch layout re-parks at neutral after a reload` (repeats 1, 2) | ok | 37.2s each |
| 10 | `a switch layout re-parks at neutral after a reload` (repeat 3) | ok | 31.5s |
| 5–6 | `a switch under reduced motion still selects the road` (repeats 1, 2) | ok | 9.7s / 9.6s |
| 11 | `a switch under reduced motion still selects the road` (repeat 3) | ok | 9.5s |
| 7, 9, 12 | `frame-aware slip sampling sees a road the fixed window misses` | ok | 9ms / 8ms / 6ms |

Total: 12 passed, 0 failed, 0 skipped, 3.7m. The failing CI case from release
`44475228404` (`[tablet] ... › ride all three slip roads with the entry blades
and lever following`) is part of `every switch kind rides every road` and
passed in all three repeats.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Slip test still requires blade keys `0.000`, `-0.210`, `0.210` and road keys `0.000`, `-1.571`, `1.571`; sampling tied to frame/ride progress with a bounded safety timeout. | `SLIP_TABLES.requiredBlades` / `requiredRoads` in `e2e/switches.spec.ts`; `sampleSlipRoads()` driven by `frameSystems()` tick with `SLIP_MAX_FRAMES` / `SLIP_SAFETY_MS`; frame progress in `formatSlipFailure()`; active test green ×3. | met |
| AC-2 | Phase evidence records the regression failing with the old sampler and passing with the new one. | Before/after block above; active regression test green ×3; `sampleSlipFixedWindow()` reproduces the 320-poll miss. | met |

Also covered: FR-1 (frame-aware sampling), FR-2 (committed regression with
before/after evidence), NFR-1 (changes confined to `e2e/` test files plus this
evidence file), NFR-2 (no runtime, telemetry, storage, gate, viewport, or kid-UI
changes).

## Evidence paths

- `e2e/helpers.ts` — shared sampling primitives (implementation).
- `e2e/switches.spec.ts` — active frame-aware assertion + regression case.
- This file — phase report.
- Console regression output quoted verbatim above (no separate binary artifact
  needed; the strings are deterministic and asserted by the test).

## Deviations

None. All edits are inside `Touches`.

## Blockers

None.

## Notes

- Both tasks are delivered in one implementation commit because P1.T1 and P1.T2
  edit the same two files and non-interactive staging cannot split hunks of
  those files cleanly; the commit message names both the sampler fix and the
  regression proof. The primary may record the single SHA against both tasks.
- The wall-clock safety cap is `240_000 ms` with a `2000`-frame budget; the
  existing `600_000 ms` test timeout is unchanged. The cap is a backstop for a
  stalled loop only — normal runs complete in a few seconds as the three key
  pairs are witnessed.
- `pnpm check` emits a pre-existing Vite `configLoader: 'native'` warning about
  the extensionless import in `vite.config.ts:6`; it is unrelated to this phase
  and does not fail the gate.

## Primary verification

At `2026-11-19T19:10:00Z` on HEAD `8656809`, the worktree contained only the
primary-owned untracked `.conductor/runs/` directory; all tracked changes were
committed. `git diff --name-only e898499f0c55054086e16ff8457f94e068230e21..HEAD`
listed exactly `e2e/helpers.ts`, `e2e/switches.spec.ts`, and this evidence file.
The range contained exactly `deed0c9` and `8656809`, matching the subagent
report, with no merge commits. The exact verification command
`pnpm check && pnpm exec playwright test e2e/switches.spec.ts --repeat-each=3`
was re-run on the final tree and exited 0: Biome 198 files clean, tsc clean,
Vitest 57 files / 1016 tests, and 12 Playwright tests passed in 3.6m on two
workers. The three regression repeats all recorded the old sampler missing
`-0.210`/`-1.571` at frame 320 and the new sampler seeing all keys at frame 363.
Source inspection confirmed `requiredBlades` and `requiredRoads` remain the
exact required sets at `e2e/switches.spec.ts:128-129`, with `SLIP_MAX_FRAMES =
2000` and `SLIP_SAFETY_MS = 240000` as bounded backstops. AC-1 and AC-2 are
satisfied. No deviation; the untracked run file belongs to the primary.
