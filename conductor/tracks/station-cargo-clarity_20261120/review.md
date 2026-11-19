# Review: Station Cargo Clarity

- **Track:** `station-cargo-clarity_20261120`
- **Type:** `feature`
- **Branch:** `feat/station-cargo-clarity_20261120`
- **Range:** `be83e91714cea3c4a1b2d58623301e6f394561a0..fe8a5c7aa73bef8085e916db91be26fe6bffa748`
- **Date:** 2026-11-20T16:10:00Z
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The diff delivers the frozen station-cargo hand-off contract with no Critical or
High findings, and all configured checks are green (static, unit, coverage,
build, full Playwright matrix). The read-only reviewer found three fixable
issues: a per-frame allocation in the transfer tick (NFR-1), a visual-continuity
gap where the delivered platform slot lights up before the arc lands (FR-2 /
AC-3 / FR-6), and a test that could pass without actually proving a mid-arc
Stop cancel (AC-5). Under `review.strict: true` these are resolved in review
phase R1 before completion; no override is requested. No clarity numbers or
v1.0 child-gate claim were made, and the comparison table remains at eight
`awaiting observation` cells.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint + format | `pnpm exec biome check .` | pass (200 files clean) | `verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `verification/integrated.md` |
| unit | `pnpm test` | pass (58 files / 1029 tests) | `verification/phase-1.md`, `verification/phase-2.md` |
| coverage | `pnpm test:coverage` | pass (97.16 / 91.44 / 97.44 / 98.94%, gate 80%) | `verification/integrated.md` |
| build | `pnpm build` | pass | `verification/integrated.md` |
| e2e | `pnpm exec playwright test --shard=1/2` and `--shard=2/2` | pass (47 + 41 passed, 1 pre-existing skip) | `verification/integrated.md` |
| manual device | iPad Safari / Android Chrome touch, audio, frame rate | human-only — not claimed | `verification/integrated.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1 | `e2e/cargo.spec.ts` load-arc spec, `verification/phase-2.md` | covered |
| FR-2 | P2.T2 | `e2e/cargo.spec.ts` stop-settled spec; F2 gap open until R1 | covered with finding |
| FR-3 | P1.T1 | `src/core/cargo-transfer.test.ts` (13 tests) | covered |
| FR-4 | P2.T3 | `e2e/cargo.spec.ts` reduced-motion spec | covered |
| FR-5 | P1.T2 | frozen-contract guards in `src/core/cargo-transfer.test.ts` | covered |
| FR-6 | P2.T4 | cargo e2e + full matrix; F2 visual gap open until R1 | covered with finding |
| NFR-1 | P1.T1, P2.T1–T2 | allocation-free helper, single travel crate; F1 open until R1 | covered with finding |
| NFR-2 | P2.T1–T4 | no kid text/gestures in diff; full matrix | covered |
| NFR-3 | P1.T2, P2.T4 | scope guard, `runtime-guarantees.spec.ts` | covered |
| NFR-4 | P2.T3 | reduced-motion spec, `a11y.spec.ts` axe sweep | covered |
| NFR-5 | integrated | static/unit/coverage/build/full Playwright | covered |
| NFR-6 | P2.T4 | scope guard; no sky/train-length/piece-type/clarity changes | covered |
| AC-1 | P1.T1 | `src/core/cargo-transfer.test.ts` | covered |
| AC-2 | P2.T1 | `e2e/cargo.spec.ts` load-arc spec | covered |
| AC-3 | P2.T2 | `e2e/cargo.spec.ts` stop-settled spec; F2 gap open until R1 | covered with finding |
| AC-4 | P2.T3 | `e2e/cargo.spec.ts` reduced-motion spec | covered |
| AC-5 | P1.T2, P2.T4 | cancel unit tests; F3 weak Stop timing open until R1 | covered with finding |
| AC-6 | P1.T2, P2.T4 | diff scope guard, frozen-contract test | covered |
| AC-7 | integrated | full matrix, perf + axe, tablet/phone/prod | covered |
| AC-8 | P2.T4 | scope guard; comparison still 8× `awaiting observation` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Per-frame allocation in transfer tick**
  - **File:** `src/scene/rig-cargo.ts:218`
  - **What:** `tickTransfer()` calls `stationOf()` every frame, and
    `stationOf()` calls `world.scenery()`, which maps and copies every scenery
    item. Roughly 30 frames per arc allocate a fresh array plus object/cell
    copies for the whole scenery list, despite the file's scratch-state comment.
  - **Why:** Violates frozen NFR-1 (no per-frame allocation); avoidable GC churn
    in the render loop that the perf-budget e2e does not measure.
  - **Fix:** Replace the per-frame `stationOf()` with an allocation-free presence
    flag maintained by a world subscription (scan the internal scenery array in
    a plain loop on notify, never per frame), or capture presence at transfer
    start and refresh only via the listener. Keep the richer lookup at stop time.
  - **Requirement:** NFR-1
  - **Test gap:** Assertion that the transfer tick does not call
    `world.scenery()` during an active arc.

- **F2 — Delivered slot lights up before the arc lands**
  - **File:** `src/scene/rig-cargo.ts:256`
  - **What:** The ledger settles at the station stop and `syncStationCrates()`
    immediately reveals the destination platform slot, so for the whole 0.5 s
    delivery flight a stationary crate already sits in the slot while the
    travelling crate flies toward it; on landing the flyer vanishes into a
    duplicate.
  - **Why:** Undermines FR-2 / AC-3 visual continuity — the arc reads as a
    highlight rather than a hand-off. FR-6's witness samples spot movement only.
  - **Fix:** Have the scene slot resolver also return the actual
    `station_crate_N` mesh; hide that slot mesh when a delivery arc starts,
    keep it hidden for the flight (re-apply on notify), and reveal it in every
    finish/cancel/instant path. Keep the ledger increment at the stop.
  - **Requirement:** FR-2 / AC-3 / FR-6
  - **Test gap:** Assert the destination slot is hidden while a `deliver` arc is
    active and visible after landing and after a mid-arc cancel.

### Low

- **F3 — Stop-cancel e2e assertion can pass without a cancel**
  - **File:** `e2e/cargo.spec.ts:597`
  - **What:** The check waits 900 ms after Stop before asserting no active arc;
    the arc is only 0.5 s, so it can finish naturally and still pass.
  - **Why:** AC-5's "ride stopped mid-transfer" edge is only proven by the pure
    helper unit test and code inspection, not by the e2e as claimed.
  - **Fix:** Sample the witness immediately after Stop while the arc is still
    in flight, then assert it snaps home with no second count; or cancel via
    station removal and sample immediately.
  - **Requirement:** AC-5
  - **Test gap:** Immediate post-Stop witness sample proving an arc was live.

## Overrides

- <none — strict mode; all findings scheduled for R1>

## Plan compliance

Both planned phases are verified (17/17 tasks, checkpoints `9b3d81b` and
`5661d0d`), with one documented rework inside Phase 2. No planned task was
marked complete without verification. The Phase R1 fix phase will be appended
before completion.

## Out of scope

Pre-existing warnings (Vite `configLoader: 'native'` extensionless import,
`THREE.WebGLShadowMap` deprecation, >500 kB bundle advisory) and the known
`conductor/product.md:115` v0.14.1 wording drift belong to other tracks. The
full Playwright first-run environment flakes (WebGL context loss in a 3.5 h
session, one async IndexedDB reload race in `hills.spec.ts`) were diagnosed and
cleared by a complete sharded rerun; they are not code defects in this diff.

## Debt

- <none>

## Doc sync

`pending` — CHANGELOG `[Unreleased]` was updated before review; post-review sync
will confirm spec/docs need no further change and record the final state.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 2 | 1 | 0 (R1 scheduled) |
