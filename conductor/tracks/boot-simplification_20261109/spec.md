# Boot Simplification — Specification

> **Stability note:** Requirement IDs are stable identifiers. After approval, never renumber `FR-`, `NFR-`, or `AC-` entries. If a requirement is removed or changed, mark it `Withdrawn` or `Amended` with a dated note instead of deleting it.

## Overview

`src/main.ts` mounts the UI first and binds the scene second. Everything the UI needs from the scene therefore has to survive a gap: eighteen capability closures are written as `scene?.method()` guards, three listener arrays buffer subscriptions until the scene exists, each buffered unsubscribe has to handle the not-yet-bound case, and `dayClock` mirrors the scene's day phase with `?? DEFAULT_DAY_PHASE` in three places.

This track inverts the order — shell, then scene, then controls — so the gap stops existing. `mountApp` splits into `mountShell` (markup, returns the canvas) and `mountControls` (wiring, takes a bound `SceneHandle`). The queues, the replay loop, the pre-bind unsubscribes and the fallbacks are deleted, and the type checker refuses any attempt to wire controls before the scene exists.

## Problem / Motivation

**The queues exist only for the mount order.** `main.ts` builds the canvas inside `mountApp`'s `innerHTML` and returns it; `initScene` only runs afterwards. So a control that subscribes during mount has no producer to subscribe to. The current code buffers: `filmCountListeners`, `rideModeListeners`, `dayPhaseListeners` are filled during the mount, replayed once after `initScene`, and every unsubscribe is written twice — a `splice`-based removal when the scene is still null, and `scene.subscribeX(listener)` otherwise. The comment at the replay site records the bug this guards against: an unsubscribe that misses the bind would replay into it and live on.

**Every capability read pays for it.** `AppOptions` declares eighteen members (`cellFromPoint`, `beginGhost`, `moveGhost`, `endGhost`, `pickPiece`, `cellToScreen`, `setPieceVisible`, `setGridVisible`, `startRide`, `stopRide`, `notifyActivity`, `tootWhistle`, `cycleFilmTarget`, `dayPhase`, `advanceDay`, `subscribeDayPhase`, `subscribeFilmCount`, `subscribeRideMode`). `main.ts` fills each one with a closure, most of them `scene?.method() ?? fallback`. `SceneHandle` already declares all eighteen with the same signatures, so the closures are a duplicate interface that can silently drift: adding a member to `SceneHandle` does not oblige `AppOptions` to expose it, and the other way round nothing checks the shapes agree except use.

**The fallbacks hide real bugs.** The three `?? DEFAULT_DAY_PHASE` sites mean a missing scene reads as "day" instead of failing. `dayPhase()` in `AppOptions`, `dayClock.phase`, and the `advanceDay` path each carry one. Once the scene is bound before controls, a missing scene is a construction error and a fallback is a lie.

**Boot order is a convention, not a rule.** Nothing stops a future edit from moving `initScene` above `mountApp`, or from reintroducing a queue, except review. There is no test that would fail.

## Goals & Success Metrics

- **Goal:** delete the pre-bind machinery. *Metric:* `main.ts` contains no listener array, no replay loop and no pre-bind unsubscribe; the file shrinks and no `?? DEFAULT_DAY_PHASE` remains in it.
- **Goal:** make the order enforced. *Metric:* calling `mountControls` without a `scene` is a `tsc` error; a source-level guard fails if the three mounts are called out of order or a queue returns.
- **Goal:** no behavioural change. *Metric:* the existing suite passes unchanged — smoke 13 passed / 1 skipped, full matrix 57 passed / 1 skipped — including the specs that watch the first ride, film and day events.
- **Goal:** no size or speed cost. *Metric:* 178 precache entries, gzipped JS not larger than the base build.

## Scope

### In Scope

- `src/ui/app.ts`: split `mountApp` into `mountShell(root)` and `mountControls(root, options)`; shrink `AppOptions` to `{ world, audio, scene, isReady?, recoveryNote? }`; bind the capabilities from the scene inside `mountControls` (`cellFromPoint: (x, y) => scene.cellFromPoint(x, y)`, and so on).
- `src/main.ts`: call `mountShell` → `initScene` → `mountControls`; delete the three listener arrays, the replay loop and the pre-bind unsubscribes; let `dayClock` read and write the scene directly.
- A new source-level guard test for the boot order and the absence of queues.
- `conductor/tech-stack.md`: document the boot order and why controls require a scene.
- `conductor/product.md`: mark the roadmap row shipped.

### Out of Scope

- Changes to `SceneHandle` — no member added, removed, renamed or retyped.
- The storage gate: `restoring`, `isReady`, the lazy `recoveryNote` thunk and the recovery read stay exactly as they are; they concern a snapshot in flight, not a scene.
- Any change to `src/core/`, the save format, the frame contract, the asset pipeline, or the DOM markup itself.
- Any visual, timing or first-paint change.
- Removing the `dayClock` adapter object. Persistence takes structural types (`{ phase, subscribe }` and `{ setPhase }`) and `SceneHandle` spells the members differently; the adapter shrinks to three lines with no fallback rather than disappearing.
- A general dependency-injection container, or moving scene construction out of `main.ts`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `src/ui/app.ts` exports `mountShell(root: HTMLElement): HTMLCanvasElement`, which writes the frame markup once and returns the canvas. It wires no events and touches no scene. | must |
| FR-2 | `src/ui/app.ts` exports `mountControls(root: HTMLElement, options: ControlsOptions): void`, which wires every control against an already-bound `SceneHandle` and writes no markup. | must |
| FR-3 | `AppOptions` (as consumed by `mountControls`) carries `world`, `audio`, `scene`, and the optional `isReady`/`recoveryNote` members only. The eighteen capability closures are gone; `app.ts` binds them from `scene`. | must |
| FR-4 | `src/main.ts` calls `mountShell` → `initScene` → `mountControls` in that order, and passes a non-null `SceneHandle` to `mountControls`. No `scene?.` guard remains for a capability the scene always provides. | must |
| FR-5 | The three listener arrays, the replay loop after the bind, and the three pre-bind unsubscribe branches are deleted. | must |
| FR-6 | `dayClock` reads and writes the scene directly; no `?? DEFAULT_DAY_PHASE` remains in `src/main.ts`. | must |
| FR-7 | The first events still reach the UI: the ▶/⏹ face, the 🎥 visibility and the day icon update from the first change, with no queue to catch them. | must |
| FR-8 | `SceneHandle` is byte-identical in shape: no member added, removed, renamed, or retyped; its doc comments unchanged. | must |
| FR-9 | `restoring`/`isReady`, the lazy `recoveryNote` thunk, the PWA self-update block and the dev handles (`__tinyTracksWorld`, `__tinyTracksScene`, `__tinyTracksReady`, `__tinyTracksExport`) keep their current semantics. | must |
| FR-10 | A source-level guard test fails if `main.ts` calls the mounts out of order, if it contains a listener array or a replay loop, or if `mountControls` is invoked without a scene. | must |
| FR-11 | `conductor/tech-stack.md` records the boot order and the reason controls take a bound scene. | should |
| FR-12 | No `src/core` runtime change, no new dependency, no save-format change, no markup change. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new runtime or development dependency. |
| NFR-2 | No visible change: same DOM structure and classes, same first-paint behaviour, same canvas sizing at boot. The shell and the scene are still created in the same task, exactly as today. |
| NFR-3 | `pnpm check` passes, and coverage on `src/core` + `src/state` does not fall below the recorded baseline (97.36 statements / 91.06 branches / 98.10 functions / 99.44 lines). |
| NFR-4 | The production build keeps 178 precache entries and the gzipped JavaScript bundle does not grow against the base build. |
| NFR-5 | The order is enforced by the type checker, not by review: a `mountControls` call without a `SceneHandle` fails `tsc`. |
| NFR-6 | No new per-frame work, no new timer, and no added `requestAnimationFrame` at boot. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `pnpm exec tsc --noEmit` rejects a `mountControls` call without `scene`, proven by a `@ts-expect-error` fixture that fails if the requirement disappears. | FR-3, NFR-5 |
| AC-2 | The guard test reports the three mounts in order and finds no listener array and no replay loop in `src/main.ts`; it fails when the order is swapped or a queue is added back, demonstrated both ways. | FR-4, FR-5, FR-10 |
| AC-3 | `e2e/smoke.spec.ts` passes (13 passed, 1 skipped) — the app boots with a clean console, drag-places, rides, and the parent gate still works. | FR-1, FR-2, FR-7 |
| AC-4 | The first-event specs pass: `e2e/sun-moon.spec.ts` (day icon), `e2e/smoke.spec.ts` (the camera-cycle button inside the two-loops journey), `e2e/ride-toybox-flow.spec.ts` (ride controls). | FR-7 |
| AC-5 | The full matrix matches the base: 57 passed, 1 skipped, no retries, no page crashes. | NFR-2 |
| AC-6 | `pnpm check` is green with the unit count at 893 plus the new guard test, and coverage is not below baseline. | NFR-3 |
| AC-7 | `pnpm build` reports 178 precache entries and the gzipped JS total is not larger than the base build. | NFR-4 |
| AC-8 | `conductor/tech-stack.md` describes the order and the reason; the roadmap row is marked shipped. | FR-11 |

## Edge Cases

- **Canvas layout at boot:** `mountShell` sets `innerHTML` and `initScene` runs in the same task, exactly as today. If `clientWidth` is zero at that instant today, it stays zero; this track does not add a frame of delay to "fix" it.
- **`prefers-reduced-motion`:** sampled once in `mountControls`, as today; nothing about the split changes when it is sampled.
- **A ride already in progress at mount:** impossible — `initScene` starts idle and the world is hydrated before the controls exist. `riding` still initialises to `false` and is corrected by the first `subscribeRideMode` callback, as today.
- **Day phase before the first subscription:** `dayClock` now reads the live scene, so `phase` is correct from the first call instead of falling back to `DEFAULT_DAY_PHASE`.
- **`?perf=debug` overlay:** mounted by `initScene` on `document.body`, not inside `root`, so the shell/controls split does not move it.
- **Dev handles:** the `import.meta.env.DEV` block runs last, after `mountControls`, so `__tinyTracksWorld` and `__tinyTracksScene` appear a few lines later than before; `__tinyTracksReady` still flips when the recovery read settles. Nothing awaits the handles, and `e2e` waits on `__tinyTracksReady`.
- **A future member added to `SceneHandle`:** controls can use it immediately; no second interface to update. That is the point of FR-3.

## Dependencies

- **Tracks:** `frame-contract_20261109` (merged `9ac5fd1`) and `e2e-cost_20261108` (merged `410a1c3`) — the frame contract must already exist so the scene's subscriber set is stable while the wiring moves.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** `SceneHandle`'s eighteen members are the complete surface the UI needs. Verified by grep: every `options.*` capability read in `app.ts` has a matching `SceneHandle` member with an identical signature.
- **Assumption:** `subscribeX` on `SceneHandle` is safe to call once, immediately, at bind time, and returns a working unsubscribe. Verified in `init-scene.ts` and exercised today by the rebuilt subscriptions.
- **Assumption:** no e2e spec imports `mountApp`; verified — only `src/main.ts` imports it.
- **Open question (deferred, not blocking):** whether `initScene` should eventually construct the shell itself. Rejected for this track: it would move markup into the scene layer and violate the boundary the renderer decomposition just established.

## References

- `src/main.ts`, `src/ui/app.ts`, `src/scene/init-scene.ts` (`SceneHandle`), `src/state/persistence.ts` (`watchDayPhasePersistence`, `restoreDayPhasePreference`)
- `conductor/archive/frame-contract_20261109/` — the frame contract this builds on
- `src/core/import-graph.test.ts`, `src/core/no-external-urls.test.ts` — precedent for source-level guards
