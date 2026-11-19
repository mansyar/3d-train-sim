# Release v0.14.0 — Implementation Plan

> **Branch:** `chore/release-v0.14.0_20261119`
> **Base:** `main` @ `9dee5cc4cb6b740a3f5974ec155cb470a3d09d1b`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Version and Release Documentation

- **Goal:** make `package.json`, `CHANGELOG.md`, the clarity comparison artifact, and the clarity-audit link in `product.md` consistently describe v0.14.0 without inventing audit data.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-2, NFR-3, NFR-6, AC-1, AC-2, AC-3, AC-4
- **Touches:** `package.json`, `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/product.md`, `conductor/tracks/release-v0.14.0_20261119/verification/phase-1.md`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Bump the release version** — covers: FR-1
  - [x] **P1.T1.1: Change `package.json` version from `0.13.0` to `0.14.0`.**
  - [x] **P1.T1.2: Check that remaining `0.13.0` strings occur only in CHANGELOG history, archives, or this track's prose.**
- [x] **P1.T2: Curate the parent-facing CHANGELOG** — covers: FR-2
  - [x] **P1.T2.1: Promote `[Unreleased]` into `## [0.14.0] - 2026-11-19` with parent notes for paged toybox tabs, hand-drawn piece icons, and easier removal beyond the board; leave an empty `[Unreleased]`.**
  - [x] **P1.T2.2: Refresh compare links: `[Unreleased]` → `v0.14.0...HEAD`, add `[0.14.0]` → `v0.13.0...v0.14.0`.**
- [x] **P1.T3: Retarget the clarity baseline label** — covers: FR-3
  - [x] **P1.T3.1: Replace v0.13.0 with v0.14.0 in the comparison artifact title, section heading, table heading, and baseline prose.**
  - [x] **P1.T3.2: Confirm every measured value remains `awaiting observation` and no number was added.**
- [x] **P1.T4: Correct the clarity artifact link in product docs** — covers: FR-4
  - [x] **P1.T4.1: Change `conductor/tracks/clarity-audit_20261110/` to `conductor/archive/clarity-audit_20261110/` in `conductor/product.md`.**

**Result:** verified — version, changelog, clarity baseline, and product link are aligned to v0.14.0 with no invented audit data.
**Checkpoint:** `6677c9bff4ab6ac05191ceb6f975f6698dc7e8b4`
**Evidence:** `conductor/tracks/release-v0.14.0_20261119/verification/phase-1.md`

## Phase 2: Pre-merge Verification, Dry Run, and PR Inputs

- **Goal:** prove the release branch passes the configured gates and the release workflow dry run, then record the evidence used by review and the release PR.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, FR-7, NFR-4, NFR-5, AC-5, AC-6, AC-7
- **Touches:** `conductor/tracks/release-v0.14.0_20261119/verification/integrated.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high && gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true`
- **Status:** verified

- [x] **P2.T1: Run the full configured verification matrix** — covers: FR-5
  - [x] **P2.T1.1: Run static, unit, coverage, build, full Playwright, and audit commands on the final release-branch content.**
  - [x] **P2.T1.2: Record exact commands, results, and file/test counts in `verification/integrated.md`.**
  - [x] **P2.T1.3: Confirm the diff remains limited to the Phase 1 files and Conductor evidence.**
- [x] **P2.T2: Run the release-workflow dry run** — covers: FR-6
  - [x] **P2.T2.1: Dispatch `release.yml` from `chore/release-v0.14.0_20261119` with `dry_run=true`.**
  - [x] **P2.T2.2: Wait for the run to complete and require all gates plus image build to succeed with no publish or deploy.**
  - [x] **P2.T2.3: Record the run URL, jobs, and conclusion in `verification/integrated.md`.**
- [x] **P2.T3: Assemble release PR inputs** — covers: FR-7
  - [x] **P2.T3.1: Record the release summary, phase checkpoints, verification table, dry-run gate, and automatic tag/post-tag workflow gates for the primary to place in `pr.md`.**

**Result:** verified — local matrix green, release dry run successful with no deploy, and PR/tag/workflow gates recorded.
**Checkpoint:** `069c0c4887acea8a1f381c2379d35d86127ac176`
**Evidence:** `conductor/tracks/release-v0.14.0_20261119/verification/integrated.md`

## Release Tag and Workflow Gate (post-merge, not a phase)

After the release PR is merged, the primary automatically creates annotated tag
`v0.14.0` at the squash merge commit and runs `git push origin v0.14.0` without a
second user confirmation. No manual tablet check is performed; that is an explicit
user decision recorded in the spec. The primary then watches the tag-triggered
release workflow to completion and reports success, failure, cancellation, or a
skipped publish job. A GHCR package query returning 403 is reported as unknown,
not inferred as published or unpublished by the agent. This gate covers FR-8,
FR-9, AC-8, and AC-9. It is recorded in `verification/integrated.md` and `pr.md`
by the primary rather than by a phase subagent.

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
