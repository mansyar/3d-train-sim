# Switch E2E Stability and Release v0.14.1 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Stabilize the double-slip switch e2e assertion so a slow, software-rendered CI run cannot miss a valid road cycle, and ship the fix as v0.14.1 with the full release workflow. The v0.14.0 tag remains untouched; v0.14.1 becomes the first publishable release from this line.

## Problem / Motivation

The tag-triggered v0.14.0 release run `44475228404` failed in `[tablet] e2e/switches.spec.ts:144 › every switch kind rides every road › ride all three slip roads with the entry blades and lever following`, then skipped `publish`. The observed values were `missing roads: -1.571` with roads `0.000`, `3.142`, `1.571` seen. The same test passed targeted and full local reruns; the failure appears only under CI load. The current assertion samples four entries for a fixed `320 × 400 ms` wall-clock window, while the ride cycle advances with rendered frames. Under software WebGL, a valid road can occur after the wall-clock cap, so the test reports a false product failure. Without a fix, releases remain blocked by a non-deterministic test and v0.14.0 stays unpublished.

## Goals & Success Metrics

- **Goal:** Make the slip-road e2e assertion deterministic under slow CI rendering and publish the repaired line as v0.14.1.
- **Metric:** A regression case that fails with the current fixed-time sampler passes after the fix; the full local matrix is green; two consecutive release dry runs are green with `publish` skipped; the tag-triggered v0.14.1 workflow completes with publish not skipped.

## Scope

### In Scope

- Replace the fixed wall-clock slip-road sampler with frame/ride-progress-aware sampling that still requires all three blade values and all three lever road angles.
- Add or adapt a regression case that demonstrably fails on the current timing-based assertion and passes after the fix.
- Bump version to `0.14.1`, curate a parent-facing CHANGELOG entry, retarget the clarity baseline labels to v0.14.1 with no invented values, and keep all eight `awaiting observation` cells unchanged.
- Run the full local verification matrix and two consecutive release-workflow dry runs from the release branch.
- Create the release PR, pass review, archive the track, merge, automatically create and push annotated tag `v0.14.1`, and watch the tag-triggered release workflow.

### Out of Scope

- Runtime changes to switch, ride, scene, or renderer source unless the fix investigation proves a real product defect rather than test timing.
- Deleting, overwriting, or force-pushing `v0.14.0`; changing the historical v0.14.0 tag or PR.
- Publishing from a `workflow_dispatch` dry run; dry runs must skip deploy.
- Manual tablet checks, GHCR package mutation, clarity audit measurements, phase-3 work, or v1.0 claims.
- Changing `playwright.config.ts` worker count or `release.yml` unless a phase proves it is required for determinism.

## Bug Details

- **Reproduction steps:**
  1. Push tag `v0.14.0` and run the release workflow.
  2. Observe the tablet e2e job on `ubuntu-24.04` with software WebGL and two workers.
  3. The slip-road sampling loop ends after 320 iterations × 400 ms without observing lever angle `-1.571`.
- **Expected behavior:** The test waits long enough, in a frame-aware way, to witness all three roads and all three blade poses before failing.
- **Actual behavior:** The test fails with `missing blades: ; missing roads: -1.571; seen blades: 0.000, -0.210, 0.210; seen roads: 0.000, 3.142, 1.571`, causing release `publish` to be skipped.
- **Root-cause hypothesis:** The assertion is coupled to wall-clock polling while the slip road cycle advances with rendered frames. Under low FPS, the wall-clock cap expires before every road is sampled; this is a test-timing defect, not evidence that the renderer skipped a road.
- **Regression test:** A focused e2e case that reproduces the old missing-road condition must fail against the current sampler and pass after frame-aware sampling; the exact before/after output is recorded in phase evidence.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The slip-road test samples blade/lever poses against frame or ride progress and does not expire solely from a fixed wall-clock iteration count. | must |
| FR-2 | The regression case proving the old timing failure is committed and documented with failing-before/passing-after evidence. | must |
| FR-3 | The full configured local verification matrix passes on the final release content. | must |
| FR-4 | Two consecutive release-workflow dry runs from the release branch pass all gates with publish/deploy skipped. | must |
| FR-5 | Version, parent-facing CHANGELOG, and clarity baseline are aligned to v0.14.1 with no invented audit values. | must |
| FR-6 | A release PR with PASS review and terminal proof is opened and merged. | must |
| FR-7 | After merge, annotated tag `v0.14.1` is created at the squash merge commit and pushed without overwriting another tag. | must |
| FR-8 | The tag-triggered release workflow is watched to completion and its success, failure, cancellation, or skipped publish is reported. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Implementation changes remain in e2e/test files unless a proven product defect requires otherwise; release documentation changes are limited to version/changelog/comparison/product artifact paths. |
| NFR-2 | No telemetry, network calls, storage keys, save-format changes, parent-gate changes, viewport changes, or kid-UI changes. |
| NFR-3 | Clarity audit values remain `awaiting observation`; no child data, timing values, or v1.0 claims are invented. |
| NFR-4 | No tag deletion, overwrite, force-push, workflow_dispatch publish, manual tablet check, or GHCR mutation. |
| NFR-5 | All configured checks remain green, including lint, typecheck, unit tests, 80% coverage gate, build, Playwright, and audit. |
| NFR-6 | GHCR package inspection returning 403 is reported as unknown, not as verified or unpublished. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The slip test still requires blade keys `0.000`, `-0.210`, `0.210` and road keys `0.000`, `-1.571`, `1.571`; sampling is tied to frame/ride progress with a bounded safety timeout. | FR-1 |
| AC-2 | Phase evidence records the regression case failing with the old sampler and passing with the new one. | FR-2 |
| AC-3 | `pnpm exec biome check .`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, and `pnpm audit --audit-level=high` all exit 0 on final release content. | FR-3 |
| AC-4 | Two distinct `workflow_dispatch` release dry runs from the release branch conclude success; each has all gates green and image build success, with deploy skipped. | FR-4 |
| AC-5 | `package.json` is `0.14.1`; CHANGELOG has an empty `[Unreleased]` and a dated `[0.14.1] - 2026-11-19` parent-facing section with refreshed compare links; comparison labels are v0.14.1 with eight `awaiting observation` cells intact. | FR-5 |
| AC-6 | Review verdict is PASS and archive/metadata/PR terminal proof is committed before merge. | FR-6 |
| AC-7 | Annotated tag `v0.14.1` resolves to the squash merge commit and exists on origin; v0.14.0 tag is unchanged. | FR-7 |
| AC-8 | The tag-triggered workflow is watched to completion and its conclusion plus publish job state are reported; GHCR 403 is reported as unknown. | FR-8 |

## Edge Cases

- A slow CI renderer advances few frames: sampling remains alive until the safety cap and still requires all three roads.
- A real renderer defect never produces a road: the test still fails rather than masking missing behavior.
- A dry run succeeds but deploy is accidentally not skipped: stop and report rather than treat as a dry run.
- The second dry run fails after the first passes: do not tag; record the failed run and stop.
- `v0.14.1` already exists locally or remotely: stop before tagging; do not overwrite.
- GHCR API returns 403: report package availability as unknown.
- Release workflow is cancelled or times out after tag push: report cancellation/timeout and do not claim publication.

## Dependencies

- **Tracks:** none
- **External:** GitHub Actions release workflow, GitHub PR/CI APIs, npm/pnpm toolchain, GHCR package visibility (read-only).

## Open Questions & Assumptions

- **Assumption:** The failure is a test-timing defect; any evidence of a real product defect changes scope and is reported before source edits.
- **Assumption:** Two successful dry runs are sufficient evidence before tagging, and both use `--ref` on this release branch with `dry_run=true`.
- **Assumption:** `v0.14.0` remains historical and is never retagged.
- **Assumption:** No manual tablet check is required for this patch release.

## References

- Failed release run: https://github.com/mansyar/3d-train-sim/actions/runs/44475228404
- Successful pre-tag dry run: https://github.com/mansyar/3d-train-sim/actions/runs/44464649923
- `e2e/switches.spec.ts:144,362-428` — failing slip-road assertion
- `playwright.config.ts:5-10` — two-worker policy
- `conductor/archive/release-v0.14.0_20261119/` — previous release plan and evidence conventions
- `conductor/archive/clarity-audit_20261110/comparison.md` — baseline labels and `awaiting observation` cells
