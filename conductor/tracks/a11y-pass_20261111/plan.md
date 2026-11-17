# Accessibility Pass — Implementation Plan

> **Branch:** `feat/a11y-pass_20261111`
> **Base:** `main` @ `0e985dbb1b7ce44b3523630e8c93857fecf0d2f8`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Toolchain, focus and zoom policy

- **Goal:** Axe is installed and documented, keyboard focus is visible, and
  zoom is available only while the parent tray is visible.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-1, NFR-3, NFR-4, AC-1, AC-2, AC-3
- **Touches:** `package.json`, `pnpm-lock.yaml`, `conductor/tech-stack.md`, `src/style.css`, `src/ui/parent-gate.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Add axe tooling and record the stack change** — covers: FR-1, NFR-4, AC-1
  - [x] **P1.T1.1: Install `@axe-core/playwright` as a devDependency and commit the lockfile update**
  - [x] **P1.T1.2: Document the dev-only e2e tool in `conductor/tech-stack.md`**
- [x] **P1.T2: Add visible keyboard focus styling** — covers: FR-2, NFR-1, NFR-3, AC-2
  - [x] **P1.T2.1: Add a `:focus-visible` ring using existing tokens with a clear offset; keep pointer focus quiet and target sizes unchanged**
- [x] **P1.T3: Settle the parent-only zoom policy** — covers: FR-3, NFR-1, AC-3
  - [x] **P1.T3.1: Add a viewport helper with the default kid-safe content string**
  - [x] **P1.T3.2: Apply the policy on every tray show/hide path, including the portable-note path, so reload restores no-zoom**

**Result:** verified — axe devDependency and dated tech-stack note added; `:focus-visible` ring on all buttons and canvas; viewport zoom enabled only while the parent tray is visible; `pnpm check` exit 0 (988 tests).
**Checkpoint:** `9d241f7`
**Evidence:** `conductor/tracks/a11y-pass_20261111/verification/phase-1.md`
**Deviation:** `renovate.json` grouped the new devDependency with existing test tooling — required by `src/core/renovate-config.test.ts`, smallest necessary edit. No squash: the active goal prohibits `reset`, and all five reported commits are retained.

## Phase 2: Axe sweep and bounded fixes

- **Goal:** Four tablet states are axe-clean with documented contrast and zoom
  behavior, and any ARIA defects found are fixed minimally.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2, AC-4, AC-5, AC-6, AC-7
- **Touches:** `e2e/a11y.spec.ts`, `src/ui/*.ts`, `src/style.css`, `conductor/product-guidelines.md`, `conductor/tracks/a11y-pass_20261111/verification/contrast.md`
- **Verification:** `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet`
- **Status:** pending

- [ ] **P2.T1: Add the axe e2e spec for four tablet states** — covers: FR-4, AC-4
  - [ ] **P2.T1.1: Scan the idle state**
  - [ ] **P2.T1.2: Scan the toy drawer open state**
  - [ ] **P2.T1.3: Scan the parent tray open state and assert zoom is enabled**
  - [ ] **P2.T1.4: Scan the riding state**
- [ ] **P2.T2: Fix axe findings in bounded UI scope** — covers: FR-5, AC-6
  - [ ] **P2.T2.1: Apply minimal ARIA/label corrections and record each with file and reason in the evidence**
- [ ] **P2.T3: Document contrast** — covers: FR-6, AC-5
  - [ ] **P2.T3.1: Record palette token ratios and the color-contrast result in `verification/contrast.md`**
- [ ] **P2.T4: Record the zoom resolution in the guidelines** — covers: FR-7, AC-7
  - [ ] **P2.T4.1: Update the viewport rule in `conductor/product-guidelines.md` to the settled parent-only policy**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/a11y-pass_20261111/verification/phase-2.md
-->

## Phase 3: Roadmap sync and full gate

- **Goal:** The roadmap records the shipped track and every configured check
  passes after all changes are integrated.
- **Depends on:** Phase 2
- **Covers:** FR-7, NFR-2, NFR-3, AC-7, AC-8
- **Touches:** `conductor/product.md`, `conductor/tracks/a11y-pass_20261111/verification/integrated.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` and `pnpm build`
- **Status:** pending

- [ ] **P3.T1: Mark the roadmap row Shipped** — covers: FR-7, AC-7
- [ ] **P3.T2: Run the full gate and write integrated evidence** — covers: NFR-2, NFR-3, AC-8
  - [ ] **P3.T2.1: Run `pnpm check`, the axe e2e spec and `pnpm build`**
  - [ ] **P3.T2.2: Write `verification/integrated.md` with commands, exits, AC coverage and deviations**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
