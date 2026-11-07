# Phase 5 — Crossings and switches

| Field | Value |
| --- | --- |
| Track | `renderer-decomposition_20261108` |
| Phase | 5 — Crossings and switches (FR-7, AC-5, AC-9) |
| Date | 2026-11-08 |
| Branch | `refactor/renderer-decomposition_20261108` |
| Phase base | `78c5788` — "conductor(plan): Mark phase 'Crossings and switches' as in progress" (confirmed with `git rev-parse HEAD` before any edit) |
| Head | `5cc746b` — `refactor(scene): move crossings and switch poses out of the renderer` |
| Result | verified |

The brief's "phase base" is the commit it was registered on; `git rev-parse HEAD` at start was
`78c5788fa4440bf4009e50aa7773422fcef7ef44`, so no second base exists for this phase and all
diffs below are against `78c5788`.

## Tasks and commits

| Task | Scope | Commit |
| --- | --- | --- |
| P5.T1.1 | `crossingMotions`, `crossingParts`, `trackCrossing`, `updateCrossings`, the train pool/view buffers, `crossingBell`, `setCrossingSnow`, the gate/crossing constants and `easeOut` → `src/scene/track-crossings.ts` | `5cc746b` |
| P5.T2.1 | `LEVER_*_Y`, `SWITCH_POSES`, `SLIP_BLADES`, `SLIP_LEVERS`, `BLADE_TWEEN_MS`, `bladeTweens`, `bladeRaf`, `runBladeTweens`, `setSwitchRoad`, the `switchPose` read; probe shapes preserved | `5cc746b` |

One commit: neither task compiles alone (the facade would reference bodies that moved). Same
convention as Phases 2–4.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| Static + unit | `pnpm check` | 0 | biome 182 files clean, `tsc --noEmit` clean, 49 files / 874 tests passed (4.28 s) |
| E2E | `pnpm exec playwright test e2e/crossing-gate.spec.ts e2e/switches.spec.ts e2e/switch-slip.spec.ts` | 0 | 14 passed (1.3 m), tablet + phone, first attempt on the final tree |

Both commands were run exactly as written. The e2e specs assert behaviour (gate phases, the bell
edge, blade and lever poses under normal and reduced motion, reload re-parking), so the green run
is an assertion pass, not a throughput sample; no rerun was needed or used.

An earlier run of both commands on the pre-trim module (408 lines, before the interface docs were
condensed — see Notes) was also green with identical counts. The recorded numbers are from the
final tree that was committed.

## Acceptance criteria touched

| Criterion | Evidence |
| --- | --- |
| FR-7 — crossings owns registration, `updateCrossings`, gate poses, switch blade/lever state, the bell flag and crossing snow | All of it lives in `src/scene/track-crossings.ts`: `modelAdded` (registration), `updateCrossings` (arms, lantern, bell ask), `setSwitchRoad` + pose tables (blade and lever), `crossingSnow`/`pieceTemplate`/`setCrossingSnow` (snow). The facade holds no crossing state. |
| AC-1 — line budgets | `track-renderer.ts` 599 → 285 (facade-only ≤ 200 is Phase 6's terminal check, as planned); `track-crossings.ts` 400 lines (≤ 400). |
| AC-2 — unchanged `TrackRenderer` surface | `git diff 78c5788 -- src/scene/track-renderer.ts` has no hunk inside the `TrackRenderer` interface (lines 22–87 before the move); every member keeps its name, arity and types. `init-scene.ts`, `scene-context.ts`, `app.ts`, `train-fleet.ts` and `day-ambience.ts` are untouched and type-check. |
| AC-5 — named specs | `crossing-gate`, `switches`, `switch-slip` all green on tablet and phone (14/14). |
| AC-9 — e2e probes unmodified | No `e2e/` file changed. `crossingPhases`, `bellRinging`, `switchPose` and `setCrossingSnow` keep their names, arity and returned shapes. |
| NFR-1 — no new dependency | `package.json`/lockfile untouched. |

## Probe-shape proof

The facade still exposes exactly the same members, now as direct references to the module's
functions (`track-renderer.ts`):

```ts
crossingPhases: crossings.crossingPhases,   // () => string[]
bellRinging: crossings.bellRinging,         // () => boolean
switchPose: crossings.switchPose,           // (pieceId: string, entry?: Edge) => { blade: number; lever: number | null } | null
setSwitchRoad: crossings.setSwitchRoad,     // (pieceId, exit, entry?) => void
updateCrossings: crossings.updateCrossings, // (dt, trains, night) => void
setCrossingSnow: crossings.setCrossingSnow, // (visible) => void
```

The bodies were diffed against the phase base and are byte-identical, not rewritten:

- `crossingPhases` — same `[...placement.tracked.values()]` spread, same `isPiece(item) &&
  item.type === 'crossing-gate'` filter, same `crossingMotions.get(item.id)?.phase ?? 'idle'`
  map. Same order, same `string[]`.
- `bellRinging` — returns the same `crossingBell` boolean.
- `switchPose` — same `switch_blades` / `switch_blades_<entry>` group selection, same `?`
  optional-model read, same early `null` for a missing model or blades, same
  `{ blade, lever: lever ? lever.rotation.y : null }` object literal (same keys, same order,
  same `number | null`).
- `setCrossingSnow` — same `visible === crossingSnow` early return, same template read and
  same placed-clone traversal.
- `init-scene.ts` (lines 411–416) is unmodified, so `SceneHandle` still forwards the probes
  unchanged.

The three e2e specs read these values by shape (`p !== 'idle'`, `=== true/false`,
`{ blade: number; lever: number | null } | null`), and they pass unmodified.

## Parity proof

`git diff --numstat 78c5788` (new file added with intent-to-add so it appears in the diff):

```
400  0  src/scene/track-crossings.ts
 21 335 src/scene/track-renderer.ts
```

`599 − 335 + 21 = 285` renderer lines, matching the committed file.

The diff enumerates to exactly these hunk categories:

1. **Imports (two hunks).** `three` narrowed to `Object3D` (still used by `setTunnelSnow` and
   `setDelightSnow`) and `PerspectiveCamera`/`Scene`; `Mesh`/`MeshStandardMaterial` dropped —
   only `trackCrossing` used them. `advanceCrossing`/`CrossingMotion`/`idleCrossing`,
   `CELL_SIZE`, `isSwitchPiece`/`SwitchPieceType`, `GROUND_SIZE` and `advancedEdge` dropped for
   the same reason. `startTrackCrossings` imported. `cellToWorld`, `PickedItem`, `isPiece`,
   `Object3D`, `Edge`, `Cell`, `Rotation` all remain in use.
2. **The switch block removed** (from the pose-contract comment through `setSwitchRoad`) and
   re-declared in `track-crossings.ts` in the same relative order, with the same constants
   (`LEVER_FORWARD_Y 0`, `LEVER_EAST_Y -π/2`, `LEVER_WEST_Y π/2`, `LEVER_BACK_Y π`,
   `SWITCH_POSES`, `SLIP_BLADES`, `SLIP_LEVERS`, `BLADE_TWEEN_MS 180`), the same
   `bladeTweens`/`bladeRaf`, the same `runBladeTweens` body and the same `setSwitchRoad` body.
3. **The placement comment** says the hooks are the resident delight/critter/music-box reactions
   plus crossing delegations — comment only, no code.
4. **`onPieceTemplate`:** the `crossing-gate` branch (snow cap read of `crossingSnow`) is replaced
   by `crossings.pieceTemplate(type, model)`; the module early-returns for every non-crossing
   type, so the call is a no-op for the tunnel branch above it. The crossing snow flag now has a
   single owner.
5. **`onModelReplaced` / `onModelRemoved` / `onModelAdded`:** the crossing deletes and the
   `crossing-gate` registration move into `crossings.modelReplaced` / `modelRemoved` /
   `modelAdded`; the delight and music-box detaches stay in the facade. `modelReplaced` still
   deletes from `bladeTweens` while `modelRemoved` does not — the asymmetry is preserved.
6. **The crossing block removed** (banner through `setCrossingSnow`) and re-declared verbatim,
   including `GATE_OPEN_Y`, the `CROSSING_*` constants, `easeOut`, the lamp-material clone in
   `trackCrossing`, the reused `trainPool`/`trainView` scratch cells, the `performance.now()`
   blink/breathe maths, the reduced-motion snap, and the change-gated
   `audio.setCrossingBell(anyAwake)` edge.
7. **Construction seam:** `const crossings = startTrackCrossings(placement, audio,
   reducedMotion);` sits exactly where the removed crossing block began (after
   `let tunnelSnow = false;`, after the ghost and picking constructions). The hooks above it only
   run on a loader callback or a store notify — never synchronously during `startTrackPlacement`
   (its only synchronous work is `loader.load` dispatch and `world.subscribe`, which does not
   invoke), so the module exists before any hook can reach it.
8. **Return wiring:** the three crossing methods become direct references; the two probe arrow
   wrappers and their comments move into the module's return object unchanged.
9. **`dispose()`:** the blade-rAF cancel and the three map clears collapse into
   `crossings.dispose()`, which sets the module's own `disposed` flag before doing exactly the
   same teardown. It is called in the same position (after `placement.dispose()` and
   `ghost.endGhost()`), and the facade sets its own `disposed = true` on the preceding line, so
   the `if (disposed)` guards in `updateCrossings`/`setSwitchRoad` observe the same ordering.

There is no hunk outside these categories, and no touched line was reformatted, renamed or
reordered. The interface docs added to `TrackCrossings` are new scaffolding, not moved code, and
are the only place where wording was condensed (see Notes).

## The hook coupling

Placement's crossing reactions are now thin delegations:

```ts
onModelReplaced: (id) => { crossings.modelReplaced(id); delight.detach(id); musicBox.detach(id); },
onModelRemoved:  (id) => { crossings.modelRemoved(id);  delight.detach(id); musicBox.detach(id); },
onModelAdded:    (id, model, kind) => crossings.modelAdded(id, model, kind),
```

`onPieceTemplate` delegates the crossing snow cap the same way. The facade keeps no
`crossingMotions`/`crossingParts`/`bladeTweens`/`crossingSnow`/`crossingBell` names at all, so
there is no duplicated state to drift from the module.

## Files changed

- `src/scene/track-crossings.ts` (new, 400 lines)
- `src/scene/track-renderer.ts` (599 → 285 lines)
- `conductor/tracks/renderer-decomposition_20261108/verification/phase-5.md` (this file)

## Deviations

None. No file outside the two `Touches` paths was modified.

## Notes

- **The module keeps its own `disposed`.** Rather than pass a predicate into the factory, the
  module mirrors the facade's pattern and `crossings.dispose()` sets it. The facade still sets
  `disposed = true` first, in the same synchronous `dispose()`, so nothing can call a crossing
  method in the window between the two flags.
- **One `pieceTemplate` call per piece template.** The facade calls it unconditionally and the
  module returns early unless `type === 'crossing-gate'`. That is what removed the last facade
  read of `crossingSnow`; the alternative (a `snowVisible()` getter) would have kept the flag
  single-owned too but left the branch in the facade.
- **Line budget forced one cosmetic trim.** At 408 lines the module was over AC-1's 400-line
  ceiling. The eight lines removed are the `TrackCrossings` member docs (condensed from multi-line
  to one line each; they duplicated `TrackRenderer`'s fuller docs) and one module-header line. No
  moved body, comment or blank line inside the moved blocks was touched. Both verification
  commands were then re-run on the trimmed tree; the numbers above are from that final run. Both
  earlier runs were also green.
- **Direct method references, not arrow wrappers.** `crossingPhases`, `bellRinging` and
  `switchPose` are function declarations closed over module state, so passing them as object
  methods cannot rebind `this`; arity and return types are unchanged. `switchPose` moved to the
  module with its comment, which keeps the `null` shapes documented next to the body.
- **`updateCrossings` still early-returns after dispose** even though its only caller is the
  frame loop; the guard moved with the body rather than being dropped.
- **`easeOut` moved rather than shared.** It was only used by the gate arm swing, so it lives in
  the module now; nothing else in the facade referenced it.
- The `scene/track-crossings.ts` name collides in spirit with `core/crossings.ts` (the pure state
  machine). The dependency direction is unchanged: the scene module imports
  `advanceCrossing`/`idleCrossing`/`CrossingMotion` from core and core knows nothing about
  three.js.

## Primary verification

Performed by the primary agent on `aca1683`, tree clean.

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome 182 files, `tsc --noEmit` clean, 49 files / **874 tests** |
| Behaviour specs | `pnpm exec playwright test e2e/crossing-gate.spec.ts e2e/switches.spec.ts e2e/switch-slip.spec.ts` | 0 | **14 passed**, 1.3 m, first attempt |

These three specs assert behaviour rather than throughput — gate phases, bell edges, blade poses on
reload — so a green first run here is worth more than a green smoke rerun.

**Review of the move:**

- Diff is `track-crossings.ts` (new, 383 lines by tool count, 400 as counted with a trailing newline,
  inside the AC-1 budget), `track-renderer.ts` −335 net, and the evidence file.
- The renderer is now **272 lines**, down from 1,263 at the start of the track. Phase 6 has ~72 lines
  of headroom to give away and still meet the ≤200 budget.
- The four probes the e2e reads — `crossingPhases`, `bellRinging`, `switchPose`, `setCrossingSnow` —
  are forwarded from the new module, and the `TrackRenderer` interface block is unchanged: no probe
  gained or lost a parameter.
- The placement hooks are now delegations with no crossing state left in the facade, which is the
  correct end state: placement reports "a model appeared", crossings decides whether that model is a
  gate.

