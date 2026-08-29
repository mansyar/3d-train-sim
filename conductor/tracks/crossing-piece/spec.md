# Spec: Crossing Piece

**Track ID:** `crossing-piece` · **Type:** Feature · **Branch:** `track/crossing-piece`

## Overview

Add a four-way **crossing** track piece to Tiny Tracks, closing a gap in the V1
scope ("straights, 90° curves, crossings"). The crossing occupies one grid
cell, connects all four meadow edges, and lets the autonomous train pass
straight through from any side to the opposite side. Visually it is a single
custom-authored GLB that matches the Kenney Train Kit's look exactly, authored
in Blender and committed to `public/assets/train-kit/`.

## Functional Requirements

1. **New piece type `crossing`** in `src/core/pieces.ts`:
   - `PIECE_TYPES` gains `crossing`; `baseEndpointsFor('crossing')` returns all
     four edges (`north`, `east`, `south`, `west`).
2. **Connectivity** (`track-graph.ts`): `endpointEdgesFor` must link a crossing
   to pieces on all four sides via the existing boundary-key mechanism — no
   algorithm changes, only the new base-endpoint mapping (verify with tests
   across rotations).
3. **Straight-through pathing** (`pathing.ts`):
   - When the solved path enters a crossing from edge X, it exits at the
     opposite edge (north⇄south, east⇄west).
   - An unconnected crossing edge is an open end: existing dead-end handling
     applies unchanged (ride in → pause → shuttle back). No special casing.
   - Both travel directions resolve symmetrically.
4. **Visuals** (`track-renderer.ts` + new GLB):
   - Author `railroad-crossing.glb` in Blender: two straight rails crossing at
     90° on the kit's 4-unit module, chunky sleepers, steel rails, materials
     matched to the kit straights. Mesh sits below the mat like kit pieces;
     anchor at model-space (0, −1, 2) equivalent so the cell centre lands on
     the crossing centre.
   - Committed to `public/assets/train-kit/` and registered in `PIECE_URLS`.
5. **Toybox drawer** (`ui/app.ts`): a third `piece-slot` button
   `data-piece="crossing"` with a hand-drawn SVG icon in the existing style
   (same palette variables, chunky strokes), aria-label "Crossing track piece".
6. **Rotation**: the crossing is 4-fold symmetric — the rotate knob is a visual
   no-op for it (rotation value stored but has no visible effect).
7. **Persistence**: `save.ts` round-trips crossing pieces with no schema change
   (type is a string enum member).

## Non-Functional Requirements

- TDD per `workflow.md` for all `src/core` changes; >80% coverage on new
  logic-bearing code.
- No per-frame allocations; the crossing model loads once and clones like
  other pieces.
- Kid experience unchanged elsewhere: no fail states, no new gestures, no text.

## Acceptance Criteria

- [ ] A crossing can be dragged from the drawer and snaps to the meadow like
      any piece.
- [ ] All four sides of a crossing connect to neighboring pieces; the train
      rides straight through from any direction and exits opposite.
- [ ] A crossing with unconnected edges behaves as a dead end (pause + shuttle
      back).
- [ ] Crossing pieces survive autosave/reload exactly.
- [ ] The crossing GLB is visually indistinguishable in style from kit
      straights.
- [ ] `pnpm check` (biome + typecheck + vitest) passes; new core code >80%
      covered.

## Out of Scope

- Turning at crossings / branch choice (future "Track Switches & Branches"
  track).
- Special sounds, animations, or ghost tints for the crossing.
- Any other new piece types (ramps, hills, bends).
