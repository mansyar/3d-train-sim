# Phase 3 Verification — Second dry run and release gate evidence

- **Track:** `release-v0.15.0_20261120`
- **Phase:** 3
- **Date:** 2026-11-20
- **Branch:** `chore/release-v0.15.0_20261120`
- **Phase base:** `174b5b9c2009d4bef6b94965b310db1cd6e411f8` (same as Phase 2; both dry-run gates are evidenced here)
- **Result:** PASS — two consecutive successful dry runs after the user-authorized R1 fix; post-merge tag/workflow gate recorded as pending, not claimed.

## What was verified

The exact phase command was dispatched twice in succession from the pushed branch head `30f4676`:

`gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true`

Each run was watched with `gh run watch <id> --exit-status --interval 20` and job/step conclusions were read with `gh run view`.

| Run | Conclusion | Gate · biome + typecheck | Gate · vitest | Gate · e2e (tablet · phone · prod) | publish | Deploy via Coolify webhook |
| --- | --- | --- | --- | --- | --- | --- |
| `44715407918` | success | success | success | success | success (build, no push) | skipped |
| `44717739869` | success | success | success | success | success (build, no push) | skipped |

Both URLs:
- https://github.com/mansyar/3d-train-sim/actions/runs/44715407918
- https://github.com/mansyar/3d-train-sim/actions/runs/44717739869

These two are **consecutive successes**, satisfying FR-6 and AC-6. The `workflow_dispatch` event keeps GHCR push off (`push: ${{ github.event_name == 'push' }}`) and the deploy step is gated on `github.event_name == 'push'`; therefore no image was pushed and no deployment occurred. No test was weakened, skipped or deleted; the same branch commit was used for both runs.

The earlier post-fix run `44712469297` failed a CI-load perf floor after ~19 minutes (`2.4667 < 2.5` ticks/s in `e2e/perf-budget.spec.ts:82`) while every functional test passed. It is disclosed in `verification/phase-2.md`; the two final runs above supersede it. No cargo-arc failure recurred after R1.

## Release gate state before merge

| Gate | Evidence | Status |
| --- | --- | --- |
| `package.json` version | `package.json:3` reads `"version": "0.15.0"` | satisfied |
| CHANGELOG | `## [0.15.0] - 2026-11-20` with cargo and cloud entries, empty `[Unreleased]`, refreshed compare links | satisfied |
| Product wording | `conductor/product.md:115` says shipped in v0.14.1, gates complete | satisfied |
| Clarity baseline | `comparison.md` retargeted to v0.15.0; all eight cells remain `awaiting observation` | satisfied |
| Local matrix | `FULL_MATRIX_EXIT=0`: Biome 204 files, tsc clean, 60 files / 1051 tests, coverage 97.18/91.48/97.45/98.95, build, sharded e2e, audit exit 0 (`1 low | 4 moderate`, no high/critical) | satisfied |
| Two consecutive green dry runs | `44715407918`, `44717739869` | satisfied |
| No tag before merge | `git tag --list v0.15.0` empty; `git describe --tags --abbrev=0` = `v0.14.1` | satisfied |
| Post-merge annotated tag | Primary-owned gate: after squash merge create `v0.15.0` at the merge commit and `git push origin v0.15.0` without a second confirmation; never overwrite an existing tag | pending by design |
| Tag-triggered release workflow | Primary-owned gate: watch the `v*` run to completion and report success/failure/cancellation/skipped publish | pending by design |
| GHCR package query | A 403 is reported as **unknown**, not inferred published or unpublished | pending by design |
| Manual device check | Explicitly skipped per user decision; human-only exception | not claimed |
| v1.0 child gate | 3/3 children, 30-day dogfooding and unassisted session not met; no claim | not claimed |

## Scope guard

The final release diff from base `e13f652` contains release content (`package.json`, `CHANGELOG.md`, `conductor/product.md`, `conductor/archive/clarity-audit_20261110/comparison.md`), Conductor track state, and the user-authorized R1 cargo e2e determinism change (`src/scene/rig-cargo.ts`, `src/scene/init-scene.ts`, `src/scene/rig-cargo.test.ts`, `e2e/cargo.spec.ts`). R1 adds a transfer trace exposed only through the DEV scene handle and changes no crate timing, reduced-motion path, confetti, persistence, `transferWitness()` shape or player-facing behavior. No dependency or lockfile change; no workflow, save, UI, audio, telemetry or clarity-number change.

## Non-claims

- No `v0.15.0` tag was created or pushed in this phase.
- No GHCR push, Coolify deploy or production verification occurred.
- No clarity numbers were invented; all eight cells stay `awaiting observation`.
- No v1.0 gate or manual tablet result is claimed.
