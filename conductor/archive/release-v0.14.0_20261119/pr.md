## Summary

Prepare and ship Tiny Tracks v0.14.0, the first release containing the toybox clarity work. This track aligns the version, parent-facing changelog, clarity comparison baseline, and product artifact link with `main`; verifies the configured local matrix; completes a release-workflow dry run; and records automatic post-merge tag/workflow gates. No player-facing source code changes are included.

## Track

- **ID:** `release-v0.14.0_20261119`
- **Type:** Chore
- **Spec:** [spec.md](conductor/archive/release-v0.14.0_20261119/spec.md)
- **Plan:** [plan.md](conductor/archive/release-v0.14.0_20261119/plan.md)
- **Review:** [review.md](conductor/archive/release-v0.14.0_20261119/review.md)

## What happened

| Phase | Description | Checkpoint |
| --- | --- | --- |
| Phase 1 | Bumped version to `0.14.0`, curated parent-facing CHANGELOG, retargeted clarity baseline, and fixed the product artifact link. | `6677c9bff4ab6ac05191ceb6f975f6698dc7e8b4` |
| Phase 2 | Ran the full local matrix, completed release workflow dry run `44464649923`, and assembled PR/release evidence. | `069c0c4887acea8a1f381c2379d35d86127ac176` |
| Post-merge gate | Automatically tag `v0.14.0` at the squash merge commit, push the tag, and watch the tag-triggered release workflow. | pending |

## Requirements

- [x] FR-1 — version set to `0.14.0`
- [x] FR-2 — parent-facing CHANGELOG with empty `[Unreleased]` and refreshed compare links
- [x] FR-3 — clarity baseline retargeted with no invented measurements
- [x] FR-4 — product artifact link points to the archive
- [x] FR-5 — full verification matrix passed and recorded
- [x] FR-6 — release dry run succeeded with no publish/deploy
- [x] FR-7 — release PR with PASS review and terminal proof
- [ ] FR-8 — automatic annotated `v0.14.0` tag after merge
- [ ] FR-9 — tag-triggered release workflow watched and reported
- [x] NFR-1 — narrow docs/version diff
- [x] NFR-2 — no invented audit numbers
- [x] NFR-3 — parent-voice changelog
- [x] NFR-4 — manual tablet check explicitly skipped by user decision
- [x] NFR-5 — checks and dry run authoritative
- [x] NFR-6 — historical `v0.13.0` tag untouched
- [x] AC-1 through AC-7
- [ ] AC-8 — automatic post-merge tag
- [ ] AC-9 — post-tag workflow watch

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| Lint | `pnpm exec biome check .` | pass — 198 files, no fixes |
| Typecheck | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 57 files / 1016 tests |
| Coverage | `pnpm test:coverage` | pass — 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines |
| Build | `pnpm build` | pass — Vite 115 modules, PWA 178 precache entries |
| E2E | `pnpm exec playwright test` | pass — 84 passed, 1 pre-existing `@ci` skip, 0 failed |
| Audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high |
| Dry run | `gh workflow run release.yml --ref chore/release-v0.14.0_20261119 --field dry_run=true` | pass — run `44464649923`, all gates and image build green, Coolify deploy skipped |

An earlier `e2e/switches.spec.ts:144` flake was cleared by a targeted rerun and then a full green suite rerun. No source changed in this release track.

## Review

- **Verdict:** PASS
- **Rounds:** 1
- **Findings:** none

## Deviations and risks

- Two `conductor/` edits in Phase 1 were permission-denied to the phase executor and applied verbatim by the primary; no workaround was used.
- The `v0.13.0` release workflow was cancelled during browser installation and skipped publish; v0.14.0 requires a successful dry run and post-tag workflow watch to catch recurrence.
- No manual tablet check, by explicit user decision.
- A GHCR package query with insufficient scope will be reported as unknown, not claimed as published or unpublished.

## Follow-ups

- After merge: automatically create annotated `v0.14.0` at the squash merge commit and push it.
- Watch the tag-triggered release workflow to completion and report success, failure, cancellation, or skipped publish.
- Clarity audit numbers remain human-only and are still `awaiting observation`.

## Rollback

No runtime or data migration is included. For a code-level rollback, revert the squash commit with `git revert --no-edit <squash-commit>`. Do not remove or rewrite the `v0.14.0` tag after release.
