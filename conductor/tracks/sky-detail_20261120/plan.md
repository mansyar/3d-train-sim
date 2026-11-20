# Sky Detail — Implementation Plan

> **Branch:** `feat/sky-detail_20261120`
> **Base:** `main` @ `da63f087eceec2754e7e0daf5efa71a0a7206a77`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Pure cloud-layer math and contract guards

- **Goal:** deterministic, allocation-free cloud-layer math exists with TDD tests
  and a frozen visual-only contract guard.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-5, FR-7, AC-1, AC-3, AC-5, AC-7
- **Touches:** `src/core/cloud-layers.ts`, `src/core/cloud-layers.test.ts`, `verification/phase-1.md`
- **Verification:** `pnpm check && pnpm test:coverage`
- **Status:** in_progress

- [ ] **P1.T1: Failing tests for layer/cover/parallax helpers** — covers: FR-1, FR-2, FR-3, FR-5
  - [ ] **P1.T1.1: exactly two layer descriptors with distinct depth and speed**
  - [ ] **P1.T1.2: cover monotone in cloud intensity, clamped; snow stays moderate**
  - [ ] **P1.T1.3: drift wraps inside the arc; near layer faster than far; deterministic**
  - [ ] **P1.T1.4: scratch `out` object identity preserved over repeated calls (no allocation)**
- [ ] **P1.T2: Implement the pure helper** — covers: FR-1, FR-2, FR-3, FR-5
- [ ] **P1.T3: Guard the visual-only contract** — covers: FR-7, AC-7
  - [ ] **P1.T3.1: assert no save-key/schema/snapshot-key/dependency changes in the diff**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/sky-detail_20261120/verification/phase-1.md
-->

## Phase 2: Visible layered clouds and witnesses

- **Goal:** two-layer clouds render in the live scene, follow weather, freeze
  under reduced motion, and are provable by witnesses and e2e.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8
- **Touches:** `src/scene/weather-particles.ts`, `src/scene/day-ambience.ts`, `src/scene/init-scene.ts`, `e2e/sky-detail.spec.ts`, `verification/phase-2.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/sky-detail.spec.ts e2e/sun-moon.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts`
- **Status:** pending

- [ ] **P2.T1: Build the two fixed cloud pools** — covers: FR-1, FR-2, FR-3, FR-5
  - [ ] **P2.T1.1: near/far sprite pools reuse the existing puff texture; no post-boot mesh creation**
  - [ ] **P2.T1.2: feed layer opacity and speed from the Phase 1 helper in place**
  - [ ] **P2.T1.3: wrap drift inside the arc and preserve the quality guardrail scale**
- [ ] **P2.T2: Wire reduced motion and weather/day repaint** — covers: FR-4, FR-7
  - [ ] **P2.T2.1: freeze drift under reduced motion while keeping static layered clouds visible**
  - [ ] **P2.T2.2: keep weather cross-fades and day-phase tint working with no flash**
- [ ] **P2.T3: Dev/e2e witnesses and specs** — covers: FR-6, AC-1, AC-2, AC-3, AC-4, AC-6
  - [ ] **P2.T3.1: expose layer count, drift state/relative speed and cover on the DEV scene handle**
  - [ ] **P2.T3.2: assert two layers, weather response, parallax drift and reduced-motion freeze**
  - [ ] **P2.T3.3: keep existing sun-moon, a11y and perf specs unchanged and green**
- [ ] **P2.T4: Scope guard and evidence** — covers: AC-5, AC-7, AC-8
  - [ ] **P2.T4.1: prove no new network/identifier/script, no save/UI/audio/dependency diff**
  - [ ] **P2.T4.2: write `verification/phase-2.md`**

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
