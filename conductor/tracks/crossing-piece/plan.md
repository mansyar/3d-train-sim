# Plan: Crossing Piece

## Phase 1 — Core Logic (TDD)

- [ ] Task: Write failing tests for the `crossing` piece type (Red)
  - [ ] `pieces.test.ts`: `baseEndpointsFor('crossing')` returns all four edges
  - [ ] `track-graph.test.ts`: crossing connects to neighbors on all four
        sides, at every rotation (0/90/180/270)
- [ ] Task: Implement the `crossing` type in `src/core/pieces.ts` (Green)
- [ ] Task: Write failing tests for straight-through pathing (Red)
  - [ ] `pathing.test.ts`: enter from north → exit south; enter from west →
        exit east
  - [ ] `pathing.test.ts`: both travel directions resolve symmetrically
  - [ ] `pathing.test.ts`: partially-connected crossing (T-shape use) falls
        through to existing dead-end behavior
- [ ] Task: Implement crossing routing in `src/core/pathing.ts` (Green)
- [ ] Task: Save/load round-trip tests for crossing pieces (Red → Green,
      expect little/no change in `save.ts`)
- [ ] Task: Coverage check: `CI=true pnpm test -- --coverage`, >80% on new core
      code
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Asset & Scene Wiring (non-logic)

- [ ] Task: Author `railroad-crossing.glb` in Blender
  - [ ] Two straight rails crossing at 90° on the 4-unit module,
        below-the-mat geometry
  - [ ] Materials matched to kit straights; export GLB, calibrate anchor at
        (0, −1, 2) equivalent
  - [ ] Save to `public/assets/train-kit/`
- [ ] Task: Register the model in `src/scene/track-renderer.ts` (`PIECE_URLS`,
      `KIT_ANCHORS`, yaw no-op)
  - Acceptance: placed crossing renders aligned to the grid, rails collinear
    with neighbors
- [ ] Task: Add the toybox slot in `src/ui/app.ts`
  - [ ] `data-piece="crossing"` button + hand-drawn SVG icon (existing
        palette/stroke style), `PIECE_LABELS` entry
  - Acceptance: drag → ghost preview → snap works; rotate knob does not
    visibly change the piece
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Gates & Verification

- [ ] Task: Full quality gates: `pnpm check` (biome + typecheck + vitest) and
      `pnpm exec playwright test`
- [ ] Task: Manual tablet verification (build a cross layout, ride through,
      autosave reload)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
