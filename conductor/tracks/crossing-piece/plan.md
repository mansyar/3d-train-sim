# Plan: Crossing Piece

## Phase 1 — Core Logic (TDD)

- [x] Task: Write failing tests for the `crossing` piece type (Red) `[702a8ed]`

  Notes:
  - Red phase confirmed: 7 failing tests across `pieces.test.ts` and
    `track-graph.test.ts`, all failing because `crossing` is absent from
    `PIECE_TYPES` (`baseEndpointsFor` returns `undefined`).
  - Updated the V1-set expectation to include `crossing`; split the
    "two endpoints" invariant into two-end pieces vs. the crossing's four.
  - New coverage: crossing endpoints at all rotations (canonical order,
    4-fold symmetry), boundary keys for all four edges, and `connectionsFor`
    linking a crossing to neighbors on all four sides at 0° and 270°.
  - Files: `src/core/pieces.test.ts`, `src/core/track-graph.test.ts`.
  - Why: the spec's first requirement — 4-endpoint connectivity — needs its
    acceptance harness in place before any implementation exists.
  - [ ] `pieces.test.ts`: `baseEndpointsFor('crossing')` returns all four edges
  - [ ] `track-graph.test.ts`: crossing connects to neighbors on all four
        sides, at every rotation (0/90/180/270)
- [x] Task: Implement the `crossing` type in `src/core/pieces.ts` (Green) `[05c5a34]`

  Notes:
  - `PIECE_TYPES` gains `crossing`; `BASE_ENDPOINTS['crossing']` returns all
    four canonical edges. `baseEndpointsFor` widened from a 2-tuple to
    `readonly Edge[]` — `endpointsFor`, `endpointEdgesFor`, and the pathing
    `endsOf` all consume it generically, so no other core code changed.
  - One test fix during Green: the rotation-invariance test sorted only the
    expected array; `toEqual` is order-sensitive for arrays, so the actual
    list is now sorted too.
  - Files: `src/core/pieces.ts`, `src/core/track-graph.test.ts` (test fix).
  - Why: connectivity is pure data once the catalog knows the crossing joins
    all four edges — the existing boundary-key algorithms do the rest.
  - Verified: `pnpm test` 143/143 green.
- [x] Task: Write failing tests for straight-through pathing (Red) `[339b182]`

  Notes:
  - Red confirmed: 4 failing tests in a new `solvePath — crossing` block.
  - Files: `src/core/pathing.test.ts`.
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
