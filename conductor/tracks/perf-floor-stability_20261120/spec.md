# Perf Floor Stability — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Replace the wall-clock `ticks/second` hard gate in the CI perf spec with a deterministic frame-contract hard gate. Throughput samples remain recorded, but only as non-blocking observation. The interactive-mark budget and the once-per-frame wiring contract stay hard, so the release gate stops failing because of renderer contention while the guarantees that actually protect the player are preserved.

## Problem / Motivation

The `v0.15.0` tag workflow failed at `e2e/perf-budget.spec.ts:82` with `frame ticks/second 2.3696682464454977 below floor 2.5`; its samples were `2.37, 2.51, 2.48`. An earlier post-fix dry run failed at `2.4667`. The floor was calibrated from six older samples (`2.65`–`2.79`) in run `44283047563`. In the failed tag run, 91 tests passed and only this wall-clock floor failed; `Gate · vitest` and `Gate · biome + typecheck` passed and `publish` was skipped. This is a measurement-design defect: the hard gate treats environment-dependent RAF cadence as if it were the product contract. If unfixed, every future release can be blocked by a false negative, or tempting “fixes” could weaken real performance guarantees.

## Goals & Success Metrics

- **Goal:** Make the perf hard gate deterministic across machines and CI load.
- **Metric:** No hard assertion depends on wall-clock frame throughput; the interactive mark and exact per-frame tick/order assertions remain hard.
- **Goal:** Keep performance visible without gating on noisy throughput.
- **Metric:** Three ticks/second samples continue to be logged and attached by the observation spec.
- **Goal:** Prove the fix under the real release workflow path.
- **Metric:** Two consecutive `workflow_dispatch` dry runs after the fix are green with deploy skipped.

## Scope

### In Scope

- Rewrite `e2e/perf-budget.spec.ts` so the hard gate covers exactly one interactive mark ≤5000 ms plus a deterministic frame-count/order contract over at least 10 observed animation frames.
- Add negative proofs for a late interactive mark and a deliberately over-ticking / wrongly ordered frame sample.
- Update `e2e/perf-budget-observe.spec.ts` so it remains non-blocking and its comment no longer claims a Phase 2 floor exists.
- Record phase and integrated evidence with imported failure samples, full-matrix results, scope guard and explicit non-claims.

### Out of Scope

- Runtime changes under `src/`, unit tests, `playwright.config.ts`, `.github/workflows/`, dependencies or the lockfile.
- Save format, storage keys, preferences, UI, audio, telemetry, network requests or third-party scripts.
- Product, product-guidelines, tech-stack, CHANGELOG, clarity artifacts, `product.md`, or prior release documents.
- Retagging, deleting or rewriting `v0.15.0`; GHCR mutation; deploy; manual tablet checks.
- Clarity measurements, v1.0 child-gate claims, or weakening/skipping/deleting an existing hard assertion.

## Bug Details

- **Reproduction steps:**
  1. Push the v0.15.0 release branch/tag and let `release.yml` run the full Playwright matrix on GitHub CI.
  2. Observe `e2e/perf-budget.spec.ts` sampling `2.37, 2.51, 2.48` ticks/second.
  3. Observe the gate throw `frame ticks/second 2.3696682464454977 below floor 2.5` while the other 91 tests pass and `publish` is skipped.
- **Expected behavior:** A hard perf gate that fails only when a real product guarantee breaks: a late interactive boot mark or a frame loop that does not tick every documented system exactly once per frame.
- **Actual behavior:** The gate fails when CI RAF cadence dips below a threshold calibrated from a narrow, older sample set, despite the frame contract holding.
- **Root-cause hypothesis:** `FPS_FLOOR_TICKS_PER_SECOND` conflates environment-dependent throughput with the logical once-per-frame contract already proven by `e2e/frame-contract.spec.ts`.
- **Regression test:** A deterministic frame-count/order assertion must pass at any observed RAF cadence with ≥10 frames, while a deliberate over-tick or wrong-order sample must fail closed. The late-mark negative proof must continue to fail closed.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The hard perf spec asserts exactly one `tiny-tracks-interactive` mark with `startTime <= 5000` ms and contains no `ticksPerSecond` floor or assertion. | must |
| FR-2 | The hard perf spec asserts the documented 12-system order and that every system ticks exactly once per observed animation frame, sampling at least 10 frames. | must |
| FR-3 | Negative proofs show that a late interactive mark and an over-tick / wrong-order frame sample both fail closed. | must |
| FR-4 | The observation spec continues to record and attach three ticks/second samples and asserts the interactive mark only; it carries no floor. | must |
| FR-5 | Full configured matrix plus repeated perf/frame-contract specs pass; no test is skipped, weakened or deleted. | must |
| FR-6 | Diff is confined to the two perf e2e specs and Conductor evidence. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No runtime, config, dependency, storage, network, UI, audio or telemetry changes. |
| NFR-2 | No player-facing guardrail is relaxed: the interactive mark and once-per-frame logic stay hard. |
| NFR-3 | Evidence records real observed samples, invents no clarity numbers, claims no v1.0 child gate, and states that manual device checks remain human-only. |
| NFR-4 | Biome, tsc, unit, coverage, build, full sharded Playwright and audit gates pass. |
| NFR-5 | `v0.15.0` remains immutable; no retag, GHCR push or deploy occurs. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `e2e/perf-budget.spec.ts` has no `FPS_FLOOR_TICKS_PER_SECOND`, no ticks/second assertion, and still fails a late or missing interactive mark. | FR-1 |
| AC-2 | The hard gate proves documented system order and equal tick deltas over at least 10 observed RAF frames. | FR-2 |
| AC-3 | Both negative proofs execute and throw the expected messages. | FR-3 |
| AC-4 | `e2e/perf-budget-observe.spec.ts` still logs three ticks/second samples, asserts the mark only, and its comment says the floor is gone. | FR-4 |
| AC-5 | Scope guard shows only the two perf e2e specs plus Conductor evidence changed. | FR-6 |
| AC-6 | Full matrix and `pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3` pass with no test skipped/deleted. | FR-5, NFR-4 |
| AC-7 | Two consecutive post-fix dry runs are green on all four gates with `Deploy via Coolify webhook` skipped. | FR-5, NFR-5 |
| AC-8 | Evidence records the original failed samples, keeps the `v0.15.0` tag immutable, and makes no manual-device, clarity-number or v1.0 claim. | NFR-3, NFR-5 |

## Edge Cases

- Contended CI worker starves RAF: the deterministic gate counts frames, not wall-clock time, so it still passes if the frame contract holds.
- Fewer than 10 RAF frames observed: fail closed rather than passing vacuously.
- Missing DEV scene handle or empty frame-system snapshot: fail closed.
- System order changes or a system ticks twice per frame: fail closed via the deterministic assertion and negative proof.
- Interactive mark missing, duplicated or >5000 ms: fail closed.
- Observation samples missing or noisy: still logged, never hard-gated.
- `v0.15.0` tag already exists: do not recreate, move or delete it.
- A dry run fails after a green one: the consecutive pair restarts; no claim is made.

## Dependencies

- **Tracks:** none. `release-v0.15.0_20261120` is complete and merged; this track stabilizes future release gates without rewriting it.
- **External:** GitHub Actions `release.yml` `workflow_dispatch` and `gh` CLI for dry-run proof.

## Open Questions & Assumptions

- **Assumption:** The v0.15.0 tag-workflow failure was a false negative from CI RAF contention, not a product frame-loop regression; 91 passing tests and unchanged deterministic frame-contract evidence support this.
- **Assumption:** Two green `workflow_dispatch` dry runs from the fix branch are sufficient proof of the stabilized gate because the released tag must remain immutable.
- **Assumption:** Manual iPad Safari / Android Chrome verification remains a human-only exception and is not claimed here.
- **Assumption:** The v1.0 3/3-child gate remains unmet and is not claimed.

## References

- Failed tag workflow: `https://github.com/mansyar/3d-train-sim/actions/runs/44730179589`
- Failed post-fix dry run: `44712469297` (`2.4667` below `2.5`)
- Original CI calibration: `conductor/archive/perf-budget_20261111/verification/phase-R1.md`, run `44283047563`
- Existing deterministic contract: `e2e/frame-contract.spec.ts`
- Current hard/observation specs: `e2e/perf-budget.spec.ts`, `e2e/perf-budget-observe.spec.ts`
- Released track: `conductor/archive/release-v0.15.0_20261120/`
