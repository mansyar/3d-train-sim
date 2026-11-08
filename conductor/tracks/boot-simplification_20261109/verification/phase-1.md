# Phase 1 — The split

- **Track:** `boot-simplification_20261109`
- **Phase:** 1 of 3, "The split"

- **Date:** 2026-11-08
- **Branch:** `refactor/boot-simplification_20261109`
- **Phase base:** `f8f7d89409cdabbc1b5c1a009a6650871a1d346e`
- **Head after this phase:** squashed into `64095cf` (the working commits `faca892` and `9e43f86` no longer resolve)
- **Result:** verified

## Commands

| Command | Exit | Output |
| --- | --- | --- |
| `pnpm check` | 0 | biome checked 181 files, no fixes; `tsc --noEmit` clean; `vitest run` — 51 files passed, 893 tests passed |
| `pnpm exec playwright test e2e/smoke.spec.ts` (attempt 1) | 1 | 12 passed, 1 failed, 1 skipped — `[tablet] steam puffs…` failed with `page.waitForFunction: Target page, context or browser has been closed` (page/browser torn down mid-wait, not an assertion) |
| `pnpm exec playwright test e2e/smoke.spec.ts` (attempt 2) | 0 | 13 passed, 1 skipped (the `@ci` frame-rate test) — the same test passed in 14.3 s |
| `git diff f8f7d89409cdabbc1b5c1a009a6650871a1d346e -- src/scene/init-scene.ts` | 0 | no output — `init-scene.ts` is byte-identical to the phase base |

Attempt 1's failure was the Playwright page being closed underneath `waitForFunction` while both emulation projects ran WebGL scenes; it did not reproduce on the exact rerun and the failing spec passed. No source change was made between the two runs.

## The new order

Options type: `AppOptions` in `src/ui/app.ts`, carrying `world`, `audio`, `scene`, `isReady?`, `recoveryNote?`. The scene surface it requires is the structural `SceneControls` view (same file); `main.ts` passes the bound `SceneHandle` returned by `initScene`, so the compiler checks all eighteen members against the real scene.

Shipped `src/main.ts` walk:

1. `createWorldStore()`, `createAudioController(createHowlerVoice())`, `restoring = true`, `recoveryLine = null`, `recoveryRead = loadWorldRecovery()` (lines 37–45).
2. `const canvas = mountShell(root)` — markup only (line 51).
3. `const scene = initScene(canvas, world, audio)` — bound before any control exists (line 52).
4. `const dayClock` — three-member adapter over the const scene, no fallback (lines 58–67).
5. `void recoveryRead.then(...)` — hydrate / seed, mute, `restoring = false`, day-phase restore, three persistence watchers, first save (lines 69–112).
6. PWA self-update block unchanged, ending with `scene.subscribeRideMode((isRiding) => { riding = isRiding; if (!isRiding) applyPendingUpdate(); })` (lines 114–196).
7. `mountControls(root, { world, audio, scene, isReady: () => !restoring, recoveryNote: () => recoveryLine })` (lines 198–204).
8. Dev handles `__tinyTracksWorld`, `__tinyTracksScene`, `__tinyTracksReady`, `__tinyTracksExport`, and the `recoveryRead`-driven ready flip (lines 206–234).

`src/ui/app.ts` now exposes exactly two mounts in that order: `mountShell(root): HTMLCanvasElement` (markup verbatim, one `innerHTML` write, canvas lookup + throw, no listeners, no scene) and `mountControls(root, options): void` (queries, toybox, drag, grid, ride, gate, day toggle, global `pointerdown`).

## Deleted

- `filmCountListeners`, `rideModeListeners`, `dayPhaseListeners` arrays in `src/main.ts`.
- The three replay `for` loops that flushed them after `initScene`.
- The three `splice` unsubscribes that handled "scene not bound yet".
- The eighteen `scene?.method()` closures in the `mountApp` options object.
- `let scene: SceneHandle | null = null` — the scene is now a `const`.
- The three `?? DEFAULT_DAY_PHASE` / `scene?.` fallbacks in `dayClock`.
- The `DEFAULT_DAY_PHASE` import and the `type SceneHandle` import in `src/main.ts`.
- `mountApp` itself.

Remaining `DEFAULT_DAY_PHASE` uses are the pre-existing ones in `src/core/day-clock.ts`, `src/core/save.ts` and `src/state/persistence.ts` (out of scope). The `filmCountListeners`/`rideModeListeners` sets that remain live inside `src/scene/init-scene.ts` are the scene's own dispatch sets, not boot queues.

## Acceptance criteria

| AC | Evidence |
| --- | --- |
| AC-1 — the option type requires a bound scene | `src/ui/app.ts`: `scene: SceneControls;` — a required, non-optional property, so `mountControls(root, { world, audio })` fails `tsc`; `src/main.ts` passes `scene` from `initScene`. Phase 2 adds the `@ts-expect-error` fixture. |
| AC-3 — smoke unchanged | 13 passed, 1 skipped on the clean run. |
| NFR-6 — no boot deferral | `main.ts` uses no `requestAnimationFrame`/`setTimeout`/microtask to order the three mounts; they run in one task. The only timers are the pre-existing PWA guard/probe ones. |
| FR-8 — scene handle untouched | Empty `git diff … -- src/scene/init-scene.ts` above. |
| FR-12 / NFR-1 — no collateral change | `git status` shows only `src/ui/app.ts` and `src/main.ts`; no dependency, save-format, markup or `src/core` change. Markup moved verbatim to `mountShell`. |

## Deviations

| File | Reason |
| --- | --- |
| `src/ui/app.ts` | The brief types `scene` as `SceneHandle`, but `src/core/import-graph.test.ts` forbids any `src/ui` → `src/scene` edge (it parses `import type` too), and `src/core` is outside this phase's Touches. `app.ts` therefore declares `SceneControls`, a structural view of the eighteen members the controls use. The bound `SceneHandle` is checked against it at the `mountControls` call in `main.ts`, so a renamed or narrowed member is still a compile error. |

## Notes

- First smoke attempt hit a Playwright page-closed flake; the exact rerun was green. If the reviewer sees a flaky `steam puffs` tablet run, retry before treating it as a regression.
- Phase 2 should reuse the `SceneControls` name if it needs a fixture type, and should assert `mountShell` → `initScene` → `mountControls` textually plus the absence of the queue names in `src/main.ts`.
- `dayClock.subscribe` still adapts `(phase) => listener({ phase })` because `src/state/persistence.ts` takes a clock-shaped view; that adapter is the three-line form the spec keeps.

## Primary verification

Checked at head `64095cf` with a clean working tree, independently of the phase report.

| Check | Result |
| --- | --- |
| `pnpm check` | exit 0 — biome 181 files clean, `tsc --noEmit` clean, 51 files / **893 tests** in 3.08 s (no test added; count unchanged, as required) |
| `pnpm exec playwright test e2e/smoke.spec.ts` | exit 0 — **13 passed, 1 skipped** in 1.7 min, no retries on the primary's own run |
| `git diff f8f7d89…HEAD -- src/scene/init-scene.ts \| Measure-Object -Line` | **0** — the frozen `SceneHandle` file is untouched (FR-8) |
| `rg "Listeners\|scene\?\.\|DEFAULT_DAY_PHASE\|mountApp" src/main.ts src/ui/app.ts` | no matches — queues, late-bind guards, fallbacks and the old mount name are gone |
| `git diff --stat f8f7d89..64095cf` | 3 files, +185/-121: `src/ui/app.ts`, `src/main.ts`, the evidence file. Nothing under `src/core`, `src/scene`, `e2e` or the dependency manifests changed |

Review notes:

- **The order is now the type system's job, not a convention.** `mountControls` takes `scene: SceneControls` (required), and `main.ts` can only satisfy it from the `const scene = initScene(...)`. There is no state in which the scene is null after boot.
- **The deviation is the right call.** My brief said `scene: SceneHandle`; the phase agent found that `src/core/import-graph.test.ts` forbids every `src/ui → src/scene` edge, `import type` included, so a structural `SceneControls` was the only lawful option without editing `src/core`. The compiler still checks all eighteen members at the `mountControls` call site, which is where they matter.
- **`canvas` is queried twice on purpose.** `mountShell` returns it for `initScene`; `mountControls` re-queries it because `createToyDrag(canvas, …)` binds pointer listeners to it. One source of truth (the DOM), no second hand-off to keep in sync.
- **The smoke flake in attempt 1 is the documented soak artefact** (`steam puffs` tablet, page closed under `waitForFunction`), and the primary's own run was green first time. It is recorded, not smoothed over.
