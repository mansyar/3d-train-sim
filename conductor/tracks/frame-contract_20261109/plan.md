# Frame Contract — Implementation Plan

> **Branch:** `refactor/frame-contract_20261109`
> **Base:** `main` @ `410a1c38531321d5e9e7b5304b3819e9af62c9b8`
>
> Phase status vocabulary: `pending` · `in_progress` · `verified` · `failed` · `blocked`.
> Only the primary agent writes this file.

## Phase 1: The contract and the wiring

- **Goal:** every per-frame subsystem is a named entry in one documented order, the runner refuses a mismatched order at construction, and the loop drives it with one reused `FrameInputs`.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, NFR-2, NFR-3, NFR-6, AC-1, AC-2, AC-3, AC-5
- **Touches:** `src/scene/frame-contract.ts`, `src/scene/frame-contract.test.ts`, `src/scene/init-scene.ts`, `src/scene/train-fleet.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/smoke.spec.ts`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 292d685
- **Evidence:** `conductor/tracks/frame-contract_20261109/verification/phase-1.md`

- [x] **P1.T1: Write the contract module** — covers: FR-1
  - [x] **P1.T1.1: Declare `FRAME_SYSTEM_ORDER` with one reason per entry, plus the `FrameSystemName`, `FrameInputs` and `FrameSystem` types**
  - [x] **P1.T1.2: Implement `createFrameRunner` with fail-fast name validation and in-place tick counters**
- [x] **P1.T2: Test the runner headlessly** — covers: FR-4, FR-5
  - [x] **P1.T2.1: Prove the order, the counts and the error messages for a missing, extra and swapped system**
  - [x] **P1.T2.2: Prove one tick per `run()` and that the snapshot never allocates per frame**
- [x] **P1.T3: Give the fleet a void update** — covers: FR-8
  - [x] **P1.T3.1: Make `fleet.update(dt)` return `void` and add `steamPuffCount()`**
  - [x] **P1.T3.2: Point the existing steam-puff witness at the new accessor**
- [x] **P1.T4: Drive the loop from the runner** — covers: FR-6, FR-9
  - [x] **P1.T4.1: Build the twelve systems in `init-scene.ts`, fill one `FrameInputs` per frame, and replace the `onFrame` body**
  - [x] **P1.T4.2: Add the `frameSystems()` probe to `SceneHandle` behind the existing dev handle**

**Deviations:** `FrameInputs.rain`/`.snow` are `0..1` intensities, not the brief's booleans, because
weather eases between states and those values feed `CritterMood`/`DuckMood` — coercing them would change
behaviour. The primary closed a one-frame lag the subagent flagged: `night`/`rain`/`snow` are now published
by the `day-ambience` system right after `tick()`/`paint(dt)`, so downstream systems read the frame just
painted, exactly as before this phase. `starSpot` remains one object literal per frame, deliberately
unchanged. The `frameSystems()` probe is wired but unexercised until Phase 2.

## Phase 2: Browser proof

- **Goal:** the live loop proves its own cadence — documented names in order, and every system advancing exactly one tick per animation frame.
- **Depends on:** Phase 1
- **Covers:** FR-10, AC-4
- **Touches:** `e2e/frame-contract.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/frame-contract.spec.ts` and `pnpm check`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 1013811
- **Evidence:** `conductor/tracks/frame-contract_20261109/verification/phase-2.md`

- [x] **P2.T1: Assert the contract in the running app** — covers: FR-10
  - [x] **P2.T1.1: Assert `frameSystems()` names equal `FRAME_SYSTEM_ORDER`, with no console errors**
  - [x] **P2.T1.2: Compare tick deltas against an in-page animation-frame counter so a slow frame cannot look like a skipped system**

**Deviations:** none. The spec runs on the `tablet` project only — the phone project's three-file `testMatch`
allowlist excludes it (verified: `--project=phone` reports no tests) and `prod` cannot see `__tinyTracksScene`. The
caveat that `prefers-reduced-motion` would make the frame floor fail rather than pass falsely is recorded here
and in the evidence.

## Phase 3: Documentation and measurement

- **Goal:** the tech stack records the contract and the track's cost is measured rather than assumed.
- **Depends on:** Phase 2
- **Covers:** FR-11, FR-12, NFR-1, NFR-4, NFR-5, AC-6, AC-7
- **Touches:** `conductor/tech-stack.md`
- **Verification:** `pnpm check` and `pnpm build`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** e22ad9d
- **Evidence:** `conductor/tracks/frame-contract_20261109/verification/phase-3.md`

- [x] **P3.T1: Document the contract** — covers: FR-11
  - [x] **P3.T1.1: Record the module, the twelve-name order, the fail-fast rule and the e2e proof in the scene folder map and a short note**
- [x] **P3.T2: Measure what it cost** — covers: FR-12, NFR-4, NFR-5
  - [x] **P3.T2.1: Record precache entries, the gzipped JS delta against the base build, the unit-test count and the absence of `src/core`/dependency changes**

**Deviations:** performed by the primary, because the phase subagent is denied writes under `conductor/` and
this phase's only file is `conductor/tech-stack.md`. The order is twelve names, not the thirteen an early draft
of the spec listed — corrected before implementation and noted in the spec's edge cases. Gzip delta measured
like-for-like against a detached worktree build of the base commit: **+546 B**.

## Phase R1: Review Fixes

- **Goal:** close the six round-1 findings — the stale `starSpot` (the same defect class as the mood lag), the
  over-claiming publish test, the load-bearing order assertion, the untested duplicate guard, the inaccurate
  evidence claims and the `FrameInputs` JSDoc.
- **Depends on:** Phase 3
- **Covers:** F1, F2, F3, F4, F5, F6
- **Touches:** `src/scene/init-scene.ts`, `src/scene/frame-contract.ts`, `src/scene/frame-contract.test.ts`,
  `e2e/frame-contract.spec.ts`, `conductor/tracks/frame-contract_20261109/verification/*.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/frame-contract.spec.ts`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9418483
- **Evidence:** `conductor/tracks/frame-contract_20261109/verification/phase-R1.md`

- [x] **R1.T1: Publish `starSpot` from the system that owns it** — covers: F1
  - [x] **R1.T1.1: Move the fill into the `fleet` system, after `fleet.update(dt)`, and delete the pre-run fill**
- [x] **R1.T2: State what the publish test actually proves** — covers: F2
  - [x] **R1.T2.1: Reword the test comment to the shared-object/ordered-call pattern and record the wiring gap as residual risk**
- [x] **R1.T3: Make the browser order assertion independent** — covers: F3
  - [x] **R1.T3.1: Compare against a list spelled out in the spec instead of importing the tuple**
- [x] **R1.T4: Test the duplicate-append guard** — covers: F4
  - [x] **R1.T4.1: Add the appended-duplicate case and make the message say what happened**
- [x] **R1.T5: Correct the evidence** — covers: F5
  - [x] **R1.T5.1: Fix the "same arguments" claim, the superseded mood-lag note, the over-claim and the AC-6/AC-7 labels**
- [x] **R1.T6: Document where each value comes from** — covers: F6
  - [x] **R1.T6.1: Reword the `FrameInputs` JSDoc to the publish-from-the-owner rule**

## Phase R2: Second-round review fixes

- **Goal:** finish R1.T1.1 — the first attempt added the `fleet` publisher but left the pre-run fill alive, so the
  frame allocated a discarded spot and two comments named different publishers; and correct the evidence that
  claimed otherwise.
- **Depends on:** Phase R1
- **Covers:** R2-F1, R2-F2, R2-F3, R2-F4
- **Touches:** `src/scene/init-scene.ts`, `src/scene/frame-contract.test.ts`,
  `conductor/tracks/frame-contract_20261109/verification/integrated.md`,
  `conductor/tracks/frame-contract_20261109/verification/phase-R1.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/frame-contract.spec.ts e2e/smoke.spec.ts`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9418483
- **Evidence:** `conductor/tracks/frame-contract_20261109/review.md` (round 2) and `verification/integrated.md`

- [x] **R2.T1: Delete the pre-run fill for real** — covers: R2-F1
  - [x] **R2.T1.1: `onFrame` is only `frameRunner.run(frameInputs, dt)`; the ownership comment lives on `fleet` alone**
- [x] **R2.T2: Record the wiring gap where the hand-off document can see it** — covers: R2-F2
  - [x] **R2.T2.1: Add the residual-risk bullet and drop the "unit test proves the wiring" phrasing**
- [x] **R2.T3: Refresh the stale witness cells** — covers: R2-F3
  - [x] **R2.T3.1: 893 tests, literal-order witness, duplicate-message case**
- [x] **R2.T4: Assert the whole duplicate message** — covers: R2-F4
  - [x] **R2.T4.1: Expect the named repeat, not just the counts**

**Deviations:** performed by the primary (findings live in `conductor/` state). The first R1 attempt was reported
as verified while the pre-run fill survived; round 2 caught it, and this phase is the correction. No `src/core`,
dependency or lockfile change.

