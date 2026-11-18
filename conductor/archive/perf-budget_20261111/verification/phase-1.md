# Phase 1 Verification — Interactive mark and CI observation

- **Track:** `perf-budget_20261111` (Performance Budget)
- **Phase:** 1 — Interactive mark and CI observation
- **Date:** 2026-11-18
- **Branch:** `feat/perf-budget_20261111`
- **Base commit (phase):** `3ae533462a9a61472511233b8a17656d950fbe65`
- **Head commit (code):** `7cbc13a8c6339655b6854ae227d4e261900336ac`
  (`perf: add dev interactive mark and tablet observation spec`; this evidence
  file is committed immediately after and is the only other change.)

## Result

**verified** — All Phase 1 tasks are complete and the exact verification command
passed. Phase 1 observes and records only; no FPS floor is asserted (see below).

## Commands

| Layer | Exact command | Exit code | Summary |
| --- | --- | --- | --- |
| Full verification | `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget-observe.spec.ts` | 0 | All three stages green; one Playwright test passed on `[tablet]` in 7.7 s. |
| check | `pnpm check` | 0 | `biome check .`: 196 files, no fixes/errors. `tsc --noEmit`: clean. `vitest run`: 57 files / 1009 tests passed. |
| build | `pnpm build` | 0 | Vite 8.3.6 production build succeeded (115 modules, `dist/` regenerated). Only pre-existing chunk-size / config-loader warnings. |
| e2e observation | `pnpm exec playwright test e2e/perf-budget-observe.spec.ts` | 0 | `1 passed (11.2s)` — `[tablet]` only; mark assertion and three tick samples all succeeded. |
| production grep | literal search for `tiny-tracks-interactive` in `dist/` (native grep tool) | 0 matches | String absent from the production bundle; the `import.meta.env.DEV` block was tree-shaken. |

### Raw frame-tick samples

Measured on the `[tablet]` project over a fixed ~2000 ms RAF window from
`window.__tinyTracksScene.frameSystems()`:

| Sample | ticks/second | Systems | Elapsed (s) | Tick progress |
| --- | --- | --- | --- | --- |
| 1 | 27.40 | 12 | 2.007 | 660 |
| 2 | 20.70 | 12 | 2.029 | 504 |
| 3 | 26.79 | 12 | 2.016 | 648 |

`ticks/second = (sum(end.ticks) − sum(start.ticks)) / systemCount / elapsedSeconds`,
with both tick reads taken at the same point in a `requestAnimationFrame` callback
and elapsed time from `performance.now()`. The test fails closed on a missing dev
scene handle, zero systems, non-positive elapsed time, or zero tick progress.

Playwright stdout (verbatim):

```
frame tick sample 1: 27.40 ticks/s (12 systems, 2.007 s, 660 tick progress)
frame tick sample 2: 20.70 ticks/s (12 systems, 2.029 s, 504 tick progress)
frame tick sample 3: 26.79 ticks/s (12 systems, 2.016 s, 648 tick progress)
ticks/second samples: 27.40, 20.70, 26.79
```

## Acceptance criteria (Phase 1 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Dev tablet boot exposes exactly one `tiny-tracks-interactive` mark with `startTime ≤ 5000`. | Spec asserts `getEntriesByName` length `=== 1` and `startTime <= 5000`; passed on `[tablet]`. | pass |
| AC-2 | Production build exposes no such mark. | Literal grep of `dist/` returned 0 matches after `pnpm build`. | pass |
| AC-3 | New specs are tagged `@ci`, run on `tablet` only, included in full matrix. | Test title ends in `@ci`; no project config edited. `playwright.config.ts` restricts `phone`/`prod` projects so only `[tablet]` runs this file (observed: `1 passed` on `[tablet]`). | pass |
| AC-4 | At least three raw tick/second samples and the derived floor with headroom are recorded in evidence. | Three raw samples recorded in the table above. The derived floor with headroom is intentionally deferred to Phase 2 by the phase brief, which forbids a floor constant here. | partial (by design — samples recorded; floor is Phase 2) |

## Evidence paths

- `src/main.ts` — dev-only `performance.mark('tiny-tracks-interactive')` on the
  `bootReady.then(...)` path that sets `__tinyTracksReady = true`.
- `e2e/perf-budget-observe.spec.ts` — `@ci` tablet observation spec (mark +
  three RAF tick samples, no floor).
- `conductor/tracks/perf-budget_20261111/verification/phase-1.md` — this report.
- Test stdout above and the `ticks-per-second-samples` JSON attachment recorded
  by `test.info().attach` in the Playwright run.

## Deviations / notes

- **No FPS floor was asserted in Phase 1.** The spec records the mark time and
  three raw tick/second samples only; there is no numeric floor constant and no
  throughput gate. Phase 2 owns the calibrated floor and the negative runs.
- Production safety confirmed: the only source change is the `import.meta.env.DEV`
  block in `src/main.ts`. No change to kid UI, parent gate, viewport,
  `PERF_HEALTHY_FPS`, `PERF_STRAINED_FPS`, or the quality controller. No new
  import, network call, telemetry, storage key, production API, or dependency.
- Manual-device frame-rate feel remains a human-only check (NFR-4); CI samples
  are observations, not real-device proof.
- No deviations from `Touches`.

## Primary verification

- Worktree clean before verification; `git diff --name-only
  3ae533462a9a61472511233b8a17656d950fbe65..HEAD` = `src/main.ts`,
  `e2e/perf-budget-observe.spec.ts`,
  `conductor/tracks/perf-budget_20261111/verification/phase-1.md` — exactly the
  phase Touches. Commits in range were `7cbc13a` and `baad605`, matching the
  subagent report; no merge commits.
- Re-ran the exact command with `CI=1` (the spec's calibration assumption):
  `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget-observe.spec.ts`
  → exit 0. Biome 196 files no fixes, tsc clean, 57 files / 1009 tests passed,
  Vite + PWA build succeeded (178 precache entries, known pre-existing warnings),
  Playwright 1 passed on `[tablet]` in 11.3 s.
- Primary `CI=1` samples: 23.81, 21.81, 25.76 ticks/second (12 systems,
  ~2.02 s windows, tick progress 576 / 528 / 624). Combined with the subagent's
  samples (27.40, 20.70, 26.79), six raw observations are recorded:
  min 20.70, max 27.40, mean 24.38, population σ 2.49.
- Literal grep of `dist/` for `tiny-tracks-interactive` returned no matches,
  confirming the mark is dev-only.
- AC-1, AC-2 and AC-3 pass. AC-4 is deliberately partial here: the three raw
  samples are present; the derived floor and headroom are Phase 2.
- Accepted deviation: none.
