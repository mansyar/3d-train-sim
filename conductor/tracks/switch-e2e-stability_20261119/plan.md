# Switch E2E Stability and Release v0.14.1 — Implementation Plan

> **Branch:** `fix/switch-e2e-stability_20261119`
> **Base:** `main` @ `1ad84b2e996934532f54c6ddb1804366ca5fc2c9`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Frame-aware slip-road sampling

- **Goal:** Replace the fixed wall-clock slip-road sampler with frame/ride-progress-aware sampling and prove the old CI failure case is fixed without weakening the three-road/three-blade assertion.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-1, NFR-2, AC-1, AC-2
- **Touches:** `e2e/switches.spec.ts`, `e2e/helpers.ts`, `conductor/tracks/switch-e2e-stability_20261119/verification/phase-1.md`
- **Verification:** `pnpm check && pnpm exec playwright test e2e/switches.spec.ts --repeat-each=3`
- **Status:** verified

- [x] **P1.T1: Make slip sampling frame-aware** — covers: FR-1
  - [x] **P1.T1.1: Replace the fixed 320 × 400 ms polling loop with sampling tied to frame or ride progress, retaining a bounded safety timeout.**
  - [x] **P1.T1.2: Preserve the exact required blade keys `0.000`, `-0.210`, `0.210` and road keys `0.000`, `-1.571`, `1.571`, and include frame progress in failure diagnostics.**
- [x] **P1.T2: Prove the regression** — covers: FR-2
  - [x] **P1.T2.1: Add a focused regression case that reproduces the old missing-road condition and fails against the old sampler but passes with the new sampler, without weakening the active assertion.**
  - [x] **P1.T2.2: Record the before/after regression output and the three repeated switch-spec runs in phase evidence.**

**Result:** verified — frame-aware sampling passes three repeated switch-spec runs; the regression proves the old fixed-window sampler misses the east road while the new sampler observes all keys at frame 363.
**Checkpoint:** `580cc1cb8204f452ab2068e73cb467973b6b25dc`
**Evidence:** conductor/tracks/switch-e2e-stability_20261119/verification/phase-1.md

## Phase 2: v0.14.1 release content and first dry run

- **Goal:** Align version, changelog, and clarity baseline to v0.14.1 with no invented audit values, then prove the full local matrix and a first successful release dry run with deploy skipped.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-5, NFR-3, NFR-5, AC-3, AC-5
- **Touches:** `package.json`, `CHANGELOG.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/tracks/switch-e2e-stability_20261119/verification/integrated.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test && pnpm audit --audit-level=high && gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true`
- **Status:** verified

- [x] **P2.T1: Align v0.14.1 release documentation** - covers: FR-5
  - [x] **P2.T1.1: Bump `package.json` from `0.14.0` to `0.14.1`.**
  - [x] **P2.T1.2: Curate an empty `[Unreleased]` and a parent-facing `[0.14.1] - 2026-11-19` CHANGELOG section with refreshed compare links, explaining the release-flow fix.**
  - [x] **P2.T1.3: Retarget all clarity baseline labels to v0.14.1 while leaving all eight `awaiting observation` cells and all privacy/traceability wording intact.**
- [x] **P2.T2: Run the full local matrix and first dry run** - covers: FR-3
  - [x] **P2.T2.1: Run every configured local verification layer and record exact results in integrated evidence.**
  - [x] **P2.T2.2: Dispatch the first release dry run from the release branch, watch it to completion, require all gates and image build green with deploy skipped, and record run ID, URL, jobs, and timestamps.**
- [x] **P2.T3: Assemble release evidence** - covers: FR-3
  - [x] **P2.T3.1: Record phase checkpoints, release summary inputs, dry-run gate, automatic tag gate, and post-tag workflow-watch gate in integrated evidence.**

**Result:** verified — local matrix green, clarity baseline retargeted to v0.14.1, and first successful dry run `44493402673` recorded with deploy skipped; a cancelled infrastructure-only attempt is retained as history.
**Checkpoint:** 147f58c2635eb29407d74880be59b0597c01336f
**Evidence:** conductor/tracks/switch-e2e-stability_20261119/verification/integrated.md

## Phase 3: Second dry run and release gate evidence

- **Goal:** Prove a second consecutive dry-run success on the final release content and complete the evidence needed for review, PR, automatic tagging, and workflow watch.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-6, FR-7, FR-8, NFR-4, NFR-6, AC-4, AC-6, AC-7, AC-8
- **Touches:** `conductor/tracks/switch-e2e-stability_20261119/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref fix/switch-e2e-stability_20261119 --field dry_run=true` (then watch the dispatched run to completion and record the result)
- **Status:** in_progress

- [x] **P3.T1: Prove two consecutive dry runs** — covers: FR-4
  - [x] **P3.T1.1: Dispatch and watch a second distinct dry run from the release branch; require all gates and image build green with deploy skipped, and record run ID, URL, jobs, and timestamps.**
  - [x] **P3.T1.2: Assert both dry runs are green and stop without tagging if either fails, is cancelled, or deploys.**
- [x] **P3.T2: Record release gate evidence** — covers: FR-6, FR-7, FR-8
  - [x] **P3.T2.1: Record the automatic annotated-tag-after-merge gate at the squash merge commit, the no-tag-overwrite rule, and the tag-triggered workflow watch requirement.**
  - [x] **P3.T2.2: Record PR inputs, review gate, archive gate, GHCR-403-is-unknown policy, and the explicit no-manual-tablet-check decision.**

**Result:** verified — two consecutive successful dry runs (`44493402673`, `44514200919`) recorded with all gates green and deploy skipped; post-merge automatic tag and tag-workflow watch gates documented for primary execution.
**Checkpoint:** 2c57c2bff09f2439583b4b76f6bcf6f0be092a75
**Evidence:** conductor/tracks/switch-e2e-stability_20261119/verification/integrated.md

## Phase R1: Review Fixes

**Goal:** Resolve the round-1 Low documentation finding F1 by qualifying the product roadmap status until the post-merge and post-tag release gates complete, without changing code or release behavior.
**Depends on:** Phase 3
**Covers:** FR-6, AC-6
**Touches:** `conductor/product.md`, `conductor/tracks/switch-e2e-stability_20261119/verification/phase-R1.md`
**Verification:** `pnpm check`
**Status:** in_progress

- [ ] **R1.T1: Qualify roadmap status** — covers: FR-6
  - [ ] **R1.T1.1: Change the `switch-e2e-stability_20261119` product roadmap status from a premature `Shipped 2026-11-19` claim to a qualified fix-complete/release-gates-pending wording, keeping all other rows and the v0.14.1 clarity-baseline correction unchanged.**
- [ ] **R1.T2: Record review-fix evidence** — covers: AC-6
  - [ ] **R1.T2.1: Write `verification/phase-R1.md` with the before/after wording, focused regression result, `pnpm check`, and scope statement.**

**Result:** pending
**Checkpoint:** pending
**Evidence:** conductor/tracks/switch-e2e-stability_20261119/verification/phase-R1.md
