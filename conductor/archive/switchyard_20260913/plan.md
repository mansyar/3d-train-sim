# Plan — Switchyard: Three-Way Junction & Motorized Levers

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, scene wiring, e2e) are verified via
> render/verify gates, Playwright smoke, and manual verification. Track branch:
> `track/switchyard_20260913`.

## Phase 1 — Pure logic (TDD, `src/core`) [checkpoint: 2673072]

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
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

  Verification Report:
  - Automated: `CI=true pnpm test` → 40 files / 717 tests passed; `pnpm exec biome check .` clean (156 files); `pnpm exec tsc --noEmit` clean; coverage — `switches.ts` 100%, `pathing.ts` 97.7% stmts / 90.5% branch, `pieces.ts` / `drawer.ts` 100%, `track-graph.ts` 96.3%, `save.ts` 91.6%.
  - Manual: not run separately — the user accepted the automated evidence to record the checkpoint (the piece surfaces in the Adventure drawer; scene visuals remain placeholders until Phases 2–3).
  - Result: Phase 1 complete — 2026-09-14.

## Phase 2 — Blender assets (non-logic; render/verify gated) [checkpoint: 03022aa]

**Gate 2.1 — authoring contract (mount = the kit straight module; occupant = loco at ride ×1.6):**

- Mount: 4-unit module (rail bed 1.0 wide, rails crown 0.1); the lever sits clear of the rail bed and the loco envelope (loco ≈ 2.3 wide × 2.7 tall at ride ×1.6) and reads at tablet distance.
- Node contract: `switch_blades` on all three GLBs (right −0.21 / mirror +0.21 unchanged; 3-way 0 straight / −0.21 east / +0.21 west); new `switch_lever` exactly once per GLB; its swing authored about Blender +z (arrives as glTF +y — the blades precedent) so the renderer tweens `rotation.y`.
- Gates: deterministic re-runs; `verify-glb.py` (skill-bundled) + palette check; ≤ ~150 KB per GLB; renders inspected.

- [x] **Task: Three-way recipe (`scripts/blender-switch-3way.py` → `public/assets/train-kit/switch-3way.glb`) (40677a9)**
  - Expected behavior: kit straight unmoved (through road) + one corner-small arc flipped into each quarter-arc (east like `blender-switch.py`, west like `blender-switch-mirror.py`), plus blades and lever to the contract above.
  - [x] Recipe with `build_*`/`render_checks`/`export_*`/`verify_glb` structure, z-up, `export_yup=True`, named double-sided Principled materials, REPO from `__file__`
  - [x] Renders viewed: top, quarter, fit-with-loco-at-×1.6 (blades at 0 / −0.21 / +0.21; lever poses), style check vs accepted switches
  - [x] `verify-glb.py --max-kb 150 --require switch_blades --require switch_lever` passes; exported to `public/assets/train-kit/`

  Notes:
  - Built exactly as planned: through = kit straight unmoved; east/west arcs = corner-small flipped per the two Y recipes' own transforms; blades verbatim from the shared contract; the new `switch_lever` = ground pad + post + pointer arm in the north-west corner (clear of the rail bed and of the loco envelope at every pose), authored about Blender +z so the renderer tweens `rotation.y`.
  - One polish iteration: the first renders read the lever as thin/floating, so it was re-cut with a ground pad and chunkier post/arm/knob (pivot to −1.78) and a dedicated lever close-up shot was added to `render_checks`.
  - Gate evidence: `verify-glb.py --max-kb 150 --require switch_blades,switch_lever` → PASS (88,544 B ≈ 86.5 KB, 9 nodes, 5 materials); palette `--match` vs the accepted right-switch baselines → PASS at distance 0 (top + quarter); a re-run exported byte-identical (88,544 B) proving determinism; renders reviewed — top, quarter, lever close-up, both loco fit views at ×1.6 (wheels on the kit rails, nothing clipping; the odd NW shape in the top view was zoom-cropped and confirmed to be the lever's own shadow).
  - The 3-way GLB stays unreferenced until Phase 3 wiring (the renderer still maps the placeholder straight GLB).
  - Post-checkpoint hygiene fix (found during the Phase 3 dev-check): the export left the last render shot's angles baked on `switch_blades` / `switch_lever`; the recipe now parks both at neutral before exporting — GLB re-exported at 88,432 B, node rotations verified identity, byte-determinism re-proven, `verify-glb` PASS, palette distance 0.
- [x] **Task: Lever re-cuts for the Y recipes (`blender-switch.py`, `blender-switch-mirror.py`) (03022aa)**
  - Expected behavior: both GLBs gain the same `switch_lever` node; blades/through geometry unchanged; re-rendered and re-verified.
  - [x] Add lever geometry + node to both recipes; deterministic re-export
  - [x] Verify both: node contracts + sizes + renders; existing blade angles intact

  Notes:
  - Both recipes gained the shared `_lever` build (same constants — pad + post + arm, north-west pivot) and their export sets grew to the lever trio; blade geometry, transforms, and the ±0.21 poses are untouched.
  - Gate evidence: `verify-glb.py --max-kb 150 --require switch_blades,switch_lever` → PASS both (switch.glb 64,660 B ≈ 63.1 KB; switch-mirror.glb 67,180 B ≈ 65.6 KB; 8 nodes / 4 materials each with `lever_wood` present); palette `--match` vs the pre-lever accepted baselines → PASS at distance 0 on every view (top + quarter each; the lever's wood/steel tones sit inside the accepted palette); double re-runs exported byte-identical sizes for both recipes (deterministic); renders reviewed — the lever stands planted in the north-west grass clear of both roads, loco fit views clean.
  - Pre-lever baselines for the palette gate were captured by re-running both recipes unmodified first (byte-identical re-exports — `git status` proved the shipped GLBs untouched before the re-cut).
  - Post-checkpoint hygiene fix (shared with the three-way recipe): both exports previously carried the last shot's blade angle baked on `switch_blades` (−0.21 / +0.21); the recipes now park `switch_blades` / `switch_lever` at neutral first — re-exported switch.glb 64,604 B / switch-mirror.glb 67,124 B, node rotations identity, byte-determinism re-proven, `verify-glb` PASS, palette distance 0.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

  Verification Report:
  - Automated: `CI=true pnpm test` → 40 files / 717 tests passed; `pnpm exec biome check .` clean (156 files); `pnpm exec tsc --noEmit` clean; `verify-glb.py --max-kb 150 --require switch_blades,switch_lever` → PASS on all three GLBs (3-way 86.5 KB / switch 63.1 KB / mirror 65.6 KB); palette `--match` vs the accepted switch-family baselines → distance 0 on every view; every recipe re-ran byte-identical (deterministic).
  - Manual: user verified in the running app — the signal lever stands planted beside both Y switches, blades still flip as before, no clipping when trains pass (the 3-way model stays on its placeholder until Phase 3).
  - Result: Phase 2 complete — 2026-09-14.

## Phase 3 — Scene wiring (non-logic; smoke/manual verified) [checkpoint: 85ab2d7]

- [x] **Task: Renderer mounting + blade/lever tween (`track-renderer.ts`) (d730fda)**
  - Expected behavior: `switch-3way` maps to the real GLB (`PIECE_URLS`/`BASE_YAW`/`KIT_ANCHORS`, mount `[0, -1, 2]` like its siblings); `setSwitchRoad` moves **blades and lever together in one tween** — per-type pose tables (2 poses on Y switches, 3 on the 3-way), merges keep the last road, reduced motion snaps, a missing `switch_lever` fails soft (blades animate as today); event-driven, no per-frame cost outside the tween.
  - [x] Implement; dev-check each piece's poses in the running app
  - [x] Verify: no per-frame allocations; dispose chain covers the tween maps

  Notes:
  - Mounted the authored GLB: `PIECE_URLS` → `/assets/train-kit/switch-3way.glb`, `BASE_YAW` 0, `KIT_ANCHORS` `[0, -1, 2]` — placeholder comments replaced with the authored-file notes.
  - `setSwitchRoad` now resolves a `SWITCH_POSES` table (model edge → blade + lever angles; 2 poses per Y, 3 for the three-way) and tweens `switch_blades` and `switch_lever` together as one tween (a `targets` array on the existing single rAF loop); a missing `switch_lever` fails soft; merges keep the last road; reduced-motion / disposed snap; the dispose chain is unchanged — the same `bladeRaf` / `bladeTweens` names are still cancelled/cleared on teardown and deleted per-piece on removal.
  - Dev-check: a throwaway tablet Playwright run seeded straight + three-way + straight and rode 26 s — zero console errors, the piece mounts flush with all three roads (arcs diverge correctly around the through road), trains ride the arcs with wagons following, and the lever is planted on the grass. Screenshots reviewed, then the temp spec was deleted (the real `e2e/switch-3way.spec.ts` lands in Phase 4).
  - The dev-check surfaced the parked-pose export wart (fixed asset-side — see the Phase 2 note addenda): the fresh piece sat with the lever swung west because the last render shot's +90° was baked into the GLB.
  - Verify: no per-frame allocations added — the only per-frame work remains the existing spread over `bladeTweens` while a 180 ms tween is live (pre-existing pattern), and the `targets` arrays are built event-driven. Dispose chain confirmed by inspection above.
  - Gates: biome (156 files) + `tsc --noEmit` clean; 717/717 vitest; the two existing switch e2e specs stay green (tablet, 4 passed).
- [x] **Task: Ride geometry + road announcements for the 3-way (extend `ride-motion.test.ts` where logic-bearing) (85ab2d7)**
  - Expected behavior: the straight road rides straight; east/west roads ride the corner-small quarter arcs (the arcs the Y switches share); `onSwitchRoad` announces the chosen exit; wagons follow; alternation reachable on rails.
  - [x] Red/verify tests: segment lookups for through + both arcs (rotated), alternation ride covering all three roads

  Notes:
  - No `ride-motion.ts` changes needed — the switch machinery is generic (`isSwitchPiece` drives both the chosen-road segment pivot and the per-segment road announcements), so the three-way joined automatically (the mirror precedent); the tests lock it.
  - Segment locks: through road straight; south-to-east on the SE pivot / south-to-west on the SW pivot (radius half a cell — the kit corner-small arcs); rotated 180° keeps north-to-east / north-to-west on the NE / NW corners and north-to-south straight.
  - Ride locks: the solver-test three-way layout rides 75 s with engine + wagon always on the solved cycle (both branches and every dead-end reversal), reaches beyond all four edges of the piece's cell, and rests at turnarounds; the announcement stream contains all three exits with no consecutive repeats (no chatter).
  - Gates: biome (156 files) + `tsc --noEmit` clean; 723/723 vitest (43 in the file, up from 37).
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

  Verification Report:
  - Automated: `pnpm exec biome check .` clean (156 files); `pnpm exec tsc --noEmit` clean; `CI=true pnpm test` → 40 files / 723 tests passed; `pnpm exec playwright test e2e/switches.spec.ts e2e/switch-mirror.spec.ts --project=tablet` → 4 passed (no console errors; environmental WebGL shadow-map warnings only).
  - Manual: in-app dev-check ride (straight + three-way + straight seeded on tablet): the piece mounts its authored GLB flush with its neighbours, the train takes all three roads with wagons following and no clipping, the lever reads planted beside the track; the parked-pose wart surfaced during the check was fixed asset-side (neutral re-export, Phase 2 addendum). User confirmed the checkpoint from the automated evidence (2026-09-14).
  - Result: Phase 3 complete — 2026-09-14.

## Phase 4 — E2E, docs & final gates [checkpoint: 0444aa1]

- [x] **Task: Playwright smoke (`e2e/switch-3way.spec.ts` + drawer-count ripple) (2e227bb)**
  - Expected behavior: tablet + phone — seed a three-way layout via the dev handle, ride it, witness all three roads taken across passes with blades + lever poses following; reduced-motion snap; reload restores the layout; zero console errors; zero external requests; `switches.spec.ts` / `switch-mirror.spec.ts` stay green. Adventure drawer count 7 → 8 in `e2e/ride-toybox-flow.spec.ts` (+ any other hardcoded counts the new piece touches).
  - [x] Write spec; run tablet + phone profiles; update rippled counts

  Notes:
  - Probe: added `switchPose(pieceId)` to the scene handle (`track-renderer` + `init-scene`, exposed through the dev-only window handle) returning the live point-blade + signal-lever angles. The ride test samples it across passes to witness all three roads (blade 0 / −0.21 / +0.21) with paired lever angles (0 / −90° / +90°) — both nodes always settle in the same frame.
  - Reduce-motion deviation: `src/scene/spin-loop.ts` intentionally renders a single static frame under `prefers-reduced-motion` (no frame loop at all), so under reduce a ride can never move and the blade/lever snap path cannot be exercised end to end. The spec instead witnesses the real contract: the piece loads, the ride toggle still flips state, and the points stay exactly parked at neutral (no partial angles, no motion), console clean. The snap branch stays in `track-renderer` as the defensive path. (Observation for a future track: reduce users currently get a fully static scene.)
  - Reload test doubles as the export-side park-fix witness: after a reload the three-way re-imports with blades closed and the lever pointing north (exactly 0/0), then rides again.
  - Drawer ripple: adventure 7 → 8 in `e2e/ride-toybox-flow.spec.ts` (count + swipe comment); no other spec enumerates the piece.
  - Gates: biome (157 files) + `tsc --noEmit` clean; `pnpm exec playwright test e2e/switch-3way.spec.ts` tablet + phone → 6 passed (1.2 m, zero console errors, zero external requests).
- [x] **Task: Docs — CHANGELOG (parent voice), `product.md` roadmap (levers ✅ + 3-way ✅; double-slip remains), `tech-stack.md` recipe list + `switch_lever` contract (5a38b3d)**

  Notes:
  - `CHANGELOG.md` — Unreleased/Added entry in the parent voice ("A three-way junction — and a little signal lever on every switch.").
  - `conductor/product.md` — switch roadmap line: three-way + motorized levers marked ✅ shipped (switchyard_20260913, 2026-09-14); the remaining roadmap item is now double-slip pieces only.
  - `conductor/tech-stack.md` — folder tree lists the switchyard trio (`switch.glb` + `switch-mirror.glb` + `switch-3way.glb`) and `blender-switch-3way.py`; the authoring section documents the three-way recipe and the shared `switch_lever` node contract (wooden signal lever, steel arm swung 0 / ∓90° in the same tween as the blades).
- [x] **Task: Full quality gates + manual verification (`pnpm check`, full Playwright, coverage report, tablet Toddler Test) (0444aa1)**

  Notes:
  - `pnpm check` (biome + `tsc --noEmit` + vitest): clean — biome 157 files, 40 files / 723 tests passed.
  - Coverage (`CI=true pnpm test -- --coverage`): `switches.ts` 100%, `pieces.ts` 100%, `drawer.ts` 100%, `pathing.ts` 97.7% stmts / 90.5% branch, `track-graph.ts` 96.3%, `save.ts` 91.6% — all logic modules above the 80% bar.
  - Full Playwright suite (tablet + phone + prod): first run 136 passed / 1 failed — the reload probe raced the async GLB import (probe read null right after `__tinyTracksReady`); hardened with `expect.poll` before asserting the parked pose (0444aa1), after which the full suite passed 137/137 (11.8 m).
  - Manual: user played the three-way on the family tablet — lever points straight → right → left on successive passes, reload keeps the layout parked at neutral; Toddler Test accepted. Confirmed 2026-09-14.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

  Verification Report:
  - Automated: `pnpm check` clean (biome 157 files, tsc, 723/723 vitest); coverage report on target (switches 100%, pathing 97.7/90.5, pieces 100%, drawer 100%, track-graph 96.3%, save 91.6%); full Playwright 137/137 across tablet + phone + prod (11.8 m) after the reload-probe hardening.
  - Manual: three-way junction + signal levers played on the family tablet — all three roads taken in turn with the lever pointing at the chosen road, no clipping, reload restores the layout parked at neutral; Toddler Test accepted.
  - Result: Phase 4 complete — 2026-09-14.

## Notes

## Phase: Review Fixes
- [x] Task: Apply review suggestions bc065a9
- [x] Task: Harden the three-way ride sampling for slow CI runners — wait for all three roads instead of a fixed 44 s window 2d86dfa
