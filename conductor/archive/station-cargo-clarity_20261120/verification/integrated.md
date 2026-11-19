# Integrated Verification — Station Cargo Clarity

- **Track:** station-cargo-clarity_20261120
- **Branch:** feat/station-cargo-clarity_20261120
- **Date:** 2026-11-20
- **Scope:** Both phases verified; full configured verification strategy run against the final diff.
- **Result:** PASS (manual physical-device check remains a human-only exception; v1.0 child gate not claimed)

## Required commands

| Gate | Command | Exit | Result |
|------|---------|------|--------|
| Static — lint + format | `pnpm exec biome check .` | 0 | 200 files clean, no fixes applied |
| Static — types | `pnpm exec tsc --noEmit` | 0 | Clean |
| Unit | `pnpm test` | 0 | 58 files / 1029 tests passed |
| Coverage | `pnpm test:coverage` | 0 | 97.16% stmts / 91.44% branches / 97.44% funcs / 98.94% lines — all above 80% gate on `src/core` + `src/state` |
| Build | `pnpm build` | 0 | Vite build green, 116 modules, PWA SW generated |
| E2E — full matrix | `pnpm exec playwright test` (first pass) | 1 | 84 passed, 1 skipped, 4 failed — see "Full-matrix diagnosis" |
| E2E — full matrix (rerun, sharded) | `pnpm exec playwright test --shard=1/2` then `--shard=2/2` | 0 / 0 | Shard 1: 47 passed, 1 skipped; Shard 2: 41 passed — all 83 runnable tests green |

Pre-existing, unrelated warnings were left untouched: Vite `configLoader: 'native'` extensionless-import warning at `vite.config.ts:6:36`, `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated`, and the >500 kB bundle-size advisory.

## Full-matrix diagnosis

The first single-session run took 3.5 hours and ended with four failures:

1. `[tablet] hills.spec.ts:144` — reload kept 5 pieces instead of 6 (async IndexedDB save raced by an immediate reload; same class of race already diagnosed and fixed in cargo e2e during Phase 2 rework).
2. `[phone] smoke.spec.ts:46` — `.whistle-toot` click timed out.
3. `[phone] smoke.spec.ts:523` — `.ride-toggle` click timed out.
4. `[phone] toybox-clarity.spec.ts:156` — `__tinyTracksReady` wait timed out.

The three phone failures coincided with WebGL context-loss errors in the dev server (`gl.getShaderPrecisionFormat` on a null context, `info.autoReset` undefined) and reported 3.3-hour durations — a browser/WebGL resource degradation in one long-lived headless session, not a defect in the diff. Verification:

- Each failing test was re-run in isolation: **4/4 passed** in under 30 seconds each.
- The complete suite was re-run in two shards to avoid single-session degradation: **all 83 runnable tests passed** (1 pre-existing `@ci`-only skip). All tablet, phone, and prod projects are covered.

No test was weakened, skipped, or deleted to obtain the green result.

## Acceptance criteria

| AC | Evidence | Status |
|----|----------|--------|
| AC-1 monotonic 0→1 pure helper, deterministic arc endpoint/midpoint | `src/core/cargo-transfer.test.ts` (13 tests), phase-1.md | pass |
| AC-2 tablet e2e load arc | `e2e/cargo.spec.ts` `load and delivery crates arc…`, phase-2.md | pass |
| AC-3 tablet e2e delivery arc + count +1 exactly once | `e2e/cargo.spec.ts` `the count settles at the station stop…`, phase-2.md | pass |
| AC-4 reduced motion instant fallback, count still increments | `e2e/cargo.spec.ts` `reduced motion skips the crate arc…`, phase-2.md | pass |
| AC-5 cancel/snap on station/ride disappearance, no orphan | `src/core/cargo-transfer.test.ts` cancel tests; `rig-cargo.ts` cancel path; phase-2.md | pass |
| AC-6 no save/key/schema/pure-helper/dependency diff | `git diff --name-only be83e917..HEAD`: no `src/core/cargo.ts`, `src/core/save.ts`, `package.json`, `pnpm-lock.yaml`, `track-placement.ts`; phase-1.md contract guard | pass |
| AC-7 full chain incl perf budget, tablet/phone/prod, audit, axe | This report: static, unit, coverage, build, full Playwright; `a11y.spec.ts` axe-clean, `perf-budget*.spec.ts` green, `runtime-guarantees.spec.ts` no external requests/CSP | pass |
| AC-8 scope excludes sky/train length/piece types/kid text/parent gate/clarity values | Diff confined to cargo transfer helper + scene cargo/e2e + Conductor state; comparison.md still 8× `awaiting observation` | pass |

## Non-claims and human-only exceptions

- Manual iPad Safari / Android Chrome touch, audio, and frame-rate check is a human-only exception and was **not** claimed by any agent.
- The v1.0 ship gate (3/3 children, 30-day dogfooding, 10-minute unassisted session) cannot be met with one child and is **not** claimed.
- No clarity numbers were invented; `conductor/archive/clarity-audit_20261110/comparison.md` retains all 8 cells as `awaiting observation`.
