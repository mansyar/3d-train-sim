# Plan — Double-Slip Switch

Implementation follows `conductor/workflow.md`. Logic-bearing tasks
(`src/core/*`) are TDD: failing tests first, then minimum implementation.

## Phase 1: Core Routing Logic (TDD)

- [ ] Task: Write failing unit tests for `switch-slip` routing
  - [ ] `src/core/switches.test.ts`: `routeSwitch` mod-3 cycle (straight →
        right → left) for `switch-slip`, all four entry directions, rotation
        variants, counter wrap, cap fallback contract
  - [ ] `src/core/pathing.test.ts`: `walkAlternating` rides a 4-way slip loop
        taking all three roads in order; step-cap fallback; multi-train
        components containing a slip
  - [ ] `src/core/pieces.test.ts`: catalog entry with 4 crossing-style
        endpoints, rotations
- [ ] Task: Implement `switch-slip` in core (`pieces.ts`, `switches.ts`,
      `pathing.ts`)
- [ ] Task: Refactor pass + verify coverage (`CI=true pnpm test --
      --coverage` >80% on new core code)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
