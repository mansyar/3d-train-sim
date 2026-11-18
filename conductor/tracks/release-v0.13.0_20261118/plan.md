# Release v0.13.0 - Implementation Plan

> **Branch:** `chore/release-v0.13.0_20261118`
> **Base:** `main` @ `68a36405be2b6b0f71998fc20b1b97360e3d711c`
> **TDD:** not applicable — no logic-bearing code is changed. Each phase records its acceptance check in evidence before it is marked verified.

## Phase 1: Version and Release Documentation

- **Goal:** make `package.json`, `CHANGELOG.md`, and the clarity comparison artifact consistently describe v0.13.0 without inventing audit data.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-1, NFR-2, NFR-3, AC-1, AC-2, AC-3
- **Touches:** `package.json`, `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md`
- **Verification:** `pnpm check`
- **Status:** pending

- [ ] **P1.T1: Bump the release version** — covers: FR-1
  - [ ] **P1.T1.1: Change `package.json` version from `0.12.0` to `0.13.0`.**
  - [ ] **P1.T1.2: Check that remaining `0.12.0` strings occur only in CHANGELOG history, archives, or this track's prose.**
- [ ] **P1.T2: Curate the parent-facing CHANGELOG** — covers: FR-2
  - [ ] **P1.T2.1: Promote `[Unreleased]` into `## [0.13.0] - 2026-11-18` with notes for local insights, install onboarding, a11y polish, pnpm/audit, and the perf gate; leave an empty `[Unreleased]`.**
  - [ ] **P1.T2.2: Refresh compare links: `[Unreleased]` → `v0.13.0...HEAD`, add `[0.13.0]` → `v0.12.0...v0.13.0`.**
- [ ] **P1.T3: Retarget the clarity baseline label** — covers: FR-3
  - [ ] **P1.T3.1: Replace v0.12.0 with v0.13.0 in the comparison artifact title, section heading, table heading, and baseline prose.**
  - [ ] **P1.T3.2: Confirm every measured value remains `awaiting observation` and no number was added.**

**Result:** pending
**Checkpoint:** pending
**Evidence:** `conductor/tracks/release-v0.13.0_20261118/verification/phase-1.md`

## Phase 2: Pre-merge Verification

- **Goal:** prove the release branch passes the configured gates and record the evidence used by review and the release PR.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, NFR-4, AC-4, AC-5
- **Touches:** `conductor/tracks/release-v0.13.0_20261118/verification/integrated.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high`
- **Status:** pending

- [ ] **P2.T1: Run the full configured verification matrix** — covers: FR-4
  - [ ] **P2.T1.1: Run static, unit, coverage, build, full Playwright, and audit commands on the final release-branch content.**
  - [ ] **P2.T1.2: Record exact commands, results, and file/test counts in `verification/integrated.md`.**
  - [ ] **P2.T1.3: Confirm the diff remains limited to the Phase 1 files and Conductor evidence.**
- [ ] **P2.T2: Assemble release PR inputs** — covers: FR-5
  - [ ] **P2.T2.1: Record the release summary, phase checkpoints, verification table, and tag-approval gate for the primary to place in `pr.md`.**

**Result:** pending
**Checkpoint:** pending
**Evidence:** `conductor/tracks/release-v0.13.0_20261118/verification/integrated.md`

## Release Tag Gate (post-merge, not a phase)

After the release PR is merged, the primary must ask for explicit approval before
pushing the tag. On approval, the primary creates annotated tag `v0.13.0` at the
squash merge commit and runs `git push origin v0.13.0`, then stops. This gate
covers FR-6, AC-6, and AC-7. It is not a numbered phase because it cannot execute
before the PR merge; it is recorded in `verification/integrated.md` and `pr.md`
by the primary rather than by a phase subagent. No GHCR or production verification
is performed by this track.

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
