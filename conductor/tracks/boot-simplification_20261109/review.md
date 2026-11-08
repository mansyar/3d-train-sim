# Review — Boot Simplification

| Field | Value |
|---|---|
| Track | `boot-simplification_20261109` |
| Branch | `refactor/boot-simplification_20261109` |
| Range | `9ac5fd1..edd3706` (round 1); round 2 over the Phase R1 commit |
| Rounds | 1 |
| Verdict | **PASS WITH FINDINGS** |

## Summary

The split does what the roadmap asked and does it without a behaviour seam. `main.ts` now runs
store → recovery read → `mountShell(root)` → `initScene(canvas, …)` → `mountControls(root, {
scene, … })`, and the three listener queues, three replay loops, splice-based pre-bind
unsubscribes and `?? DEFAULT_DAY_PHASE` fallbacks are gone. `mountControls` takes the bound scene
and calls its members directly, so the eighteen `scene?.` closures cannot come back without a
type error.

The reviewer checked the seams that could hide a lost call: nothing is wired twice, re-targeted
or dropped; `isReady`/`recoveryNote` are still thunks; `restoring = false` still happens inside
the recovery microtask, before the watchers attach; the day clock reads the live scene so the
first icon still matches the seed; `subscribeRideMode`/`subscribeFilmCount` are `Set.add`
shorthands that cannot rely on `this`, so the extracted references are safe; the canvas re-query
returns the same element and `.scene-canvas` is absolutely positioned, so measuring before the UI
modules exist cannot change its size.

The one real weakness is in the guard itself. Three of its assertions could pass while the thing
they name is gone: the `scene` argument was matched by a 400-character window that the
dev-handle comment satisfied, the queue scan only recognised names ending in `Listeners`, and
the order check read raw text while its own JSDoc promised a commented-out mount could not
satisfy it. A guard that can pass for the wrong reason is worse than no guard, because it buys
false confidence. All three are closed in Phase R1 and each fix was proved to bite.

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` | pass — 182 files |
| Types | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 52 files / 898 tests (893 baseline + 5 guard tests) |
| Coverage | `pnpm test:coverage` | pass — 97.36% statements / 91.06% branches / 98.10% functions / 99.44% lines, identical to base |
| Build | `pnpm build` | pass — 178 precache entries, 10,642.67 KiB; gzipped JS+sw 218,485 B vs base 218,712 B (−227 B) |
| Boot-order guard | `pnpm test src/ui/boot-order.test.ts` | pass — 5 tests (post-R1) |
| First events | `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/ride-toybox-flow.spec.ts` | pass — 17 passed, 1 skipped (2.4 m) |
| Full matrix | `pnpm exec playwright test` | pass — 57 passed, 1 skipped in 8.7 min at `edd3706` (attempt 1: 55/2/1, documented soak; attempt 2 clean) |

## Requirements coverage

| Requirement | Implemented by | Verified by | Status |
|---|---|---|---|
| FR-1 `mountShell` writes the frame and returns the canvas | `src/ui/app.ts` | `pnpm check`, smoke | covered |
| FR-2 `mountControls` writes no markup | `src/ui/app.ts` | diff review (markup is byte-identical) | covered |
| FR-3 `AppOptions` carries the bound scene | `src/ui/app.ts` | `@ts-expect-error` fixture | covered |
| FR-4 order shell → scene → controls | `src/main.ts` | `src/ui/boot-order.test.ts` | covered |
| FR-5 no listener queues or replays | `src/main.ts` | `src/ui/boot-order.test.ts` | covered |
| FR-6 day clock reads the scene directly | `src/main.ts` | `e2e/sun-moon.spec.ts` | covered |
| FR-7 first events still land | `src/main.ts` | smoke, sun-moon, ride-toybox-flow | covered |
| FR-8 `SceneHandle` unchanged | — | empty `init-scene.ts` diff | covered |
| FR-9 storage gate, recovery thunk, PWA block, dev handles unchanged | `src/main.ts` | diff review, e2e | covered |
| FR-10 guard test | `src/ui/boot-order.test.ts` | the test itself, both bite directions | covered after R1 |
| FR-11 docs | `conductor/tech-stack.md`, `conductor/product.md` | diff review | covered |
| FR-12 no core, dependency or format change | — | `git diff --stat` | covered |
| NFR-1 no dependency | — | manifest diff empty | covered |
| NFR-2 no visible change, same-task boot | `src/main.ts` | smoke, matrix | covered |
| NFR-3 coverage not below baseline | — | `pnpm test:coverage` | covered |
| NFR-4 size not larger | — | build gzip −227 B | covered |
| NFR-5 order enforced by the compiler | `AppOptions` | `@ts-expect-error` fixture | covered |
| NFR-6 no boot deferral | `src/main.ts` | diff review (no rAF/timer added) | covered |
| AC-1 tsc rejects a scene-less mount | `AppOptions` | `src/ui/boot-order.test.ts` | covered |
| AC-2 guard reports the order and finds no queue; fails both ways | guard | demonstrated swaps/re-additions | covered after R1 |
| AC-3 smoke green | — | 13 passed, 1 skipped | covered |
| AC-4 first-event specs | — | smoke (camera), sun-moon, ride-toybox-flow | covered |
| AC-5 matrix parity | — | 57 passed, 1 skipped | covered |
| AC-6 `pnpm check` green, coverage flat | — | 898 tests, coverage unchanged | covered |
| AC-7 build parity | — | 178 entries, gzip smaller | covered |
| AC-8 docs | — | tech-stack + roadmap | covered |

## Findings — round 1

| ID | Severity | File | What | Fix |
|---|---|---|---|---|
| F1 | Medium | `src/ui/boot-order.test.ts:78` | The `scene` check matched a 400-character window at the `mountControls(` call, and the dev-handle comment inside that window contains the word "scene", so deleting the argument stayed green | Match the argument list on the comment-stripped source; proved failing with `scene,` removed |
| F2 | Medium | `src/ui/boot-order.test.ts:64` | The queue scan only knew `\w*Listeners` declarations and `for…of` replays, so `const queue`, `new Set()`, `.forEach(` all passed | Scan for a queue-ish binding name initialised to `[`/`new Set`/`new Map`/`new Array`, and for `for…of` or `.forEach(` replays; proved failing with `const queue: unknown[] = []` |
| F3 | Medium | `src/ui/boot-order.test.ts:12` | The JSDoc claimed a commented-out mount could not satisfy the order, but `indexOf` and `toContain` read raw text | Read the comment-stripped copy for order and anti-vacuity, and correct the JSDoc; proved failing with `mountShell` commented out |
| F4 | Low | `src/ui/app.ts:9,14` | `CellFromPoint` was imported only to be re-exported, and nothing imports it from `./app` | Deleted the re-export and its type-only import; the type still lives in `src/ui/toy-drag.ts` |
| F5 | Low | `spec.md:95` | Said `__tinyTracksScene` is assigned before `mountControls`; the dev block runs after it | Corrected, with the reason nothing depends on the earlier assignment |
| F6 | Low | `spec.md:82` | AC-4 credited the camera-cycle witness to `e2e/fleet.spec.ts`; it is the two-loops journey in `e2e/smoke.spec.ts` | Corrected the witness list |
| F7 | Low | `verification/integrated.md:32` | The integrated matrix numbers (55/2/1) differ from `phase-2.md` (56/1/1) with no note that they are separate runs | Headed and dated the integrated run and named the Phase 2 run as a different one |

## Overrides

None.

## Plan compliance

Phase 1 `64095cf`, Phase 2 `a8dc1bb`, Phase 3 `f23da57` all verified; Phase R1 closes the seven
findings above. Recorded deviations: the options type is a structural `SceneControls` view rather
than `SceneHandle` (the import-graph guard forbids every `src/ui → src/scene` edge, `import type`
included); the canvas is queried in both `mountShell` and `mountControls`; Phase 3 was performed
by the primary because it writes Conductor-owned docs; the gzip baseline used a disposable
worktree.

## Out of scope

Real-device boot timing (manual layer), the perf overlay's placement, and the pre-existing
ordering nit in `mountControls` where `createTrainPicker` is built before the chrome guard.

## Debt

None carried forward: the three guard holes were fixed rather than recorded, because a guard that
passes for the wrong reason is the failure mode this track exists to prevent.

## Doc sync

`synced` — `conductor/tech-stack.md` documents the three-step order and the guard; the
`conductor/product.md` roadmap row is marked shipped with the measured numbers.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | PASS WITH FINDINGS | 0 | 0 | 3 | 4 | 7 |
