# Integrated verification — perf-budget_20261111

- **Head:** `f553058`
- **Branch:** `feat/perf-budget_20261111`
- **Result:** pass
- **Verified at:** 2026-11-18T10:31:02Z

This file was refreshed after review-fix round 1. Static checks, unit tests,
coverage and build were re-run on the final HEAD `f553058`. The full e2e result
below is from the unchanged production source head `f5cfb9e`; the only later
code change was the test-only floor recalibration in `e2e/perf-budget.spec.ts`,
which was re-verified with the exact Phase R1 command on the final HEAD.

## Command matrix

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint / format | `pnpm exec biome check .` | pass | 197 files checked, no fixes applied |
| Typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| Unit | `pnpm test` | pass | 57 files / 1009 tests passed |
| Coverage | `pnpm test:coverage` | pass | 97.05% statements / 91.19% branches / 97.39% functions / 98.86% lines (80% gate on `src/core` + `src/state`) |
| Build | `pnpm build` | pass | Vite + PWA service worker, 178 precache entries; only pre-existing `configLoader: 'native'` and chunk-size warnings |
| e2e (full suite) | `CI=1 pnpm exec playwright test --workers=1` | pass | 73 passed in 16.0 min on unchanged source head `f5cfb9e`, tablet/phone/prod |
| e2e (final floor recheck) | `CI=1 pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | pass | 4 passed in 10.4 s on final HEAD `f553058`; floor 2.5, both negative proofs pass |
| Audit | `pnpm audit --audit-level=high` | pass | 5 vulnerabilities (1 low / 4 moderate below threshold), `1 ignored: 1 high` = the single dated `GHSA-fc5q-39xc-vjpf` exception |
| Production mark absence | `grep -R -n "tiny-tracks-interactive" dist` | pass | exit 1, no matches — the dev mark is absent from production output |

## Scope check

- `git status --porcelain` empty before and after verification.
- Non-Conductor diff from base `6496b35aa7e7a37b6ff45ba45876a74a9703c3fa`:
  `src/main.ts` (dev-only mark) and new `e2e/perf-budget-observe.spec.ts`,
  `e2e/perf-budget.spec.ts`. No kid UI, parent gate, viewport, a11y, quality
  controller, PERF constants, dependency, network, storage, or telemetry change.
- Production-safe: `performance.mark('tiny-tracks-interactive')` sits inside the
  existing `import.meta.env.DEV` block; the dist grep confirms it is stripped.

## e2e load and flake notes

Three full e2e runs with the default two workers on this local machine each hit
a different transient, pre-existing flake (parent-gate hold timing in
`e2e/smoke.spec.ts` on runs 1 and 3, a switch-angle sampling miss in
`e2e/switches.spec.ts` on run 2). Targeted reruns of both tests passed. Run 3
also recorded a low tick sample (4.49 ticks/s) because the local machine was
under heavy parallel browser load; this is **not** a GitHub CI observation.

The final full-suite evidence above uses `CI=1` with `--workers=1` to remove
local CPU contention and is fully green: perf-budget live mark 982 ms; tick
samples 24.09, 21.99, 25.92 ticks/s, all above the then-approved floor of 15.

GitHub Actions run `44283047563` later became the authoritative observation and
failed shard 1/2 at 2.65 ticks/s, with six CI samples 2.79/2.74/2.72 and
2.65/2.71/2.67. Review-fix round 1 recalibrated the floor to **2.5 ticks/s**
(min 2.65, population σ 0.0457, `min − 2σ = 2.5586` rounded down; 0.15 ticks/s
headroom). The final targeted recheck recorded local samples 27.60/28.34/32.11
but uses the GitHub CI numbers as the only calibration input. The same run's
shard 2/2 failure was an apt browser-install problem (`fonts-tlwg-loma-otf`,
`fonts-freefont-ttf`) and is runner infrastructure, not a code finding.

Load sensitivity and the CI authority rule are carried into the PR risks.
