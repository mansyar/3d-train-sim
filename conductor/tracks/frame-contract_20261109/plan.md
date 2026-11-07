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
- **Status:** pending

- [ ] **P1.T1: Write the contract module** — covers: FR-1
  - [ ] **P1.T1.1: Declare `FRAME_SYSTEM_ORDER` with one reason per entry, plus the `FrameSystemName`, `FrameInputs` and `FrameSystem` types**
  - [ ] **P1.T1.2: Implement `createFrameRunner` with fail-fast name validation and in-place tick counters**
- [ ] **P1.T2: Test the runner headlessly** — covers: FR-4, FR-5
  - [ ] **P1.T2.1: Prove the order, the counts and the error messages for a missing, extra and swapped system**
  - [ ] **P1.T2.2: Prove one tick per `run()` and that the snapshot never allocates per frame**
- [ ] **P1.T3: Give the fleet a void update** — covers: FR-8
  - [ ] **P1.T3.1: Make `fleet.update(dt)` return `void` and add `steamPuffCount()`**
  - [ ] **P1.T3.2: Point the existing steam-puff witness at the new accessor**
- [ ] **P1.T4: Drive the loop from the runner** — covers: FR-6, FR-9
  - [ ] **P1.T4.1: Build the thirteen systems in `init-scene.ts`, fill one `FrameInputs` per frame, and replace the `onFrame` body**
  - [ ] **P1.T4.2: Add the `frameSystems()` probe to `SceneHandle` behind the existing dev handle**

## Phase 2: Browser proof

- **Goal:** the live loop proves its own cadence — documented names in order, and every system advancing exactly one tick per animation frame.
- **Depends on:** Phase 1
- **Covers:** FR-10, AC-4
- **Touches:** `e2e/frame-contract.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/frame-contract.spec.ts` and `pnpm check`
- **Status:** pending

- [ ] **P2.T1: Assert the contract in the running app** — covers: FR-10
  - [ ] **P2.T1.1: Assert `frameSystems()` names equal `FRAME_SYSTEM_ORDER`, with no console errors**
  - [ ] **P2.T1.2: Compare tick deltas against an in-page animation-frame counter so a slow frame cannot look like a skipped system**

## Phase 3: Documentation and measurement

- **Goal:** the tech stack records the contract and the track's cost is measured rather than assumed.
- **Depends on:** Phase 2
- **Covers:** FR-11, FR-12, NFR-1, NFR-4, NFR-5, AC-6, AC-7
- **Touches:** `conductor/tech-stack.md`
- **Verification:** `pnpm check` and `pnpm build`
- **Status:** pending

- [ ] **P3.T1: Document the contract** — covers: FR-11
  - [ ] **P3.T1.1: Record the module, the thirteen-name order, the fail-fast rule and the e2e proof in the scene folder map and a short note**
- [ ] **P3.T2: Measure what it cost** — covers: FR-12, NFR-4, NFR-5
  - [ ] **P3.T2.1: Record precache entries, the gzipped JS delta against the base build, the unit-test count and the absence of `src/core`/dependency changes**

<!--
The primary agent appends after verification, per phase:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/frame-contract_20261109/verification/phase-1.md
-->
