# Implementation Plan — Track Placement (Build Mode)

**Track ID:** `track-placement`
**Spec:** `conductor/tracks/track-placement/spec.md`

## Phase 1 — Track Graph Core (TDD) [checkpoint: e640fe7]

> **Verification Report** (2026-08-27)
> - Automated: `pnpm test` 25/25 passed (exit 0); `pnpm check` (Biome +
>   `tsc --noEmit` + tests) exit 0; coverage — pieces.ts 100/100/100/100,
>   track-graph.ts 95.7 stmts / 91.7 branch / 100 lines (uncovered 119–122
>   are `noUncheckedIndexedAccess` guards, unreachable by valid input).
> - Manual: none required — pure logic, no user-visible surface.
> - User confirmation: **yes** (Phase 1 gate).
> - Checkpoint SHA: `e640fe7`

- [x] Task: Write failing unit tests for `src/core/pieces.ts` — b583b5c
  - Acceptance criteria: tests cover piece catalog (straight, corner), endpoint
    cell computation for all 4 rotations, cell footprint; suite runs Red
    (module missing).
  - Notes: Red witnessed — `Cannot find module './pieces'` (grid suite 5/5
    unaffected). Contract: clockwise yaw (0/90/180/270°), edges
    `north|east|south|west`, straight joins north↔south, corner joins
    north↔east, results in canonical edge order, 1-cell footprint.
- [x] Task: Implement `src/core/pieces.ts` to green — 5ab70cb
  - Acceptance criteria: Red→Green witnessed; exports pure catalog functions;
    no three.js imports.
  - Notes: Green 11/11. Fix 1/2 — `% CANONICAL_EDGES` (array coerced to NaN,
    empty endpoints) → `% CANONICAL_EDGES.length`; caught by the unit gate,
    esbuild does not typecheck.
- [x] Task: Write failing unit tests for `src/core/track-graph.ts` — 90c8042
  - Acceptance criteria: tests cover placement records, occupancy + bounds
    validation, 64-piece cap check, connectivity edges from endpoint
    coincidence (incl. corner joins), duplicate-cell rejection; Red witnessed.
  - Notes: 14 cases incl. corner↔straight joins, cap boundary, via-edge
    reporting. Deviation: Red run not witnessed separately for this module —
    tests + module landed in one commit; Green witnessed 25/25.
- [x] Task: Implement `src/core/track-graph.ts` to green — 90c8042
  - Acceptance criteria: Red→Green witnessed; pure module; no scene imports.
  - Notes: fix 1/2 — removed unused `endpointsFor` import (tsc TS6133);
    fix 2/2 — replaced COMPASS index arithmetic with total `NEXT_EDGE`
    stepping and explicit element guards to satisfy
    `noUncheckedIndexedAccess` without assertions.
- [x] Task: Verify coverage >80% on both modules; full gate green — 90c8042
  - Acceptance criteria: `CI=true pnpm test -- --coverage`; `pnpm check` exit 0.
  - Notes: Windows pwsh omits `CI=true` (bootstrap fix, see workflow.md).
    Witnessed: pieces 100/100/100/100; track-graph 95.7 stmts / 91.7 branch /
    100 lines (uncovered 119–122 = unreachable index guards, by design);
    `pnpm check` exit 0 (Biome + tsc + 25/25).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — World State (TDD) [checkpoint: 7ee6bfd]

> **Verification Report** (2026-08-27)
> - Automated: `pnpm test` 35/35 passed (exit 0); `pnpm check` (Biome +
>   `tsc --noEmit` + tests) exit 0; coverage — world.ts 97.6 stmts /
>   94.4 branch / 100 lines (line 62 self-relocate guard branch).
> - Manual: none required — pure logic, no user-visible surface.
> - User confirmation: **yes** (Phase 2 gate).
> - Checkpoint SHA: `7ee6bfd`

- [x] Task: Write failing unit tests for `src/state/world.ts` — 0e1f7d2
  - Acceptance criteria: tests cover place at cell, relocate, return-to-drawer,
    duplicate/occupied rejection, cap enforcement, change-listener emission;
    Red witnessed.
  - Notes: 10 cases — place/relocate/remove happy paths, occupied + out-of-
    bounds + cap rejections, self-relocate no-op, unknown-id handling,
    unsubscribe. Red witnessed: `Cannot find module './world'`.
- [x] Task: Implement `src/state/world.ts` to green; coverage >80% — 0e1f7d2
  - Acceptance criteria: Red→Green witnessed; framework-free store with
    subscribe/notify; gate green.
  - Notes: Green 10/10; coverage 97.6 stmts / 94.4 branch / 100 lines (line 62
    self-relocate guard branch). fix 1/1 — Biome import sort + union format
    (`--write`). Full gate: `pnpm check` exit 0, 35/35.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Toybox Drawer + Ghost Drag UI [checkpoint: 1250acb]

> **Verification Report** (2026-08-27)
>
> - **Automated:** `pnpm test` 35/35 passed (exit 0); `pnpm check`
>   (Biome + `tsc --noEmit` + tests) exit 0; Playwright smoke 1/1
>   (3-slot layout + clean console + zero external requests).
> - **Manual:** drawer toggle, drag ghost 1:1 tracking, amber/gray validity
>   tint, ⟳ 90° rotation, drop-ping / wobble-return — proposed and exercised
>   by the user. **Fix 1/1 (2539e8b):** corner icon didn't read as a curve —
>   redrew both icons as chunky top-down silhouettes (plank + rails + ties /
>   layered-stroke bend), verified via browser screenshots.
> - **User confirmation:** yes (2026-08-27).
> - **Checkpoint SHA:** 1250acb

## Phase 3 — Toybox Drawer + Ghost Drag UI

- [x] Task: Build track drawer in the toybox rail (track tab opens drawer;
    ≥64px icon-only straight + corner buttons; buttons dim at 64-piece cap) — 8602e28
  - Acceptance criteria: drawer toggles from the existing rail without breaking
    the 3-slot layout; icons are silhouettes; no text; no hover dependence.
  - Notes: track slot toggles `.track-drawer` (aria-expanded); inline-SVG
    silhouettes (wood + steel, no text); 72px buttons; cap dims via world
    subscription (`is-dimmed` + disabled). Smoke's 3-slot assertion intact.
    Manual-verification fix 1/1 (2539e8b): corner glyph didn't read as a
    curve (broken arc, then quadrant-confined annulus) — both icons redrawn
    as layered-stroke top-down silhouettes (plank + ties + twin rails for
    straight; fat bend + steel rail for corner), verified via screenshots.
- [x] Task: Implement pointer-drag ghost (Pointer Events capture, ghost
    follows finger <100 ms, validity tint amber/desaturated, tap-to-rotate
    affordance, tap-vs-drag discrimination) — 8602e28
  - Acceptance criteria: ghost tracks touch 1:1 at tablet emulation; tint
    flips on occupied cells; rotate steps yaw 90°; plain tap lifts and
    snap-backs without changing the world.
  - Notes: window-level pointermove/up with CSS `translate` (no layout
    thrash); tint = amber glow (placeable) vs grayscale (blocked) via
    `cellFromPoint` + occupancy; ⟳ knob steps 90°. Deviation: plain-tap
    lift/snap-back applies to placed 3D pieces — needs mesh raycasting,
    lands with Phase 4 sync (documented).
- [x] Task: Wire ghost to world state (release on valid cell → place/snap
    bounce; invalid drop → return-to-drawer wobble; drag placed piece to
    relocate or onto rail to return) — 8602e28
  - Acceptance criteria: world mutations only via `world.ts`; invalid drops
    never change state; visual feedback matches guideline timing.
  - Notes: drop → `world.place` (DOM drop-ping at finger); invalid/off-meadow
    → wobble-return, world untouched. Deviation: placed-piece relocate/
    rail-return needs Phase 4 picking (documented).
- [x] Task: `prefers-reduced-motion` guard (no wobble/pulse; instant placement) — 8602e28
  - Acceptance criteria: with the OS setting on, no transform animations run;
    placement remains functional (matches spin-loop pattern).
  - Notes: ping/wobble animations wrapped in
    `@media (prefers-reduced-motion: no-preference)` semantics — reduced
    users get no ping/wobble; placement itself is instant either way.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Scene Rendering of Placed Pieces

- [~] Task: Load straight + corner GLB templates; render placements via
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
