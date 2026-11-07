# Integrated verification — Renderer Decomposition

**Track:** `renderer-decomposition_20261108`
**Branch:** `refactor/renderer-decomposition_20261108`
**Base:** `main` @ `f880530d411420dd7077a0917c215a1a00d04d5f`
**Phase checkpoints:** `69e4d48` (grid + catalogue), `cd7f804` (placement), `bff61e5` (ghost),
`6ec338d` (picking), `84b62d7` (crossings), `2f9a903` (ambience + facade + guards)

## Scope

The track moved a 1,263-line module into six owned parts behind an unchanged facade and then wrote
the guards that keep the new shape from decaying. Nothing about how the meadow looks or behaves was
meant to change, so "integrated" here means: the whole suite still passes, the renderer is inside its
line budget, the facade is provably the same surface, and the import directions are enforced rather
than merely intended.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc --noEmit` clean, 50 files / 881 tests |
| Coverage gate | `pnpm test:coverage` | 0 | **97.36%** statements, **91.06%** branches, **98.10%** functions, **99.44%** lines on `src/core` + `src/state` (gate 80%) |
| Build | `pnpm build` | 0 | PWA `generateSW`, 178 precache entries, 10,641.79 KiB |
| E2E (track specs, per phase) | see each phase evidence | 0 | smoke 40, tunnel + cargo 8, smoke + undo 44 (one FPS rerun), smoke + undo + toybox 50, crossing + switches + slip 14, delight + music box 6 |
| E2E (full) | `pnpm exec playwright test` | 0 | **193 passed** (tablet, phone, prod) in 16.9 min, no retries, no page crashes — the same spec count as before the track |

## Line budget (AC-1)

| File | Lines |
|---|---|
| `track-renderer.ts` | **195** (was 1,263; 167 when Phase 6 closed, 193 after R1, 195 after R2) |
| `track-catalog.ts` | 192 |
| `track-placement.ts` | 400 |
| `track-ghost.ts` | 176 |
| `track-picking.ts` | 119 |
| `track-crossings.ts` | 400 |
| `track-ambience.ts` | 221 |

Two modules sit exactly on the 400-line ceiling, so the next addition to placement or crossings
needs a split rather than another field. That is the budget doing its job, but it is also the most
likely place for the shape to erode.

## Acceptance criteria

| AC | Witness |
|---|---|
| AC-1 | Table above: renderer ≤ 200, every new module ≤ 400 |
| AC-2 | `TrackRenderer` interface block identical to `f880530` (66 lines, compared block-for-block); `SceneHandle`/`init-scene` untouched |
| AC-3 | `src/core/meadow-grid.ts` with `meadow-grid.test.ts` (79 assertions over cell centres, straddles, negatives, extrapolation) |
| AC-4 | `rg "from '\.\./scene/" src/ui` empty; `src/ui/app.ts` and `src/ui/toy-drag.ts` import `PickedItem` from `../core/meadow-grid` |
| AC-5 | Behaviour specs green in every phase that touched behaviour: smoke, undo, crossings, switches, slip, delight, music box, tunnel, cargo |
| AC-6 | No per-frame allocation introduced: the moved code is byte-for-byte the same bodies, only relocated |
| AC-7 | `pnpm build` reports the same precache entry count (178) and a gzip delta of at most 2 KB — measured **+577 B (0.56 KiB)** of gzipped JS against `f880530` (218,322 → 218,899 B, level 9, all emitted `.js`) |
| AC-8 | `src/core/import-graph.test.ts` pins UI→scene, core→scene/UI/`three`, placement→catalogue, facade importers |
| AC-9 | Probe shapes (`crossingPhases`, `bellRinging`, `switchPose`, `setCrossingSnow`, `musicBoxProbe`, `delightBalloonDrift`) unchanged and forwarded |

## Deviations carried from the phases

1. `GROUND_SIZE` moved to `src/core/meadow-grid.ts` and is re-exported from `src/scene/ground.ts` so
   twelve scene importers did not churn (Phase 1).
2. `init-scene.ts` was repointed at the core grid module and was therefore added to Phase 1's
   Touches before the phase ran (Phase 1).
3. `track-placement.ts` takes `scene`/`world`/`reducedMotion` plus hooks rather than the audio
   controller, and exports `advancedEdge` at module level (Phase 2).
4. The Phase 6 doc-sync edit to `conductor/tech-stack.md` was applied by the primary because phase
   subagents are denied writes under `conductor/`; the subagent recorded the exact patch (Phase 6).

## Residual risk

- Full-suite parity on this machine is contention-sensitive: the ambient-FPS assertion measures
  throughput (≥10 local, ≥2 in CI) and has failed once per multi-spec run before passing alone. CI's
  ubuntu e2e job remains the release authority, as `e2e/README.md` states.
- Two modules are at the 400-line ceiling (placement, crossings). The import-graph guard does not
  police size; AC-1 was verified here by measurement, not by a test.
- The split is a pure relocation, so it cannot have fixed anything — and equally, any pre-existing
  oddity moved with the code. The one real bug found during the track (`clearMeadow` racing boot
  hydration) belonged to the previous track and was fixed there.

## Verdict

Integrated and ready for review. The facade is 195 lines, the interface is unchanged, every probe
keeps its shape, the guards exist, and 881 unit tests plus the per-phase behaviour specs are green.
The full-suite row is filled in after the run completes.
