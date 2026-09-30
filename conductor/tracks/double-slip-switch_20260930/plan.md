# Plan — Double-Slip Switch

Implementation follows `conductor/workflow.md`. Logic-bearing tasks
(`src/core/*`) are TDD: failing tests first, then minimum implementation.

## Phase 1: Core Routing Logic (TDD) [checkpoint: 0ce1614e4953083df36ba9e2ab78aa0316b1c0f0]

- [x] Task: Write failing unit tests for `switch-slip` routing
  - [x] `src/core/switches.test.ts`: `routeSwitch` mod-3 cycle (straight →
        right → left) for `switch-slip`, all four entry directions, rotation
        variants, counter wrap, cap fallback contract
  - [x] `src/core/pathing.test.ts`: `walkAlternating` rides a 4-way slip loop
        taking all three roads in order; step-cap fallback; multi-train
        components containing a slip
  - [x] `src/core/pieces.test.ts`: catalog entry with 4 crossing-style
        endpoints, rotations

  Notes: 13 new tests across the three suites (8 in switches.test.ts incl. a
  total/self-consistent rotation table, 3 geometry tests in pieces.test.ts,
  3 in pathing.test.ts). Red confirmed first: all 13 failed on the missing
  `switch-slip` type, zero existing failures. The pathing dead-end test
  asserts the invariant the layout actually guarantees — the exit sequence
  cycles straight → right → left on every pass (each entry's counter phase
  is fixed by the cycle, so per-entry road sets are not the right
  assertion). Commit f8d76f5.
- [x] Task: Implement `switch-slip` in core (`pieces.ts`, `switches.ts`,
      `pathing.ts`)

  Notes: pieces.ts catalog entry (four edges, like the crossing); switches.ts
  widens `SwitchPieceType` + `isSwitchPiece` and adds `slipExitBase` + the
  slip branch in `routeSwitch` — no stem, every pass advances the counter
  (mod 3), straight = opposite edge, right/left = driver's quarter turns of
  the inward heading. pathing.ts needed no code change: the frozen
  straight-through fallback already routes the slip straight at counter 0;
  only doc comments updated (state space now "2 or 3 counters per
  junction"). Commit f8d76f5.
- [x] Task: Refactor pass + verify coverage (`CI=true pnpm test --
      --coverage` >80% on new core code)

  Notes: no refactor needed — the slip branch reuses `nextThreeWayBranch`
  (same mod-3 vocabulary). Coverage: switches.ts and pieces.ts 100% (v8
  reporter omits fully-covered files), pathing.ts 97.67% stmts (line 233 is
  the pre-existing step-cap fallback). Also ran the full gates: 736/736
  tests, tsc clean, Biome clean. Commit f8d76f5.

  Deviation note: the new `PieceType` broke exhaustive `Record<PieceType, …>`
  maps outside core (drawer.ts, track-renderer.ts, toy-icons.ts), so the
  minimal wiring landed early to keep the repo compiling at commit time:
  drawer Adventure-tab entry (+ test updates, catalog count 18 → 19),
  renderer yaw/anchor/URL entries, and an empty `SWITCH_POSES['switch-slip']`
  that fails soft until Phase 3 adds entry-aware blade/lever poses (one exit
  edge is reachable by two roads, so exit-keyed poses are ambiguous). The
  drawer-tab and renderer tasks in Phase 3 now cover the remaining polish
  (icon was drafted with the catalog entry; visual pass still pending).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 1): gates all green on the first run — 736/736
  tests across 40 files (incl. 13 new), coverage switches.ts/pieces.ts 100%
  and pathing.ts 97.67% stmts (>80% gate), `tsc --noEmit` clean, Biome
  clean. No fix attempts needed. Manual verification deferred by design:
  nothing user-visible yet (the GLB arrives in Phase 2, the hands-on ride
  check belongs to Phase 3's manual pass, as planned). User approved the
  checkpoint via the question tool.

## Phase 2: Blender Asset (`switch-slip.glb`)

- [ ] Task: Author `scripts/blender-switch-slip.py` via the
      `threejs-blender-asset` skill — 4-unit module mount, crossing bed +
      two diagonal crossings, `switch_blades` (3 poses) + `switch_lever`
      node contract
- [ ] Task: Export `public/assets/train-kit/switch-slip.glb` (≤ ~150 KB) +
      `verify_glb()` gate + real render fit check with the kit train
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Renderer & UI Wiring

- [ ] Task: `track-renderer.ts` — `PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`
      entries, blade flip + lever swing tweens, `switchPose` witness
      extension (acceptance criteria recorded in plan)
- [ ] Task: `drawer.ts` Adventure tab entry + `toy-icons.ts` SVG icon
      (acceptance criteria recorded in plan)
- [ ] Task: Manual/verification pass — place from drawer, rotate, ride
      through all three roads, reduced-motion freeze
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: E2E & Docs

- [ ] Task: `e2e/switch-slip.spec.ts` — place the slip, ride ≥3 passes
      asserting all three roads via witnesses, reload persistence, clean
      console
- [ ] Task: Docs — retire the roadmap item in `conductor/product.md`,
      CHANGELOG `[Unreleased]` entry
- [ ] Task: Full gate run (`biome` + `tsc` + Vitest + Playwright)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
