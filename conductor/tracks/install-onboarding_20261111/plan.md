# Install Onboarding — Implementation Plan

> **Branch:** `feat/install-onboarding_20261111`
> **Base:** `main` @ `ecaed2971a308f0c529e07a51b848064e540d502`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Classifier and preference data layer

- **Goal:** A pure install-mode classifier and a persisted dismissal flag are
  unit-proven, with no browser or UI coupling.
- **Depends on:** none
- **Covers:** FR-1, FR-6, NFR-1, NFR-2, AC-1, AC-6
- **Touches:** `src/core/install-mode.ts`, `src/core/install-mode.test.ts`, `src/core/save.ts`, `src/core/save.test.ts`, `src/state/persistence.ts`, `src/state/persistence.test.ts`
- **Verification:** `pnpm check && pnpm test:coverage`
- **Status:** verified

- [x] **P1.T1: Pure install-mode classifier** — covers: FR-1
  - [x] **P1.T1.1: Classify from an injectable display-mode query and `navigator.standalone`, tolerating missing APIs and non-browser environments**
  - [x] **P1.T1.2: Cover every signal combination, missing APIs, and a runtime media-query change in unit tests** — covers: AC-1
- [x] **P1.T2: Persisted install-hint dismissal preference** — covers: FR-6, FR-5
  - [x] **P1.T2.1: Add optional `installHintDismissed` to `DevicePreferences`, round-trip it through snapshots, and default missing/malformed values to false**
  - [x] **P1.T2.2: Write the flag through the full-snapshot save path; a rejected save stays non-fatal** — covers: AC-6

**Result:** verified — pure classifier with injectable signals and a live detector; dismissal round-trips through minimal snapshots with non-fatal saves. `pnpm check` and `pnpm test:coverage` both exit 0 (1009 tests, coverage above the 80% gate).
**Checkpoint:** 865e694
**Evidence:** conductor/tracks/install-onboarding_20261111/verification/phase-1.md

## Phase 2: Gated tray hint and wiring

- **Goal:** The hint appears in the 2s-hold tray only when browsing and not
  dismissed, and dismissal hides it immediately; the kid-facing surface is
  unchanged.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, NFR-3, NFR-4
- **Touches:** `src/ui/app.ts`, `src/ui/parent-gate.ts`, `src/style.css`, `src/main.ts`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P2.T1: Gated tray hint markup and styling** — covers: FR-3, FR-4
  - [ ] **P2.T1.1: Add an icon-led hint line with a short parent instruction and a labelled dismiss control inside `.preset-tray`**
  - [ ] **P2.T1.2: Style per parent-tray conventions with `:focus-visible`; leave the kid shell untouched**
- [ ] **P2.T2: Boot and media-change gating with dismissal wiring** — covers: FR-2, FR-5
  - [ ] **P2.T2.1: Hide the hint when standalone; show it only when browsing and not dismissed; react to media-query changes without reload**
  - [ ] **P2.T2.2: Dismiss writes the preference and hides the hint immediately; a world reset restores it**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/install-onboarding_20261111/verification/phase-2.md
-->

## Phase 3: E2E verification

- **Goal:** Browser-level proof of gating, dismissal persistence, reset
  restoration, and accessibility cleanliness.
- **Depends on:** Phase 2
- **Covers:** AC-2, AC-3, AC-4, AC-5, NFR-3
- **Touches:** `e2e/install-onboarding.spec.ts`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/install-onboarding.spec.ts e2e/a11y.spec.ts`
- **Status:** pending

- [ ] **P3.T1: Gating and kid-UI e2e assertions** — covers: AC-2, AC-3, AC-4
  - [ ] **P3.T1.1: Hint absent before the hold; after the 2s hold the tray shows icon and iOS instruction, nested in `.preset-tray`**
  - [ ] **P3.T1.2: Standalone emulation renders no hint and the kid-facing shell DOM is unchanged**
- [ ] **P3.T2: Dismissal and reset e2e assertions** — covers: AC-5
  - [ ] **P3.T2.1: Dismiss → reload → hidden; world reset → hint returns**
- [ ] **P3.T3: Accessibility regression sweep** — covers: NFR-3
  - [ ] **P3.T3.1: Existing axe sweep stays clean in four tablet states with the tray open**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/install-onboarding_20261111/verification/phase-3.md
-->
