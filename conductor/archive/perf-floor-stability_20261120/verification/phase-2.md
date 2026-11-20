# Phase 2 Verification — First post-fix release dry run

- **Track:** `perf-floor-stability_20261120`
- **Phase:** 2
- **Date:** 2026-11-20
- **Branch:** `fix/perf-floor-stability_20261120`
- **Phase base:** `219a98f0d61d617a03c079d2021ba12183e5fcb5`
- **Result:** verified — every dispatched gate succeeded and deploy was skipped.

## What was verified

The branch carrying the deterministic perf hard gate was pushed to `origin`, then a release dry run was dispatched from that exact branch with `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true`. This is the first post-fix dry run; the second consecutive green run is Phase 3.

| Command / check | Result | Evidence |
|---|---|---|
| `git push -u origin fix/perf-floor-stability_20261120` | pass (`PUSH_EXIT=0`) | new remote branch created from local phase-1 checkpoint |
| `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true` | pass (`DISPATCH_EXIT=0`) | run `44811466927` — https://github.com/mansyar/3d-train-sim/actions/runs/44811466927 |
| `gh run watch 44811466927 --exit-status --interval 20` | pass (`WATCH_EXIT=0`) | run conclusion `success` |
| `gh run view 44811466927 --json status,conclusion,jobs` | pass | all four jobs succeeded; deploy skipped |

Gate conclusions for run `44811466927`:

| Gate | Conclusion |
|---|---|
| Gate · biome + typecheck | success |
| Gate · vitest | success |
| Gate · e2e (tablet · phone · prod) | success |
| publish | success — `Build and push image (push only on real tags)` succeeded; `Deploy via Coolify webhook` was skipped because the event was `workflow_dispatch` |

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-7 (release dry run green, deploy skipped) | pass for the first of two required consecutive runs | run `44811466927`, all gates success, deploy skipped |
| AC-8 (honest non-claims) | pass | no tag pushed, no GHCR push, no deploy; pre-existing Node 20 action deprecation annotations recorded, not fixed here |

## Deviations

None. The workflow's `workflow_dispatch` path builds the image but does not push it and skips deployment; that is the expected dry-run boundary, not a weakened gate.

## Notes

- The previously failed tag workflow `44730179589` and dry run `44712469297` are unchanged and remain in history as the motivation for this track. No tag was rewritten.
- Pre-existing Node.js 20 action deprecation annotations appeared on the gates; they are unrelated to this change and were not modified.
- AC-7 is only fully satisfied when a second consecutive run is green; Phase 3 owns that proof.
