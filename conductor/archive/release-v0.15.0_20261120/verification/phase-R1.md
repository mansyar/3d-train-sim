# Phase R1 Verification — Deterministic cargo-arc trace

- **Track:** `release-v0.15.0_20261120`
- **Phase:** R1
- **Date:** 2026-11-20
- **Branch:** `chore/release-v0.15.0_20261120`
- **Phase base:** `c19947fe2bbbb6b669a0ec9decc017645847e86a`
- **Head at verification:** `73317daa2b31133296f694d86e8a9c2f48dbd5f3` (this evidence commit is appended on top)
- **Result:** VERIFIED — all configured checks green; cargo-arc e2e passed 5/5 repeats.

## Goal and approach

Remove the CI-load-sensitive, test-side `requestAnimationFrame` sampler from
`e2e/cargo.spec.ts`. The scene rig now records an in-place, preallocated trace of
every cargo transfer (start sample at progress 0, every tick, and the landing tick
at progress 1 before the active transfer is cleared). The arc assertions read that
app-recorded trace through the existing DEV-only scene handle; `transferWitness()`
and all player-facing crate timing stay unchanged.

## TDD record

| Stage | Observation |
| --- | --- |
| RED (unit) | After adding the five new unit tests, `pnpm check` exited 1 with 9 × `TS2339: Property 'transferTrace' does not exist on type 'RigCargo'` at `src/scene/rig-cargo.test.ts` lines 172, 175, 183, 191, 203, 204, 219, 231, 233. |
| RED (implementation bugs) | First implementation run failed `expected NaN to be close to +0` on landing spot/to: the test wagon had no mesh, so `Box3.setFromObject(wagon).max.y = -Infinity` produced NaN world coords. Fixed by giving the harness wagon a `BoxGeometry` mesh. Biome also flagged `lint/style/noNonNullAssertion` on the trace-array accessor; fixed by removing the accessor and using explicit guards. |
| GREEN (unit + types + lint) | `pnpm check` exited 0: Biome 204 files clean, `tsc --noEmit` clean, 60 test files / 1051 tests passed. |
| GREEN (full verification) | Exact chained command exited 0; all four steps passed. |

E2E assertions were authored before the implementation commit (test-first ordering);
the deterministic pass/fail proof is the five-repeat run below.

## Commands

Exact command run (single chained invocation, exit code 0):

`pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5 && pnpm exec playwright test e2e/sky-detail.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts`

| Step | Command | Exit code | Result / counts |
| --- | --- | --- | --- |
| 1 | `pnpm check` | 0 | Biome: 204 files checked, no fixes. `tsc --noEmit`: clean. Vitest: 60 passed / 60 files, 1051 passed / 1051 tests (3.14 s). |
| 2 | `pnpm build` | 0 | Vite 8.3.6: 117 modules transformed, built in 660 ms; PWA generateSW: 178 precache entries (10661.48 KiB), `dist/sw.js` + `dist/workbox-9c191d2f.js` generated. |
| 3 | `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5` | 0 | 30 passed, 0 failed (6 cargo specs × 5 repeats), 5.1 m, 2 workers. |
| 4 | `pnpm exec playwright test e2e/sky-detail.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts` | 0 | 8 passed, 0 failed, 24.3 s (sky-detail 3, a11y 1, perf-budget 3, perf-budget-observe 1). |

## Five-repeat proof

The arc spec `e2e/cargo.spec.ts:430:1 › load and delivery crates arc between the
platform slot and the wagon bed` reported five passing results in the
`--repeat-each=5` run, with no flake and no retry:

| Repeat | Result | Duration |
| --- | --- | --- |
| 1 | ok | 20.2 s |
| 2 | ok | 20.2 s |
| 3 | ok | 19.7 s |
| 4 | ok | 19.6 s |
| 5 | ok | 19.6 s |

All other cargo assertions (wagon load/deliver/reload, per-train presets, switch
shuttle, reduced motion, count settles before arc finishes, slot visibility) were
left unchanged and passed in all five repeats. The removed RAF sampler is no longer
a possible pass/fail source; the trace poll waits for the delivery landing sample.

## Scope guard

`git diff --name-only c19947fe2bbbb6b669a0ec9decc017645847e86a..HEAD`

```
conductor/tracks/release-v0.15.0_20261120/verification/phase-R1.md
e2e/cargo.spec.ts
src/scene/init-scene.ts
src/scene/rig-cargo.test.ts
src/scene/rig-cargo.ts
```

Exactly the five assigned Touch paths; no Conductor state, product docs, clarity
artifacts, package/lockfile, core cargo modules, state layer, workflows, or dependencies.

## Deviations

None. All changes are inside the assigned `Touches` paths.

## Notes — pre-existing warnings (not introduced by this phase)

- Vite `configLoader: 'native'` unsupported-feature warning for the extensionless
  `import "./src/core/security-headers"` at `vite.config.ts:6:36`; shown during
  `pnpm check`, `pnpm build`, and Playwright webServer startup.
- `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap
  instead.` from the e2e webServer console.
- Vite/Rolldown chunk-size warning: `dist/assets/index-V2NOdeOy.js` is 819.02 kB
  (gzip 217.75 kB), above the 500 kB advisory limit.

## Context — original failed dry runs (not repeated here)

Two authorized Phase 2 release dry runs failed on the same cargo-arc spec, which
motivated this deterministic trace (details in `verification/phase-2.md`):

- Run `44698232311`: e2e gate 91 passed / 1 failed — `expect(arc.length, 'deliver arc
  samples').toBeGreaterThan(1)` received 1; the RAF sampler saw only one delivery
  sample under CI load.
- Run `44700234497`: e2e gate 91 passed / 1 failed — `expect(pointDistance(max.spot,
  max.to), 'deliver ends at destination')` received 4.523869747465884 against a
  limit of 2.9198346195344724; sampling stopped before the arc landed.

This phase fixes the sampling source only. It does not re-run the release workflow
and does not change the frozen release-content diff.

## Non-claims

- No release tag was created, pushed, or claimed; `v0.14.1` remains the latest tag.
- No GHCR image push and no Coolify deploy were performed.
- No clarity numbers were measured; comparison cells remain `awaiting observation`.
- No v1.0 child gate is claimed; no manual device check was performed (human-only exception).
- No crate timing, `TRANSFER_DURATION_SECONDS`, reduced-motion, confetti, persistence,
  or live `cargoTransfer()` witness behavior changed; no player-facing behavior change.

## Primary verification

The primary independently re-ran the exact command on the final evidence head `a078c8a`: `pnpm check` exit 0 (Biome 204 files clean, tsc clean, 60 files / 1051 tests), `pnpm build` exit 0 (117 modules, 819.02 kB bundle, PWA generateSW 178 precache entries), `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5` exit 0 (30 passed / 30, including 5/5 arc spec), and the companion sky/a11y/perf command exit 0 (8 passed / 8). `CHECK_EXIT=0 BUILD_EXIT=0 CARGO5_EXIT=0 COMPANION_EXIT=0`.

Tree was clean before the run; `git diff --name-only c19947fe2bbbb6b669a0ec9decc017645847e86a..HEAD` listed exactly the five Touch paths. Squash-guard commit range: `0b3c5b3`, `c16d8b3`, `73317da`, `a078c8a`; no merge/user commits. Only pre-existing Vite `configLoader: 'native'`, `THREE.WebGLShadowMap` deprecation and >500 kB chunk warnings appeared.
