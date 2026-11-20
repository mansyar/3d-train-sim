## Summary

The sky now has two layers of slow, drifting clouds. Near puffs travel faster than far puffs for a gentle parallax, cloud cover follows the existing weather bed with a soft cross-fade, and reduced motion holds the clouds still without hiding them. This is visual-only: no save data, kid UI, audio, dependencies, clarity measurements or v1.0 claims change.

## Track

- **ID:** `sky-detail_20261120`
- **Type:** feature
- **Spec:** [`conductor/archive/sky-detail_20261120/spec.md`](conductor/archive/sky-detail_20261120/spec.md)
- **Plan:** [`conductor/archive/sky-detail_20261120/plan.md`](conductor/archive/sky-detail_20261120/plan.md)
- **Review:** [`conductor/archive/sky-detail_20261120/review.md`](conductor/archive/sky-detail_20261120/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Pure cloud-layer math and contract guards | Add allocation-free pure helpers for cover, wrap and parallax, with TDD | verified | `2f71b4b` | 13 new unit tests; frozen-contract guard; TDD red → green |
| 2: Visible layered clouds and witnesses | Split the existing cloud pool into two parallax layers, wire weather/reduced motion, add DEV witnesses and e2e | verified | `29458e3` | One e2e wrap-tolerance fix during the phase; documented in evidence |

## Requirements

- [x] `FR-1` — two fixed near/far pools reuse the existing puff texture (`src/scene/weather-particles.ts`)
- [x] `FR-2` — cover follows `WeatherIntensity.cloud` with a soft cross-fade and snow cap (`src/core/cloud-layers.ts`)
- [x] `FR-3` — slow wrapped parallax drift, near faster than far (`src/core/cloud-layers.ts`)
- [x] `FR-4` — reduced motion freezes drift but keeps static layered clouds visible
- [x] `FR-5` — frame path is allocation-free with preallocated scratch
- [x] `FR-6` — DEV/e2e witnesses for layers, cover and drift; existing specs stay green
- [x] `FR-7` — visual-only: no save, UI, audio, dependency or clock changes
- [x] `NFR-1` — no network, identifiers or third-party scripts
- [x] `NFR-2` — gentle motion, no flashes or new gestures
- [x] `NFR-3` — 60 FPS guardrails, fixed pools, perf budgets green
- [x] `NFR-4` — full verification matrix green
- [x] `NFR-5` — diff confined to sky/weather scene, pure helper and tests
- [x] `NFR-6` — reduced motion and axe clean
- [x] `AC-1` .. `AC-8` — see the requirement table in `conductor/archive/sky-detail_20261120/review.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm exec biome check .` | pass (204 files) | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| unit | `pnpm test` | pass (60 files / 1047 tests) | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass (97.18 / 91.48 / 97.45 / 98.95 %) | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| build | `pnpm build` | pass | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| e2e | `pnpm exec playwright test` (two shards) | pass (91 passed, 1 pre-existing skip, 0 failures) | `conductor/archive/sky-detail_20261120/verification/integrated.md` |
| manual device | iPad Safari / Android Chrome | human-only exception, not claimed | `conductor/archive/sky-detail_20261120/verification/integrated.md` |

## Media

![Soft layered clouds above the toy railway at storm cover](.conductor/media/sky-detail_20261120/cloud-layers.png)

Captured at `e39b911` with the DEV witness pinned to full cloud cover. It shows soft cloud puffs in the sky; the parallax motion is witnessed by the e2e assertions rather than a still image.

## Review

- **Verdict:** `PASS`
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 1 non-blocking Low documentation nit (F1) in `review.md`; no Critical/High/Medium findings

## Deviations and risks

- The wrap e2e tolerance is `0.01` rather than `1e-6` because a live RAF frame can land between probes. It still proves a whole-lap wrap and a result in `[0, 1)`. The reviewer noted that the prose rationale overstated how tight the tolerance is; this is a documentation nit only.
- Day-night tint is an in-place colour lerp on the two existing unlit cloud materials; no new texture or material is created.

## Follow-ups

- none

## Rollback

```bash
# Squash commits
git revert --no-edit 2f71b4b
git revert --no-edit 29458e3
```

No migration, feature flag, data change or save-key change is involved.
