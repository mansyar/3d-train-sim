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
- [x] Task: Implement `src/core/wagons.ts` in the `trains.ts` data pattern (06db97a)
  - Minimum pure data + resolver functions to make the tests pass (Green
    phase); refactor if clarity improves.
  - Run the suite with coverage; >80% on the new module.
  - Commit `feat(core): Add cargo wagon catalog`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Gates: `biome` lint ✅ · `tsc --noEmit` strict ✅ · 193 tests passed ✅
  - `wagons.ts` at 100% statements/branches/functions/lines (target >80% ✅)
  - Notes: "Red phase confirmed the catalog suite as the only failing file —
    16 other suites / 187 other tests stayed green. Green phase landed with
    100% coverage on the new module; both lint and typecheck gates clean."

## Phase 2: Ride Following (scene) [checkpoint: 066edf0]

**Verification Report:** Automated — `biome` ✅, `tsc --noEmit` ✅, 193 unit
tests ✅ (2026-08-29). Manual — user confirmed Phase 2 follower capability
meets expectations (2026-08-29); visual wagon verification deferred to
Phase 3 when models are wired into the scene.

- [x] Task: Extend `ride-motion.ts` so follower objects ride at a fixed
      negative path distance behind the locomotive (066edf0)
  - Acceptance criteria (non-logic — record & verify manually / via smoke):
    - Wagons share every ride behavior: loop cycling, shuttle reversal with
      the end pause, station stops (whole train rests), mid-ride ease-out.
    - Reversing keeps wagons behind the travel direction.
    - Segment geometry is reused; zero per-frame allocations in `update()`.
  - Notes: followers ride at `distance − travelDirection · (i+1) · FOLLOWER_GAP`
    clamped to `[0, total]`, reusing the same segment pose math via a new
    `target`/`faceTravel` parameter on `poseAt` — wagons trail behind the
    travel direction, keep their course during shuttles (only the engine
    turns around), and rest where the train stopped when parked. All pose
    writes go through one `poseTrain()` helper; no per-frame allocations.
    Review caught and fixed an initial direction-flip bug before commit.
  - Commit `feat(scene): Make ride motion support path followers`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (3e7895f)

## Phase 3: Wagon Lifecycle & Composition (scene)

- [x] Task: Load both wagon models in the `load-locomotive.ts` pattern; swap
      the set when the selected train changes; dispose cleanly (294a24b)
  - Acceptance criteria (non-logic):
    - Parked train shows the complete little train at rest; default pose
      behind the engine before the first ride.
    - Wagon model load failure falls back gracefully and never blocks play;
      existing placeholder fallback behavior preserved.
    - Only the active wagon set stays in the scene; clean disposal on train
      switch (no leaks).
  - Commit `feat(scene): Attach cargo wagons to the selected locomotive`.
  - Notes: New `src/scene/load-wagons.ts` mirrors `load-locomotive.ts`
    (GLTFLoader, bundled `train-carriage-lumber/box.glb`, 1.5 scale). Since
    the catalog is identical for every train kind, the scene keeps one
    persistent two-wagon set (pulling order by slot index) and re-attaches it
    on train switch instead of cloning per switch — same set in the scene,
    nothing to swap, nothing to leak. `createRideMotion` now receives the
    live `wagonSet` as followers; a new `parkFollowersBehind` helper (same
    coupler gap as the ride) gives wagons a sensible default pose behind a
    freshly selected parked engine, and re-poses late-arriving wagons.
    Load failures are swallowed — the train chugs on without a wagon;
    teardown deep-disposes the wagon set. Gates: biome ✅ · tsc ✅ · 193
    tests ✅ (2026-08-29).
  - Phase-3 verification correction (d43edae): user reported wagons
    overlapping the engine, including at play start. Root cause:
    `poseFollowers` offset wagons by `travelDirection` and clamped them to
    the path, piling them onto the engine at distance 0 and teleporting
    them through it at dead-end reversals; the 2.25-unit coupler gap was
    also far too small for the 1.5-scaled models (engine ≈3.6–3.9, wagons
    ≈4.05 units measured). Wagons now hold a fixed path-order offset
    (direction-independent), gap raised to 4.2, and `poseAt` extrapolates
    overhangs straight past short path ends; fixed a latent off-by-one
    that snapped the engine to the path start when `distance === total`.
    Gates: biome ✅ · tsc ✅ · 193 tests ✅ (2026-08-29).
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
