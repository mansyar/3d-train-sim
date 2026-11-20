# Phase R1 Evidence — Review Fixes (Perf Floor Stability)

- **Track:** `perf-floor-stability_20261120`
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-21
- **Branch:** `fix/perf-floor-stability_20261120`
- **Phase base:** `96fcb32ed2bc0db8d37815811cb6167ee325bb1e`
- **Result:** `verified`

## Finding and fix

- **F1 (Low, documentation-only):** `e2e/perf-budget.spec.ts:14-15` claimed both
  tick reads happen "inside the same RAF callback", but the before snapshot is
  read in the first callback and the after snapshot in the 31st. They occur at
  the same point within two different RAF callbacks.
- **Fix:** Replaced the two comment lines with the accurate wording already used
  in `e2e/frame-contract.spec.ts:20-21`:
  `Both tick reads happen at the same point within their RAF callbacks, so where the scene's loop sits in the callback queue cannot bias the delta.`
- No test logic, constants, imports, assertions, negative proofs, production
  code, package files, workflows, product docs, or clarity artifacts changed.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (`pnpm check`) | `pnpm exec biome check . && pnpm exec tsc --noEmit && pnpm test` | 0 | Biome: 204 files checked, no fixes; tsc clean; Vitest: 60 files / 1051 tests passed |
| e2e repeat | `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` | 0 | 15 passed (28.9s); both negative proofs threw the expected messages on all three repeats |
| chained | `pnpm check && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` | 0 | Full exact phase command green end to end |

The exact phase verification command was run as written:

```
pnpm check && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3
```

Key output:

```
Checked 204 files in 244ms. No fixes applied.
 Test Files  60 passed (60)
      Tests  1051 passed (1051)
Running 15 tests using 2 workers
  15 passed (28.9s)
```

Negative proofs on every repeat:

- `late-mark negative run threw: interactive mark startTime 5001 ms exceeds 5000 ms budget`
- `over-tick negative run threw: system day-ambience tick delta 31 does not match 30 frames`

No test was skipped, weakened or deleted. The observation spec continued to log
three non-blocking ticks/second samples. The comment-only diff did not change
behavior.

## Scope guard

`git diff --name-only 96fcb32..HEAD` lists only the two allowed paths:

```
conductor/tracks/perf-floor-stability_20261120/verification/phase-R1.md
e2e/perf-budget.spec.ts
```

## Deviations

- <none>

## Notes

- F1 was documentation-only; strict mode scheduled it for R1 rather than
  accepting it as deferred debt.
- The Vite `configLoader: 'native'` and `THREE.WebGLShadowMap` deprecation
  warnings in the output are pre-existing and not introduced by this diff.

## Primary verification

The primary independently re-ran the exact phase command on `6d24cc7`:
`pnpm check && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3`.
`check` exit 0 (Biome 204 files clean, tsc clean, Vitest 60 files / 1051 tests); Playwright exit 0 with 15/15 passed and both negative proofs throwing the expected messages on all three repeats. The working tree was clean apart from gitignored `.conductor/`; `git diff --name-only 96fcb32..HEAD` listed exactly the two allowed paths. Squash guard: the range contains only commit `6d24cc7`, with no merge/user commits. Only pre-existing Vite, WebGLShadowMap, and >500 kB warnings appeared.
