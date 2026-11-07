# Phase 3 — Ghost and grid

| Field | Value |
| --- | --- |
| Track | `renderer-decomposition_20261108` |
| Phase | 3 — Ghost and grid |
| Date | 2026-11-08 |
| Branch | `refactor/renderer-decomposition_20261108` |
| Phase base | `99ab86bd9429d3107307871e18a8aba22a7c325f` |
| Head | `fe3d9e9` |
| Result | **verified** |

## Tasks and commits

| Task | Scope | Commit |
| --- | --- | --- |
| P3.T1.1 | grid lines, material, geometries, `setGridVisible`, dev default preserved | `fe3d9e9` |
| P3.T2.1 | ghost state, tinting, `spawnGhost`, `tintGhost`, `beginGhost`/`moveGhost`/`endGhost` | `fe3d9e9` |
| P3.T2.2 | ghost reads placement's live templates through the module handle | `fe3d9e9` |

The move is one coherent change (the module cannot compile half-moved), so the
three tasks share the commit.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit | `pnpm check` | 0 | biome 180 files clean; `tsc --noEmit` clean; vitest 49 files / 874 tests passed |
| E2E (AC-5) | `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts` | 1 | **first run:** 39 passed, 5 failed (load) — see below |
| E2E (AC-5) | `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts` | 0 | **rerun:** 44 passed (3.6 m) — the verdict |

Both commands ran exactly as written in the brief. `pnpm check` needed one fix
attempt: the first run failed `tsc` on imports and locals that the move left
unused, plus a malformed document comment left by the block removal; both were
corrected and the second run was green.

### First E2E run (red, load)

`44` tests, `2` workers, `5.0 m`, exit 1. The five failures were:

1. `[tablet] smoke.spec.ts:289` ambient day/weather — 30 s test timeout at
   `page.waitForTimeout(10_000)`.
2. `[tablet] smoke.spec.ts:314` ambient FPS — `ambient FPS: 5.0` against a
   floor of `10`.
3. `[tablet] smoke.spec.ts:542` parent gate — `aria-label` never reached
   `/Confirm/i` within the 5 s attribute poll after a 2.4 s hold.
4. `[phone] smoke.spec.ts:238` riding a loop with a station — 30 s test timeout
   (`Target page, context or browser has been closed` mid-wait).
5. `[phone] smoke.spec.ts:314` ambient FPS — `ambient FPS: 5.2` against a floor
   of `10`.

No console-error assertion failed; every failure is a wall-clock or throughput
budget. The identical rerun on the same machine passed 44/44, which is the
verdict per `e2e/README.md`'s rerun convention and the brief's note about the
ambient-FPS test on a contended machine.

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| FR-5 (ghost owns the preview and the grid) | `track-ghost.ts` owns `gridLines`, `gridMaterial`, `gridGeometries`, the build loop, `setGridVisible`, `ghost`, `ghostType`, `ghostTint`, `TINT_VALID`, `TINT_BLOCKED`, `ghostMaterials`, `spawnGhost`, `tintGhost`, `beginGhost`, `moveGhost`, `endGhost` and its own `dispose()` |
| AC-5 (smoke + undo, tablet + phone) | 44/44 green on the rerun; the drag-placing, undo, reload and parent-gate legs all exercise the moved code |
| AC-1 line budget | `track-ghost.ts` = 176 lines; `track-renderer.ts` 804 → 682 lines |
| FR-9 (explicit deps, no module-level mutable state) | factory args `scene` and `templates`; every mutable value lives inside the factory |
| Export surface unchanged | the `TrackRenderer` interface block is untouched by the diff; `beginGhost`, `moveGhost`, `endGhost` and `setGridVisible` keep their names, arity and behaviour, now delegated |

## Diff-parity proof

`git diff --numstat 99ab86b -- src/scene/track-renderer.ts` → `11 133`
(133 removed, 11 added; 804 − 133 + 11 = 682 lines).
`git diff --numstat 99ab86b -- src/scene/track-ghost.ts` → `176 0` (new file).

`git diff 99ab86b -- src/scene/track-renderer.ts` was inspected hunk by hunk.
It contains exactly four kinds of hunk and nothing else:

- **imports:** five three.js names (`BufferGeometry`, `Color`, `Group`, `Line`,
  `LineBasicMaterial`) and the now-unused `disableShadows` / `baseYawOf`
  imports removed; `startTrackGhost` added;
- **one deletion block, hunk `@@ -366,120`:** the grid build loop and the whole
  ghost body, copied verbatim into `track-ghost.ts`;
- **one deletion block, hunk `@@ -529,10`:** `setGridVisible`, copied verbatim;
- **seam rewrites:** hunk `@@ -737,12` (the four facade delegates) and hunks
  `@@ -785,7` / `@@ -796,9` (the two `dispose()` calls).

Nothing between the moved text and its new home differs except one line:

| Non-verbatim change | Count | Why |
| --- | --- | --- |
| `placement.templates.get(ghostType)` → `templates.get(ghostType)` | 1 | the map is now the module's constructor argument |
| `scene`, `ghost`, `ghostType`, materials, loop bounds, colours, `0.8`/`0.35` opacities | 0 | byte-identical |

The moved grid block and ghost block were compared line by line against the
removed diff: same order (grid first, then ghost), same comments, same
`0x2d5a2d` / `0.35` grid material, same amber `(1, 0.75, 0.35)` and grey
`(0.5, 0.5, 0.5)` tints, same `disableShadows(clone)` and per-ghost material
clone, same `baseYawOf` yaw formula. No line was renamed, reordered or
reformatted.

## The two couplings

1. **Templates, live.** `startTrackGhost(scene, placement.templates)` receives
   the map itself, typed `ReadonlyMap<PieceType | SceneryKind, Object3D>` — not
   a snapshot and not a re-reading callback. `spawnGhost` still does
   `templates.get(ghostType)` and still returns early when the map has no entry,
   so `beginGhost` on a kind whose GLB has not landed leaves `ghost` null and
   `moveGhost` retries on the next pointer event, exactly as before. Because
   the argument is the same `Map` placement mutates in its loader callbacks,
   a template that lands mid-drag is visible immediately.
2. **Disposal.** `track-ghost.ts` exposes `dispose()`: it ends any live ghost,
   removes `gridLines` from the scene, disposes every grid geometry and the grid
   material. The facade calls it at the exact point of the original three grid
   teardown lines, and keeps its earlier `ghost.endGhost()` call where the old
   `endGhost()` call sat, so the disposal *order* is unchanged.
   `dispose()` calls `endGhost()` itself, which is a no-op after the facade's
   call, so the module is safe to dispose on its own.

## The dev-only grid default

The `import.meta.env.DEV` rule for the grid is not in this phase's `Touches` and
was not touched: `src/ui/app.ts:71` still mounts the `.grid-toggle` button only
under `import.meta.env.DEV`, and `src/main.ts:258` still gates the Playwright
dev handle the same way. Inside the renderer the grid's actual default was
`gridLines.visible = false`; that line moved byte-identical (`track-ghost.ts`,
same position immediately after `const gridLines = new Group();`). The toggle
path is unchanged: `setGridVisible` still writes `gridLines.visible = visible`.
Nothing was "tidied".

## Construction point

`startTrackGhost` is called at the exact site of the removed grid block — after
`startTrackPlacement` and the critter sync, before `cellFromPoint` — so the grid
group is added to the scene at the same moment as before, and the ghost handle
is bound before any pointer event can reach `beginGhost`/`moveGhost`/`endGhost`.

## Files changed

- `src/scene/track-ghost.ts` (new, 176 lines)
- `src/scene/track-renderer.ts` (804 → 682 lines)
- `conductor/tracks/renderer-decomposition_20261108/verification/phase-3.md`

## Deviations

None. No file outside `Touches` was modified.

## Notes

- **First E2E failure detail is load, not product.** Two FPS reads of 5.0 and
  5.2 against a floor of 10, two 30 s waits that overran their spec budget, and
  one 5 s attribute poll. Every functional assertion in the same run passed.
  The rerun was 44/44 in 3.6 m. Recorded verbatim rather than smoothed over.
- **`pnpm check` file count rose 179 → 180** because `track-ghost.ts` is a new
  source file; the test count is unchanged at 874, as NFR-2 requires.
- **Facade handle naming.** The module handle is `const ghost`, which would have
  collided with the old local `ghost: Object3D | null`; that local moved inside
  the module, so the name is free and no shadowing is introduced.
- **Import cleanup is mechanical.** `BufferGeometry`, `Color`, `Group`, `Line`,
  `LineBasicMaterial`, `disableShadows` and `baseYawOf` had no remaining use in
  the facade; `Mesh`/`MeshStandardMaterial` stay for the crossing lamp cache and
  `CELL_SIZE`/`MEADOW_CELLS` stay for `cellFromPoint`/`updateCrossings`.
- **No behaviour knobs touched.** Ghost opacity, tint colours, shadow flags and
  the per-drag material clone are unchanged; no animation timing lives in this
  module.
- Nothing else observed: no dead code removed, no comments reworded outside the
  new module header, no formatting changes.

## Primary verification

Performed by the primary agent on `5bdc329`, tree clean.

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome 180 files, `tsc --noEmit` clean, 49 files / **874 tests** |
| AC-5 specs (first run) | `pnpm exec playwright test e2e/smoke.spec.ts e2e/undo.spec.ts` | 1 | 43 passed, 1 failed — the phone ambient-FPS sample |
| AC-5 specs (isolated) | same file, `-g "ambient frame rate"` | 0 | **2 passed**, 20.6 s |

The single failure is the 5 s throughput sample on a contended machine; it passes alone, which is
the verdict `e2e/README.md` prescribes. My rerun was cleaner than the agent's (43/44 versus its
39/44 on the first try), so the phase is not hiding a behavioural regression behind the flake: the
only assertion failing in either run was the FPS floor.

**Review of the move:**

- Diff scope is the two `Touches` files plus the evidence: `track-ghost.ts` (new, 165 lines),
  `track-renderer.ts` −133 net, 144 deletions against 11 insertions of delegation.
- The module's surface is the four facade methods plus `dispose()`, so nothing new leaked out.
- The templates coupling is a `ReadonlyMap` parameter, and `spawnGhost` still returns early when the
  kind is absent — the "asset not loaded yet" path is preserved rather than papered over.
- `gridLines.visible = false` moved unchanged; the `import.meta.env.DEV` rule it feeds lives in
  `src/ui/app.ts` and `src/main.ts`, outside this phase, and was not touched.
- Disposal stays in the same order: the facade calls `ghost.endGhost()` where it used to release the
  preview and `ghost.dispose()` where it used to dispose the grid, before the remaining teardown.

