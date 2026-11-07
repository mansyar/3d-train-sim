# Phase 4 — Picking

| Field | Value |
| --- | --- |
| Track | `renderer-decomposition_20261108` |
| Phase | 4 — Picking (FR-6, AC-5) |
| Date | 2026-11-08 |
| Branch | `refactor/renderer-decomposition_20261108` |
| Phase base (brief) | `15fd925` — "Mark phase 'Ghost and grid' as complete" |
| Authoritative base | `73c89d5` — "Mark phase 'Picking' as in progress" (the marker commit) |
| Head | `10a94fe` — `refactor(scene): move raycast picking and the cell projection out of the renderer` |
| Result | verified |

The two bases differ only in Conductor bookkeeping (`plan.md`, `metadata.json`); no
source file changes between them. All diffs below were taken against `15fd925` and
re-checked against `73c89d5` with identical results.

## Tasks and commits

| Task | Scope | Commit |
| --- | --- | --- |
| P4.T1.1 | `raycaster`, `pointerNdc`, `groundPlane`, `groundHit`, `cellFromPoint`, `pickPiece` → `src/scene/track-picking.ts` | `10a94fe` |
| P4.T2.1 | `cellToScreen` as a thin projection wrapper, exported signature preserved | `10a94fe` |

One commit: the extraction cannot compile half-done (the facade would reference a body
that moved). Same convention as Phases 2 and 3.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit | `pnpm check` | 0 | biome 181 files clean, `tsc --noEmit` clean, 49 files / 874 tests passed (4.2 s) |
| E2E | `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | 50 passed (3.3 m), tablet + phone, first run |

`pnpm check` needed two fix attempts, both formatter/import-style only:

1. First run exit 1 — `biome` reported `useImportType` on the narrowed `three` and
   `track-graph` imports in `track-renderer.ts` (all remaining names are types now)
   and a formatter error on the multi-line `three` import in `track-picking.ts`.
   Converted both facade imports to `import type` and collapsed the picking import.
2. Second run exit 1 — formatter wanted the now-short facade `three` type import on
   one line. Collapsed it.
3. Third run exit 0.

The E2E run passed on the first attempt, including
`tablet emulation keeps an ambient frame rate with a clean console` (9.8 s tablet,
9.5 s phone), so the throughput-sensitive rerun rule was not triggered.

## Acceptance criteria touched

| Criterion | Evidence |
| --- | --- |
| FR-6 — picking owns the raycaster, ground plane, `cellFromPoint`, `pickPiece`, `cellToScreen` | `src/scene/track-picking.ts` (119 lines) holds all four objects, both hit tests and the projection; `track-renderer.ts` no longer constructs a `Raycaster`, `Plane` or pointer scratch vector. |
| FR-9 — constructed once by the facade with explicit deps, no module-level mutable state | `startTrackPicking(camera, canvas, placement)` is called once in `startTrackRenderer`; all mutable scratch state lives in the factory closure; the module exports only the immutable `cellToScreen` and the factory/type. |
| AC-1 — line budgets | `track-renderer.ts` 682 → 599 lines; `track-picking.ts` 119 lines (≤ 400). |
| AC-2 — unchanged `TrackRenderer` surface | `git diff` shows no change to the `TrackRenderer` interface; `tsc` type-checks the unchanged `init-scene.ts`, `scene-context.ts`, `app.ts`, `toy-drag.ts`, `ride-controls.ts`, `main.ts`. |
| AC-5 — named specs | `smoke`, `undo`, `ride-toybox-flow` all green (50/50). |
| AC-9 — e2e probes unmodified | No `e2e/` file changed; the drag, rotate, trash and station specs that go through `cellFromPoint`/`pickPiece`/`cellToScreen` pass. |
| NFR-1 — no new dependency | `package.json`/lockfile untouched. |

## Parity proof

`git diff --numstat 15fd925 -- src/scene/track-renderer.ts` → `12 95`
(12 added lines, 95 removed; 682 − 95 + 12 = 599).
`git diff --stat` for the commit → `2 files changed, 131 insertions(+), 95 deletions(-)`,
where 131 = 119 (new file) + 12 (facade).

The diff enumerates to exactly these hunk categories:

1. **Imports (two hunks).** `three` narrowed to type-only and `PerspectiveCamera` kept
   (still used by `startTrackRenderer`); `Plane`, `Raycaster`, `Vector2`, `Vector3`
   dropped — they were only ever used by picking. `MEADOW_CELLS` dropped from the
   `track-graph` import for the same reason; `Cell`, `Edge`, `Rotation` remain as types.
   `startTrackPicking` imported; `cellToScreen` re-exported.
2. **The `cellToScreen` declaration.** Removed from the facade; its JSDoc, both
   implementation comments and every arithmetic line are copied verbatim into
   `track-picking.ts`.
3. **The picking scratch block.** The four `const`s (`raycaster`, `pointerNdc`,
   `groundPlane`, `groundHit`) removed from `startTrackRenderer` and re-declared
   verbatim as the first statements of `startTrackPicking`. No other line touched.
4. **`cellFromPoint` and `pickPiece`.** Removed as closures of `startTrackRenderer`,
   re-declared verbatim inside `startTrackPicking`. Bodies are byte-identical: same
   NDC construction from `getBoundingClientRect`, same `setFromCamera`, same
   `intersectPlane(groundPlane, groundHit)`, same `Math.floor` cell maths, same
   `MEADOW_CELLS` bounds test, same `placement.tracked.values()` iteration, same
   `PickedItem` shapes and ordering. Only the closed-over `placement` is now the
   factory parameter of the same type.
5. **Construction seam.** The removed function block's position (after
   `const ghost = startTrackGhost(...)`, before `let tunnelSnow = false`) is where
   `const picking = startTrackPicking(camera, canvas, placement);` sits — the same
   instantiation point the closures previously had.
6. **Return wiring.** `cellFromPoint,` → `cellFromPoint: picking.cellFromPoint,`,
   `cellToScreen: (cell) => cellToScreen(cell, camera, canvas)` →
   `cellToScreen: picking.cellToScreen,`, `pickPiece,` → `pickPiece: picking.pickPiece,`.
   The adapter now lives in `startTrackPicking`'s return object
   (`cellToScreen: (cell) => cellToScreen(cell, camera, canvas)`), still binding the
   same `camera` and `canvas` passed to the facade.

No touched line is reformatted, renamed or reordered. There is no hunk outside these
categories.

## How the frozen signature is preserved

```
src/scene/track-picking.ts   export function cellToScreen(cell: Cell, camera: PerspectiveCamera, canvas: HTMLCanvasElement): { x: number; y: number } | null
src/scene/track-renderer.ts  export { cellToScreen } from './track-picking';
```

- The implementation moved, the parameter order, names, types and return type did not.
- `track-renderer.ts` keeps a real named export named `cellToScreen`, so
  `import { cellToScreen } from '../scene/track-renderer'` resolves exactly as before.
  A broken re-export target would fail the project `tsc --noEmit`, which is part of
  `pnpm check`.
- `TrackRenderer.cellToScreen(cell)` is now `picking.cellToScreen`, which calls the very
  same function with the `camera`/`canvas` captured at construction — one
  implementation, two entry points, as specified in FR-3.
- `init-scene.ts` (`cellToScreen: (cell) => tracks.cellToScreen(cell)`) and the three
  e2e probes (`smoke`, `crossing-gate`) are unmodified and green.

## The live-map coupling

`startTrackPicking` receives the `TrackPlacement` handle itself and calls
`placement.tracked.values()` on every `pickPiece` invocation. It stores no reference to
the maps and copies nothing, so the per-reconcile clearing/refilling of `tracked` is
observed at call time. Passing `placement` (rather than a snapshot or the maps
individually) mirrors the previous closure and is the same pattern the ghost uses for
`placement.templates`.

## Files changed

- `src/scene/track-picking.ts` (new, 119 lines)
- `src/scene/track-renderer.ts` (682 → 599 lines)

Evidence artifacts (not part of the build): this file,
`.conductor/evidence/phase-4-picking-export-probe.ts` (a consumer-shape reference for
the frozen export; not included in `src/`, `e2e/` or the project tsconfig).

## Deviations

None. No file outside the two `Touches` paths was modified.

## Notes

- **The brief overstates `pickPiece`'s map reads.** It says the hit test "resolves
  models from `placement.rendered`"; the removed body never touched `rendered` — it
  iterates `tracked` and returns `PickedItem` ids/data, leaving model resolution to the
  caller. The move preserves that exactly; the handle is passed whole, so `rendered`
  stays reachable without a later rewiring, but nothing new reads it.
- **Pointer maths, left alone as instructed.** `cellFromPoint` normalises by the
  bounding rect's `width`/`height`, while `cellToScreen` maps back with the canvas
  `clientWidth`/`clientHeight`. These agree under the current layout; they diverge only
  if a CSS transform scales the canvas, where `getBoundingClientRect()` would include
  the scale. Not changed, recorded here.
- **Frustum tolerance.** `cellToScreen` keeps the ±1.2 NDC margin rather than ±1, so
  cells just past the edge still project. Unchanged.
- **Scratch vectors are shared and reused** (`pointerNdc`, `groundHit`) — safe because
  picking is synchronous on the main thread and every call overwrites both. Unchanged.
- **`picking` has no `dispose`.** The moved state is three plain `three` objects and two
  numbers; the original block had no teardown either. Nothing added to the facade's
  `dispose()` ordering.
- **One standalone `tsc` probe invocation was denied by the sandbox**:
  `pnpm exec tsc --ignoreConfig --noEmit --strict ... .conductor/evidence/phase-4-picking-export-probe.ts`
  (the preceding `--ignoreConfig`-less variant ran and reported TS5112, which is why the
  flag was tried). Not required by the phase verification; the frozen export is covered
  by the project type-check and the green e2e run instead. The probe file remains as a
  review reference only.
- No behavioural change is claimed beyond the move: the e2e suite exercises drag-place,
  tap-rotate, lift-to-trash, drag-to-trash, station stops and the ride flow, all of which
  route through these three entry points.

## Primary verification

Performed by the primary agent on `485dbe1`, tree clean.

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome 181 files, `tsc --noEmit` clean, 49 files / **874 tests** |
| AC-5 specs | `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | **50 passed**, 3.3 m, no rerun needed |

The agent's claim that this run was green first time is true; unlike Phases 1 and 3 the ambient-FPS
sample did not dip, so there is no flake to explain away.

**Review of the move:**

- Diff is `track-picking.ts` (new, 113 lines), `track-renderer.ts` (95 deletions, 12 insertions) and
  the evidence file. Nothing else.
- The frozen export is genuine, not a rename: the renderer carries
  `export { cellToScreen } from './track-picking';` with a comment naming the callers, so
  `init-scene.ts` and the e2e probes keep importing the same symbol from the same path. The handle
  method delegates to `picking.cellToScreen`.
- The handle's own `cellToScreen(cell)` member keeps its one-argument shape and returns
  `{ x, y } | null`, so `SceneHandle` did not change either.
- `pickPiece` reads `placement.tracked` at call time. The agent corrected my brief on one point —
  the body never resolved models from `placement.rendered` — and recorded the correction rather than
  quietly following the wrong instruction, which is the behaviour I want from these phases.
- 682 → 577 lines by the tool count; the renderer is now four deletions away from being mostly
  crossings and ambience, which are Phases 5 and 6.

