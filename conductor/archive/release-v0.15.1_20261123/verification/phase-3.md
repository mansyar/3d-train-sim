# Phase 3 Verification — Second consecutive dry run and release gates (release-v0.15.1_20261123)

- **Track:** release-v0.15.1_20261123
- **Phase:** 3
- **Date:** 2026-11-22
- **Branch:** `chore/release-v0.15.1_20261123`
- **Phase base:** `61323cc2580e2e4a7c5e06e23f10abd2b08b1e2f`
- **Result:** PASS — the second post-content dry run is green and consecutive with the first; all release-gate evidence is recorded here and in `verification/integrated.md`.

## Consecutive dry-run proof

| Run | Command | Dispatch | Conclusion | Gates | Deploy |
| --- | --- | --- | --- | --- | --- |
| `45068023992` | `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` | 2026-11-22T20:43:16Z | success | `Gate · vitest`, `Gate · e2e (tablet · phone · prod)`, `Gate · biome + typecheck`, `publish` all success | `Deploy via Coolify webhook` skipped; `Build and push image (push only on real tags)` succeeded |
| `45069711685` | same command | 2026-11-22T21:01:31Z | success | same four jobs success | same: image built, deploy skipped |

`gh run list --workflow release.yml --event workflow_dispatch --limit 3` shows these as the two newest dispatch runs, both `success`, with the older perf-floor track run `44814318883` also successful. Both dry-run heads match the release branch commits under test (`0a6e0c7` for the first, `61323cc` for the second). No deploy, GHCR mutation or tag was produced by either `workflow_dispatch`.

## Earlier failures retained for audit honesty

The prior `v0.15.0` tag run `44730179589` and dry run `44712469297` failed on the old wall-clock `2.5 ticks/s` floor. They are unchanged by this track. This release ships the deterministic gate from `perf-floor-stability_20261120` (#89), and the two green runs above are the required proof for FR-6/AC-7.

## Release gate table

| Gate | Status | Evidence |
| --- | --- | --- |
| `package.json` version `0.15.1`, no dependency/lockfile diff | PASS | Phase 1 scope guard; `package.json:3` |
| `CHANGELOG.md` empty `[Unreleased]`, dated `[0.15.1] - 2026-11-23`, refreshed links | PASS | Phase 1 evidence |
| `conductor/product.md` deterministic perf wording + three shipped rows | PASS | Phase 1 evidence; primary commit `23965a1` |
| Clarity comparison relabeled to `v0.15.1`, all 8 cells still `awaiting observation` | PASS | Phase 1 evidence; 7 labels, 0 stale `v0.15.0`, 8 empty cells |
| Full local matrix (Biome, tsc, unit, coverage, build, sharded Playwright, audit) | PASS | `verification/integrated.md`; `FULL_MATRIX_EXIT=0` |
| Two consecutive green release dry runs, deploy skipped | PASS | Runs above |
| Annotated `v0.15.0` tag immutable; no `v0.15.1` tag before merge | PASS | `git tag --list v0.15.1` empty |
| Tag at squash merge commit, push, and watch tag workflow | PENDING BY DESIGN | Post-merge primary-owned runbook step; no tag before merge |
| PR/review/archive | PENDING BY DESIGN | Conductor-implement completion gates occur after this phase |
| GHCR 403 = unknown | NON-CLAIM | No GHCR mutation or success claim |
| Manual device checks, clarity measurement, v1.0 child gate | NON-CLAIM | Human-only / unmet; no numbers invented |

## Acceptance criteria

| AC | Status | Evidence |
| --- | --- | --- |
| AC-1 version | PASS | Phase 1 |
| AC-2 changelog | PASS | Phase 1 |
| AC-3 product drift | PASS | Phase 1 |
| AC-4 clarity empty | PASS | Phase 1 |
| AC-5 full matrix | PASS | Integrated evidence |
| AC-6 two dry runs | PASS | Runs above |
| AC-7 archive/tag proof | Partial by design: archive and tag occur post-merge; scope and no-early-tag verified here | This table; `verification/integrated.md` |
| AC-8 tag workflow watch | Partial by design: post-merge runbook; human-only and non-claims recorded | This table |

## Scope guard

Code/content diff from base `85d019354eb7e7479ab17dd6b2df0bf72ef1dd20` is confined to `package.json`, `CHANGELOG.md`, `conductor/product.md`, `conductor/archive/clarity-audit_20261110/comparison.md`, and Conductor track state/evidence. No `src/`, test, workflow, dependency, lockfile, save, UI, audio, telemetry or deployment config changed.

## Non-claims

No clarity numbers, v1.0 child-gate claim, manual-device claim, GHCR/deploy success, retagging of `v0.14.1`/`v0.15.0`, or pre-merge `v0.15.1` tag is asserted.
