# Phase 1 Evidence — Deterministic perf hard gate

- **Track:** `perf-floor-stability_20261120`
- **Phase:** 1 — Deterministic perf hard gate
- **Date:** 2026-11-21
- **Branch:** `fix/perf-floor-stability_20261120`
- **phase_base:** `254f670ef74f168e8924d107c4db621b5304d84c`
- **Head at verification (code under test):** `439a6f9cd1455c43d54e47087260e6c1280eae49`
- **Result:** `verified` after one primary rework of subagent permission/environment blockers. The
  original blocked report is retained below for audit honesty; `## Primary verification` is the
  authoritative final result.

## Summary

The wall-clock `ticks/second` hard gate is gone. `e2e/perf-budget.spec.ts` now fails closed only
for a late/missing/duplicate interactive mark (`<= 5000` ms) or a broken deterministic frame
contract: the documented 12-system order before and after sampling, and exactly one tick per
system per observed animation frame over at least 10 RAF frames. Both `frameSystems()` reads land
in the same RAF callback. The deterministic assertions live in one pure helper that the live test
and both negative proofs share. `e2e/perf-budget-observe.spec.ts` keeps its three samples, log,
mark assertion and JSON attachment; only its comment changed.

## Commands table

| # | Layer | Exact command | Exit | Summary |
| --- | --- | --- | --- | --- |
| 1 | full chain | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` | denied | `permission.rejected` (shell) before any step ran; consistent with the known `pnpm audit` restriction for phase subagents. Not retried, not worked around. |
| 2 | static + unit | `pnpm check` | 0 | Biome clean (204 files), `tsc --noEmit` clean, 1051/1051 Vitest tests pass. Re-run after both code commits. |
| 3 | coverage | `pnpm test:coverage` | 0 | 1051/1051 tests pass. Coverage: 97.18% statements, 91.48% branches, 97.45% functions, 98.95% lines (gate 80% on `src/core` + `src/state`). |
| 4 | build | `pnpm build` | 0 | Vite production build succeeded; PWA service worker generated. |
| 5 | e2e shard 1 | `pnpm exec playwright test --shard=1/2` | 1 | Attempt 1: `hills.spec.ts` "Page crashed" + retained mark assertion `5061 ms` (61 ms over). Attempt 2: 7 unrelated failures (fleet/hill-pace/hills timeouts, page crashes, one readiness timeout) from local software-rendering contention. All 3 in-scope perf specs passed on **both** attempts. Retry limit (2) reached; no third attempt. |
| 6 | e2e shard 2 | `pnpm exec playwright test --shard=2/2` | 0 | 41/41 passed (tablet, phone, prod). |
| 7 | audit | `pnpm audit --audit-level=high` | not run | Denied as part of command #1. Per the brief, not retried and not worked around; the primary must run it. |
| 8 | repeated perf | `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` | 0 | 15/15 passed. The deterministic gate passed at every observed cadence (interactive marks 1092/1039/1171 ms; 12 systems over 30 frames every run). Both negative proofs threw the expected messages on all three repeats. |

### In-scope observations from the passing runs

- Repeated perf run interactive marks: `1092`, `1039`, `1171` ms (all `<= 5000`).
- Repeated perf run frame contract: `12 systems over 30 observed frames` on all three repeats.
- Observation samples across runs (non-blocking, never gated): `12.42, 9.80, 13.61`;
  `3.09, 3.50, 3.81`; `4.50, 4.24, 4.32`; `15.74, 14.73, 19.25`; `22.38, 16.48, 18.59`;
  `22.59, 17.28, 20.91` ticks/s — proof the deterministic gate ignores wall-clock cadence.
- Negative proof messages:
  - `interactive mark startTime 5001 ms exceeds 5000 ms budget`
  - `system day-ambience tick delta 31 does not match 30 frames`

## Imported context (failure being fixed)

- Failed `v0.15.0` tag workflow run `44730179589`: samples `2.37, 2.51, 2.48` ticks/s; the
  hard gate threw `frame ticks/second 2.3696682464454977 below floor 2.5` while 91 other tests
  passed and `publish` was skipped. Source:
  `https://github.com/mansyar/3d-train-sim/actions/runs/44730179589`.
- Failed post-fix dry run `44712469297`: `2.4667` ticks/s (below `2.5`).
- Original CI calibration run `44283047563`: six samples `2.65`–`2.79` ticks/s from which the old
  `2.5` floor was derived. Archived at
  `conductor/archive/perf-budget_20261111/verification/phase-R1.md`.
- These samples are imported evidence only; no new clarity measurement is claimed here.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | No `FPS_FLOOR_TICKS_PER_SECOND`, no ticks/second assertion; late/missing mark fails closed. | `e2e/perf-budget.spec.ts` contains no floor constant or per-sample throughput assertion; `assertPerfContract` throws `'interactive mark missing or invalid'` and the >5000 ms message; late-mark proof passes on all runs. | pass |
| AC-2 | Documented order + equal tick deltas over >= 10 observed RAF frames. | Spelled-out 12-system `DOCUMENTED_ORDER`; before/after order and per-system `delta === frames` assertions; `MIN_FRAMES = 10`, `FRAMES_TO_SAMPLE = 30`; both reads in one RAF callback; logged `12 systems over 30 observed frames`. | pass |
| AC-3 | Both negative proofs execute and throw expected messages. | Repeated run 15/15 with both proofs on all three repeats; captured messages plus direct `toThrow` assertions for late mark and over-tick. | pass |
| AC-4 | Observation spec logs three samples, asserts mark only, comment says floor gone. | Comment now names the interactive mark + deterministic frame contract and states no wall-clock ticks/second floor; sample logic, log, mark assertion and JSON attachment unchanged; observation test passes. | pass |
| AC-5 | Scope guard lists only the two perf e2e specs plus this evidence file. | `git diff --name-only 254f670..HEAD` — see scope guard below. | pass |
| AC-6 | Full matrix + repeated perf specs pass; no test skipped/weakened/deleted. | Primary exact chained command exit 0: shards 50 passed + 1 pre-existing skip and 41 passed, audit 0, repeated perf 15/15. See `## Primary verification`. | pass |
| AC-7 | Two consecutive post-fix dry runs green. | Belongs to Phases 2 and 3; not attempted in Phase 1. | n/a |
| AC-8 | Imported failed samples recorded; tag immutable; no manual-device/clarity/v1.0 claim. | Imported context above; non-claims below. | pass |

## Scope guard

```
git diff --name-only 254f670..HEAD
```

Expected and verified contents (three paths):

```
conductor/tracks/perf-floor-stability_20261120/verification/phase-1.md
e2e/perf-budget-observe.spec.ts
e2e/perf-budget.spec.ts
```

No `src/**`, unit test, `playwright.config.ts`, `.github/**`, `package.json`, lockfile, product,
CHANGELOG, clarity, release doc or other Conductor state file changed.

## Deviations

- None. All edits stayed inside the three `Touches` paths.

## Blockers

- **Exact chained verification command denied:** `pnpm check && pnpm test:coverage && pnpm build
  && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit
  --audit-level=high && pnpm exec playwright test e2e/perf-budget.spec.ts
  e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` returned
  `permission.rejected` (shell). Needed to run the required `pnpm audit --audit-level=high` step
  and the full chain as written; expected result is all gates green with audit exit 0. Not retried
  or worked around; every other command was run separately.
- **Shard 1 environment flakes:** two attempts failed only on unrelated e2e specs (page crashes,
  locator/readiness timeouts, a timing ratio assertion) under heavy local software-rendering
  contention. All three in-scope perf specs passed on both attempts. Retry budget (2) exhausted;
  primary should re-run shard 1 on a clean runner.

## Non-claims

- No retag, tag deletion, GHCR mutation, deploy or Coolify webhook action. `v0.15.0` remains
  immutable.
- No manual-device verification claim; iPad Safari / Android Chrome touch feel, audio unlock and
  sustained frame rate remain human-only.
- No clarity measurement or score was invented; no v1.0 child-gate claim.
- No hard test was skipped, weakened or deleted. The one skipped test visible in shard 1
  (`e2e/smoke.spec.ts:960`, `@ci` ambient frame rate) is pre-existing (`test.skip` at line 961),
  outside this phase's touches, and was not modified.
- Shard 1 is **not** reported as passing, and `pnpm audit` is **not** reported as passing.

## Notes for primary

- Code commits: `efc36c5` (hard gate rewrite, P1.T1–T3), `439a6f9` (observation comment, P1.T4),
  plus this evidence commit.
- The deterministic gate behaved as designed: it passed at cadences from ~3 to ~22 ticks/s and
  failed only on the two seeded negative proofs. The retained interactive-mark budget remains a
  wall-clock assertion by contract and flaked once at 5061 ms under extreme local contention;
  this phase did not change it.

## Primary verification (authoritative)

The primary re-ran the **exact chained verification command** from the plan on the final code:

```
pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3
```

`FULL_MATRIX_EXIT=0`. Steps, in order:

- `pnpm check` — Biome 204 files clean, `tsc --noEmit` clean, 60 test files / 1051 tests pass.
- `pnpm test:coverage` — 1051 tests pass; 97.18% statements, 91.48% branches, 97.45% functions,
  98.95% lines (80% gate met).
- `pnpm build` — 117 modules, 819.02 kB bundle, PWA service worker with 178 precache entries.
- Shard 1/2 — 50 passed, 1 pre-existing `@ci` skip (`e2e/smoke.spec.ts:960`), 0 failures.
- Shard 2/2 — 41 passed, 0 failures (tablet, phone, prod).
- `pnpm audit --audit-level=high` — exit 0: 5 vulnerabilities (1 low, 4 moderate), no high or
  critical. No dependency or lockfile change.
- Repeated perf/frame-contract command — 15/15 pass across three repeats; both negative proofs
  threw their expected messages every time; live frame-contract samples reported `12 systems over
  30 observed frames` and non-blocking ticks/s varied widely (`12.96`–`20.76`) without affecting
  the hard gate.

The two subagent blockers were permission/environment limits, not defects: the audit was denied by
the phase subagent permission layer, and shard 1 hit unrelated contention flakes twice. Under the
primary, both passed on the exact command with no test weakened, skipped or deleted. Pre-existing
Vite `configLoader: 'native'`, `THREE.WebGLShadowMap` and >500 kB warnings remain untouched.

Final scope guard: `git status --porcelain` is clean apart from gitignored `.conductor/`;
`git diff --name-only 254f670..HEAD` lists exactly:

```
conductor/tracks/perf-floor-stability_20261120/verification/phase-1.md
e2e/perf-budget-observe.spec.ts
e2e/perf-budget.spec.ts
```

Squash guard commits: `efc36c5`, `439a6f9`, `665c008` plus this primary evidence append; no merge,
user or Conductor-state commits in the range. AC-6 is therefore **pass**; AC-7 remains a Phase 2/3
gate.
