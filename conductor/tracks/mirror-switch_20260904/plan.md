# Plan: Mirror Switch (Left-Hand Y)

Feature track per `spec.md`. Mirrors the shipped right-hand switch:
left-hand Y (stem S / through N / diverging W), same alternation
semantics, separate Rails entry, additive save, Blender-mirrored GLB.
Phase 1 is logic-bearing (TDD per `workflow.md`): piece type, pure
mirror routing, solver coverage. Phase 2 is asset + scene riding.
Phase 3 closes with e2e, docs, and final gates.

## Phase 1 - Core: Mirror Type, Semantics & Solver (TDD)

- [x] Task: Add the `switch-mirror` piece type (tests first in
  `pieces.test.ts`, `track-graph.test.ts`, `save.test.ts`,
  `drawer.test.ts`) (commits `abd994f`, `3c8ef72`)
  - [x] `PIECE_TYPES` gains `'switch-mirror'`; `BASE_ENDPOINTS` =
        `['north', 'west', 'south']` (yaw 0: stem S, straight branch N,
        diverging branch W — the spec's left-hand Y)
  - [x] Terrain rule: dry land only (via `validatePlacement`, ghost red
        over water)
  - [x] Save round-trip: snapshot containing a mirror; pre-mirror
        snapshots load unchanged; no version bump
  - [x] Catalog ripple: `drawer.ts` Rails tab gains the mirror entry;
        renderer placeholder maps (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`
        → straight GLB until Phase 2); `ui/app.ts` label + mirrored
        hand-drawn SVG icon
  - Notes: Red first — 4 failing mirror geometry tests, then Green via
    the `SwitchPieceType` generalization (`routeSwitch` keeps a default
    `type = 'switch'`, so legacy callers are byte-for-byte). Terrain and
    save needed no new logic (non-bridge dry-land rule + additive
    `PieceType` cover the mirror); tests lock the behavior. Router and
    solver stay handedness-explicit: `isSwitchPiece` guard +
    `DIVERGE_EDGE` record (switch→east, mirror→west). Lone-mirror cycle
    phase starts at the west end per the deterministic start rule (same
    4-step periodic ride as the right switch). Gates: 529→539 tests
    pass, `switches.ts`/`pieces.ts` 100% coverage, `tsc` + `biome`
    clean (one fix: hoisted `placedType` local — narrowing does not
    survive into the `find` closure).
- [x] Task: Mirror routing in pure `src/core/switches.ts` (TDD:
  `switches.test.ts`) (commit `abd994f`)
  - [x] Entry→exit routing for mirrored handedness: stem entry →
        alternating branch (first pass straight, then diverging);
        branch entry → stem; total for every entry edge
  - [x] Per-mirror alternation counter: same pure state machine as the
        right switch; session-only — never serialized
  - Notes: `DIVERGE_EDGE` record selects the diverge leg per hand;
    stem alternation / branch merge shared. New `switch-mirror`
    describe (4 tests) + restored right-hand totality test.
- [x] Task: Solver coverage for mirrored Y topologies (TDD: extend
  `pathing.test.ts`) (commit `abd994f`)
  - [x] Symmetric double loop sharing a mirror rides as alternating
        laps covering both branches
  - [x] Mirrored dead-end branch: ride out and shuttle back; reverse
        passes follow entry-based rules
  - [x] Chained mirror/right switches compose; existing
        straight/corner/crossing/switch byte-for-byte unchanged
  - [x] Termination: every topology yields a finite periodic walk;
        deterministic under any input order
  - Notes: `walkSimple` frozen route, `walkAlternating` counters, and
    `walkComponent` detection all take the piece's own hand; scene
    layers (`ride-motion` arcs + `onSwitchRoad`, renderer
    `setSwitchRoad` with per-hand diverge mapping) generalized in the
    same commit. Full suite 529 pass, no regressions.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (Phase 1): scope via `git diff --name-only
    <merge-base>..HEAD` — 4 logic files (`pieces.ts`, `switches.ts`,
    `pathing.ts`, `drawer.ts`), each covered by its test file; scene/UI
    ripple (`ride-motion.ts`, `track-renderer.ts`, `app.ts`) is
    acceptance-criteria-only per workflow (non-logic). Full suite
    `CI=true pnpm test -- --coverage`: 34 files / 537 tests pass, 0
    failures, no fixes needed. Coverage: `switches.ts` + `pieces.ts`
    100/100/100/100; `pathing.ts` lines 99.31 (unchanged from
    baseline); remaining uncovered lines are pre-existing defensive
    fallbacks (`drawer.ts` 74, `track-graph.ts` 139-142, `save.ts`
    166). Gates: `tsc --noEmit` clean, `biome check` clean.
    Manual tablet steps (user-confirmed yes): separate mirror entry
    with left-branch icon; snaps on dry land; red ghost over water;
    reload persists; old saves load.
  - [checkpoint: 3c8ef72]

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
