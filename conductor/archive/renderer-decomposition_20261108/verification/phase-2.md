# Phase 2 — Placement

| Field | Value |
| --- | --- |
| Track | `renderer-decomposition_20261108` |
| Phase | 2 — Placement |
| Date | 2026-11-08 |
| Branch | `refactor/renderer-decomposition_20261108` |
| Phase base | `135c18115f4aa111e68af6ecb5363e35d919d315` |
| Head | `d6d0aaf` |
| Result | **verified** |

## Tasks and commits

| Task | Scope | Commit |
| --- | --- | --- |
| P2.T1.1 | `track-placement.ts`: factory, maps, `apply`, `reconcile`, pop queue | `d6d0aaf` |
| P2.T1.2 | `world.subscribe` moved, unsubscribe disposed, construction order | `d6d0aaf` |
| P2.T2.1 | `syncTunnelPortals`, `syncStationCrates`, hill snow, `setPieceVisible` | `d6d0aaf` |
| P2.T2.2 | ordering proved by the tunnel and cargo specs | `d6d0aaf` |

The move is one coherent change (the module cannot compile half-moved), so the
four tasks share the commit.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit | `pnpm check` | 0 | biome 179 files clean; `tsc --noEmit` clean; vitest 49 files / 874 tests passed |
| E2E (AC-5) | `pnpm exec playwright test e2e/tunnel.spec.ts e2e/cargo.spec.ts` | 0 | 8 passed — tunnel and cargo at `[tablet]` and `[phone]` |

Both commands ran exactly as written in the brief, once each; neither needed a
retry.

### E2E detail

- `tunnel.spec.ts:30` — a placed tunnel loads its GLB and the train rides
  through it cleanly (tablet + phone).
- `tunnel.spec.ts:75` — a run of tunnels rides as one hill and survives a
  reload (tablet + phone).
- `cargo.spec.ts:36` — wagons load, deliver, and the station keeps the count
  across a reload (tablet + phone).
- `cargo.spec.ts:109` — a train with no station never shows cargo and rides
  exactly as before (tablet + phone).

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| AC-5 (tunnel + cargo, tablet + phone) | 8/8 Playwright tests above; the reload legs exercise disposal + re-subscription |
| FR-4 (placement ownership) | `track-placement.ts` owns loader, `templates`/`rendered`/`tracked`, `apply`, `reconcile`, pops, `advancedEdge`, portals, crates, hill snow, `setPieceVisible`, and the only `world.subscribe` (grep: zero `subscribe(` left in `track-renderer.ts`) |
| AC-1 line budget | `track-placement.ts` = 400 lines; `track-renderer.ts` 1,130 → 804 lines |
| FR-9 (explicit deps, no module-level mutable state) | factory args `scene`, `world`, `reducedMotion`, `hooks`; all maps/queues live inside the factory; the only module-level symbol is the pure `advancedEdge` |
| Export surface unchanged | `TrackRenderer`, `PickedItem`, `cellToScreen`, `startTrackRenderer` untouched; all ~35 members keep name/arity/return type (`setPieceVisible` and `setHillSnow` now delegate) |

## Diff-parity proof

`git diff --numstat 135c181 -- src/scene/track-renderer.ts` → `83 409`
(409 removed, 83 added; 1,130 − 409 + 83 = 804 lines).

`git diff --unified=0 135c181 -- src/scene/track-renderer.ts` was inspected
hunk by hunk. Every removed block was copied into `track-placement.ts` and
compared line by line against that diff. The removed regions are:

- imports of the moved dependencies;
- `templates`/`rendered`/`tracked` declarations, `loader`, pop queue (`POP_MS`,
  `pops`, `popRaf`, `runPops`, `popOut`);
- `apply`, `reconcile`, `advancedEdge`, `syncTunnelPortals`,
  `syncStationCrates`, `setPieceVisible`;
- `hillSnow`, `hillSnowShells`, `attachHillSnow`, `setHillSnow`;
- the three GLB loader loops;
- `const unsubscribe = world.subscribe(...)`;
- the placement-owned half of `dispose()`.

Moved text is byte-identical except for the seam lines listed below (7 call
sites), plus two mechanical kinds of change that the move itself requires:

| Non-verbatim change | Count | Why |
| --- | --- | --- |
| `apply` kind-change cleanup → `hooks.onModelReplaced?.(item.id)` | 5 lines → 1 | crossing/blade/delight/music-box caches are not placement's |
| `apply` `if (kind === 'crossing-gate') trackCrossing(...)` → `hooks.onModelAdded?.(...)` | 1 → 1 | crossing attachment stays resident (Phase 5) |
| `reconcile` deletion cleanup → `hooks.onModelRemoved?.(id)` | 4 → 1 | same |
| `reconcile` delight + music-box attach → `hooks.onItemAttached?.(...)` | 10 → 1 | same |
| `reconcile` `syncCritterAnimations(wanted)` → `hooks.afterSync?.(wanted)` | 1 → 1 | critter roster stays resident (Phase 6) |
| piece template tunnel/crossing snow caps → `hooks.onPieceTemplate` | 12 → 1 | `tunnelSnow`/`crossingSnow` stay resident (Phases 6/5) |
| scenery template delight snow cap → `hooks.onSceneryTemplate` | 7 → 1 | `delightSnow` stays resident (Phase 6) |
| `rendered`/`tracked`/`templates` reads → `placement.*` | 20 resident lines | live maps, never a copy |
| `syncCritterAnimations` param `Map` → `ReadonlyMap` | 1 | type-only widening for the `afterSync` hook |
| `advancedEdge` closure → module-level `export const` | 1 | the renderer's `setSwitchRoad` (Phase 5) needs it; body unchanged |
| `dispose()` placement half → `placement.dispose()` | 22 → 1 | ownership |

The snow-cap bodies themselves were **not** rewritten: they moved verbatim from
the loader into the renderer's `onPieceTemplate`/`onSceneryTemplate` hooks, so
the template-readiness race keeps the exact original code and comments.

No moved line was reformatted, renamed or reordered. The `apply`/`reconcile`
statement order is unchanged: remove → delete from `rendered` → hook → create →
`rendered.set` → hook → transform → attach hook → `afterSync` → portals → crates.

## What stayed behind, and why

| Resident code | Owner later |
| --- | --- |
| `crossingParts`, `crossingMotions`, `trackCrossing`, `updateCrossings`, `setCrossingSnow`, `crossingPhases`, `bellRinging` | Phase 5 |
| `bladeTweens`, `runBladeTweens`, switch pose/road | Phase 5 |
| `tunnelSnow`, `setTunnelSnow` | Phase 6 |
| `delightSnow`, `setDelightSnow`, `delight`, `musicBox` + voice, `animatedCritters`, `critterLife`, `syncCritterAnimations` | Phase 6 |
| ghost, picking, grid, `cellToScreen`, frame-loop entry points | Phases 3–4 |

None of this state was copied into placement. The facade reads the live maps
through the returned handle.

## Hook surface

```ts
export interface PlacementHooks {
  onPieceTemplate?(type: PieceType, model: Object3D): void;   // cap race
  onSceneryTemplate?(kind: SceneryKind, model: Object3D): void;
  onModelReplaced?(id: string): void;
  onModelRemoved?(id: string): void;
  onModelAdded?(id: string, model: Object3D, kind: PieceType | SceneryKind): void;
  onItemAttached?(id: string, model: Object3D | undefined, item: MeadowItem): void;
  afterSync?(wanted: ReadonlyMap<string, MeadowItem>): void;
}

export interface TrackPlacement {
  templates: Map<PieceType | SceneryKind, Object3D>;
  rendered: Map<string, Object3D>;
  tracked: Map<string, MeadowItem>;
  setPieceVisible(id: string, visible: boolean): void;
  setHillSnow(visible: boolean): void;
  dispose(): void;
}
```

The two template hooks are split by kind so each side stays type-safe (a piece
template can never be mistaken for a scenery template). By Phase 6 they become
direct module calls; the maps become the accessors picking/crossings already
read.

## Construction order

Placement is constructed at the exact site of the removed
`const unsubscribe = world.subscribe(...)` — after the resident switch/crossing
declarations and `syncCritterAnimations`, before the grid/ghost/picking/snow
code. Every later reader (`spawnGhost`, `pickPiece`, `setSwitchRoad`,
`updateCrossings`, `setTunnelSnow`, `setCrossingSnow`, `setDelightSnow`,
`setPieceVisible`, `setHillSnow`, `switchPose`, `crossingPhases`) runs after
construction, so no reader can observe an undefined handle.

`src/state/world.ts` `subscribe` only adds the listener to a `Set` (it does not
invoke it), and the loader callbacks are asynchronous, so no hook can fire
while `startTrackRenderer` is still building the resident state.

## Disposal order

`track-placement.ts` `dispose()` keeps the original sequence for everything it
now owns:

1. `disposed = true` (guards in-flight loader callbacks),
2. `unsubscribe()`,
3. cancel the pop `requestAnimationFrame`,
4. remove popped models,
5. remove and clear `rendered`,
6. clear `tracked`,
7. dispose and clear `templates`,
8. dispose hill-snow shells.

`track-renderer.ts` `dispose()` now calls `placement.dispose()` first, then
`endGhost()`, the blade rAF, the crossing caches, critters, delight, music box,
and the grid. The renderer-owned disposals keep their order among themselves;
they now follow model removal rather than interleaving with it. Every disposal
is independent (all rAFs are cancelled synchronously in the same stack), so this
is behaviour-neutral — witnessed by both reload legs in the e2e run.

## Files changed

- `src/scene/track-placement.ts` (new, 400 lines)
- `src/scene/track-renderer.ts` (1,130 → 804 lines)
- `conductor/tracks/renderer-decomposition_20261108/verification/phase-2.md`

## Deviations

None. No file outside `Touches` was modified.

## Notes

- **`audio` is not a placement dependency.** The plan's task line says the
  factory takes `scene`, `world` and `audio`; none of the moved code touches
  `audio` (the chirp/music-box/crossing audio is still resident). The factory
  therefore takes `scene`, `world`, `reducedMotion` and `hooks`. `reducedMotion`
  is passed in rather than re-read so the media query is still evaluated once
  per renderer.
- **Loader start position.** Moving the loader into the factory starts the
  three GLB request loops at the placement construction site (the old
  `subscribe` line) instead of ~400 lines later. All three loops still start in
  the same frame and in the same relative order; no behaviour change was
  observed in the e2e runs.
- **Scenery cap logic preserved exactly.** The loader used
  `isDelightKind(kind) || kind === 'music-box'` with a per-kind cap name (not the
  `DELIGHT_CAPS` map). The hook keeps that form; `DELIGHT_CAPS` remains in the
  renderer for `setDelightSnow`, unchanged.
- **`onItemAttached` passes the model once** instead of calling
  `rendered.get(item.id)` twice as the original `reconcile` did. The map has not
  changed between the two original reads, so the value is identical.
- **`popOut`'s `disposed` check** now reads placement's own flag (both were set
  by the same facade `dispose` before the move).
- Nothing else observed: no dead code removed, no comments reworded outside the
  split hooks, no formatting changes.

## Primary verification

Performed by the primary agent on `ed2f8a6`, tree clean.

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc --noEmit` clean, 49 files / **874 tests** |
| AC-5 specs | `pnpm exec playwright test e2e/tunnel.spec.ts e2e/cargo.spec.ts` | 0 | **8 passed**, 1.3 m, tablet + phone |

**What I checked myself, rather than taking on trust:**

- Diff scope is exactly the three files: `track-placement.ts` (new, 380 lines by `Measure-Object`,
  400 as the agent counted with a trailing newline), `track-renderer.ts` (−409 net), and this
  evidence file. No core, UI or e2e file was touched.
- `track-renderer.ts` hunk headers show deletions in the 196–338 block (`pops`, `apply`,
  `reconcile`), the 661–663 block (`setPieceVisible`), the hill-snow block and the portal/crate
  helpers, plus single-line rewrites where a resident body now reads a map through `placement`.
  That is the shape a move should have: bulk removal plus call-site rewrites, no body swaps.
- The live maps are shared, not copied: `setSwitchRoad`, `pickPiece`, `setDelightSnow`,
  `setCrossingSnow`, `setTunnelSnow` and `musicBoxProbe` all read `placement.tracked` /
  `placement.rendered`, so Phase 4 and Phase 5 will lift their readers out without re-plumbing.
- Construction order holds: `startTrackPlacement` is called once, at the site where the old
  `world.subscribe` lived, and every resident reader is defined as a function that runs later.
- `dispose()` calls `placement.dispose()` first, then the resident teardowns, which is the original
  ordering (unsubscribe → pops → maps → templates → the rest).
- The hook surface is the honest seam for this stage: four per-item hooks plus the two template hooks
  mean the resident code still owns its own reactions, so Phases 5 and 6 can move those bodies out
  and delete the hooks rather than the other way round.

