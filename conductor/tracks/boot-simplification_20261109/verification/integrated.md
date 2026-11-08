# Integrated Verification — Boot Simplification

**Track:** `boot-simplification_20261109`
**Branch:** `refactor/boot-simplification_20261109`
**Base:** `main` @ `9ac5fd1ded3a7d333409fa118bcb68d82510eef0`
**Phase checkpoints:** P1 `64095cf`, P2 `a8dc1bb`, P3 `f23da57`

## Scope

The UI can no longer be wired before the scene exists. `main.ts` builds the world store,
starts the recovery read, writes the shell with `mountShell(root)`, binds the scene with
`initScene(canvas, …)`, and only then calls `mountControls(root, { scene, … })`. The
eighteen `scene?.` closures, the three listener-replay arrays and their replay loops, the
splice-based pre-bind unsubscribes and the `?? DEFAULT_DAY_PHASE` fallbacks are gone. The
compiler now refuses a `mountControls` call without a scene, and
`src/ui/boot-order.test.ts` fails if the three calls reorder or a listener queue returns.

Nothing else changed: no markup, no stylesheet, no render order, no `SceneHandle` member,
no `src/core` file, no dependency.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static | `pnpm exec biome check .` | 0 | 182 files, no findings |
| Types | `pnpm exec tsc --noEmit` | 0 | clean (and the `@ts-expect-error` fixture in the guard is consumed, not unused) |
| Unit | `pnpm check` | 0 | 52 files / **898 tests** (893 base + 5 guard tests) |
| Coverage | `pnpm test:coverage` | 0 | 97.36% statements / 91.06% branches / 98.10% functions / 99.44% lines — identical to the base |
| Build | `pnpm build` | 0 | 178 precache entries, 10 642.67 KiB; gzipped JS+sw **218 485 B** vs base **218 712 B** (−227 B) |
| Boot order | `pnpm test src/ui/boot-order.test.ts` | 0 | 5 passed; both bite directions demonstrated and reverted (order swap, re-added queue) |
| First events | `pnpm exec playwright test e2e/smoke.spec.ts e2e/sun-moon.spec.ts e2e/fleet.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | 18 passed, 1 skipped |
| Full matrix | `pnpm exec playwright test` | 0 | **57 passed, 1 skipped** (`@ci` canary) in **8.7 min** — 58 runs, no retries, no page crashes. Attempt 1 was 55 passed / 2 failed / 1 skipped: tablet `smoke.spec.ts:63` (`page.waitForTimeout: Page crashed`) and tablet `river.spec.ts:216`, both the documented dev-server soak class; both files then passed together (15 passed, 1 skipped in 2.1 m), and attempt 2 was clean |

## Acceptance criteria

| ID | Criterion | Witness |
|---|---|---|
| AC-1 | A `mountControls` call without a scene is a compile error, proven by a `@ts-expect-error` fixture with a compiling positive control | `src/ui/boot-order.test.ts`; `pnpm check` green |
| AC-2 | A source guard finds `mountShell` → `initScene` → `mountControls` in `main.ts`, no listener-array declaration, no replay loop; demonstrated failing both ways | the two recorded failures in `phase-2.md`, each reverted with an empty `git diff` |
| AC-3 | The existing smoke journey still passes on tablet and phone | 13 passed, 1 skipped in the phase run; part of the matrix |
| AC-4 | The three first events (▶/⏹, 🎥 cycle, day icon) reach the UI on the first try | smoke ride + film-cycle, `sun-moon`, `fleet`, `ride-toybox-flow` |
| AC-5 | The full matrix matches the base at 57 passed / 1 skipped | full matrix row above |
| AC-6 | `pnpm check` green, 893 + guard tests, coverage not lower | 898 tests, coverage equal to the base |
| AC-7 | `pnpm build` still 178 precache entries and the gzipped bundle not larger | 178 / −227 B |
| AC-8 | The tech stack and roadmap describe the order | `tech-stack.md` folder map; `product.md` row marked shipped |

## Deviations carried from the phases

1. `AppOptions['scene']` is a structural `SceneControls` view (eighteen members) rather
   than `SceneHandle`, because `src/core/import-graph.test.ts` forbids every
   `src/ui → src/scene` edge. The compiler still checks all eighteen members at the
   `mountControls` call site in `main.ts` — the guarantee is unchanged, the import is not.
2. The guard lives in `src/ui/`, not `src/core/`, for the same reason.
3. `mountControls` re-queries `.scene-canvas` because `createToyDrag` binds its pointer
   listeners to it. One canvas, two lookups, no second hand-off.
4. Phase 3 was performed by the primary agent (Conductor-owned docs) and used a
   disposable worktree for the base build.

## Residual risk

- **The type fixture depends on `AppOptions` staying non-optional in `scene`.** If a future
  change makes `scene` optional again, the `@ts-expect-error` becomes unused and
  `pnpm check` fails — which is the intent, but it means the guard reports the regression
  as a type error rather than as a named boot-order failure.
- **The order guard is textual.** It proves the three calls appear in order in the file; it
  cannot prove the values passed are the ones from the previous step. The scene-required
  type and the runtime behaviour (smoke) cover that half.
- **First events are proven at the journey level.** A listener lost for a subsystem the
  journeys never touch (for example a future probe) would not be caught here.
- **Boot timing is unchanged by construction, not measured against a device.** Nothing was
  deferred, so there is no new async gap to miss; real-device cold start remains manual.

## Verdict

The three phases hold together: the compiler refuses the old ordering, a source guard
catches the ordering it cannot express as a type, and the journeys that depend on first
events still pass. The full matrix ran at parity with the base (57 passed, one deliberately
skipped canary, 8.7 min) after one contention-shaped attempt, so the merged journeys hang
together as a suite and not only phase by phase. Ready for review.
