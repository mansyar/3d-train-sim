# Plan: Mirror Switch (Left-Hand Y)

Feature track per `spec.md`. Mirrors the shipped right-hand switch:
left-hand Y (stem S / through N / diverging W), same alternation
semantics, separate Rails entry, additive save, Blender-mirrored GLB.
Phase 1 is logic-bearing (TDD per `workflow.md`): piece type, pure
mirror routing, solver coverage. Phase 2 is asset + scene riding.
Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Mirror Type, Semantics & Solver (TDD)

- [ ] Task: Add the `switch-mirror` piece type (tests first in
  `pieces.test.ts`, `track-graph.test.ts`, `save.test.ts`,
  `drawer.test.ts`)
  - [ ] `PIECE_TYPES` gains `'switch-mirror'`; `BASE_ENDPOINTS` =
        `['north', 'west', 'south']` (yaw 0: stem S, straight branch N,
        diverging branch W — the spec's left-hand Y)
  - [ ] Terrain rule: dry land only (via `validatePlacement`, ghost red
        over water)
  - [ ] Save round-trip: snapshot containing a mirror; pre-mirror
        snapshots load unchanged; no version bump
  - [ ] Catalog ripple: `drawer.ts` Rails tab gains the mirror entry;
        renderer placeholder maps (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`
        → straight GLB until Phase 2); `ui/app.ts` label + mirrored
        hand-drawn SVG icon
- [ ] Task: Mirror routing in pure `src/core/switches.ts` (TDD:
  `switches.test.ts`)
  - [ ] Entry→exit routing for mirrored handedness: stem entry →
        alternating branch (first pass straight, then diverging);
        branch entry → stem; total for every entry edge
  - [ ] Per-mirror alternation counter: same pure state machine as the
        right switch; session-only — never serialized
- [ ] Task: Solver coverage for mirrored Y topologies (TDD: extend
  `pathing.test.ts`)
  - [ ] Symmetric double loop sharing a mirror rides as alternating
        laps covering both branches
  - [ ] Mirrored dead-end branch: ride out and shuttle back; reverse
        passes follow entry-based rules
  - [ ] Chained mirror/right switches compose; existing
        straight/corner/crossing/switch byte-for-byte unchanged
  - [ ] Termination: every topology yields a finite periodic walk;
        deterministic under any input order
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Asset, Mounting & Scene Riding

- [ ] Task: Mirror asset in Blender (house rules from `tech-stack.md`)
  - [ ] Mirror the `blender-switch.py` recipe (e.g.
        `scripts/blender-switch-mirror.py`) on kit measurements —
        through-road from the kit straight, mirrored curved diverging
        road
  - [ ] Same named blade node contract (`switch_blades`) so the scene
        reuses the flip path; deterministic recipe; export + verify GLB
        JSON chunk + render checks (target ≤ ~60 KB)
- [ ] Task: Ride through the mirror branch (extend
  `ride-motion.test.ts` where logic-bearing; manual criteria otherwise)
  - [ ] Within-piece geometry for the mirror: stem edge → branch point
        → chosen exit edge midpoint (straight or mirrored curved leg),
        matching the solver's `to` edge; no pause or slowdown
  - [ ] Runtime alternation: the ride advances the mirror counter at
        each stem entry and rides the chosen branch; wagons/crates
        follow through either branch
- [ ] Task: Renderer mounting + blade animation
  - [ ] `switch-mirror.glb` registered
        (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`); wheels sit on rails;
        materials match the kit
  - [ ] Blades visibly flip to the chosen branch on alternation (short
        tween; instant snap under `prefers-reduced-motion`);
        event-driven, no per-frame cost outside the tween
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - E2E, Docs & Final Gates

- [ ] Task: Playwright e2e (extend `e2e/switches.spec.ts` or new
  `e2e/switch-mirror.spec.ts`)
  - [ ] Tablet + phone profiles: place a symmetric mirrored
        double-loop via the dev handle, ride, assert both branches
        ridden (alternation), reload restores the layout, zero external
        requests, clean console
- [ ] Task: Docs — CHANGELOG (parent-voice), `product.md` roadmap
  strike, `tech-stack.md` asset list + authoring reference
  - [ ] CHANGELOG Unreleased: parent-voice mirror entry (left-hand Y,
        two ways out, blades flip, normal speed, old saves unchanged)
  - [ ] product.md: roadmap strikes left-mirror as shipped
  - [ ] tech-stack.md: asset tree + recipe list gain the mirror GLB /
        recipe; authoring notes keep the `switch_blades` contract
- [ ] Task: Final gates — `pnpm check` (biome + tsc + vitest),
  coverage report on new core logic, full Playwright run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
- [ ] Task: Review & archive (`conductor-review`), PR, merge
