## Summary

Crates now visibly travel between the station platform and the wagon bed on
both loading and delivery, along a short gentle arc that needs no reading or
tapping. The delivery count and confetti still settle exactly once at the
station stop; reduced-motion users get an instant, wordless hand-off, and a
removed station or stopped ride cancels the arc without orphan meshes or a
second count.

## Track

- **ID:** `station-cargo-clarity_20261120`
- **Type:** `feature`
- **Spec:** [`conductor/archive/station-cargo-clarity_20261120/spec.md`](conductor/archive/station-cargo-clarity_20261120/spec.md)
- **Plan:** [`conductor/archive/station-cargo-clarity_20261120/plan.md`](conductor/archive/station-cargo-clarity_20261120/plan.md)
- **Review:** [`conductor/archive/station-cargo-clarity_20261120/review.md`](conductor/archive/station-cargo-clarity_20261120/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Pure transfer timing and data-contract guard | Deterministic, allocation-free arc helper and frozen-contract tests | verified | `9b3d81b` | 13 new unit tests; save/cargo contract guarded; one green-phase fix snapped arc endpoints to exact 0 |
| 2: Visible station/wagon hand-off and verification | Reused travel crate, reduced-motion fallback, cancel-and-snap, e2e proof | verified | `5661d0d` | One rework of a flaky reload-count assertion; count now settles at the stop, not at arc end |
| R1: Review fixes | Resolve F1 (per-frame allocation), F2 (slot visibility), F3 (Stop proof) | verified | `a4b0733` | Notification-refreshed presence flag, slot mesh hide/reveal, same-task Stop witness sample |

## Requirements

- [x] `FR-1` — load arc runs platform slot → wagon bed before the crate settles (`e2e/cargo.spec.ts`)
- [x] `FR-2` — delivery arc runs wagon bed → next platform slot, count +1 exactly once (`e2e/cargo.spec.ts`)
- [x] `FR-3` — pure deterministic bounded helpers, cancel-and-snap, no per-frame allocation (`src/core/cargo-transfer.ts`, `src/scene/rig-cargo.test.ts`)
- [x] `FR-4` — reduced motion takes the instant path and still increments the count (`e2e/cargo.spec.ts`)
- [x] `FR-5` — save format, keys, telemetry and dependency contracts unchanged (`src/core/cargo-transfer.test.ts`)
- [x] `FR-6` — existing cargo e2e intact plus new two-way movement assertions (`e2e/cargo.spec.ts`)
- [x] `NFR-1` — no per-frame allocation; single reused travel crate and preallocated point (`verification/phase-R1.md`)
- [x] `NFR-5` — full static/unit/coverage/build/Playwright matrix green (`verification/integrated.md`)
- [x] `AC-1` … `AC-8` — see the requirement tables in `review.md` and `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint + format | `pnpm exec biome check .` | pass (201 files clean) | `verification/phase-R1.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| unit | `pnpm test` | pass (59 files / 1034 tests) | `verification/phase-R1.md` |
| coverage | `pnpm test:coverage` | pass (97.16 / 91.44 / 97.44 / 98.94%, gate 80%) | `verification/integrated.md` |
| build | `pnpm build` | pass | `verification/integrated.md` |
| e2e | full Playwright matrix (`--shard=1/2`, `--shard=2/2`) | pass (47 + 41 passed, 1 pre-existing skip) | `verification/integrated.md` |
| targeted e2e | cargo, ride-toybox-flow, a11y, perf-budget, perf-budget-observe | pass (14 passed) | `verification/phase-R1.md` |
| stability | `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=3` | pass (18/18) | `verification/phase-R1.md` |
| manual device | iPad Safari / Android Chrome touch, audio, frame rate | human-only — not claimed | `verification/integrated.md` |

## Media

![Station cargo hand-off on a tablet: a train beside a station with a delivered crate in the platform pile](.conductor/media/station-cargo-clarity_20261120/cargo-handoff.png)
Captured on the tablet profile at code head `3782f44` with a live delivery arc in flight.

## Review

- **Verdict:** `PASS` (round 1 `PASS WITH FINDINGS`; R1 delta re-review `PASS`)
- **Rounds:** 2
- **Fixed:** 3 findings (F1, F2, F3) in review phase R1
- **Accepted/deferred:** none (see `review.md`)

## Deviations and risks

- The first full Playwright run hit four environment flakes after a 3.5 h session (WebGL context loss plus one async IndexedDB reload race); all four passed in isolation and a complete two-shard rerun was green. No test was weakened or skipped.
- One review-fix e2e iteration was needed for an over-strict sub-frame slot-visibility assertion at Stop; the final test asserts slot darkness at arc start and across all sampled deliver frames, and reveal after landing/cancel.
- The parent-facing `CHANGELOG.md` `[Unreleased]` section gained one plain-language entry. No version bump, save key, dependency or clarity measurement was added.
- Manual-device checks remain human-only and the v1.0 three-child gate is not claimed.

## Follow-ups

- none

## Rollback

```bash
# Squash commits for this track (in order):
git revert --no-edit 9b3d81b   # pure transfer helper
git revert --no-edit 5661d0d   # visible hand-off
git revert --no-edit a4b0733   # review fixes
```

No migration, feature flag or data cleanup is required; the change is view-only and the persisted delivery count keeps its existing format.
