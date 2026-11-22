## Summary

Ship Tiny Tracks v0.15.1 so the merged cargo hand-off (#86), drifting layered clouds (#87) and deterministic performance gate (#89) reach devices on a reliable build. This release chore bumps the version, curates the parent-facing CHANGELOG, corrects `conductor/product.md` drift, retargets the clarity baseline to v0.15.1 with every measured cell still `awaiting observation`, proves the full local matrix, and records two consecutive green release dry runs. Post-merge tagging and tag-workflow watch remain primary-owned gates. No runtime, test, workflow, dependency or player-facing behavior changed.

## Track

- **ID:** `release-v0.15.1_20261123`
- **Type:** Chore
- **Spec:** [spec.md](conductor/archive/release-v0.15.1_20261123/spec.md)
- **Plan:** [plan.md](conductor/archive/release-v0.15.1_20261123/plan.md)
- **Review:** [review.md](conductor/archive/release-v0.15.1_20261123/review.md)
- **Integrated verification:** [integrated.md](conductor/archive/release-v0.15.1_20261123/verification/integrated.md)

## What happened

| Phase | Description | Checkpoint |
| --- | --- | --- |
| Phase 1 | Bumped version to `0.15.1`, curated the CHANGELOG with empty `[Unreleased]` and dated `[0.15.1] - 2026-11-23`, fixed product drift and shipped rows, retargeted clarity labels, and ran the full local matrix green. | `46e1bd3` |
| Phase 2 | Verified the first post-content release dry run: all gates green, image built, deploy skipped. | `0a6e0c7` |
| Phase 3 | Verified a second consecutive green dry run and recorded the release-gate evidence. | `61323cc` |
| Review R1 | Restored the `perf-budget_20261111` Effort cell to `2.5d` after review finding F1; one-line documentation diff. | `f47280d` |
| Post-merge gate | Create annotated `v0.15.1` at squash merge commit, push, and watch tag-triggered release workflow. | pending |

## Requirements

- [x] FR-1 — version set to `0.15.1`; no dependency or lockfile change
- [x] FR-2 — parent-facing CHANGELOG with empty `[Unreleased]`, dated `[0.15.1]` entry and refreshed compare links
- [x] FR-3 — product drift corrected, deterministic perf wording, three shipped rows for #86/#87/#89
- [x] FR-4 — clarity baseline retargeted to v0.15.1; all eight measured cells still `awaiting observation`
- [x] FR-5 — full local matrix green
- [x] FR-6 — two consecutive green release dry runs, deploy skipped
- [ ] FR-7 — PR/review/archive plus post-merge tag and tag-workflow watch (tag steps pending by design)
- [x] NFR-1..NFR-6 — scope, honesty, no early tag, full gates, human-only device exception
- [x] AC-1..AC-6 — version, changelog, product wording, clarity, matrix, dry runs
- [ ] AC-7/8 — post-merge archive/tag/workflow gates pending by design

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Full local matrix | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high` | pass (`FULL_MATRIX_EXIT=0`) | [integrated.md](conductor/archive/release-v0.15.1_20261123/verification/integrated.md) |
| Static | `pnpm exec biome check .`, `pnpm exec tsc --noEmit` | pass — 204 files clean, tsc clean | integrated.md |
| Unit | `pnpm test` | pass — 60 files / 1051 tests | integrated.md |
| Coverage | `pnpm test:coverage` | pass — 97.18% / 91.48% / 97.45% / 98.95% | integrated.md |
| Build | `pnpm build` | pass — 117 modules, 819.02 kB, PWA 178 precache | integrated.md |
| E2E | shards 1/2 and 2/2 | pass — 50 + 1 pre-existing `@ci` skip / 41 | integrated.md |
| Audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical | integrated.md |
| Dry runs | `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` | pass — `45068023992`, `45069711685`, all gates green, deploy skipped | phase-2.md / phase-3.md |

## Media

No media attached: this is a release chore with no new player-facing visual.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (initial + R1 delta re-review)
- **Fixed:** 1 finding (F1, product Effort cell)
- **Accepted/deferred:** 0

## Deviations and risks

- The phase subagent's chained verification and audit commands were permission-denied; the primary ran the exact chain under its own permissions (`FULL_MATRIX_EXIT=0`) and recorded the permission boundary honestly in phase-1 evidence.
- The earlier `v0.15.0` tag workflow failed on the old wall-clock perf floor; this release ships the deterministic replacement from #89 and does not retag v0.15.0.
- Manual device checks are human-only and not claimed; GHCR 403 remains unknown; no clarity measurement or v1.0 child-gate claim is made.

## Follow-ups

- Post-merge: create and push annotated `v0.15.1` at the squash merge commit, then watch the tag-triggered release workflow.

## Rollback

```bash
git revert --no-edit 46e1bd3   # release content
git revert --no-edit f47280d   # review fix
```

Do not rewrite `v0.14.1` or `v0.15.0` tags.
