# Plan: Track Switches & Branches

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`): the switch piece type, pure alternation semantics, and the
solver generalization to Y topologies. Phase 2 is asset + scene riding
(Blender recipe, renderer mount, blade animation, within-piece branch
geometry). Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Switch Semantics & Y-Topology Solver (TDD) [checkpoint: 3e4acf4]

- [x] Task: Add the `switch` piece type (tests first in `pieces.test.ts`,
      `track-graph.test.ts`, `save.test.ts`, `drawer.test.ts`) [3bb79a4]
  - [x] `PIECE_TYPES` gains `'switch'`; `BASE_ENDPOINTS` = `['north',
        'east', 'south']` (yaw 0: stem south, straight branch north,
        diverging branch east — the spec's right-hand Y)
  - [x] Terrain rule: dry land only (regression-guard via
        `validatePlacement`, ghost red over water)
  - [x] Save round-trip: snapshot containing a switch; pre-switch
        snapshots load unchanged; no version bump
  - [x] Catalog ripple: `drawer.ts` rails tab holds 9 pieces; renderer
        placeholder maps (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS` → straight
        GLB until Phase 2); `ui/app.ts` label + hand-drawn SVG icon

  Notes:
  - TDD: 12 new tests written first, confirmed red (12 failed / 85 passed
    in the touched files — all "unknown type" failures), then implemented
    to green (456/456 across the full suite). Biome + tsc clean.
  - Switch geometry: 3 endpoints, canonical order at every rotation
    (0°: N/E/S — stem S, straight branch N, diverging branch E; 180°:
    N/S/W, etc.). `endpointEdgesFor` keeps base order with advanced
    labels (tunnel precedent), asserted at all 4 rotations.
  - Save stays v3 (additive type string, hill precedent); round-trips at
    every rotation; pre-switch v3 snapshots verbatim.
  - Renderer placeholders: straight GLB, yaw 0, straight's KIT_ANCHOR —
    replaced by the authored Y-junction in Phase 2.
  - Files: `src/core/pieces.ts`, `src/core/drawer.ts`,
    `src/core/{pieces,track-graph,save,drawer}.test.ts`,
    `src/scene/track-renderer.ts`, `src/ui/app.ts`.
- [x] Task: New pure module `src/core/switches.ts` (TDD:
      `switches.test.ts`) [85bc07e]
  - [x] Entry→exit routing: stem entry → alternating branch (first pass
        straight, then diverging); branch entry → stem; total for every
        entry edge
  - [x] Per-switch alternation counter: pure state machine
        (advance-on-use semantics per spec FR2, reverse passes included);
        session-only by contract — never serialized

  Notes:
  - TDD: 9 tests written first (red: module missing), then implemented —
    `switches.ts` 100% line/branch/function coverage.
  - API: `routeSwitch(counter, rotation, from)` → `{ exit, counter }`
    (world-oriented edges in and out; rotation mapping kept inside the
    module, RideSpan precedent from elevation.ts) and `nextBranch(counter)`
    for the scene's blade state. Counter is a two-state machine folded mod
    2; stem entries advance it, branch entries never touch it — the rule
    is entry-based and direction-agnostic, so shuttling (reverse) passes
    follow it unchanged.
  - Session-only by contract: nothing here touches save.ts — counters are
    runtime state, each placed switch starts on the straight branch.
- [x] Task: Solver generalization to Y topologies (TDD: extend
      `pathing.test.ts`) [3e4acf4]
  - [x] `walkComponent` handles 3-endpoint pieces via the routing rule:
        the ride becomes a periodic walk that covers both branches
        (two loops sharing a switch ride as alternating laps)
  - [x] Dead-end branch: ride out and shuttle back through the switch;
        reverse passes follow FR2's entry-based rules
  - [x] Chained switches compose; crossings/straights/corners/hills byte
        for byte unchanged — every existing path test passes untouched
  - [x] Termination: every topology still yields a finite periodic walk
        (no infinite expansion); determinism under any input order

  Notes:
  - Design: components WITHOUT switches keep the legacy single-pass walk
    byte for byte (all 34 pre-existing path tests untouched). Components
    WITH switches take `walkAlternating`: a faithful simulation of the
    ride (switch routing via `routeSwitch` with live per-piece counters,
    in-place reversals at dead ends exactly like the ride layer's
    shuttle) with cycle detection on the full state (piece, entry edge,
    all switch counters); the emitted path is the periodic cycle,
    closed=true, so the ride layer loops it unchanged.
  - Key insight (drove the design): a static single-pass open path can
    never cover both branches under the existing shuttle model (out-and-
    back repeats the same branch), so the alternation had to be baked
    into the path as a periodic choreography — reversals are expressed
    as ordinary PathSteps (piece re-entered through the edge it just
    exited), which existing consumers already tolerate (crossings ride
    twice per lap today).
  - Termination: finite state space + deterministic transition ⇒ a cycle
    always exists; a 4096-step cap falls back to frozen straight-through
    routing (unreachable for real layouts; keeps the solver total —
    "never fails" product rule).
  - TDD: 6 new tests (lone switch exact cycle; Y with dead-end branches;
    figure-8 with two switches + two crossings; chained-switch line;
    flat heights; per-component ride separation) — 5 confirmed red
    (legacy walk threw on 3-endpoint pieces), then green. Also fixed a
    broken test expectation during green (a cycle carries exactly two
    stem passes per lap: straight + diverge).
  - Gates: biome clean (import order auto-fix), tsc clean, 471/471.
    Coverage: pathing.ts 97.7% lines / 97.9% funcs (uncovered lines =
    the cap fallback), switches.ts 100%.
  - Ride-layer contract for Phase 2: reversal steps (piece re-entered,
    `from` == previous step's `to`) need a facing flip at turnarounds;
    blade state = each switch's counter during the ride.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 1):
  - Automated: `CI=true pnpm test` → 471/471 passing (32 files);
    `pnpm exec biome check .` and `pnpm exec tsc --noEmit` clean;
    coverage on new/changed logic — switches.ts 100% (all metrics),
    pathing.ts 97.7% lines / 97.9% functions (uncovered lines = the
    unreachable step-cap fallback), pieces.ts 100%, drawer.ts 100%
    lines, track-graph.ts 96.3% lines (pre-existing gaps), save.ts
    98.3% lines.
  - Phase scope: every logic-bearing changed file carries tests;
    `track-renderer.ts` / `ui/app.ts` changes are non-logic catalog
    placeholders (straight GLB, label, SVG icon) verified by the gates.
  - Manual verification steps: run `pnpm dev`, open on tablet/touch
    emulation; Rails tab shows 9 pieces with the new switch icon; the
    switch snaps on land, ghosts red over water, lifts/trashes like
    track; reload restores it. Switches render as straight placeholders
    and ride placeholder geometry until Phase 2 (hills-checkpoint
    precedent).
  - User confirmation: PENDING — the phase-gate question received no
    user response (2026-09-03); proceeded per session autonomy
    guidance. Not treated as approval; confirm at the next gate or in
    review.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Asset, Mounting & Scene Riding

- [x] Task: Switch asset in Blender (house rules from `tech-stack.md`) [ecdfd21]
  - [x] Measure kit straight/curve GLBs first (module span, rail line,
        joint crowns); author the Y-junction on kit measurements —
        through-road from the kit straight's warped rails/sleepers,
        curved diverging road, grassy base
  - [x] Named blade node (`switch_blades` contract) so the scene can flip
        the points; deterministic recipe `scripts/blender-switch.py`;
        export + verify GLB JSON chunk + render checks (target ≤ ~60 KB)

  Notes:
  - Measured first (headless Blender probes): the kit straight mounts
    natively in the recipe frame (x ±0.5, y −4..0, crown −0.9); the kit
    corner-small natively connects north↔west edge midpoints pivoting
    the NW corner (radius 2) — a 180° turn about the cell centre maps it
    exactly onto the solver's south→east quarter-arc (pivot SE corner),
    so the diverging road IS the kit corner's own rails, rigidly
    rotated: gauge and arc guaranteed.
  - Deviation from the plan wording: no grassy base — the kit's track
    pieces are bare sleepers + rails resting on the meadow mat, and the
    switch keeps that look; the two roads interlace at the points like
    a real turnout.
  - Node contract (verified in the exported GLB JSON chunk):
    `switch_through`, `switch_diverge`, `switch_blades` (empty at the
    heel) + `switch_blade_-1/1` bars; materials `colormap` ×2 (kit) +
    `switch_steel`. Blade rotation: 0 = closed for the through road,
    NEGATIVE z rotation angles them east toward the diverge. 60,748 B.
  - Render checks: top view (Y reads clearly, ends land on the edge
    midpoints), three-quarter, and a fit shot with the kit locomotive
    (×1.6) standing mid-arc on the diverge — wheels at the mat plane,
    matching the KIT_ANCHOR mount convention; no clipping.
  - Headless-Blender gotcha (for future recipes): the default startup
    scene ships a Cube/Camera/Light — `blender-switch.py` purges them
    before the render checks; the hills recipe never hit this because it
    ran inside an interactive session.
- [x] Task: Ride through the branch (extend `ride-motion.test.ts` where
      logic-bearing; manual criteria otherwise) [ac4ed48]
  - [x] Within-piece geometry for the switch: stem edge → branch point →
        chosen exit edge midpoint (straight or curved leg), matching the
        solver's `to` edge; no pause or slowdown at the points
  - [x] Runtime alternation: the ride advances the switch counter at each
        stem entry and rides the chosen branch; wagons/crates follow
        through either branch

  Notes:
  - `segmentForStep` curves for switch when to != opposite(from)
    (SE-pivot quarter-arc r=CELL/2, kit-corner geometry); straight
    stem→north stays a line. No pause/slowdown at the points.
  - `createRideMotion` builds per-ride switch choreography: per-segment
    road (pieceId+exit), turnaround pauses where a step re-enters the
    same piece reversed (dead-end bounce), wrap turnaround at the seam.
    `poseTrain` announces road once per change via `onSwitchRoad`
    (scene-side blade listener, zero per-frame cost).
  - Tests: +5 (3 segment geometry S-N/S-E/N-E-rot180, Y-layout ride
    stays on rails <0.02 engine/<0.03 wagon, onSwitchRoad alternates
    north/east with no repeat/chatter). 19/19 ride-motion, 476/476
    full suite, tsc clean.
- [ ] Task: Renderer mounting + blade animation
  - [ ] `switch.glb` registered (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`);
        wheels sit on rails; materials match the kit
  - [ ] Blades visibly flip to the chosen branch on alternation (short
        tween; instant snap under `prefers-reduced-motion`); event-driven,
        no per-frame cost outside the tween
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - E2E, Docs & Final Gates

- [ ] Task: Playwright e2e (`e2e/switches.spec.ts`)
  - [ ] Tablet + phone profiles: place a two-loop Y layout via the dev
        handle, ride, assert both branches ridden (alternation), reload
        restores the layout, zero external requests, clean console
- [ ] Task: Docs — CHANGELOG (parent-voice), `product.md` roadmap strike,
      `tech-stack.md` asset list + authoring reference
- [ ] Task: Final gates — `pnpm check` (biome + tsc + vitest), coverage
      report on new core modules, full Playwright run
- [ ] Task: Review & archive (`conductor-review`), PR, merge
