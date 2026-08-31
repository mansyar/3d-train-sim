# Implementation Plan — Wagon Teleport at the Lap Wrap (Bridge After Curve)

**Track ID:** `wagon-teleport-lap-wrap_20260831` · **Branch:** `track/wagon-teleport-lap-wrap`

Workflow: TDD for logic-bearing code; `src/scene/ride-motion.ts` is pose math
with colocated tests (`ride-motion.test.ts`), so each defect runs its own
Red → Green cycle inside one phase. Scene wiring beyond it is verified by
manual check (`conductor/workflow.md`). One task in flight at a time.

## Phase 0: Characterize (pins what must not change)

- [x] Task: Write characterization tests for adjacent behaviors

- **Expected behavior (these must PASS before any fix — they pin what FR4
  forbids changing):**
  - Straight→bridge crossing: follower positions stay continuous (no jump
    above epsilon between successive frames) across the segment boundary.
  - Open layout shuttle: at the dead end the engine reverses, wagons keep
    their course (facing unchanged, `faceTravel = false`).
  - Closed-loop lap: engine position is continuous across
    `distance %= total` (path end meets path start).
- **Commit:** `test(scene): Characterize ride behavior around the lap wrap`
- **Notes:** Built on the real reported layout (corner feeding a bridge,
  pieces via a world store, path via `solveRidePaths`, segments via
  `segmentForStep`). If any characterization test fails pre-fix, stop and
  re-examine the diagnosis before implementing.

## Phase 1: Closed-loop follower wrap (Red → Green)

- [~] Task: Write failing regression tests for the follower wrap (Red)

- **Expected behavior (unit tests first):** Extend
  `src/scene/ride-motion.test.ts`. Drive `createRideMotion` with two follower
  wagons across the lap wrap of the reported layout:
  - **AC1:** at engine distances spanning the wrap (0 … 2 × FOLLOWER_GAP past
    it), every follower position lies on the path (distance to the nearest
    segment below an epsilon) — never on an off-rail straight extension.
  - Specifically, right after the wrap the trailing wagon must sit on the
    **path tail** (the previous lap's last segments), not beyond the path
    start.
- **Commit:** `test(scene): Reproduce wagon teleport at the lap wrap`
- **Notes:** Run the suite and confirm the new tests FAIL (red) while
  characterization suites stay green. No implementation changes yet.

- [ ] Task: Wrap follower distances around closed loops (Green)

- **Expected behavior:**
  - `poseFollowers` (or `poseAt`'s contract) folds each follower's path
    distance into `[0, total)` **when the ride path is closed** (flag
    captured in `beginRide` from `state.path.closed`), so a wagon behind the
    lap start rides the previous lap's tail. Open paths keep the
    clamp-and-overhang semantics.
  - Wagons keep course semantics: no flipping; facing from the local tangent.
  - AC1 tests turn green; overhang test still red.
- **Commit:** `fix(scene): Wrap follower wagons around closed-loop laps`
- **Notes:** `src/scene/ride-motion.ts` only. No constant retuning
  (`FOLLOWER_GAP` stays 4.2); `parkFollowersBehind` untouched.

## Phase 2: Normalized end-overhang (Red → Green)

- [ ] Task: Write failing test for the normalized end-overhang (Red)

- **Expected behavior (unit test first):** On a short **open** path (total
  length under the coupler distances), when the train rests at the dead end:
  - **AC2:** each follower beyond the path end sits at true coupler distance
    past the end along the **unit** end tangent (`|over|` world units, ~1
    wagon length per wagon) — not the current `|over| × 3.75` overshoot.
  - Engine pose, facing, and shuttle pause behavior unchanged.
- **Commit:** `test(scene): Pin dead-end overhang to true coupler distance`
- **Notes:** Same suite run; confirm red before implementing.

- [ ] Task: Normalize the end-overhang tangent (Green)

- **Expected behavior:**
  - The overhang displacement in `poseAt` uses the **unit** tangent for both
    segment kinds (divide the line delta by the segment length; the arc
    tangent is already unit), so overhang magnitude equals the true
    coupler distance.
  - `rotation.y` derivation is direction-only — normalizing must not change
    any facing.
  - AC2 turns green; full suite green.
- **Commit:** `fix(scene): Normalize end-overhang to true coupler distance`
- **Notes:** Refactor pass if the distance-fold and tangent normalization
  share clearer structure (e.g. a unit-tangent helper); rerun the suite
  after refactoring.

## Phase 3: Verify

- [ ] Task: Coverage + gates

- Coverage >80% on the changed logic (ride-motion already carries colocated
  tests); run `CI=true pnpm check` (biome + `tsc --noEmit` + vitest). Record
  results in the task notes.
- **Commit:** `chore` only if gate fixes require it.
- **Notes:** Full suite green.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Acceptance criteria (manual browser check):**
  - `pnpm dev`: build the reported layout — a closed loop where a curve
    feeds a bridge over the river — press ▶ and watch at least two full
    laps: no wagon ever leaves the rails at the bridge crossing; the train
    reads as coupled through the wrap.
  - Open layout: a short dead-end line — wagons hang ~1 wagon length past
    the last rail at the pause, then the train shuttles back normally.
  - Regression sweep: straight→bridge crossing, multi-train 🎥 cycling,
    station pause — no visual change from before the fix.
- **Verification Report:** Automated — `CI=true pnpm check` result recorded.
  Manual — user confirmation recorded with date.
- **Notes:** Checkpoint commit hash recorded here when the phase closes.

Manual Verification Steps:
1. Start the dev server: `pnpm dev`
2. Open the app, lay the curve→bridge closed loop, press ▶, watch two laps.
3. Lay a short open dead-end line, press ▶, watch the dead-end pause pose.

## Task Summaries

### Phase 0 — Characterization tests (complete 2026-08-31)
Added `createRideMotion` integration tests to `src/scene/ride-motion.test.ts`
driving the real motion against a real `WorldStore` (no mocks): engine stays
on the rails across the lap wrap of the reported curve→bridge loop (24-piece
closed loop; the wrap lands on the south bridge (10,10), smallest cell key);
dead-end overhang stays collinear with the end tangent at the pause; wagon
facing is untouched by the shuttle reversal. All green pre-fix. Test
infrastructure: `distanceToPath` polyline check (arcs sampled at 512 points,
ε = 0.02), `startRide` driver (dt = 0.5). Commit: test(scene).
