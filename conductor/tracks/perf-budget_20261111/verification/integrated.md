# Integrated verification — perf-budget_20261111

- **Head:** `f5cfb9ed152aecb32f3a425d5021ba02dfd485ca`
- **Branch:** `feat/perf-budget_20261111`
- **Result:** pass
- **Verified at:** 2026-11-18T10:02:55Z

## Command matrix

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Lint / format | `pnpm exec biome check .` | pass | 197 files checked, no fixes applied |
| Typecheck | `pnpm exec tsc --noEmit` | pass | clean |
| Unit | `pnpm test` | pass | 57 files / 1009 tests passed |
| Coverage | `pnpm test:coverage` | pass | 97.05% statements / 91.19% branches / 97.39% functions / 98.86% lines (80% gate on `src/core` + `src/state`) |
| Build | `pnpm build` | pass | Vite + PWA service worker, 178 precache entries; only pre-existing `configLoader: 'native'` and chunk-size warnings |
| e2e (full suite) | `CI=1 pnpm exec playwright test --workers=1` | pass | 73 passed in 16.0 min, tablet/phone/prod |
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
samples 24.09, 21.99, 25.92 ticks/s, all above the approved floor of 15.
Per the frozen spec assumption, GitHub Actions CI remains the authority for the
FPS floor. If CI reports a lower sample, the agreed response is a fix round,
not a waiver or an unreviewed threshold change. This load sensitivity is
carried into the PR risks for reviewer visibility.
