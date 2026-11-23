# Implementation Plan: Clarity Observation Kit

- **Branch:** `chore/clarity-observation-kit_20261124`
- **Base:** `main` @ `3fcc79716c9a7cfed291a18ee738ad5e1cf29f8e`

## Phase 1: Draft kit artifacts and validator

- **Goal:** Produce the quick card, session log, and a deterministic static validator.
- **Depends on:** None
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** `conductor/tracks/clarity-observation-kit_20261124/quick-card.md`, `conductor/tracks/clarity-observation-kit_20261124/session-log.md`, `conductor/tracks/clarity-observation-kit_20261124/validate.mjs`, `conductor/tracks/clarity-observation-kit_20261124/verification/phase-1.md`
- **Verification:** `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`
- **Status:** verified
- **Result:** verified (after two subagent permission denials and a primary content handoff authorized by the user; exact chain exit 0)
- **Checkpoint:** `c4e45c7`
- **Evidence:** `conductor/tracks/clarity-observation-kit_20261124/verification/phase-1.md`

- [x] **P1.T1: Write the quick card**
  - [x] P1.T1.1: Include setup fields, consent reminder, both clock definitions and the 20:00 cap.
  - [x] P1.T1.2: Include interruption, disengagement, sibling/device failure, no-ride and disagreement rules.
  - [x] P1.T1.3: Include human-only iPad Safari and Android Chrome touch/audio/frame-feel prompts, visibly separate from measured values.

- [x] **P1.T2: Write the session log sheet**
  - [x] P1.T2.1: Include anonymous child 1 / 2 / 3 rows, setup context, both measured fields and observer notes with `not measured` defaults.
  - [x] P1.T2.2: Include the top-five friction table with affected-child count then severity ordering and `not measured` defaults.
  - [x] P1.T2.3: Include consent, withdrawal, no-identifiers, no-recording rules and traceability links.

- [x] **P1.T3: Write the static validator**
  - [x] P1.T3.1: Use Node built-ins only; assert required phrases in both artifacts.
  - [x] P1.T3.2: Reject identifiers, numbers in result cells, clarity claims and v1.0 claims; exit non-zero with clear messages on failure.

- [x] **P1.T4: Run exact verification**
  - [x] P1.T4.1: Run `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs` and record exit codes.

- [x] **P1.T5: Write phase evidence**
  - [x] P1.T5.1: Write `verification/phase-1.md` with command results, AC-1..AC-6 table, scope guard, deviations and non-claims.

## Phase 2: Integrated verification and scope guard

- **Goal:** Re-run the complete configured check set for this artifact-only track and record final evidence.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-1, NFR-3, NFR-4, NFR-5, AC-7
- **Touches:** `conductor/tracks/clarity-observation-kit_20261124/verification/integrated.md`
- **Verification:** `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`
- **Status:** verified
- **Result:** PASS — exact chain exit 0 on final content; validator PASS; scope confined to track artifacts.
- **Checkpoint:** `7c791ef`
- **Evidence:** `conductor/tracks/clarity-observation-kit_20261124/verification/integrated.md`

- [x] **P2.T1: Re-run exact verification against final content**
  - [x] P2.T1.1: Record exit codes for both commands.

- [x] **P2.T2: Write integrated evidence**
  - [x] P2.T2.1: Write `verification/integrated.md` with the required-command table, FR/NFR/AC coverage, scope guard and non-claims.

- [x] **P2.T3: Prove scope**
  - [x] P2.T3.1: Show the diff contains only this track's artifacts; no app, test, dependency, lockfile, release-doc, clarity-artifact or product change.


## Phase R1: Review Fixes

- **Goal:** Resolve F1 from `review.md` by correcting the requirement-ID mapping in the integrated evidence while leaving the kit artifacts unchanged.
- **Depends on:** Phase 2
- **Covers:** F1 (evidence traceability / AC-7)
- **Touches:** `conductor/tracks/clarity-observation-kit_20261124/verification/integrated.md`, `conductor/tracks/clarity-observation-kit_20261124/verification/phase-R1.md`
- **Verification:** `pnpm check && node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`
- **Status:** pending

- [ ] **R1.T1: Correct integrated evidence requirement mapping**
  - [ ] R1.T1.1: Rewrite FR-1..FR-6, NFR-1..NFR-5 and AC-1..AC-7 rows to match `spec.md:41-70`.
  - [ ] R1.T1.2: Keep all existing evidence-path references and non-claims unchanged.

- [ ] **R1.T2: Verify and record evidence**
  - [ ] R1.T2.1: Re-run the exact verification command and write `verification/phase-R1.md` with the F1 fix, commands, scope guard and delta note.
