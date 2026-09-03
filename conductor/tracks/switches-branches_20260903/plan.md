# Plan: Track Switches & Branches

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`): the switch piece type, pure alternation semantics, and the
solver generalization to Y topologies. Phase 2 is asset + scene riding
(Blender recipe, renderer mount, blade animation, within-piece branch
geometry). Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Switch Semantics & Y-Topology Solver (TDD)

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
- [~] Task: Solver generalization to Y topologies (TDD: extend
      `pathing.test.ts`)
  - [ ] `walkComponent` handles 3-endpoint pieces via the routing rule:
        the ride becomes a periodic walk that covers both branches
        (two loops sharing a switch ride as alternating laps)
  - [ ] Dead-end branch: ride out and shuttle back through the switch;
        reverse passes follow FR2's entry-based rules
  - [ ] Chained switches compose; crossings/straights/corners/hills byte
        for byte unchanged — every existing path test passes untouched
  - [ ] Termination: every topology still yields a finite periodic walk
        (no infinite expansion); determinism under any input order
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Asset, Mounting & Scene Riding

- [ ] Task: Switch asset in Blender (house rules from `tech-stack.md`)
  - [ ] Measure kit straight/curve GLBs first (module span, rail line,
        joint crowns); author the Y-junction on kit measurements —
        through-road from the kit straight's warped rails/sleepers,
        curved diverging road, grassy base
  - [ ] Named blade node (`switch_blades` contract) so the scene can flip
        the points; deterministic recipe `scripts/blender-switch.py`;
        export + verify GLB JSON chunk + render checks (target ≤ ~60 KB)
- [ ] Task: Ride through the branch (extend `ride-motion.test.ts` where
      logic-bearing; manual criteria otherwise)
  - [ ] Within-piece geometry for the switch: stem edge → branch point →
        chosen exit edge midpoint (straight or curved leg), matching the
        solver's `to` edge; no pause or slowdown at the points
  - [ ] Runtime alternation: the ride advances the switch counter at each
        stem entry and rides the chosen branch; wagons/crates follow
        through either branch
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
