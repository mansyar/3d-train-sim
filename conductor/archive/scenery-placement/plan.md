# Implementation Plan — Scenery Placement (Decorate the Meadow)

**Track ID:** `scenery-placement`
**Spec:** `conductor/tracks/scenery-placement/spec.md`

## Phase 1 — Scenery Catalog + World Store (src/core, src/state, TDD)

- [x] Task: TDD — Red: failing unit tests for the scenery catalog in `src/core/scenery.test.ts` (kind list, per-kind model URL, ground y-lift, scale; total-function purity)
- [x] Task: TDD — Green: implement `scenery.ts` minimum code to pass
- [x] Task: Verify coverage >80% on `src/core/scenery.ts`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Scenery Renderer (src/scene)

- [x] Task: Renderer — per-kind GLB template load, clone-on-placement, amber/gray ghost tint, cell anchoring + y-lift (reusing `cellToWorld`/`CELL_SIZE`)
- [x] Task: Wire into `init-scene.ts` (scene handle exposes scenery ghost/pick callbacks)
- [x] Task: Full gate suite green (biome + tsc + vitest); fix failures
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Toybox Drawer Integration (src/ui) + E2E

- [x] Task: UI — scenery drawer toggle + tree/bush/rock slots with real icons (icon-only rule); drag pipeline parity with track pieces
- [x] Task: Playwright smoke — drag a tree from the drawer onto the meadow; model clone lands; console clean, zero external requests
- [x] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [x] Task: Manual tablet walkthrough (build + decorate + ride) - user-confirmed
  - Notes: Confirmed 2026-08-29 during conductor review, based on the
    user-approved 2026-08-28 walkthrough ("all good") that covered placing,
    relocating, and removing scenery plus a ride on the finished world.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Phase 1 green: `src/core/scenery.test.ts` 5/5; `src/state/world.test.ts` 19/19 (10 original piece cases untouched + 9 scenery cases) with shared occupancy, shared `MAX_PIECES` cap, `scenery-N` ids on the shared counter, single notify channel. `world.ts` coverage 97.3% statements / 100% functions. Commit `b79f5d9` (catalog) + `4a7055d` (store).
- Phase 2 green: `track-renderer.ts` widened to a `MeadowItem` union — one template map keyed by `PieceType | SceneryKind`, scenery templates bake `sceneryScale`/`sceneryLift` into the template clone, `reconcile()` rebuilds from `world.pieces()` + `world.scenery()`, `PickedItem` discriminated union exported for the UI. `init-scene.ts` `SceneHandle` widened to pass the union through. tsc clean.
- Phase 3 green: scenery drawer (`data-drawer="scenery"`) with tree/bush/rock slots mirrors the track drawer; `setDrawer` keeps one drawer open at a time; `canPlaceAt` checks both collections (dragged toy frees its own cell); `endDrag` branches place/relocate/trash on the drag kind; `refreshCap` counts pieces + scenery and dims both drawers' slots. Ride gate still keys off track only.
- Verification: `npx tsc --noEmit` clean; `npx biome check --write src` clean; `npx vitest run` 96/96; `npx playwright test` 5/5 (new test "drag-placing scenery decorates the meadow"). Commit `418d270`.
- Pre-existing (not this track): `npx vite build` fails on base commit too — rolldown cannot resolve `workbox-window` (pnpm hoisting quirk with `vite-plugin-pwa`'s virtual register module). Dev-server e2e unaffected.
- Outstanding: manual tablet walkthrough is user-confirmed only (needs a human with a tablet).

## Phase: Review Fixes

- [x] Task: Apply review suggestions 771ae39
  - Notes: conductor-review (2026-08-29) verified the implementation against
    the evolved mainline: biome + tsc clean, 137/137 unit tests, 9/9 Playwright
    (including the scenery smoke and scenery-autosave tests), and
    `src/core/scenery.ts` at 100% statement/branch/function/line coverage.
    No code changes required. The review recorded the manual walkthrough as
    user-confirmed (see Phase 3), promoted the metadata status to complete,
    and reconciled the archival bookkeeping: the duplicate
    `conductor/tracks/scenery-placement/` folder was removed and the archive
    list in `tracks.md` now includes this track. Review fix commit: `771ae39`.
