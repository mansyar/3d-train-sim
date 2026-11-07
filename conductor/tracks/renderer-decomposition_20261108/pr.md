# refactor(scene): split the track renderer into a facade and six owned parts

## Summary

`src/scene/track-renderer.ts` was 1,263 lines doing nine jobs: asset catalogue, GLTF placement, store
subscription, drag ghost, grid, raycast picking, crossings and switch poses, critters, delight toys,
the music box and tunnel snow. It is now **195 lines of facade** over six modules, each with one
owner:

- `track-catalog.ts` — the piece/scenery tables (`PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS`), pure data.
- `track-placement.ts` — templates, loading, reconcile, the `world.subscribe` hook, hill snow.
- `track-ghost.ts` — the drag preview and the grid lines.
- `track-picking.ts` — tap hit test, cell projection, `cellToScreen`.
- `track-crossings.ts` — gates, four switch poses, blade tweens.
- `track-ambience.ts` — critters, delight actors, music box, tunnel snow.

The grid maths moved to `src/core/meadow-grid.ts` (`GROUND_SIZE`, `CELL_SIZE`, `cellToWorld`,
`PickedItem`), which closes a boundary leak: `src/ui` no longer imports anything from `src/scene`.

Nothing about the child-facing product changed. The `TrackRenderer` interface block is byte-identical
to the base commit, `init-scene.ts` still calls `startTrackRenderer` with the same arguments, and every
debug probe (`crossingPhases`, `switchPose`, `musicBoxProbe`, `wagonCount`, …) keeps its shape.

## Track

- Spec: [`conductor/archive/renderer-decomposition_20261108/spec.md`](../conductor/archive/renderer-decomposition_20261108/spec.md)
- Plan: [`conductor/archive/renderer-decomposition_20261108/plan.md`](../conductor/archive/renderer-decomposition_20261108/plan.md)
- Review: [`conductor/archive/renderer-decomposition_20261108/review.md`](../conductor/archive/renderer-decomposition_20261108/review.md)

## What happened

| Phase | What | Checkpoint |
|---|---|---|
| 1 | Core grid + catalogue out of the renderer | `69e4d48` |
| 2 | Placement and the store subscription | `cd7f804` |
| 3 | Ghost and grid | `bff61e5` |
| 4 | Picking and the cell projection | `6ec338d` |
| 5 | Crossings and switch poses | `84b62d7` |
| 6 | Ambience, facade, import-graph guard, docs | `2f9a903` |
| R1 | Review fixes: hook latch, budget test, 256-cell sweep, dispose order, honest allowlist | `3d78e13` |
| R2 | Second round: latch limit stated, strict reverse dispose, allowlist names the template, one canonical count, gzip delta measured | `3041df8` |

## Requirements

- [x] FR-1 the facade keeps every public method and probe
- [x] FR-2 the catalogue owns the asset tables
- [x] FR-3 `src/core/meadow-grid.ts` owns the grid maths
- [x] FR-4 placement owns loading, reconcile and the subscription
- [x] FR-5 ghost and grid live in their own module
- [x] FR-6 picking and projection live in their own module
- [x] FR-7 crossings, poses and tweens live in their own module
- [x] FR-8 ambience (critters, delight, music box, tunnel snow) lives in its own module
- [x] FR-9 the parts receive what they need explicitly; no module imports another's internals
- [x] FR-10 `src/ui` imports `PickedItem` and `cellToWorld` from core, never from scene
- [x] FR-11 debug probes survive with the same shapes
- [x] FR-12 the tech-stack folder map documents the split
- [x] NFR-1 no new runtime dependency; gzip growth **+577 B** against a 2 KB budget
- [x] NFR-2 the frame order in `init-scene` is unchanged
- [x] NFR-3 no per-frame allocation added by the move
- [x] NFR-4 the full suite stays green (193 specs, same count as before)
- [x] NFR-5 `pnpm check` stays green
- [x] NFR-6 the new core module reaches 80% coverage (it is at 100%)

## Verification

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome clean, `tsc --noEmit` clean, 50 files / **883 tests** |
| Coverage | `pnpm test:coverage` | pass — 97.36 / 91.06 / 98.10 / 99.44 on core + state |
| Build | `pnpm build` | pass — 178 precache entries, 10,641.84 KiB; emitted JS gzip **218,899 B** vs **218,322 B** at the base |
| E2E (full) | `pnpm exec playwright test` | pass — **193 passed** (tablet, phone, prod) in 16.9 min, no retries |
| Line budget | budget test in `src/core/import-graph.test.ts` | renderer 195/200, catalogue 199, placement 394, ghost 176, picking 119, crossings 400, ambience 221 |

Per-phase behaviour specs also ran: smoke (40), tunnel + cargo (8), undo (44), crossing-gate +
switches + switch-slip (14), delight-toys + music-box (6).

## Media

Nothing to show. This track moves code; the rendered meadow is expected to be identical, and the
behaviour specs plus the full suite are the evidence. A screenshot would only prove the meadow still
draws, which the suite already asserts.

## Review

Two rounds, both `PASS WITH FINDINGS`, nothing deferred.

- Round 1 found 3 Medium (hook wiring depended on asset timing, AC-1 had no automated gate, the grid
  sweep sampled instead of sweeping) and 3 Low. All six fixed in Phase R1, each with a witness that
  fails without the fix.
- Round 2 confirmed those six and found 5 Low: the latch drops rather than replays an edge-triggered
  hook (now stated in the code), dispose was not strict reverse (now is), the crossings allowlist
  omitted the gate template it reads (now named), three documents disagreed on line counts (one
  canonical figure from the budget test now), and AC-7's gzip delta was quoted raw (now measured).

## Deviations and risks

- `GROUND_SIZE` moved to core, so `src/scene/ground.ts` re-exports it for its twelve existing
  importers. Core cannot import from a three.js module, so this direction is the only one available.
- The hook latch is a crash guard, not ordering: if a reconcile ever became synchronous, the
  edge-triggered hooks would drop rather than replay. Stated at the latch and in the evidence.
- `track-placement.ts` (394) and `track-crossings.ts` (400) sit at their 400-line ceilings. The budget
  test now fails on the next addition, which is the point, but the next feature in either area needs a
  split rather than a field.
- `init-scene.ts` (450) and `train-fleet.ts` (552) are over the spec's 500-line folder goal. They were
  over before this track and are out of its Touches; `frame-contract_20261109` is the natural place to
  revisit the first.

## Follow-ups

- `frame-contract_20261109`: make the frame order in `init-scene` an explicit contract — this track
  moved code across that order, which is exactly why the next track should pin it.
- Split `track-crossings.ts` when its next feature lands.

## Rollback

Revert the merge commit. Nothing is persisted, migrated or deployed by this track: no save-format
change, no dependency change, no asset change.
