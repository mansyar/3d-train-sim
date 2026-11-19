# Station Cargo Clarity — Implementation Plan

> **Branch:** `feat/station-cargo-clarity_20261120`
> **Base:** `main` @ `be83e91714cea3c4a1b2d58623301e6f394561a0`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Pure transfer timing and data-contract guard

- **Goal:** Prove a deterministic, allocation-free cargo transfer progress helper exists and that cargo data/save semantics stay untouched.
- **Depends on:** none
- **Covers:** FR-3, FR-5, NFR-1, NFR-3, AC-1, AC-5
- **Touches:** `src/core/cargo-transfer.ts`, `src/core/cargo-transfer.test.ts`, `conductor/tracks/station-cargo-clarity_20261120/verification/phase-1.md`
- **Verification:** `pnpm check && pnpm test:coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 9b3d81b
- **Evidence:** conductor/tracks/station-cargo-clarity_20261120/verification/phase-1.md

- [x] **P1.T1: Add pure cargo transfer helper** — covers: FR-3
  - [x] **P1.T1.1: Deterministic bounded arc progress with a short gentle lift and no per-frame allocation**
  - [x] **P1.T1.2: Cancel-and-snap semantics and direction-independent interpolation**
- [x] **P1.T2: Guard the unchanged cargo/save contract** — covers: FR-5
  - [x] **P1.T2.1: Assert CargoLoad, CargoAction, actionAtStop, loadAfterAction, deliveredCountAfter and snapshot keys are unchanged**

## Phase 2: Visible station/wagon hand-off and verification

- **Goal:** Prove on tablet that loading and delivery show a short crate arc between platform slot and wagon bed, reduce instant fallback when requested, and preserve the cargo loop with a dev/e2e witness.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-4, FR-6, NFR-2, NFR-4, NFR-5, NFR-6, AC-2, AC-3, AC-4, AC-6, AC-7, AC-8
- **Touches:** `src/scene/rig-cargo.ts`, `src/scene/train-fleet.ts`, `src/scene/init-scene.ts`, `e2e/cargo.spec.ts`, `conductor/tracks/station-cargo-clarity_20261120/verification/phase-2.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts`
- **Status:** in_progress

- [ ] **P2.T1: Animate station-to-wagon loading** — covers: FR-1
  - [ ] **P2.T1.1: Use the next `station_crate_N` slot as the arc origin and the wagon bed as the destination**
  - [ ] **P2.T1.2: Cancel and snap to the final loaded state on interruption or train stop**
- [ ] **P2.T2: Animate wagon-to-station delivery** — covers: FR-2
  - [ ] **P2.T2.1: Use the wagon bed as the arc origin and the next visible `station_crate_N` slot as the destination, keeping the pile capped at 8**
  - [ ] **P2.T2.2: Increment the persisted delivery count exactly once and keep the existing confetti cue**
- [ ] **P2.T3: Honor reduced motion** — covers: FR-4
  - [ ] **P2.T3.1: Use the existing instant state change without a visible transfer arc while still completing the delivery**
- [ ] **P2.T4: Add e2e visual-continuity proof and scope guard** — covers: FR-6
  - [ ] **P2.T4.1: Add a dev/e2e witness for active transfer kind, normalized progress, and endpoints; assert both load and delivery arcs move**
  - [ ] **P2.T4.2: Assert reduced-motion instant fallback and unchanged delivery count**
  - [ ] **P2.T4.3: Record full-matrix results and prove no sky, train-length, piece-type, kid-text, dependency, or storage-key change**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/station-cargo-clarity_20261120/verification/phase-2.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
