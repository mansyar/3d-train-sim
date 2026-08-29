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
  - [x] `pieces.test.ts`: `baseEndpointsFor('crossing')` returns all four edges
  - [x] `track-graph.test.ts`: crossing connects to neighbors on all four
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
- [x] Task: Implement crossing routing in `src/core/pathing.ts` (Green) `[4a13f47]`

  Notes:
  - Added `OPPOSITE_EDGE` and a general exit rule: two-end pieces exit
    through their only other end; four-end pieces (crossings) route straight
    through to the edge opposite the entry. Unconnected exits remain open
    ends — the existing dead-end pause/shuttle behavior covers them with no
    special casing.
  - Refreshed the component-collection comment (components may now be trees
    through crossings, not only simple paths/cycles).
  - Files: `src/core/pathing.ts`.
  - Why: minimal solver change — straight-through routing is a property of
    exit selection, not of the graph.
  - Verified: `pnpm test` 147/147 green.
- [x] Task: Save/load round-trip tests for crossing pieces (Red → Green,
      expect little/no change in `save.ts`) `[780bc25]`

  Notes:
  - Zero production change needed: `isPieceType` validates against
    `PIECE_TYPES`, which the catalog update already extended — snapshots
    round-trip crossings verbatim, rotation included.
  - Also repaired a test fixture my catalog change had silently weakened:
    `save.test.ts` used `type: 'crossing'` as its "unknown kind" fixture; it
    now uses a genuinely unknown type (`hovercraft`) so the test still
    asserts what its name says.
  - Files: `src/core/save.test.ts`.
  - Verified: `pnpm test` 149/149 green.
- [x] Task: Coverage check: `CI=true pnpm test -- --coverage`, >80% on new core
      code

  Notes:
  - `pieces.ts` 100% · `pathing.ts` 97.5% · `track-graph.ts` 95.7% ·
    `save.ts` 88.9% — all above the 80% bar with 149/149 tests passing.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Asset & Scene Wiring (non-logic)

> **Sequencing note (2026-08-29):** The catalog change made the exhaustive
> `Record<PieceType, …>` types in `track-renderer.ts` and `app.ts` incomplete,
> so the typecheck gate cannot pass until this phase's wiring exists. Phase 2
> tasks are therefore executed alongside Phase 1's tail (user-approved
> pull-forward), with one combined checkpoint at the end.

- [x] Task: Author `railroad-crossing.glb` in Blender
  - [x] Two straight rails crossing at 90° on the 4-unit module,
        below-the-mat geometry
  - [x] Materials matched to kit straights; export GLB, calibrate anchor at
        (0, −1, 2) equivalent
  - [x] Save to `public/assets/train-kit/`

  Notes:
  - Authored in Blender 5.2 from the kit's own `railroad-straight.glb`:
    duplicated the straight, rotated 90° about the vertical through the
    anchor (0, −2, −1) Blender-space, joined, exported as-is — so the
    crossing centre lands at glTF (0, −1, 2), exactly the anchor the
    renderer maps to the cell centre. No new calibration needed.
  - Verified by re-import: X∈[−2,2], Y∈[−4,0], Z∈[−1,−0.9]; single shared
    `colormap` material like the kit pieces.
  - User visually confirmed the GLB (2026-08-29).
  - Files: `public/assets/train-kit/railroad-crossing.glb` (`3b129d0`).
- [x] Task: Register the model in `src/scene/track-renderer.ts` (`PIECE_URLS`,
      `KIT_ANCHORS`, yaw no-op)
  - Acceptance: placed crossing renders aligned to the grid, rails collinear
    with neighbors

  Notes:
  - `PIECE_URLS.crossing` → the authored GLB; `KIT_ANCHORS.crossing` = the
    straight's anchor (0, −1, 2), which the authored model already honours;
    `BASE_YAW.crossing` = 0 (4-fold symmetric — rotation is a visual no-op).
  - Also fixed `ride-motion.ts`: crossings ride a line through the cell
    centre; only corners take the quarter-arc branch (the old `else` would
    have arced a crossing wrongly).
  - Pulled forward from the plan's sequencing note: these entries are what
    the compiler demanded once `PIECE_TYPES` gained `crossing`.
  - Files: `src/scene/track-renderer.ts`, `src/scene/ride-motion.ts`,
    `src/ui/app.ts` (plus a biome formatting fix in
    `src/core/track-graph.test.ts`).
  - Gates: biome clean · typecheck clean · 149/149 tests (`f13c158`).
- [x] Task: Add the toybox slot in `src/ui/app.ts`
  - [x] `data-piece="crossing"` button + hand-drawn SVG icon (existing
        palette/stroke style), `PIECE_LABELS` entry
  - Acceptance: drag → ghost preview → snap works; rotate knob does not
    visibly change the piece

  Notes:
  - Third drawer slot with a hand-drawn SVG: two crossing rails in the
    kit's cream/brown/steel palette variables, same chunky stroke language
    as the straight and corner icons. Ghost preview, cap dimming, and the
    rotate knob work through the existing generic piece machinery.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phases 1–3 (combined checkpoint) `[checkpoint: f13c158]`

- Automated: `pnpm check` (biome + typecheck + 149/149 vitest) ✅ ·
  `pnpm exec playwright test` 9/9 on the tablet profile ✅
- Manual verification steps proposed (drawer slot, snap, straight-through
  ride, dead-end shuttle, autosave reload, rotation no-op) — user confirmed
  all meet expectations on the dev server (2026-08-29).
- Coverage: pieces 100% · pathing 97.5% · track-graph 95.7% · save 88.9%.

## Phase 3 — Gates & Verification

- [x] Task: Full quality gates: `pnpm check` (biome + typecheck + vitest) and
      `pnpm exec playwright test`

  Notes:
  - `pnpm check` green (biome · typecheck · 149/149 vitest).
  - Playwright e2e: 9/9 passed on the tablet profile (44s), including the
    silent-console assertion — the crossing GLB loads without errors.
- [x] Task: Manual tablet verification (build a cross layout, ride through,
      autosave reload)

  Notes:
  - User confirmed on the dev server (2026-08-29): crossing renders aligned
    and kit-consistent, rides straight through, dead-end edges shuttle back,
    autosave restores the crossing, rotation is a visual no-op.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Covered by the combined Verification Report above (checkpoint `f13c158`).

## Phase: Review Fixes

- [x] Task: Apply review suggestions

  Notes:
  - Principal-engineer review of the full track diff (c3b49f7..HEAD): plan
    compliance, style guides, tests, coverage, and privacy all pass; zero
    correctness defects.
  - Applied the one accepted suggestion: documented the figure-eight /
    spur-layout known limitation in the spec's Out of Scope, pointing the
    richer traversal to the future switches track.
  - Declined (low value, deferred): shifting one pathing test fixture into
    meadow bounds — the solver is pure graph math and existing tests already
    use arbitrary coordinates.
