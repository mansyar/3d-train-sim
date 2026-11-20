# Integrated Verification — Sky Detail

- Track: `sky-detail_20261120` — Sky Detail
- Branch: `feat/sky-detail_20261120`
- Date: 2026-11-20
- Scope: both phases verified (22/22 tasks), full configured verification strategy
- Result: **PASS** (manual physical-device checks are human-only; the v1.0 child gate is not claimed)

## Required commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm exec biome check .` | 0 | 204 files clean. |
| typing | `pnpm exec tsc --noEmit` | 0 | No type errors. |
| unit | `pnpm test` | 0 | 60 test files / 1047 tests passed. |
| coverage | `pnpm test:coverage` | 0 | 97.18% statements / 91.48% branches / 97.45% functions / 98.95% lines on `src/core` + `src/state`; all above the 80% gate. |
| build | `pnpm build` | 0 | Vite build, 117 modules, 818.44 kB bundle, PWA service worker generated. |
| e2e (phase 2) | `pnpm exec playwright test e2e/sky-detail.spec.ts e2e/sun-moon.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts` | 0 | 9/9 tablet tests passed, including the three new sky-detail specs and all unchanged existing specs. |
| e2e shard 1/2 | `pnpm exec playwright test --shard=1/2` | 0 | 50 passed, 1 pre-existing `@ci` skip (5.7 m). |
| e2e shard 2/2 | `pnpm exec playwright test --shard=2/2` | 0 | 41 passed (4.3 m). |

The full Playwright matrix was executed as two shards covering all projects
(tablet iPad Mini, phone iPhone 13, prod preview on 5198): **91 passed, 1
pre-existing skip, 0 failures**. This split is used deliberately: a single
long-running unsharded pass previously degraded under WebGL context loss in
this environment; the sharded run keeps the same test set and avoids that
resource failure. No test was weakened, skipped or deleted to obtain green.

Pre-existing warnings left untouched: Vite `configLoader: 'native'`
extensionless import at `vite.config.ts:6:36`, `THREE.WebGLShadowMap:
PCFSoftShadowMap` deprecation, and the >500 kB bundle warning. No WebGL
context-loss failures occurred in this run.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Exactly two layers with distinct depth and speed. | `src/core/cloud-layers.ts` frozen tuple; `e2e/sky-detail.spec.ts:83` asserts `far`/`near`, `near.depth > far.depth`, `near.speed > far.speed`. | pass |
| AC-2 | Cover follows cloud intensity with soft cross-fades; snow capped. | `cloudCover` monotone/clamped tests; `e2e/sky-detail.spec.ts:139` pins clear → storm → clear, an intermediate faded cover, and the snow cap. | pass |
| AC-3 | Near layer drifts faster, wraps inside the arc. | `layerOffset` unit tests; `e2e/sky-detail.spec.ts:83` steps 60 frames and a whole-lap step, asserting near > far × 1.5 and offsets in `[0,1)`. | pass |
| AC-4 | Reduced motion freezes drift but keeps static layers and weather repaint. | `e2e/sky-detail.spec.ts:183` emulates reduced motion, asserts `drifting: false`, frozen offsets, visible puffs and rising cover. | pass |
| AC-5 | No per-frame allocation; perf budget green. | Static read of `src/scene/weather-particles.ts`: all creation at boot/module scope, scratch objects reused in `update`; `e2e/perf-budget.spec.ts` and `e2e/perf-budget-observe.spec.ts` green in both targeted and full runs. | pass |
| AC-6 | DEV witnesses expose count/drift/cover; existing specs stay green. | `SceneHandle.cloudLayers()`, `setCloudWeather()`, `stepClouds()` in `src/scene/init-scene.ts`; unchanged `sun-moon`, `a11y`, `perf-budget`, `cargo`, `smoke` specs green in the full matrix. | pass |
| AC-7 | Visual-only diff; no save/UI/audio/dependency/clarity/product change. | Scope guard below: no `package.json`, lockfile, state/save, UI, audio, clarity artifact or `product.md` diff; no new network request, identifier, third-party script or texture asset. | pass |
| AC-8 | Full chain green including coverage, tablet/phone/prod, axe and perf. | Tables above: static/unit/coverage/build green; 91 passed across all Playwright projects; axe-clean tablet states; perf gates green. Manual physical-device checks remain human-only. | pass |

## Scope guard

`git diff --name-only da63f087eceec2754e7e0daf5efa71a0a7206a77..HEAD` lists
only: `conductor/tracks.md`, the eight `conductor/tracks/sky-detail_20261120/`
state/spec/plan/evidence files, `e2e/sky-detail.spec.ts`,
`src/core/cloud-layers.ts`, `src/core/cloud-layers.test.ts`,
`src/scene/day-ambience.ts`, `src/scene/init-scene.ts` and
`src/scene/weather-particles.ts`. No forbidden path changed; 13 files,
1098 insertions / 35 deletions.

## Non-claims and human-only exceptions

- iPad Safari and Android Chrome touch/audio/frame-rate checks are human-only
  exceptions and were **not** performed by an agent.
- The v1.0 ship gate (3/3 children first ride < 60 s, 10+ minute unassisted
  session, zero data loss, 30-day dogfooding) is **not** claimed; only one
  child is available.
- `conductor/archive/clarity-audit_20261110/comparison.md` remains eight
  `awaiting observation` cells; no clarity number was measured or invented.
- The known `conductor/product.md:115` wording drift is untouched by this
  track and belongs to the later release track.
