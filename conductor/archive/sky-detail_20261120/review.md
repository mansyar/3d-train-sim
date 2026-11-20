# Review: Sky Detail

- **Track:** `sky-detail_20261120`
- **Type:** feature
- **Branch:** `feat/sky-detail_20261120`
- **Range:** `da63f087eceec2754e7e0daf5efa71a0a7206a77..92fa2ccec4b0bec135aafa1b9fe5f04d3f0c9fb9`
- **Date:** `2026-11-20T03:19:43Z`
- **Verdict:** `PASS`

## Summary

Both phases and the integrated diff are scope-clean, allocation-free on the frame path, and fully evidenced. All FR/NFR/AC are covered with green static, unit, coverage, build and Playwright checks. The reviewer found no Critical, High or Medium issues; a single Low documentation-accuracy nit (F1) is recorded below. Under the configured severity policy a Low does not block, and `review.strict` requires no override for it. No clarity numbers, v1.0 child-gate claim or release-document edits were introduced.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm exec biome check .` | pass (204 files clean) | `verification/phase-1.md`, `verification/phase-2.md`, `verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| test | `pnpm test` | pass (60 files / 1047 tests) | `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass (97.18% stmts / 91.48% branches / 97.45% funcs / 98.95% lines) | `verification/integrated.md` |
| build | `pnpm build` | pass (818.44 kB bundle, PWA service worker) | `verification/integrated.md` |
| e2e | `pnpm exec playwright test` (two shards) | pass (50 + 41 passed, 1 pre-existing `@ci` skip, 0 failures) | `verification/integrated.md` |
| e2e | targeted sky/sun-moon/a11y/perf specs | pass (9/9) | `verification/phase-2.md` |

The full matrix was run as two shards deliberately, to avoid the resource degradation previously observed in a single long run. No test was weakened, skipped or deleted; the one skip is a pre-existing `@ci` marker. Manual iPad Safari / Android Chrome checks remain a human-only exception.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P2.T1 | `src/core/cloud-layers.test.ts`, `e2e/sky-detail.spec.ts`, `src/scene/weather-particles.ts` | covered |
| FR-2 | P1.T2, P2.T2 | `cloudCover` unit tests, `e2e/sky-detail.spec.ts` | covered |
| FR-3 | P1.T1.3, P2.T1.3 | `layerOffset` unit tests, `e2e/sky-detail.spec.ts` | covered |
| FR-4 | P2.T2.1 | `e2e/sky-detail.spec.ts` reduced-motion spec, `src/scene/weather-particles.ts`, `src/scene/day-ambience.ts` | covered |
| FR-5 | P1.T2, P2.T1, P2.T2 | scratch-identity unit tests, frame-path static read, perf-budget e2e | covered |
| FR-6 | P2.T3 | DEV witnesses in `src/scene/init-scene.ts`, `src/main.ts` DEV gate, unchanged sun-moon/a11y/perf specs | covered |
| FR-7 | P1.T3, P2.T4 | integration scope guard, `weather.update` signature | covered |
| NFR-1 | P1.T3, P2.T4 | zero-import helper, scope guard | covered |
| NFR-2 | P2.T1, P2.T2 | gentle speeds, in-place colour lerp, no flashes | covered |
| NFR-3 | P2.T1 | fixed pools, scratch objects, perf-budget e2e | covered |
| NFR-4 | P2.T4, integrated | `verification/integrated.md` all checks green | covered |
| NFR-5 | P1.T3, P2.T4 | scope guard: no release-document, lockfile or dependency changes | covered |
| NFR-6 | P2.T2.1, P2.T3 | reduced-motion e2e, a11y e2e | covered |
| AC-1 | P1.T1, P2.T1, P2.T3 | `cloud-layers.test.ts`, `e2e/sky-detail.spec.ts` | covered |
| AC-2 | P1.T2, P2.T2, P2.T3 | `cloud-layers.test.ts`, `e2e/sky-detail.spec.ts` | covered |
| AC-3 | P1.T1.3, P2.T3 | `layerOffset` tests, wrap/parallax e2e | covered |
| AC-4 | P2.T2.1, P2.T3 | reduced-motion e2e | covered |
| AC-5 | P1.T2, P2.T1, P2.T4 | frame-path static read, perf-budget e2e | covered |
| AC-6 | P2.T3 | DEV witnesses, full-matrix sun-moon/a11y/perf/cargo/smoke green | covered |
| AC-7 | P1.T3, P2.T4 | 6-file code diff; no package/lockfile/save/UI/audio/clarity/`product.md`/`CHANGELOG.md` changes | covered |
| AC-8 | P2.T4, integrated | `verification/integrated.md`: 91 pass / 1 pre-existing skip; manual device human-only | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — Wrap-tolerance rationale is inverted in evidence prose**
  - **File:** `e2e/sky-detail.spec.ts:118-119`, `verification/phase-2.md:66-67`
  - **What:** The comment describes the relaxed `toBeLessThan(0.01)` tolerance as “a fraction of one frame's drift”; it is in fact about 10x the 0.1 s-step drift and roughly 60x a 16 ms RAF frame's near-layer drift.
  - **Why:** An evidence reader could conclude the tolerance is tighter than one frame of motion when it is looser. The wrap invariant itself is still proven and the implementation is correct, so this is documentation accuracy only.
  - **Fix:** Reword the two prose references to state the tolerance absorbs one inter-probe RAF frame (~0.0004 observed) while still proving the modulo wrap. No production-code change needed.
  - **Requirement:** AC-3
  - **Test gap:** none

## Overrides

- <none — F1 is Low and non-blocking under the configured severity policy; no override is required.>

## Plan compliance

Both planned phases are verified (17/17 originally planned tasks, recounted 22/22 including sub-tasks) with checkpoints `2f71b4b` and `29458e3`. No task is marked complete without its evidence. No review-fix phase was needed because no Critical/High/Medium finding was raised.

## Out of scope

Pre-existing Vite `configLoader: 'native'` extensionless-import warning at `vite.config.ts:6:36`, `THREE.WebGLShadowMap` deprecation warning and >500 kB bundle warning. The unrelated `conductor/product.md:115` v0.14.1 wording drift belongs to the later release track and was not touched. Manual-device checks are human-only; the v1.0 3/3-child gate is not claimed.

## Debt

- <none>

## Doc sync

`none` — the frozen spec's NFR-5 forbids release-document edits and AC-7 forbids product/clarity changes in this track. `CHANGELOG.md` and `conductor/product.md` are intentionally untouched; the known `product.md:115` drift is reserved for the later release track.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 1 | 0 |
