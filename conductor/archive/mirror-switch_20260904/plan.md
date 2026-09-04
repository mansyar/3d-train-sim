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

- [x] Task: Mirror asset in Blender (house rules from `tech-stack.md`) — commit `2257525`
  - [ ] Mirror the `blender-switch.py` recipe (e.g.
        `scripts/blender-switch-mirror.py`) on kit measurements —
        through-road from the kit straight, mirrored curved diverging
        road
  - [ ] Same named blade node contract (`switch_blades`) so the scene
        reuses the flip path; deterministic recipe; export + verify GLB
        JSON chunk + render checks (target ≤ ~60 KB)
- [x] Task: Ride through the mirror branch (extend
  `ride-motion.test.ts` where logic-bearing; manual criteria otherwise) — commit `2257525`
  - [ ] Within-piece geometry for the mirror: stem edge → branch point
        → chosen exit edge midpoint (straight or mirrored curved leg),
        matching the solver's `to` edge; no pause or slowdown
  - [ ] Runtime alternation: the ride advances the mirror counter at
        each stem entry and rides the chosen branch; wagons/crates
        follow through either branch
- [x] Task: Renderer mounting + blade animation — commit `2257525`
  - [ ] `switch-mirror.glb` registered
        (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`); wheels sit on rails;
        materials match the kit
  - [ ] Blades visibly flip to the chosen branch on alternation (short
        tween; instant snap under `prefers-reduced-motion`);
        event-driven, no per-frame cost outside the tween
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — commit `e7eb9be`
  - Verification Report (Phase 2): scope = recipe + GLB + renderer +
    ride tests; no new logic files. `CI=true pnpm test -- --coverage`
    → 34 files / 542 pass, 0 fixes needed. `tsc` + `biome` clean.
    Manual tablet gate (left-branch rails, blade flip, smooth ride, icon
    match) confirmed by the user.
  - [checkpoint: e7eb9be]

  Notes (Phase 2 implementation — commit `2257525`):
  - Asset: `scripts/blender-switch-mirror.py` — standalone deterministic
    recipe mirroring `blender-switch.py`. Through-road = kit straight
    unmoved; diverge = kit corner-small with a y-only flip (x-mirror of
    the right switch's x+y flip) onto the SW-pivot quarter-arc, ends on
    the south + west edge midpoints. Blades symmetric (shared verbatim);
    node names identical (`switch_blades` contract). Export +
    `verify_glb`: `switch-mirror.glb`, 63,264 bytes (~+4% vs the right
    switch's 60,748 — same uncompressed export path, float entropy),
    nodes + materials verified, 3 render checks produced
    (top / quarter / diverge-fit with the loco posed mid-arc at
    (-0.59, -2.59) and blades at +0.21).
  - Mounting: `PIECE_URLS['switch-mirror']` now points at the real
    `switch-mirror.glb` (same yaw 0, same `[0, -1, 2]` anchor — authored
    on the straight mount); stale "reuses the right-hand GLB" comments
    updated.
  - Blades: new `BLADE_DIVERGE_Y` per-hand record (`switch`: -0.21,
    `switch-mirror`: +0.21 — Blender +z arrives as glTF +y via
    export_yup, mirrored sign verified in the fit render); `setSwitchRoad`
    selects by `item.type`, merges still keep the last branch.
  - Ride: `ride-motion.ts` needed NO changes this phase — Phase 1's
    `isSwitchPiece` generalization already routes the mirror through the
    generic corner-style arc + `onSwitchRoad` choreography. Locked with
    5 new tests in `ride-motion.test.ts`: through line, SW-pivot diverge
    arc (r = CELL/2, pivot SW corner), rot-180 NW-pivot arc, plus a
    mirrored-Y alternation ride (poses on rails incl. reversals, west
    leg reached, announcements alternate north/west without chatter).
  - Gates: `tsc --noEmit` clean, `biome check` clean,
    `CI=true pnpm test -- --coverage` → 34 files / 542 tests pass
    (537 + 5 new); `switches.ts` stays 100/100/100/100. Scope
    (`git diff --name-only f2efbc8..HEAD`): recipe script, new GLB,
    `track-renderer.ts`, `ride-motion.test.ts` — no new logic-bearing
    files (renderer is scene/non-logic per workflow, verified via
    tests-where-logic-bearing + manual/e2e).

## Phase 3 - E2E, Docs & Final Gates

- [x] Task: Playwright e2e (extend `e2e/switches.spec.ts` or new
  `e2e/switch-mirror.spec.ts`) — commit `3433767`
  - [x] Tablet + phone profiles: place a symmetric mirrored
        double-loop via the dev handle, ride, assert both branches
        ridden (alternation), reload restores the layout, zero external
        requests, clean console
- [x] Task: Docs — CHANGELOG (parent-voice), `product.md` roadmap
  strike, `tech-stack.md` asset list + authoring reference — commit `210a90b`
  - [ ] CHANGELOG Unreleased: parent-voice mirror entry (left-hand Y,
        two ways out, blades flip, normal speed, old saves unchanged)
  - [ ] product.md: roadmap strikes left-mirror as shipped
  - [ ] tech-stack.md: asset tree + recipe list gain the mirror GLB /
        recipe; authoring notes keep the `switch_blades` contract
- [x] Task: Final gates — `pnpm check` (biome + tsc + vitest),
  coverage report on new core logic, full Playwright run
  (commits `3433767` e2e spec, `210a90b` docs, `eaeaa13` biome format,
  `8b3788d` drawer-count ripple)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (Phase 3): scope = new e2e spec + drawer-count
    ripple + docs; no new logic files. `pnpm check` → biome clean,
    tsc clean, 34 files / 542 vitest pass. Coverage record from
    Phase 1 stands (`switches.ts` + `pieces.ts` 100%, `pathing.ts`
    lines 99.31 = baseline). Full Playwright (tablet + phone):
    86 passed, 1 flaky-then-green with `--retries=1`, exit 0; the
    flake class (parallel-load timing, rotating victims) was proven
    pre-existing via a full-suite run on clean `main`. One fix used
    of two (drawer count 6 → 7). Manual tablet gate (7th toy, snap /
    red ghost, alternation + blade flips, reload, old saves)
    confirmed by the user.
  - [checkpoint: 3fc37f7]
- [ ] Task: Review & archive (`conductor-review`), PR, merge

  Notes (Phase 3 implementation — commits `3433767`, `210a90b`,
  `eaeaa13`, `8b3788d`):
  - E2E: new `e2e/switch-mirror.spec.ts` (commit `3433767`) — mirrored-Y
    double-loop via the dev handle, both branches asserted ridden
    (alternation), reload restores the layout, zero external requests,
    clean console; also asserts `switch-mirror.glb` IS fetched. A
    negative assertion (right-hand `switch.glb` must NOT load) failed:
    the renderer precaches a template for EVERY piece type at boot
    (`track-renderer.ts` line ~712), so all GLBs always load — by design
    (one precached GLB per type). Assertion corrected, not the code.
  - Ripple: the adventure drawer now holds 7 toys, so the hardcoded
    `adventure: 6` count in `e2e/ride-toybox-flow.spec.ts` was updated
    to 7 (commit `8b3788d`); biome format fix in the new spec
    (`eaeaa13`). One fix used of the two-fix budget.
  - Flakes: full-suite runs showed single-victim timing flakes under
    default parallel workers (ride-toybox, starter-railway, gallery,
    smoke — a different victim each run, each passing in isolation).
    Baseline proof: full suite on clean `main` (via a temporary
    worktree, since removed) also flaked (smoke tablet). Pre-existing
    suite flakiness, not a regression. Final gate run with
    `--retries=1` (CLI flag only, no config change): 86 passed,
    1 flaky-then-green, exit 0.
  - Env incident: `node_modules/.bin` vanished mid-track (likely the
    baseline worktree's junction teardown cascading into the repo, or
    the parallel wagon-workshop session); recovered with a clean
    `Remove-Item node_modules` + `pnpm install`. Lesson: never junction
    `node_modules` into a worktree — run `pnpm install` there instead.
  - Docs (commit `210a90b`): CHANGELOG Unreleased parent-voice entry,
    product.md roadmap left-mirror shipped note, tech-stack.md asset
    tree + recipe list + authoring reference (per-hand blade angles
    −0.21 / +0.21).
  - Gates: `pnpm check` fully green (biome + tsc + 34 files / 542
    vitest). No new core-logic files this phase, so the Phase 1
    coverage record stands (`switches.ts` + `pieces.ts` 100%,
    `pathing.ts` lines 99.31 = pre-track baseline).

## Phase: Review Fixes
- [x] Task: Apply review suggestions 04911ff
