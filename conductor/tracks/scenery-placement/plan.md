# Implementation Plan — Scenery Placement (Decorate the Meadow)

**Track ID:** `scenery-placement`
**Spec:** `conductor/tracks/scenery-placement/spec.md`

## Phase 1 — Scenery Catalog + World Store (src/core, src/state, TDD)

- [ ] Task: TDD — Red: failing unit tests for the scenery catalog in `src/core/scenery.test.ts` (kind list, per-kind model URL, ground y-lift, scale; total-function purity)
- [ ] Task: TDD — Green: implement `scenery.ts` minimum code to pass
- [ ] Task: Verify coverage >80% on `src/core/scenery.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Scenery Renderer (src/scene)

- [ ] Task: Renderer — per-kind GLB template load, clone-on-placement, amber/gray ghost tint, cell anchoring + y-lift (reusing `cellToWorld`/`CELL_SIZE`)
- [ ] Task: Wire into `init-scene.ts` (scene handle exposes scenery ghost/pick callbacks)
- [ ] Task: Full gate suite green (biome + tsc + vitest); fix failures
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Toybox Drawer Integration (src/ui) + E2E

- [ ] Task: UI — scenery drawer toggle + tree/bush/rock slots with real icons (icon-only rule); drag pipeline parity with track pieces
- [ ] Task: Playwright smoke — drag a tree from the drawer onto the meadow; model clone lands; console clean, zero external requests
- [ ] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Manual tablet walkthrough (build + decorate + ride) — user-confirmed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(appended per task as implementation proceeds)
