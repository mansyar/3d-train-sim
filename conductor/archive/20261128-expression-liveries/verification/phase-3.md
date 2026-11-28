# Phase 3 verification — Expression livery paint + reward

**Goal:** Tapping a paint swatch instantly repaints the whole 3D body of the
selected vehicle (engine plus its consist), with a mute-respecting soft pop +
happy ding and one scale-bounce; reduced motion lands the final state silently.

## Tasks

| Task | Status | What landed |
| --- | --- | --- |
| P3.T1 Body recolor path | done | `paintVehicle`/`paintHex` in `rig-cargo.ts` lazily clone colored materials per rig/wagon (stock restores swap the originals back, cargo crates skipped); `train-fleet.ts` subscribes to the single Phase-2 store and repaints the loco plus both wagons on a loco paint, including newly built/swapped/re-dressed meshes. All six kinds covered by the spec. |
| P3.T2 Reward sound + bounce | done | `src/audio/liveries.ts` reuses the existing Howler-backed `audio.click()` (soft pop) + `audio.ding()` (happy ding), mirrors the persisted mute via `audio.subscribe` and rechecks `isMuted()` at play time (zero audible plays while muted). One short scale pulse per matched rig from its captured base scale; `context.reducedMotion` skips the bounce entirely. |
| P3.T3 Paint spec | done | `e2e/liveries-paint.spec.ts`: RED first (3/3 failed: missing witness), then GREEN (3/3 passed). Covers all six paints on all six engines with both wagons, muted repaint with `plays + 6` / `audiblePlays` unchanged, reduced motion with zero bounces, and zero console errors. |

## Files changed

- `src/scene/rig-cargo.ts` (modified)
- `src/scene/train-fleet.ts` (modified)
- `src/audio/liveries.ts` (new)
- `e2e/liveries-paint.spec.ts` (new)
- `src/ui/app.ts` (modified — one-line store re-export for ownership only)

## Verification

| Command | Exit code | Result |
| --- | --- | --- |
| `pnpm exec playwright test e2e/liveries-paint.spec.ts` | 0 | 3 passed (tablet) |
| `pnpm check` | 0 | biome clean, tsc clean, 63 files / 1091 vitest tests passed |

Earlier RED run of the targeted spec: exit 1, 3/3 failed on
`window.__tinyTracksLivery` being absent, as required by TDD.

Note: Vite's pre-existing `configLoader: 'native'` warning and Three.js's
`PCFSoftShadowMap` deprecation warning appear in logs but are not console
errors and predate this phase.

## Deviations

- `src/ui/app.ts`: added a one-line `export { liveryStore } from './train-picker'`
  so `train-fleet.ts` can observe the drawer's store instance. The brief's
  preferred direction (scene importing from a UI module) is used directly from
  `app.ts`, the sanctioned composition root; no second store was created.
  `src/core/import-graph.test.ts` passes (only ui→scene is forbidden).
- A DEV-only `window.__tinyTracksLivery` witness is installed from
  `createTrainFleet`. `SceneHandle` lives in `init-scene.ts` and the global
  bootstrap in `main.ts`, both outside this phase's Touches, so the witness
  could not be published through either existing hook. It is gated on
  `import.meta.env.DEV` and removed on fleet dispose.

## Open questions

- Phase 2's drawer only targets `locoVehicleId(world.train())`, so wagons are
  repainted as part of the loco's consist; there is no per-wagon selector yet.
  The scene handler also supports direct wagon ids for a future drawer.
- Livery persistence/hydration is not part of this phase; the store is seeded
  at fleet creation and subscription-driven from there.

## Primary verification (independent, 2026-11-28)

- Tree vs Touches: working tree holds exactly `M src/scene/train-fleet.ts`,
  `M src/scene/rig-cargo.ts`, `M src/ui/app.ts` (sanctioned conditional), plus
  new `src/audio/liveries.ts`, `e2e/liveries-paint.spec.ts`, and this evidence
  file. No other files.
- `pnpm check` re-run by the primary: exit 0.
- `pnpm exec playwright test e2e/liveries-paint.spec.ts` re-run by the primary:
  exit 0 — 3 passed.
- Deviation review: `app.ts` is a one-line re-export with a clear ownership
  comment (scene observes the drawer's single instance via the composition root —
  exactly the sanctioned conditional). The `__tinyTracksLivery` witness is
  `import.meta.env.DEV`-gated with disposal cleanup, matching the established
  test-witness pattern.
- AC check: P3.T1 covers FR-2 (whole-body repaint, all six engines + wagon
  bodies, instant material mutation); P3.T2 covers FR-6 (synthesized pop+ding
  via the Howler path, instant mute) with the NFR-3 reduced-motion landing;
  P3.T3 covers AC-5 (muted run, zero audible plays).
- Accepted notes: wagons repaint as part of the loco consist (consistent with the
  Phase 2 accepted scope); persistence/hydration belongs to Phase 5.
- Decision: ACCEPT.
