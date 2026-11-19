# Switch E2E Stability and Release v0.14.1

## Summary

Replaces the flaky wall-clock slip-road sampler with bounded frame-aware sampling, proves the old fixed window misses a road the new sampler observes, and ships v0.14.1 release documentation. Two consecutive release-workflow dry runs passed with all gates green, image build success, and deploy skipped.

## Track

- **ID:** `switch-e2e-stability_20261119`
- **Type:** Bug
- **Spec:** [spec.md](https://github.com/mansyar/3d-train-sim/blob/main/conductor/archive/switch-e2e-stability_20261119/spec.md)
- **Plan:** [plan.md](https://github.com/mansyar/3d-train-sim/blob/main/conductor/archive/switch-e2e-stability_20261119/plan.md)
- **Review:** [review.md](https://github.com/mansyar/3d-train-sim/blob/main/conductor/archive/switch-e2e-stability_20261119/review.md)

## What happened

| Phase | Result | Checkpoint |
|---|---|---|
| Phase 1 — Frame-aware slip sampling | verified | `580cc1cb8204f452ab2068e73cb467973b6b25dc` |
| Phase 2 — v0.14.1 docs and first dry run | verified | `f15c9a2d713c755044a5c0c5f654f05b0abcbe73` |
| Phase 3 — Second dry run and release gate evidence | verified | `2c57c2bff09f2439583b4b76f6bcf6f0be092a75` |
| Phase R1 — Review fix F1 | verified | `bbcf9625349dd392efd74620e308d85062c284b5` |

Phase 2 was rebased onto the pushed branch after a non-fast-forward push; no force-push, reset, or merge was used.

## Requirements

- [x] FR-1 frame/ride-progress-aware slip sampling
- [x] FR-2 active before/after regression proof
- [x] FR-3 full local verification matrix
- [x] FR-4 two consecutive successful `workflow_dispatch` dry runs
- [x] FR-5 v0.14.1 version, CHANGELOG, and clarity baseline docs
- [ ] FR-6 PR/review/archive terminal proof
- [ ] FR-7 automatic annotated `v0.14.1` tag after merge
- [ ] FR-8 tag-triggered workflow watch, GHCR 403 = unknown
- [x] NFR-1..NFR-6 as documented in the spec
- [x] AC-1..AC-5
- [ ] AC-6 review/PR gate
- [ ] AC-7 automatic tag gate
- [ ] AC-8 tag-workflow watch gate

## Verification

| Layer | Result |
|---|---|
| Biome | 198 files, no fixes |
| TypeScript | clean |
| Vitest | 57 files / 1016 tests |
| Coverage | 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines |
| Build | Vite 115 modules, PWA 178 precache entries |
| Playwright | 85 passed / 1 pre-existing `@ci` skip / 0 failed (`--workers=1`) |
| Audit | 5 vulnerabilities (1 low / 4 moderate), no high |
| Dry runs | `44493402673` and `44514200919` success; deploy skipped |

Regression: the fixed 320-frame window misses `-0.210` / `-1.571`; the new sampler observes all keys at frame 363. Interactive mark 1114 ms; hard-gate samples 18.65/15.04/19.36 against floor 2.5.

## Review

- Verdict: **PASS**
- Rounds: 2
- Fixed: F1 (premature “Shipped” roadmap status)
- Outstanding findings: none

## Deviations and risks

- Permission denials for `conductor/` edits were resolved by documented primary handoffs; denied commands were not retried or worked around.
- The first dry run `44488925935` was cancelled during WebKit browser installation (infrastructure); it is retained as history and was not counted.
- No manual tablet check, by explicit user decision.
- GHCR package inspection may return 403; if so the image is reported as unknown, not verified or unpublished.

## Follow-ups

- After merge: automatically create annotated `v0.14.1` at the squash merge commit, push the tag, and watch the tag-triggered release workflow.
- Clarity audit values remain `awaiting observation`; no v1.0 claim is made.

## Rollback

Squash merge rollback: `git revert --no-edit <squash-commit>`. No data migration.
