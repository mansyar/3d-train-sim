# Plan — Switchyard: Three-Way Junction & Motorized Levers

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, scene wiring, e2e) are verified via
> render/verify gates, Playwright smoke, and manual verification. Track branch:
> `track/switchyard_20260913`.

## Phase 1 — Pure logic (TDD, `src/core`)

- [x] **Task: `switch-3way` catalog entry (tests first in `pieces.test.ts`, `track-graph.test.ts`, `save.test.ts`, `drawer.test.ts`) (304907e)**
  - Expected behavior: `PIECE_TYPES` gains `switch-3way`; `BASE_ENDPOINTS` joins all four edges (stem south, exits north/east/west at yaw 0); endpoints rotate correctly through all four yaws; dry land only (ghost red over water); save round-trip restores it and pre-track snapshots load unchanged (no version bump); drawer maps it to the Adventure tab; `toy-icons.ts` gains its hand-drawn three-road SVG (+ any icon-completeness tests); renderer placeholder maps (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS` → straight GLB until Phase 2, the mirror precedent).
  - [x] Red: failing tests — endpoints at all rotations, dry-land rule, save round-trip, drawer mapping
  - [x] Green: catalog + `drawer.ts` + `toy-icons.ts` + renderer placeholder maps (icon look seen in the phase's manual verification)
  - [x] Verify: tests green, `tsc --noEmit` clean, coverage maintained

  Notes:
  - Red confirmed with exactly 12 failing tests across the four files (693 passing), each failing for the missing piece — no unrelated failures.
  - Green: `PIECE_TYPES` + `BASE_ENDPOINTS` (`['north','east','south','west']`) in `pieces.ts`; `TAB_FOR_KIND` entry in `drawer.ts`; straight-GLB placeholder maps in `track-renderer.ts`; `PIECE_LABELS` + a two-branch three-road SVG in `toy-icons.ts`.
  - Gates: biome (156 files) + `tsc --noEmit` clean; 705/705 vitest; coverage — `pieces.ts` 100%, `track-graph.ts` 96.3%, `drawer.ts` 100%, `save.ts` 91.6%.
- [x] **Task: Three-road routing in pure `switches.ts` (TDD: `switches.test.ts`) (7b045d6)**
  - Expected behavior: stem entry cycles straight → right (east) → left (west) on a 0|1|2 counter, first pass straight; any branch entry merges to the stem without moving the counter; reverse shuttling follows the same entry-based rules; the two Y switches stay byte-for-byte unchanged; the counter is session-only (never serialized).
  - [x] Red: truth tables across all four rotations, counter folds, branch merges, Y-switch regression locks
  - [x] Green: extend `SwitchPieceType` / `isSwitchPiece` / routing to the third piece
  - [x] Verify: `switches.ts` coverage, gates clean

  Notes:
  - Red confirmed with exactly 8 failing tests (14 passing) in `switches.test.ts`; every failure came from the missing routing arm (`DIVERGE_EDGE['switch-3way']` undefined → wrong exits), no unrelated failures.
  - Green: `SwitchPieceType` widened to the three pieces; `isSwitchPiece` covers all three; `nextThreeWayBranch` cycles straight → right → left on `counter % 3`; `routeSwitch` gained a four-end arm (stem cycles 0|1|2, every branch entry merges to the stem with the counter unchanged); `DIVERGE_EDGE` narrowed to the two Y pieces plus a new `THREE_WAY_EDGES` map.
  - Ripple: widening the union forced `BLADE_DIVERGE_Y` record completeness in `track-renderer.ts` — added an interim `'switch-3way': -0.21` pose, inert until the authored GLB (the placeholder loads the straight GLB, which has no `switch_blades` node, so `setSwitchRoad` fails soft). Phase 3 replaces it with the three-pose table.
  - Gates: biome + `tsc --noEmit` clean; 714/714 vitest; `switches.ts` coverage 100%.
- [x] **Task: Solver coverage for three-road topologies (TDD: extend `pathing.test.ts`) (2673072)**
  - Expected behavior: three-road cycles ride as one periodic walk covering all roads; dead-end spurs shuttle; 3-way + Y chains compose; deterministic under any input order; frozen fallback unchanged.
  - [x] Red: three-road topology fixtures + expected periodic walks
  - [x] Green: extend the live-counter walk to the new type (mirror precedent — likely via `isSwitchPiece`; tests lock it)
  - [x] Verify: full suite green, no regressions

  Notes:
  - No `pathing.ts` changes needed — the walk already routes any `isSwitchPiece` through live counters, so the three-way joined automatically (the mirror precedent); the new tests lock the behavior.
  - Locks: lone three-way exact 6-step cycle (W→S / S→N / N→S / S→E / E→S / S→W — all three roads per lap); stem + straight dead-end topology exact 14-step lap covering straight → right → left; 3-way + Y chain periodic across every branch; determinism under reversed input order.
  - Slice note: the returned walk starts at the first repeated full state (piece|entry|counters), so the chain fixture yields a two-rotation cycle — its test locks the straight/right/left chunk pattern rather than a single rotation.
  - Gates: biome + `tsc --noEmit` clean; 717/717 vitest; coverage — `pathing.ts` 97.7% statements / 90.5% branches, `switches.ts` 100%.
- [ ] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

## Phase 2 — Blender assets (non-logic; render/verify gated)

**Gate 2.1 — authoring contract (mount = the kit straight module; occupant = loco at ride ×1.6):**

- Mount: 4-unit module (rail bed 1.0 wide, rails crown 0.1); the lever sits clear of the rail bed and the loco envelope (loco ≈ 2.3 wide × 2.7 tall at ride ×1.6) and reads at tablet distance.
- Node contract: `switch_blades` on all three GLBs (right −0.21 / mirror +0.21 unchanged; 3-way 0 straight / −0.21 east / +0.21 west); new `switch_lever` exactly once per GLB; its swing authored about Blender +z (arrives as glTF +y — the blades precedent) so the renderer tweens `rotation.y`.
- Gates: deterministic re-runs; `verify-glb.py` (skill-bundled) + palette check; ≤ ~150 KB per GLB; renders inspected.

- [ ] **Task: Three-way recipe (`scripts/blender-switch-3way.py` → `public/assets/train-kit/switch-3way.glb`)**
  - Expected behavior: kit straight unmoved (through road) + one corner-small arc flipped into each quarter-arc (east like `blender-switch.py`, west like `blender-switch-mirror.py`), plus blades and lever to the contract above.
  - [ ] Recipe with `build_*`/`render_checks`/`export_*`/`verify_glb` structure, z-up, `export_yup=True`, named double-sided Principled materials, REPO from `__file__`
  - [ ] Renders viewed: top, quarter, fit-with-loco-at-×1.6 (blades at 0 / −0.21 / +0.21; lever poses), style check vs accepted switches
  - [ ] `verify-glb.py --max-kb 150 --require switch_blades --require switch_lever` passes; exported to `public/assets/train-kit/`
- [ ] **Task: Lever re-cuts for the Y recipes (`blender-switch.py`, `blender-switch-mirror.py`)**
  - Expected behavior: both GLBs gain the same `switch_lever` node; blades/through geometry unchanged; re-rendered and re-verified.
  - [ ] Add lever geometry + node to both recipes; deterministic re-export
  - [ ] Verify both: node contracts + sizes + renders; existing blade angles intact
- [ ] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

## Phase 3 — Scene wiring (non-logic; smoke/manual verified)

- [ ] **Task: Renderer mounting + blade/lever tween (`track-renderer.ts`)**
  - Expected behavior: `switch-3way` maps to the real GLB (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`, mount `[0, -1, 2]` like its siblings); `setSwitchRoad` moves **blades and lever together in one tween** — per-type pose tables (2 poses on Y switches, 3 on the 3-way), merges keep the last road, reduced motion snaps, a missing `switch_lever` fails soft (blades animate as today); event-driven, no per-frame cost outside the tween.
  - [ ] Implement; dev-check each piece's poses in the running app
  - [ ] Verify: no per-frame allocations; dispose chain covers the tween maps
- [ ] **Task: Ride geometry + road announcements for the 3-way (extend `ride-motion.test.ts` where logic-bearing)**
  - Expected behavior: the straight road rides straight; east/west roads ride the corner-small quarter arcs (the arcs the Y switches share); `onSwitchRoad` announces the chosen exit; wagons follow; alternation reachable on rails.
  - [ ] Red/verify tests: segment lookups for through + both arcs (rotated), alternation ride covering all three roads
- [ ] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

## Phase 4 — E2E, docs & final gates

- [ ] **Task: Playwright smoke (`e2e/switch-3way.spec.ts` + drawer-count ripple)**
  - Expected behavior: tablet + phone — seed a three-way layout via the dev handle, ride it, witness all three roads taken across passes with blades + lever poses following; reduced-motion snap; reload restores the layout; zero console errors; zero external requests; `switches.spec.ts` / `switch-mirror.spec.ts` stay green. Adventure drawer count 7 → 8 in `e2e/ride-toybox-flow.spec.ts` (+ any other hardcoded counts the new piece touches).
  - [ ] Write spec; run tablet + phone profiles; update rippled counts
- [ ] **Task: Docs — CHANGELOG (parent voice), `product.md` roadmap (levers ✅ + 3-way ✅; double-slip remains), `tech-stack.md` recipe list + `switch_lever` contract**
- [ ] **Task: Full quality gates + manual verification (`pnpm check`, full Playwright, coverage report, tablet Toddler Test)**
- [ ] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

## Notes
