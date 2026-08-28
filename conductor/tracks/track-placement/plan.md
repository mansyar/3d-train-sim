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

## Phase 4 — Scene Rendering of Placed Pieces [checkpoint: d71acb3]

### Verification Report (2026-08-28)

- Automated: `pnpm exec biome check .` (26 files clean), `pnpm exec tsc --noEmit`
  (clean), `pnpm test` (35/35) — all green at the checkpoint.
- Coverage: phase touched only scene/UI/DOM glue (main.ts, init-scene.ts,
  track-renderer.ts, style.css, app.ts) — no logic-bearing modules, so the
  >80% coverage gate is N/A per workflow; logic coverage already enforced in
  Phases 1–2.
- Manual/Playwright: place (cell-centered, amber ghost, drop-ping), relocate,
  tap snap-back, rotation mid-drag, occupied-cell wobble-return — all leave
  scene == world, console-errors 0. Connectivity: user hand-built a closed
  oval loop (2 straights + 4 corners), pieces join seamlessly (corner arc
  realigned via 180° base yaw + arc-center anchor, c6e3013). Trashbin drop
  target added during verification feedback (3826566): bin drop removes,
  rail drop wobble-returns; user visually confirmed all flows.
- User confirmation: 2026-08-28 ("all connected nicely", "all working").

- [x] Task: Load straight + corner GLB templates; render placements via
    clone-per-piece; map grid cells to world positions; apply yaw per rotation — 8a535a8
  - Acceptance criteria: placed piece visually equals its drawer icon piece;
    corner orientation matches its graph endpoints; template loads once per
    type; graceful fallback if a GLB fails (piece still tracked in world).
  - Notes: invisible-piece root cause — Kenney kit geometry is authored below
    its origin (box min y = −1); templates now lifted by −box.min.y at load.
    Straight renders north-south; corner renders as a bend (screenshots).
    Fallback witnessed: corner GLB hidden mid-run → straight still rendered,
    world tracked, console clean. User-feedback round folded in: real-3D
    drag ghost (grid-snapped, amber/gray tint), drawer toggle fix
    (author display:flex beat the UA [hidden] rule), R/Shift+R rotate,
    rotate-knob release no longer drops the piece. User confirmed placement
    and rotation; re-witnessed on 8a535a8: corner drop at 180° (R ×2)
    fans right, gate 35/35, console-errors 0.
- [x] Task: Sync renderer to world changes (add, relocate, remove-to-drawer
    incremental scene updates; dispose clones on removal) — fd25fd1
  - Acceptance criteria: no per-frame allocations in sync path; scene matches
    world state after every interaction; gate green.
  - Notes:
    - Changes: wired canvas pointerdown → pickPiece → beginPlacedDrag so
      placed pieces lift as ghosts for relocate / return-to-rail drags
      (closes the Phase 3 deviation); app.ts, main.ts, init-scene.ts,
      track-renderer.ts.
    - Kit-model centering: the Kenney GLBs are authored off-origin (straight
      rail geometry extends +2 units along local +Z; lift below the mat).
      Templates are now wrapped in a Group with the Box3 offset baked in, so
      clones sit centered on their cell and rotate around it. Removed the
      per-type lift map (baked into the wrapper).
    - Picking: replaced mesh raycasting with cell lookup — the store keeps
      one piece per cell, so the whole cell is the tap target. Raycasting
      proved unreliable (thin rail tops, gaps between sleepers catch the
      steep camera ray). This supersedes the "needs mesh raycasting"
      deviation note from Phase 3 with a simpler, more forgiving mechanism.
    - cellFromPoint moved from init-scene into track-renderer (next to
      cellToWorld, single source of grid↔world mapping); init-scene delegates.
    - Why: the sync loop (reconcile) already added/relocated/removed clones
      via world.subscribe; the missing half was the interaction loop that
      mutates the world from an existing piece, plus faithful cell-centered
      rendering. Verified in-browser (Playwright-driven drags): place,
      relocate, return-to-rail, tap snap-back all leave scene == world,
      console-errors 0; gate 35/35, biome + tsc clean.
- [x] Task: Trashbin drop target for piece removal (replaces drag-to-rail;
    rail drops wobble-return) — user-requested during Phase 4 verification — 3826566
  - Acceptance criteria: a fixed 🗑️ trash button sits at the right end of
    the toybox rail; dragging a placed piece onto it removes the piece from
    the world (drawer slot frees, drop-ping feedback); dropping a dragged
    piece on the rail/toolbar no longer removes — it wobble-returns to its
    cell; touch target ≥64px; console clean.
  - Notes: trash button mirrors `.toy-slot` styling (cream body, 72px
    target, `margin-left: auto` pins it to the rail's right end); endDrag
    now bins only over `.trash-slot`; toolbar drops (`.toybox-rail`) never
    relocate — the bottom grid row hides behind the rail, so the piece
    wobble-returns to its cell instead. Playwright: bin drop removes,
    rail drop keeps (probe-press confirmed the piece still lifts), console
    clean; user visually confirmed all flows in the dev server.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — d71acb3

## Phase 5 — E2E + Full Verification

- [x] Task: Extend Playwright smoke spec (open drawer, drag-place a piece,
    assert rendered world + clean console + localhost-only requests) — dd21256
  - Acceptance criteria: `pnpm exec playwright test` passes including the new
    interaction on the tablet project.
  - Notes: second spec opens the drawer via the rail toggle, mouse-drags a
    piece slot to the meadow (pointer events, works under touch emulation),
    asserts the viewport screenshot changed (piece rendered), zero external
    requests, zero console errors. Both tests green on the iPad Mini project.
- [x] Task: Run full local gate suite; fix any failures — 7793414
  - Acceptance criteria: `pnpm check` + Playwright both exit 0.
  - Notes: first run surfaced 4 Biome `noNonNullAssertion` warnings in the
    new spec (guard clause replaces `box!`); rerun fully green — biome 26
    files clean, tsc clean, vitest 35/35, Playwright 2/2 on the tablet
    project.
- [x] Task: Manual tablet walkthrough per workflow (drag feel, snap bounce,
    snap-back, reduced-motion, 60 FPS) — user walkthrough 2026-08-28
  - Acceptance criteria: user confirms drag feel, snap bounce, snap-back,
    reduced motion, and 60 FPS on a real tablet.
  - Notes: user ran the walkthrough on a tablet against the network-exposed
    dev server (Wi-Fi http://192.168.0.114:5176) and confirmed "all good" —
    drag feel, snap bounce, snap-back, trashbin, and fluidity all pass.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(appended per task as implementation proceeds)
