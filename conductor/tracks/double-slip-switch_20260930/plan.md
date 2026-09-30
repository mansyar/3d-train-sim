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

## Phase 2: Blender Asset (`switch-slip.glb`) [checkpoint: 29c7bf5b9d6180942dc583276b0d48e9fcbecc32]

Mount measurement table (Gate 1.1, from tech-stack + blender-switch-3way.py
+ kit GLB sizes, recorded before authoring):

| Item | Value | Source |
|---|---|---|
| Module | 4 units; bed Blender y −4..0, x ±2; cell centre (0,−2) | 3-way recipe / tech-stack |
| Mat / ride plane | ground z = −1, ride plane 0.1 above; KIT_ANCHORS [0,−1,2] | recipe + renderer |
| Edge midpoints | N (0,0), E (2,−2), S (0,−4), W (−2,−2) | 3-way recipe |
| Through roads | kit `railroad-crossing.glb` mesh (N–S + E–W, proper diamond), same straight mount | renderer BASE_YAW/KIT_ANCHORS |
| Quarter arcs (r=2) | NE centre (2,0), NW (−2,0), SE (2,−4), SW (−2,−4) | derived from corner-flip algebra |
| Arc transforms | NW = native corner as-imported; NE = native rot −90° about cell centre; SE = rot 180°; SW = native y-mirrored (baked copy) — 3 rotations share one mesh, 1 baked mirror | derived & verified against 3-way diverge transforms |
| Blades | 4 groups (one per entry edge), heels 0.38 inside each edge midpoint (S (0,−3.62), N (0,−0.38), E (1.62,−2), W (−1.62,−2)), bar geometry identical to 3-way (±0.16 offset, rise 0.06, z −0.95); δ=0 = straight-aligned | 3-way BLADE_* constants |
| Blade pose signs | south: δ −0.21 → SE, +0.21 → SW; north: −0.21 → NW, +0.21 → NE; east: −0.21 → NE, +0.21 → SE; west: −0.21 → SW, +0.21 → NW (frame-rotation symmetry of the 3-way convention) | derived |
| Lever | `switch_lever` pivot (−1.78,−0.5), 3-way geometry verbatim; clearance to nearest curve (NW arc) 1.45 > 1.23 loco envelope; arm swing tip stays clear | 3-way LEVER_* constants + distance check |
| Occupant | kit locomotive ×1.6 ≈ 2.3-wide envelope; fit renders on the NE (rotation-instanced) and SW (mirrored) arcs | 3-way fit-check pattern |
| Budget | unique meshes ≈ crossing + 2 corner copies + 8 bars + lever parts; kit sizes (3-way 88 KB w/ 3 meshes) → estimate ~100–120 KB ≤ 150 KB | kit GLB sizes |

- [x] Task: Author `scripts/blender-switch-slip.py` via the
      `threejs-blender-asset` skill — 4-unit module mount, crossing bed +
      two diagonal crossings, `switch_blades` (3 poses) + `switch_lever`
      node contract

  Notes: recipe mirrors blender-switch-3way.py; through roads = the kit
  railroad-crossing mesh (`switch_cross`) on the straight mount; four
  quarter-arcs from the kit corner mesh — NW as-imported, NE rot −90° and
  SE rot 180° share the centred native mesh (linked duplicates), SW gets a
  baked y-mirrored copy. FOUR blade groups (south keeps the legacy
  `switch_blades` contract node; north/east/west siblings), each
  straight-aligned at export with the 3-way's bar geometry; per-group pose
  signs documented in the recipe. Lever = 3-way verbatim at (−1.78,−0.5),
  re-measured clear of the new NW arc (1.45 > 1.23 loco envelope). Two
  recipe bugs found and fixed while shooting fit renders: the NE shot
  hardcoded the 3-way's tangent (now derived from ARC_CHECKPOINTS), and
  glTF-imported roots ignore euler rotation (quaternion rotation_mode) so
  fit shots compose the yaw against the captured import quaternion.

- [x] Task: Export `public/assets/train-kit/switch-slip.glb` (≤ ~150 KB) +
      `verify_glb()` gate + real render fit check with the kit train

  Notes: exported 120,808 bytes (≤ 150 KB); skill verify-glb.py RESULT:
  PASS (20 named nodes, 13 meshes, 4 materials, contract nodes
  `switch_blades` + `switch_lever` present; the reported extents
  x=4/z=6/y=1.84 are the tool's documented raw-accessor caveat — node
  translations are not composed — true world bounds proven by renders).
  Renders viewed: top (all four arcs flush at the edge midpoints, blades
  at all four edges), quarter, lever close-up (arm clear of all curves),
  and loco fits on the NE (rotation-instanced) and SW (mirrored) arcs —
  seated on the sleeper line, no clipping. Palette Layer 1: PASS vs the
  shipped 3-way rendered in the same check env (5/5 colors, dist 0).
  Vision Layer 2: PASS — 5/5 on all rubric lines; reads as a 4-way
  intersection switch. Layer 3: user accepted the asset via the question
  tool.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 2): verify-glb.py exit 0 (size, node
  contract, hygiene); palette match exit 0; vision rubric PASS; fit
  renders viewed and accepted; no code gates needed (recipe/asset only).
  One fix attempt each on the NE fit shot (tangent) and the loco rotation
  (quaternion) — both resolved in the recipe, no stop-and-ask needed.
  User approved the checkpoint via the question tool.

## Phase 3: Renderer & UI Wiring [checkpoint: 6b378c37149975e8ab4df4057d965dfa36db8f00]

- [x] Task: `track-renderer.ts` — `PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`
      entries, blade flip + lever swing tweens, `switchPose` witness
      extension (acceptance criteria recorded in plan)

  Notes: PIECE_URLS/BASE_YAW/KIT_ANCHORS landed with the Phase 1
  compile-fix pass. Entry-aware posing: ride-motion's `onSwitchRoad` now
  carries the entry edge (`switchRoads` entries gain `entry`; the
  once-per-change road key includes it so a different entry re-announces),
  the fleet passes it through, and `setSwitchRoad(pieceId, exit, entry?)`
  poses the slip's ENTRY blade group from SLIP_BLADES (per-entry blade
  angles, 0 = straight) while SLIP_LEVERS points the lever along the exit
  (north 0 / east −90° / south 180° / west +90°). The `switchPose`
  witness takes an optional entry to read that group. The slip asset was
  re-exported (121,208 bytes) with each group's bars BAKED at its
  orientation so all group nodes rest at 0 — the renderer's pose writes
  would otherwise destroy the rest rotations; the pose signs were settled
  empirically with a ±0.6 top-view A/B on the shipped 3-way (bar TOPS
  lean toward the chosen road's tangent), confirming the recipe's
  documented contract. Gates: biome clean, tsc clean, 736/736 tests.
  Commit 4e8df87.

- [x] Task: `drawer.ts` Adventure tab entry + `toy-icons.ts` SVG icon
      (acceptance criteria recorded in plan)

  Notes: completed during Phase 1's compile-fix pass so the repo kept
  compiling against the exhaustive Record maps — 'switch-slip' maps to
  the Adventure tab after the other switches; label "Double-slip switch
  track piece"; icon SVG shows the crossing plus the steel diagonal X;
  drawer tests updated (kinds list, catalog count 19, tabForKind).
  Covered by the Phase 1 test run.
- [x] Task: Manual/verification pass — place from drawer, rotate, ride
      through all three roads, reduced-motion freeze

  Notes: Deviation (documented): the e2e harness IS the practical
  in-app browser verification, so `e2e/switch-slip.spec.ts` was authored
  now (Phase 4 Task 1 pulled forward) and its green run plus an in-app
  screenshot form this pass; commit d390239. Six tests across the tablet
  and phone projects: the placed slip loads its own GLB, all four entry
  blade groups witness, the ride cycles all three roads with settled
  blade+lever pairings witnessed per road, reduced motion shows only
  exact road poses (never partial angles), and a reload restores the
  piece parked at neutral — with zero console errors and zero external
  requests. Two test-contract corrections came out of red runs: (1) the
  lone-slip layout is required — a through-line locks each entry's
  counter phase so single-entry sampling can never see all three roads;
  sampling spans all four entry groups with settled-pairing semantics
  (the lever is one global node, so only the just-announced entry's
  snapshot pairs); (2) rides still announce under reduced motion and
  poses snap, so the freeze contract is exact road poses, not a
  parked-neutral pose. In-app ground-contact check (skill Gate 5.1): a
  dev-server screenshot with the slip placed on dry land shows the piece
  seated flush on the grass — no float, no sink — lever proud at the NW
  corner, rail ends meeting the cell edges. Placement correctly refused
  river cells. User approved the checkpoint via the question tool.

  Verification Report (Phase 3): biome clean, tsc clean, 736/736 unit
  tests, e2e 6/6 across tablet+phone (zero console errors, zero external
  requests), in-app ground-contact screenshot verified. One red e2e cycle
  (two contract corrections, documented above) — no product-code fixes
  were needed. Checkpoint SHA: 6b378c3.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: E2E & Docs

- [x] Task: `e2e/switch-slip.spec.ts` — place the slip, ride ≥3 passes
      asserting all three roads via witnesses, reload persistence, clean
      console

  Notes: pulled forward into Phase 3 (documented there) — the e2e run was
  the in-app verification harness. Commit d390239; 6/6 across tablet and
  phone.

- [x] Task: Docs — retire the roadmap item in `conductor/product.md`,
      CHANGELOG `[Unreleased]` entry

  Notes: product.md's switch roadmap bullet now records the double slip
  as shipped (track id + date) and notes the named roadmap is exhausted;
  CHANGELOG gains a parent-facing `[Unreleased]` Added entry (what it
  does, where to find it, saves stay compatible).
- [ ] Task: Full gate run (`biome` + `tsc` + Vitest + Playwright)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
