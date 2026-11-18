# Performance Budget — Implementation Plan

> **Branch:** `feat/perf-budget_20261111`
> **Base:** `main` @ `6496b35aa7e7a37b6ff45ba45876a74a9703c3fa`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Interactive mark and CI observation

- **Goal:** dev build exposes a single interactive mark; a tablet-only `@ci` observation spec records the mark time and three frame-tick samples, with no FPS floor asserted yet.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-2, NFR-3, NFR-5, AC-1, AC-2, AC-3, AC-4
- **Touches:** `src/main.ts`, `e2e/perf-budget-observe.spec.ts`, `conductor/tracks/perf-budget_20261111/verification/phase-1.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget-observe.spec.ts`
- **Status:** verified

- [x] **P1.T1: Add dev-only interactive mark** — covers: FR-1, NFR-2, AC-1, AC-2
  - [x] **P1.T1.1: Mark the boot-ready path** — covers: FR-1, AC-1
  - [x] **P1.T1.2: Guard with import.meta.env.DEV and confirm absence from dist/** — covers: FR-1, NFR-2, AC-2
- [x] **P1.T2: Add tablet observation spec** — covers: FR-2, FR-3, NFR-5, AC-1, AC-3, AC-4
  - [x] **P1.T2.1: Assert interactive mark ≤ 5000 ms in a tablet @ci test** — covers: FR-2, AC-1, AC-3
  - [x] **P1.T2.2: Sample frameSystems tick counters and record three ticks/second values** — covers: FR-3, NFR-5, AC-4
- [x] **P1.T3: Prove production safety and local green** — covers: FR-6, NFR-1, NFR-3, AC-2, AC-7, AC-8
  - [x] **P1.T3.1: Build, grep dist for the mark name and confirm no UI/threshold change** — covers: FR-6, NFR-2, NFR-3, AC-2, AC-8
  - [x] **P1.T3.2: Run the exact Phase 1 verification command and record output** — covers: NFR-1, AC-7

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/perf-budget_20261111/verification/phase-1.md
-->

**Result:** verified  
**Checkpoint:** `4f5eb3a7aee92d179134bbedf89252a073f6fca3`  
**Evidence:** `conductor/tracks/perf-budget_20261111/verification/phase-1.md`

## Phase 2: Calibrated FPS floor and hard gate

- **Goal:** a new hard-fail `@ci` spec enforces an FPS floor derived from Phase 1 samples; both failure paths are proven negative, and the full matrix is green.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, NFR-1, NFR-4, NFR-5, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Touches:** `e2e/perf-budget.spec.ts`, `conductor/tracks/perf-budget_20261111/verification/phase-2.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts`
- **Status:** pending

- [ ] **P2.T1: Derive and document the floor** — covers: FR-4, NFR-5, AC-4
  - [ ] **P2.T1.1: Record minimum observed ticks/second and headroom subtraction in evidence** — covers: FR-4, NFR-5, AC-4
  - [ ] **P2.T1.2: State the calibrated floor as a named constant with the derivation comment** — covers: FR-4, AC-4
- [ ] **P2.T2: Add hard gate spec** — covers: FR-4, FR-5, AC-4, AC-5, AC-6
  - [ ] **P2.T2.1: Assert interactive mark ≤ 5000 ms and ticks/second ≥ floor in one tablet @ci test** — covers: FR-2, FR-4, AC-1, AC-4
  - [ ] **P2.T2.2: Fail closed when either the mark or tick counters are missing** — covers: FR-5, AC-5, AC-6
- [ ] **P2.T3: Prove both failure paths** — covers: FR-5, AC-5, AC-6
  - [ ] **P2.T3.1: Temporarily force a late mark and record the failing run** — covers: FR-5, AC-6
  - [ ] **P2.T3.2: Temporarily force a low tick count and record the failing run** — covers: FR-5, AC-5
- [ ] **P2.T4: Confirm full matrix and scope** — covers: FR-6, NFR-1, NFR-4, AC-7, AC-8, AC-9
  - [ ] **P2.T4.1: Run the exact Phase 2 verification command and record output** — covers: NFR-1, AC-7
  - [ ] **P2.T4.2: Record that manual-device feel remains human-only and the diff is production-safe** — covers: FR-6, NFR-4, AC-8, AC-9

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
