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
- **Checkpoint:** pending-squash
- **Evidence:** `conductor/tracks/frame-contract_20261109/verification/phase-3.md`

- [x] **P3.T1: Document the contract** — covers: FR-11
  - [x] **P3.T1.1: Record the module, the twelve-name order, the fail-fast rule and the e2e proof in the scene folder map and a short note**
- [x] **P3.T2: Measure what it cost** — covers: FR-12, NFR-4, NFR-5
  - [x] **P3.T2.1: Record precache entries, the gzipped JS delta against the base build, the unit-test count and the absence of `src/core`/dependency changes**

**Deviations:** performed by the primary, because the phase subagent is denied writes under `conductor/` and
this phase's only file is `conductor/tech-stack.md`. The order is twelve names, not the thirteen an early draft
of the spec listed — corrected before implementation and noted in the spec's edge cases. Gzip delta measured
like-for-like against a detached worktree build of the base commit: **+546 B**.

<!--
The primary agent appends after verification, per phase:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/frame-contract_20261109/verification/phase-1.md
-->
