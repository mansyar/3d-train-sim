# Phase R1 Verification — Review Fixes (station-cargo-clarity_20261120)

- **Track / phase:** `station-cargo-clarity_20261120` / R1
- **Date:** 2026-11-20
- **Branch:** `feat/station-cargo-clarity_20261120`
- **Phase base:** `4ba9ab85794dd05258ca1a3f88a4cc3cf0e67c5c`
- **Verified head (code):** `3782f44d6822a201f8ddab520dbcf6e36b502eae`
- **Result:** PASS — all named checks exited 0; no findings remain from R1.

## Commands

| Command | Result | Exit code |
| --- | --- | --- |
| `pnpm check` (Biome, tsc, Vitest: 59 files / 1034 tests passed) | PASS | 0 |
| `pnpm build` (Vite 8 + PWA; only pre-existing >500 kB warning) | PASS | 0 |
| `pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts` (14 passed) | PASS | 0 |
| `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` (18 passed) | PASS | 0 |
| Full chained command above, run verbatim as one shell invocation | PASS | 0 |

Pre-existing warnings (Vite `configLoader` extensionless import, `THREE.WebGLShadowMap` deprecation, >500 kB bundle) are not findings.

## Findings

| ID | Fix | Verification | Status |
| --- | --- | --- | --- |
| F1 (NFR-1, Medium) | `tickTransfer()` no longer calls `stationOf()`/`world.scenery()`; a preallocated `stationPresent` boolean is captured at arc start and refreshed by a `world.subscribe` listener (plain loop, disposed on teardown). The frame path is now allocation-free. | New `src/scene/rig-cargo.test.ts`: counting `scenery()` stub asserts zero calls across a live arc and its landing; notify-driven station removal cancels on the next tick without a scenery read. `pnpm check` green. | fixed |
| F2 (FR-2/AC-3/FR-6, Medium) | `stationSlotWorld()` now returns the actual `station_crate_N` mesh; deliver arcs hide it at start, re-apply `visible = false` each tick, and reveal it in `finishTransfer()` (landing, cancel, new stop, dispose). The instant reduced-motion/mesh-less path never hides it. `CargoTransferWitness.slotVisible` plus a dev `cargoSlotVisible()` witness expose the state. | New unit tests cover hidden-in-flight, reveal on notify-cancel / stopped ride / new stop / reduced motion. E2E asserts deliver samples hidden and the slot visible after landing; `cargo.spec.ts` full matrix + 3× repeat green. | fixed |
| F3 (AC-5, Low) | Replaced the 900 ms post-Stop wait with a poll for a live deliver arc (progress < 0.5) and one `page.evaluate` that clicks `.ride-toggle` and samples `cargoTransfer()` in the same task, proving an arc was in flight at Stop. Then polls for a null witness, unchanged count, and a revealed slot. | `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` — 18 passed. | fixed |

## Scope guard

`git diff --name-only 4ba9ab8..HEAD` (after the code commit, before this evidence) returned exactly:

```
e2e/cargo.spec.ts
src/scene/init-scene.ts
src/scene/rig-cargo.test.ts
src/scene/rig-cargo.ts
```

All paths are within the Phase R1 `Touches`. With this evidence file added, the range additionally contains `conductor/tracks/station-cargo-clarity_20261120/verification/phase-R1.md`, also an allowed Touch. No Conductor state, frozen core file, dependency, lockfile, or clarity/comparison file was edited.

## Deviations

- Added a small dev witness `cargoSlotVisible(stationId, slot)` on `SceneHandle` (within `init-scene.ts`). `cargoTransfer()` alone goes null when an arc ends, so a separate readback was needed to assert "slot visible after it lands / after cancel" without reaching into scene internals. It stays behind the existing DEV handle.
- The F3 same-task sample asserts that a deliver arc was live at Stop and that the count does not repeat; it does not assert slot darkness at that instant. Slot darkness is asserted at arc start (`stop.arc.slotVisible === false`) and across all deliver samples in the arc test. Reason: a world notify can transiently re-settle slot visibility between frames, and the tick deliberately re-applies `visible = false` on the next frame; sampling at an arbitrary sub-frame instant is not deterministic.

## Notes

- The full verification matrix was already green **pre-fix** (per `review.md`); these changes keep it green. The primary will re-run the affected checks after acceptance.
- No clarity numbers or v1.0 child-gate claims were introduced; no product/comparison docs were touched.
- Slot visibility is intentionally re-applied on each live tick (a plain property write, no allocation) so a world notification cannot leave the destination slot revealed before the crate lands.
- Unit tests are headless (real `Object3D` scene, no renderer) and add 5 tests to `pnpm check` (1029 → 1034).

## Primary verification

- **Exact command, primary re-run:** `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts && pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` — all four stages exit 0: Biome 201 files clean, tsc clean, 59 files / 1034 unit tests, Vite build green, **14 passed** targeted e2e (tablet + phone, perf + axe), **18 passed / 18** cargo repeat.
- **Tree/diff check:** `git status --porcelain` clean apart from untracked `conductor/runs/`; `git diff --name-only 4ba9ab8..HEAD` = exactly the four code/test Touches plus this evidence file.
- **Squash guard:** commit range `3782f44` (scene + e2e + unit fix), `9d3bf01` (evidence) matches the report; no merge or user commits in range. Phase accepted at the post-squash checkpoint.
