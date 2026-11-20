## Summary

Ship Tiny Tracks v0.15.0, releasing the visible station-cargo hand-off (#86) and the two-layer drifting sky clouds (#87). This track aligns the version, parent-facing changelog, product artifact wording and clarity baseline, verifies the full local matrix, makes the cargo-arc e2e deterministic under CI load after two failed dry runs, and records two consecutive green release dry runs. Post-merge tagging and tag-workflow watch remain primary-owned gates. No save, telemetry, dependency, workflow or player-facing behavior change is included.

## Track

- **ID:** `release-v0.15.0_20261120`
- **Type:** Chore
- **Spec:** [spec.md](conductor/archive/release-v0.15.0_20261120/spec.md)
- **Plan:** [plan.md](conductor/archive/release-v0.15.0_20261120/plan.md)
- **Review:** [review.md](conductor/archive/release-v0.15.0_20261120/review.md)
- **Integrated verification:** [integrated.md](conductor/archive/release-v0.15.0_20261120/verification/integrated.md)

## What happened

| Phase | Description | Checkpoint |
| --- | --- | --- |
| Phase 1 | Bumped version to `0.15.0`, curated the parent-facing CHANGELOG with cargo and cloud entries, restored shipped `product.md:115` wording, retargeted the clarity baseline to v0.15.0 with all values still `awaiting observation`, and ran the full local matrix. | `4f9d9a3` |
| Phase R1 | User-authorized override after two failed dry runs: added a bounded preallocated cargo-transfer trace read only through the DEV scene handle and made the cargo-arc e2e assert from app-recorded samples. No crate timing or player-facing change. | `2945aea` |
| Phase 2 | Verified the first release dry run after R1, including disclosure of an intervening perf-floor flake. | `30f4676` |
| Phase 3 | Verified two consecutive green dry runs and recorded all post-merge release gates. | `eae4cae` |
| Post-merge gate | Automatically create an annotated `v0.15.0` tag at the squash merge commit, push it, and watch the tag-triggered release workflow. | pending |

## Requirements

- [x] FR-1 — version set to `0.15.0`, no dependency or lockfile change
- [x] FR-2 — parent-facing CHANGELOG with empty `[Unreleased]`, dated `[0.15.0]` entries and refreshed compare links
- [x] FR-3 — `product.md:115` restored to shipped wording
- [x] FR-4 — clarity baseline retargeted with all eight cells still `awaiting observation`
- [x] FR-5 — full local matrix green
- [x] FR-6 — two consecutive release dry runs green with deploy skipped
- [ ] FR-7 — automatic annotated `v0.15.0` tag and tag-workflow watch (post-merge)
- [x] NFR-1/NFR-2 — no runtime, save, telemetry, UI, audio, dependency or workflow change in release content
- [x] NFR-3 — no clarity numbers and no v1.0 claim
- [x] NFR-4 — no tag overwrite or force-push; GHCR 403 reported as unknown
- [x] NFR-5 — all configured checks green
- [x] NFR-6 — manual device check skipped by explicit user decision
- [x] AC-1 through AC-6, AC-8
- [ ] AC-7 — post-merge tag and tag-workflow gates

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| Lint | `pnpm exec biome check .` | pass — 204 files clean |
| Typecheck | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 60 files / 1051 tests |
| Coverage | `pnpm test:coverage` | pass — 97.18% stmts / 91.48% branches / 97.45% funcs / 98.95% lines |
| Build | `pnpm build` | pass — 117 modules, PWA service worker generated |
| E2E | sharded full Playwright matrix | pass — 50 + 41, 1 pre-existing `@ci` skip, 0 failures |
| Audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical |
| Cargo stability | `pnpm exec playwright test e2e/cargo.spec.ts --repeat-each=5` | pass — 30/30 |
| Dry runs | `gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true` | final runs `44715407918` and `44717739869` both green; image built but not pushed; Coolify deploy skipped |

The first two dry runs (`44698232311`, `44700234497`) failed on the cargo-arc test's own RAF sampler; after the R1 fix a later run (`44712469297`) hit a separate perf-floor flake with all functional tests green. All failures are disclosed in the evidence; no test was weakened or deleted, and the final two runs used the same commit and passed consecutively.

## Media

No new player-facing visual behavior is introduced by this release chore; the R1 trace is read only through the DEV scene handle. No media asset is attached.

## Review

- **Verdict:** PASS (one Low accuracy finding corrected in post-review sync)
- **Rounds:** 1
- **Findings:** F1 — evidence called the cargo trace "DEV-only" when its reader, not its recorder, is DEV-gated; reworded in code comments and release evidence with no behavior change.

## Deviations and risks

- R1 is an explicit user-authorized scope expansion recorded in `spec.md` after two dry-run failures; it changes only DEV trace recording and the cargo e2e assertions.
- A CI-load perf-floor flake caused one dry-run failure after R1; the two final consecutive runs were green without changing the perf test.
- No manual tablet check, by explicit user decision.
- A GHCR package query with insufficient scope will be reported as unknown, not claimed as published or unpublished.

## Follow-ups

- After merge: create annotated `v0.15.0` at the squash merge commit and push it without a second confirmation; never overwrite an existing tag.
- Watch the tag-triggered release workflow to completion and report success, failure, cancellation, or skipped publish.
- Clarity audit numbers remain human-only and are still `awaiting observation`; the v1.0 3/3-child gate remains unmet and unclaimed.

## Rollback

No runtime or data migration is included. For a code-level rollback after release, revert the squash commit with `git revert --no-edit <squash-commit>`. Do not remove or rewrite the `v0.15.0` tag after release.
