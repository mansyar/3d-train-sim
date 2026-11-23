# Implementation Plan: Clarity Observation Kit

- **Branch:** `chore/clarity-observation-kit_20261124`
- **Base:** `main` @ `3fcc79716c9a7cfed291a18ee738ad5e1cf29f8e`

## Phase 1: Draft kit artifacts and validator

- **Goal:** Produce the quick card, session log, and a deterministic static validator.
- **Depends on:** None
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** `conductor/tracks/clarity-observation-kit_20261124/quick-card.md`, `conductor/tracks/clarity-observation-kit_20261124/session-log.md`, `conductor/tracks/clarity-observation-kit_20261124/validate.mjs`, `conductor/tracks/clarity-observation-kit_20261124/verification/phase-1.md`
- **Verification:** `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`
- **Status:** in_progress

- [ ] **P1.T1: Write the quick card**
  - [ ] P1.T1.1: Include setup fields, consent reminder, both clock definitions and the 20:00 cap.
  - [ ] P1.T1.2: Include interruption, disengagement, sibling/device failure, no-ride and disagreement rules.
  - [ ] P1.T1.3: Include human-only iPad Safari and Android Chrome touch/audio/frame-feel prompts, visibly separate from measured values.

- [ ] **P1.T2: Write the session log sheet**
  - [ ] P1.T2.1: Include anonymous child 1 / 2 / 3 rows, setup context, both measured fields and observer notes with `not measured` defaults.
  - [ ] P1.T2.2: Include the top-five friction table with affected-child count then severity ordering and `not measured` defaults.
  - [ ] P1.T2.3: Include consent, withdrawal, no-identifiers, no-recording rules and traceability links.

- [ ] **P1.T3: Write the static validator**
  - [ ] P1.T3.1: Use Node built-ins only; assert required phrases in both artifacts.
  - [ ] P1.T3.2: Reject identifiers, numbers in result cells, clarity claims and v1.0 claims; exit non-zero with clear messages on failure.

- [ ] **P1.T4: Run exact verification**
  - [ ] P1.T4.1: Run `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs` and record exit codes.

- [ ] **P1.T5: Write phase evidence**
  - [ ] P1.T5.1: Write `verification/phase-1.md` with command results, AC-1..AC-6 table, scope guard, deviations and non-claims.

<!-- The primary appends after acceptance:
- **Result:** verified
- **Checkpoint:** <short-sha>
- **Evidence:** conductor/tracks/clarity-observation-kit_20261124/verification/phase-1.md
-->

## Phase 2: Integrated verification and scope guard

- **Goal:** Re-run the complete configured check set for this artifact-only track and record final evidence.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-1, NFR-3, NFR-4, NFR-5, AC-7
- **Touches:** `conductor/tracks/clarity-observation-kit_20261124/verification/integrated.md`
- **Verification:** `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`
- **Status:** pending

- [ ] **P2.T1: Re-run exact verification against final content**
  - [ ] P2.T1.1: Record exit codes for both commands.

- [ ] **P2.T2: Write integrated evidence**
  - [ ] P2.T2.1: Write `verification/integrated.md` with the required-command table, FR/NFR/AC coverage, scope guard and non-claims.

- [ ] **P2.T3: Prove scope**
  - [ ] P2.T3.1: Show the diff contains only this track's artifacts; no app, test, dependency, lockfile, release-doc, clarity-artifact or product change.

<!-- The primary appends after acceptance:
- **Result:** verified
- **Checkpoint:** <short-sha>
- **Evidence:** conductor/tracks/clarity-observation-kit_20261124/verification/integrated.md
-->

<!--
## Phase R1: Review Fixes
- **Goal:** Resolve `<finding ID>` from `review.md`.
- **Depends on:** Phase 2
- **Covers:** `<requirement ID>`
- **Touches:** `<paths>`
- **Verification:** `<exact command>`
- **Status:** pending
- [ ] **R1.T1: Resolve `<finding ID>`**
-->
