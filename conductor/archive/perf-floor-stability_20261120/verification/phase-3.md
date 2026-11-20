# Phase 3 Verification — Second consecutive dry run and integrated evidence

- **Track:** `perf-floor-stability_20261120`
- **Phase:** 3
- **Date:** 2026-11-20
- **Branch:** `fix/perf-floor-stability_20261120`
- **Phase base:** `63a444f42d75464884dd861052eb06e2f69b0748`
- **Result:** PASS — the second post-fix dry run succeeded, forming a consecutive green pair.

## Consecutive dry-run pair

| Order | Run | Created (UTC) | Conclusion | Deploy |
|---|---|---|---|---|
| 1 | `44811466927` — https://github.com/mansyar/3d-train-sim/actions/runs/44811466927 | 2026-11-20T20:27:01Z | success — all four gates succeeded | skipped (`workflow_dispatch`) |
| 2 | `44814318883` — https://github.com/mansyar/3d-train-sim/actions/runs/44814318883 | 2026-11-20T20:46:06Z | success — all four gates succeeded | skipped (`workflow_dispatch`) |

Both runs used `--ref fix/perf-floor-stability_20261120` with `dry_run=true`. Every gate (`Gate · biome + typecheck`, `Gate · vitest`, `Gate · e2e (tablet · phone · prod)`, `publish`) concluded `success`. In `publish`, `Build and push image (push only on real tags)` succeeded and `Deploy via Coolify webhook` was skipped. No GHCR push or deploy occurred.

`gh run list --workflow release.yml --event workflow_dispatch --limit 5` shows these two runs as the two newest dispatch runs, with no intervening run. The first used branch head `219a98f`; the second used `63a444f`. The only commits between them were this track's Conductor state/evidence commits, not changes to the perf gate or any runtime code. The pair therefore tests the same deterministic gate implementation.

## Earlier failures retained for context

- Tag workflow `44730179589`: e2e failed at `e2e/perf-budget.spec.ts:82` with `frame ticks/second 2.3696682464454977 below floor 2.5`; samples `2.37, 2.51, 2.48`. `publish` skipped.
- Dry run `44712469297`: same wall-clock floor flake at `2.4667 < 2.5`.
- The deterministic gate no longer has a wall-clock floor; throughput is observation-only, and the hard gate uses the interactive mark plus frame-count/order invariants. Neither old tag nor old run was rewritten.

## Release gate evidence

| Gate | Status | Evidence |
|---|---|---|
| `package.json` version remains `0.15.0` | pass — unchanged from shipped release | no diff in `package.json` from base `15dbc052` |
| Full local matrix | pass | `verification/integrated.md`, exact chained command exit 0 |
| Two consecutive green dry runs | pass | `44811466927`, `44814318883` |
| No tag created or overwritten | pass | `v0.15.0` remains the existing latest tag; this track never creates a tag |
| No GHCR push or deploy | pass | image build only; deploy step skipped on both runs |
| Manual device check | human-only exception, not claimed | iPad Safari / Android Chrome remain a human step |
| Clarity measurements and v1.0 child gate | not claimed | comparison stays eight `awaiting observation` cells; 3/3-child gate unmet |

## Scope guard

`git diff --name-only 15dbc05220a29a31a32480ccaa1f6a2805865a1d..HEAD` lists exactly nine files: `conductor/tracks.md`, this track's `index.md`/`metadata.json`/`plan.md`/`spec.md`/`verification/phase-1.md`/`verification/phase-2.md`, and the two perf e2e specs. No runtime source, configuration, dependencies, lockfile, release docs, clarity artifacts, or product docs changed. `git status --porcelain` was empty at the time of this check.

## Non-claims

No clarity number, 3/3-child v1.0 gate, physical-device result, GHCR success, deploy success, tag mutation, or hidden failure is claimed here. Pre-existing Node 20 action deprecation annotations were present on the gates and were not modified.
