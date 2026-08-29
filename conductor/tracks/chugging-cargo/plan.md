# Implementation Plan — Chugging Cargo

**Track ID:** `chugging-cargo` · **Branch:** `track/chugging-cargo`

Workflow: TDD for logic-bearing code only (`src/core/`, `src/state/`); scene wiring
verified via acceptance criteria + smoke tests. One task in flight at a time;
follow `conductor/workflow.md` for the full task lifecycle.

## Phase 1: Wagon Catalog (pure core, TDD)

- [x] Task: Write failing unit tests for the wagon catalog (573f4ac)
  - Create `src/core/wagons.test.ts` covering: exactly two wagon slots; stable
    model URLs pointing at bundled `train-carriage-*.glb` assets; resolvers
    apply to every `TrainKind`; fixed-count invariant; catalog is pure data
    (no Three.js/browser imports).
  - Run the suite and confirm the new tests fail (Red phase). ✅ Confirmed —
    the wagon catalog file was the only failing suite (16 passed, 187 other
    tests green).
- [~] Task: Implement `src/core/wagons.ts` in the `trains.ts` data pattern
  - Minimum pure data + resolver functions to make the tests pass (Green
    phase); refactor if clarity improves.
  - Run the suite with coverage; >80% on the new module.
  - Commit `feat(core): Add cargo wagon catalog`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Ride Following (scene)

- [ ] Task: Extend `ride-motion.ts` so follower objects ride at a fixed
      negative path distance behind the locomotive
  - Acceptance criteria (non-logic — record & verify manually / via smoke):
    - Wagons share every ride behavior: loop cycling, shuttle reversal with
      the end pause, station stops (whole train rests), mid-ride ease-out.
    - Reversing keeps wagons behind the travel direction.
    - Segment geometry is reused; zero per-frame allocations in `update()`.
  - Commit `feat(scene): Make ride motion support path followers`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Wagon Lifecycle & Composition (scene)

- [ ] Task: Load both wagon models in the `load-locomotive.ts` pattern; swap
      the set when the selected train changes; dispose cleanly
  - Acceptance criteria (non-logic):
    - Parked train shows the complete little train at rest; default pose
      behind the engine before the first ride.
    - Wagon model load failure falls back gracefully and never blocks play;
      existing placeholder fallback behavior preserved.
    - Only the active wagon set stays in the scene; clean disposal on train
      switch (no leaks).
  - Commit `feat(scene): Attach cargo wagons to the selected locomotive`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: E2E Coverage & Track Completion

- [ ] Task: Extend `e2e/smoke.spec.ts`
  - Ride with wagons present; switch trains mid-session and confirm the
    wagon set stays consistent; reload and confirm the world restores
    unchanged; no console errors; no external requests.
  - Commit `test(e2e): Cover cargo wagon riding`.
- [ ] Task: Full quality gate
  - `pnpm exec biome check . && pnpm exec tsc --noEmit && CI=true pnpm test`
  - Playwright smoke run.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
