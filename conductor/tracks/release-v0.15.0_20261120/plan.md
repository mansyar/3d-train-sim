# Release v0.15.0 — Implementation Plan

> **Branch:** `chore/release-v0.15.0_20261120`
> **Base:** `main` @ `e13f6528bbc91f3bc75f04a1eaecfa800da6a572`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Release content and local matrix

- **Goal:** Align version, changelog, shipped docs wording and clarity labels to v0.15.0, then prove the full local matrix green on the final release content.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, NFR-5, AC-1, AC-2, AC-3, AC-4, AC-5
- **Touches:** `package.json`, `CHANGELOG.md`, `conductor/product.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, `conductor/tracks/release-v0.15.0_20261120/verification/phase-1.md`, `conductor/tracks/release-v0.15.0_20261120/verification/integrated.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high`
- **Status:** verified

- [x] **P1.T1: Bump the release version** — covers: FR-1
  - [x] **P1.T1.1: Set `package.json` version to `0.15.0` with no dependency or `pnpm-lock.yaml` diff.**
- [x] **P1.T2: Curate the parent-facing changelog** — covers: FR-2
  - [x] **P1.T2.1: Leave `[Unreleased]` empty and add `[0.15.0] - 2026-11-20` with plain-language entries for the cargo hand-off and the layered clouds.**
  - [x] **P1.T2.2: Refresh the compare links at the foot of `CHANGELOG.md` for v0.15.0 and v0.14.1.**
- [x] **P1.T3: Restore shipped roadmap wording** — covers: FR-3
  - [x] **P1.T3.1: Change only `conductor/product.md:115` from "v0.14.1 release gates pending" to shipped wording, leaving the rest of the roadmap, Phase 3, anti-roadmap and v1.0 gate unchanged.**
- [x] **P1.T4: Retarget the clarity baseline labels** — covers: FR-4
  - [x] **P1.T4.1: Relabel `comparison.md` from v0.14.1 to v0.15.0 while all eight `awaiting observation` cells and the no-numbers wording stay intact.**
- [x] **P1.T5: Run the full local matrix** — covers: FR-5
  - [x] **P1.T5.1: Run the exact verification command, including both Playwright shards and the audit gate.**
  - [x] **P1.T5.2: Record exact command results, gate exit codes and any pre-existing warnings without inventing values.**
- [x] **P1.T6: Assemble release evidence** — covers: FR-5
  - [x] **P1.T6.1: Write `verification/phase-1.md` with the scope guard, check table, AC-1..AC-5 mapping and honest non-claims; `verification/integrated.md` is assembled after all phases.**

**Result:** verified (after one primary rework of three phase-subagent permission denials; see evidence `## Primary rework 1`)
**Checkpoint:** `4f9d9a3`
**Evidence:** `conductor/tracks/release-v0.15.0_20261120/verification/phase-1.md`

## Phase 2: First release dry run

- **Goal:** Prove that a `workflow_dispatch` dry run from the release branch has every gate green and deploy skipped.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-4, AC-6
- **Touches:** `conductor/tracks/release-v0.15.0_20261120/verification/phase-2.md`, `conductor/tracks/release-v0.15.0_20261120/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true` (then watch the dispatched run to completion and record the result)
- **Status:** verified
- **Result:** verified after the user-authorized R1 e2e fix; final two dry runs (`44715407918`, `44717739869`) are consecutive successes with deploy skipped. Original failures retained in evidence.
- **Checkpoint:** `30f4676`
- **Evidence:** `conductor/tracks/release-v0.15.0_20261120/verification/phase-2.md`

- [x] **P2.T1: Dispatch and watch the first dry run** — covers: FR-6
  - [x] **P2.T1.1: Dispatch the dry run from this branch, watch it to completion and record run ID, URL, jobs and timestamps.**
  - [x] **P2.T1.2: Require all gates and image build green with deploy skipped; stop without tagging if it fails, is cancelled, or deploys.**
- [x] **P2.T2: Record first-run evidence** — covers: FR-6
  - [x] **P2.T2.1: Append the first dry-run result to `verification/integrated.md`.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/release-v0.15.0_20261120/verification/integrated.md
-->

## Phase 3: Second dry run and release gate evidence

- **Goal:** Prove a second consecutive dry-run success on final content and document the post-merge tagging and workflow-watch gates.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-7, NFR-4, NFR-6, AC-6, AC-7, AC-8
- **Touches:** `conductor/tracks/release-v0.15.0_20261120/verification/phase-3.md`, `conductor/tracks/release-v0.15.0_20261120/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true` (then watch the dispatched run to completion and record the result)
- **Status:** pending

- [ ] **P3.T1: Prove two consecutive dry runs** — covers: FR-6
  - [ ] **P3.T1.1: Dispatch and watch a second distinct dry run; require all gates green and deploy skipped, and record its ID, URL, jobs and timestamps.**
  - [ ] **P3.T1.2: Assert both dry runs are green and stop without tagging if either fails, is cancelled, or deploys.**
- [ ] **P3.T2: Record release gate evidence** — covers: FR-7
  - [ ] **P3.T2.1: Record the automatic annotated-tag-after-merge gate at the squash merge commit, the no-overwrite rule, and the tag-triggered workflow-watch requirement.**
  - [ ] **P3.T2.2: Record PR inputs, review gate, archive gate, GHCR-403-is-unknown policy and the explicit no-manual-tablet-check and no-v1.0-claim decisions.**

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/release-v0.15.0_20261120/verification/integrated.md
-->

## Phase R1: Cargo arc e2e determinism (user-authorized scope override)

- **Goal:** Remove the CI-load-sensitive RAF sampling from the cargo-arc e2e by recording a preallocated DEV-only transfer trace inside the cargo rig, so both arcs are asserted from samples the app itself recorded at transfer start and every tick.
- **Depends on:** Phase 1
- **Covers:** FR-6, NFR-4, AC-6 (2026-11-20 user override recorded in `spec.md`)
- **Touches:** `src/scene/rig-cargo.ts`, `src/scene/init-scene.ts`, `src/scene/rig-cargo.test.ts`, `e2e/cargo.spec.ts`, `conductor/tracks/release-v0.15.0_20261120/verification/phase-R1.md`
- **Verification:** `pnpm check && pnpm build && pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5 && pnpm exec playwright test e2e/sky-detail.spec.ts e2e/a11y.spec.ts e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts`
- **Status:** verified
- **Result:** verified — exact command green under the primary; cargo spec 5/5 repeats; two original dry-run failures recorded as context in evidence.
- **Checkpoint:** `2945aea`
- **Evidence:** `conductor/tracks/release-v0.15.0_20261120/verification/phase-R1.md`

- [x] **R1.T1: Add a preallocated DEV transfer trace to the cargo rig** — covers: FR-6
  - [x] **R1.T1.1: Record one in-place sample at transfer start and at every tick (including the landing tick), reusing fixed point objects in a bounded ring; assert no allocation in the frame path.**
  - [x] **R1.T1.2: Expose `cargoTransferTrace()` on the DEV `SceneHandle` in `init-scene.ts` and keep the existing live `cargoTransfer()` witness unchanged.**
- [x] **R1.T2: Make the cargo-arc e2e assert the recorded trace** — covers: AC-6
  - [x] **R1.T2.1: In `e2e/cargo.spec.ts`, assert both load and deliver arcs from the app-recorded trace (multiple samples, progress span, endpoint-to-spot geometry) instead of relying on the test's own RAF sampler under CI load.**
- [x] **R1.T3: Prove stability and record evidence** — covers: FR-6, NFR-4
  - [x] **R1.T3.1: Run the exact verification command above, including five repeats of the cargo spec and the neighbouring sky/a11y/perf specs.**
  - [x] **R1.T3.2: Write `verification/phase-R1.md` with command results, scope guard and explicit non-claims.**

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
