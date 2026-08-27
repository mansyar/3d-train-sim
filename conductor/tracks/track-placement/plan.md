# Implementation Plan — Track Placement (Build Mode)

**Track ID:** `track-placement`
**Spec:** `conductor/tracks/track-placement/spec.md`

## Phase 1 — Track Graph Core (TDD)

- [ ] Task: Write failing unit tests for `src/core/pieces.ts`
  - Acceptance criteria: tests cover piece catalog (straight, corner), endpoint
    cell computation for all 4 rotations, cell footprint; suite runs Red
    (module missing).
- [ ] Task: Implement `src/core/pieces.ts` to green
  - Acceptance criteria: Red→Green witnessed; exports pure catalog functions;
    no three.js imports.
- [ ] Task: Write failing unit tests for `src/core/track-graph.ts`
  - Acceptance criteria: tests cover placement records, occupancy + bounds
    validation, 64-piece cap check, connectivity edges from endpoint
    coincidence (incl. corner joins), duplicate-cell rejection; Red witnessed.
- [ ] Task: Implement `src/core/track-graph.ts` to green
  - Acceptance criteria: Red→Green witnessed; pure module; no scene imports.
- [ ] Task: Verify coverage >80% on both modules; full gate green
  - Acceptance criteria: `CI=true pnpm test -- --coverage`; `pnpm check` exit 0.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — World State (TDD)

- [ ] Task: Write failing unit tests for `src/state/world.ts`
  - Acceptance criteria: tests cover place at cell, relocate, return-to-drawer,
    duplicate/occupied rejection, cap enforcement, change-listener emission;
    Red witnessed.
- [ ] Task: Implement `src/state/world.ts` to green; coverage >80%
  - Acceptance criteria: Red→Green witnessed; framework-free store with
    subscribe/notify; gate green.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Toybox Drawer + Ghost Drag UI

- [ ] Task: Build track drawer in the toybox rail (track tab opens drawer;
    ≥64px icon-only straight + corner buttons; buttons dim at 64-piece cap)
  - Acceptance criteria: drawer toggles from the existing rail without breaking
    the 3-slot layout; icons are silhouettes; no text; no hover dependence.
- [ ] Task: Implement pointer-drag ghost (Pointer Events capture, ghost
    follows finger <100 ms, validity tint amber/desaturated, tap-to-rotate
    affordance, tap-vs-drag discrimination)
  - Acceptance criteria: ghost tracks touch 1:1 at tablet emulation; tint
    flips on occupied cells; rotate steps yaw 90°; plain tap lifts and
    snap-backs without changing the world.
- [ ] Task: Wire ghost to world state (release on valid cell → place/snap
    bounce; invalid drop → return-to-drawer wobble; drag placed piece to
    relocate or onto rail to return)
  - Acceptance criteria: world mutations only via `world.ts`; invalid drops
    never change state; visual feedback matches guideline timing.
- [ ] Task: `prefers-reduced-motion` guard (no wobble/pulse; instant placement)
  - Acceptance criteria: with the OS setting on, no transform animations run;
    placement remains functional (matches spin-loop pattern).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Scene Rendering of Placed Pieces

- [ ] Task: Load straight + corner GLB templates; render placements via
    clone-per-piece; map grid cells to world positions; apply yaw per rotation
  - Acceptance criteria: placed piece visually equals its drawer icon piece;
    corner orientation matches its graph endpoints; template loads once per
    type; graceful fallback if a GLB fails (piece still tracked in world).
- [ ] Task: Sync renderer to world changes (add, relocate, remove-to-drawer
    incremental scene updates; dispose clones on removal)
  - Acceptance criteria: no per-frame allocations in sync path; scene matches
    world state after every interaction; gate green.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — E2E + Full Verification

- [ ] Task: Extend Playwright smoke spec (open drawer, drag-place a piece,
    assert rendered world + clean console + localhost-only requests)
  - Acceptance criteria: `pnpm exec playwright test` passes including the new
    interaction on the tablet project.
- [ ] Task: Run full local gate suite; fix any failures
  - Acceptance criteria: `pnpm check` + Playwright both exit 0.
- [ ] Task: Manual tablet walkthrough per workflow (drag feel, snap bounce,
    snap-back, reduced-motion, 60 FPS)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(appended per task as implementation proceeds)
