# Release v0.15.1 — Implementation Plan

> **Branch:** `chore/release-v0.15.1_20261123`
> **Base:** `main` @ `85d019354eb7e7479ab17dd6b2df0bf72ef1dd20`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Release content and local matrix

- **Goal:** Align version, changelog, product drift and clarity labels to v0.15.1, then prove the full local matrix green on final release content.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-5, NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5
- **Touches:** `package.json`, `CHANGELOG.md`, `conductor/product.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/tracks/release-v0.15.1_20261123/verification/phase-1.md`, `conductor/tracks/release-v0.15.1_20261123/verification/integrated.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high`
- **Status:** pending

- [ ] **P1.T1: Bump the release version** — covers: FR-1
  - [ ] **P1.T1.1: Set `package.json` version to `0.15.1` with no dependency or `pnpm-lock.yaml` diff.**
- [ ] **P1.T2: Curate the parent-facing changelog** — covers: FR-2
  - [ ] **P1.T2.1: Leave `[Unreleased]` empty and add `[0.15.1] - 2026-11-23` with a plain-language note that the updates now reach tablets reliably after a behind-the-scenes reliability fix.**
  - [ ] **P1.T2.2: Preserve the existing v0.15.0 cargo hand-off and layered-cloud entries as history; do not duplicate them into the new section.**
  - [ ] **P1.T2.3: Refresh the compare links at the foot of `CHANGELOG.md` for v0.15.1 and v0.15.0.**
- [ ] **P1.T3: Correct product-drift wording** — covers: FR-3
  - [ ] **P1.T3.1: Change `conductor/product.md:113` from the removed calibrated `2.5 ticks/s` frame floor to the deterministic frame-contract gate.**
  - [ ] **P1.T3.2: Change `conductor/product.md:114` so station cargo and sky detail are shipped rather than future ideas.**
  - [ ] **P1.T3.3: Add shipped rows for `station-cargo-clarity_20261120`, `sky-detail_20261120`, and `perf-floor-stability_20261120`.**
  - [ ] **P1.T3.4: Leave the v1.0 gate, Phase 3 options and anti-roadmap unchanged.**
- [ ] **P1.T4: Retarget the clarity baseline labels** — covers: FR-4
  - [ ] **P1.T4.1: Relabel `comparison.md` from v0.15.0 to v0.15.1 while all eight `awaiting observation` cells and the no-numbers wording stay intact.**
- [ ] **P1.T5: Run the full local matrix** — covers: FR-5
  - [ ] **P1.T5.1: Run the exact verification command, including both Playwright shards and the audit gate.**
  - [ ] **P1.T5.2: Record exact command results, gate exit codes and any pre-existing warnings without inventing values.**
- [ ] **P1.T6: Assemble release evidence** — covers: FR-5
  - [ ] **P1.T6.1: Write `verification/phase-1.md` with the scope guard, check table, AC-1..AC-5 mapping and honest non-claims.**
  - [ ] **P1.T6.2: Assemble `verification/integrated.md` after all phases with the full required-command table and requirements coverage.**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/release-v0.15.1_20261123/verification/phase-1.md
-->

## Phase 2: First release dry run

- **Goal:** Prove that a `workflow_dispatch` dry run from the release branch has every gate green and deploy skipped.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-4, AC-6
- **Touches:** `conductor/tracks/release-v0.15.1_20261123/verification/phase-2.md`, `conductor/tracks/release-v0.15.1_20261123/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` (then watch the dispatched run to completion and record the result)
- **Status:** pending

- [ ] **P2.T1: Dispatch and watch the first dry run** — covers: FR-6
  - [ ] **P2.T1.1: Dispatch the dry run from this branch, watch it to completion and record run ID, URL, jobs and timestamps.**
  - [ ] **P2.T1.2: Require all gates and image build green with deploy skipped; stop without tagging if it fails, is cancelled, or deploys.**
- [ ] **P2.T2: Record first-run evidence** — covers: FR-6
  - [ ] **P2.T2.1: Append the first dry-run result to `verification/integrated.md`.**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/release-v0.15.1_20261123/verification/phase-2.md
-->

## Phase 3: Second dry run and release gate evidence

- **Goal:** Prove a second consecutive dry-run success on final content and document the post-merge tagging and workflow-watch gates.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-7, NFR-4, NFR-6, AC-6, AC-7, AC-8
- **Touches:** `conductor/tracks/release-v0.15.1_20261123/verification/phase-3.md`, `conductor/tracks/release-v0.15.1_20261123/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` (then watch the dispatched run to completion and record the result)
- **Status:** pending

- [ ] **P3.T1: Prove two consecutive dry runs** — covers: FR-6
  - [ ] **P3.T1.1: Dispatch and watch a second distinct dry run; require all gates green and deploy skipped, and record its ID, URL, jobs and timestamps.**
  - [ ] **P3.T1.2: Assert both dry runs are green and stop without tagging if either fails, is cancelled, or deploys.**
- [ ] **P3.T2: Record release gate evidence** — covers: FR-7
  - [ ] **P3.T2.1: Record the automatic annotated-tag-after-merge gate at the squash merge commit, the no-overwrite rule, and the tag-triggered workflow-watch requirement.**
  - [ ] **P3.T2.2: Record PR inputs, review gate, archive gate, GHCR-403-is-unknown policy, and the explicit no-manual-tablet-check and no-v1.0-claim decisions.**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/release-v0.15.1_20261123/verification/phase-3.md
-->

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
