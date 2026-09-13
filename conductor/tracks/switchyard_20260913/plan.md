# Plan — Switchyard: Three-Way Junction & Motorized Levers

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, scene wiring, e2e) are verified via
> render/verify gates, Playwright smoke, and manual verification. Track branch:
> `track/switchyard_20260913`.

## Phase 1 — Pure logic (TDD, `src/core`)

- [ ] **Task: `switch-3way` catalog entry (tests first in `pieces.test.ts`, `track-graph.test.ts`, `save.test.ts`, `drawer.test.ts`)**
  - Expected behavior: `PIECE_TYPES` gains `switch-3way`; `BASE_ENDPOINTS` joins all four edges (stem south, exits north/east/west at yaw 0); endpoints rotate correctly through all four yaws; dry land only (ghost red over water); save round-trip restores it and pre-track snapshots load unchanged (no version bump); drawer maps it to the Adventure tab; `toy-icons.ts` gains its hand-drawn three-road SVG (+ any icon-completeness tests); renderer placeholder maps (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS` → straight GLB until Phase 2, the mirror precedent).
  - [ ] Red: failing tests — endpoints at all rotations, dry-land rule, save round-trip, drawer mapping
  - [ ] Green: catalog + `drawer.ts` + `toy-icons.ts` + renderer placeholder maps (icon look seen in the phase's manual verification)
  - [ ] Verify: tests green, `tsc --noEmit` clean, coverage maintained
- [ ] **Task: Three-road routing in pure `switches.ts` (TDD: `switches.test.ts`)**
  - Expected behavior: stem entry cycles straight → right (east) → left (west) on a 0|1|2 counter, first pass straight; any branch entry merges to the stem without moving the counter; reverse shuttling follows the same entry-based rules; the two Y switches stay byte-for-byte unchanged; the counter is session-only (never serialized).
  - [ ] Red: truth tables across all four rotations, counter folds, branch merges, Y-switch regression locks
  - [ ] Green: extend `SwitchPieceType` / `isSwitchPiece` / routing to the third piece
  - [ ] Verify: `switches.ts` coverage, gates clean
- [ ] **Task: Solver coverage for three-road topologies (TDD: extend `pathing.test.ts`)**
  - Expected behavior: three-road cycles ride as one periodic walk covering all roads; dead-end spurs shuttle; 3-way + Y chains compose; deterministic under any input order; frozen fallback unchanged.
  - [ ] Red: three-road topology fixtures + expected periodic walks
  - [ ] Green: extend the live-counter walk to the new type (mirror precedent — likely via `isSwitchPiece`; tests lock it)
  - [ ] Verify: full suite green, no regressions
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
