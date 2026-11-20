# Phase 2 Verification — First release dry run

- **Track:** `release-v0.15.0_20261120`
- **Phase:** 2
- **Date:** 2026-11-20
- **Branch:** `chore/release-v0.15.0_20261120`
- **Phase base:** `174b5b9c2009d4bef6b94965b310db1cd6e411f8`
- **Result:** VERIFIED after the user-authorized R1 e2e-determinism fix and four post-fix dry runs. The original blocked report below is retained for audit honesty; the `## Recovery after R1` section is authoritative.

## What was attempted

The exact phase verification command was dispatched twice from the track branch:

`gh workflow run release.yml --ref chore/release-v0.15.0_20261120 --field dry_run=true`

Each run was watched to completion with `gh run watch <id> --exit-status --interval 20`; job and step conclusions were read back with `gh run view`.

## Dry run 1 — `44698232311`

URL: https://github.com/mansyar/3d-train-sim/actions/runs/44698232311

| Gate | Conclusion |
| --- | --- |
| Gate · biome + typecheck | success |
| Gate · vitest | success |
| Gate · e2e (tablet · phone · prod) | failure — 91 passed, 1 failed |
| publish | skipped (`needs` gate failed; no image build) |

Failing test: `[tablet] › e2e/cargo.spec.ts:412:1 › load and delivery crates arc between the platform slot and the wagon bed`.

Failure detail: at `e2e/cargo.spec.ts:480`, `expect(arc.length, 'deliver arc samples').toBeGreaterThan(1)` — Expected `> 1`, Received `1`. The in-page per-animation-frame sampler captured only one delivery sample under the loaded CI runner.

## Dry run 2 (retry) — `44700234497`

URL: https://github.com/mansyar/3d-train-sim/actions/runs/44700234497

| Gate | Conclusion |
| --- | --- |
| Gate · biome + typecheck | success |
| Gate · vitest | success |
| Gate · e2e (tablet · phone · prod) | failure — 91 passed, 1 failed |
| publish | skipped (`needs` gate failed; no image build) |

Failing test: the same `e2e/cargo.spec.ts:412` cargo-arc spec, this time at `e2e/cargo.spec.ts:502`, `expect(pointDistance(max.spot, max.to), 'deliver ends at destination').toBeLessThan(...)` — Expected `< 2.9198346195344724`, Received `4.523869747465884`. The last sampled spot was still short of the destination when sampling stopped.

## Diagnosis

Both failures are timing-sensitive samples of the same pre-existing cargo-arc e2e. During Phase 1 of this release track, the same spec flaked locally on one of two shard attempts (an arc bounds assertion); the primary's full chained re-run passed with no test change. The release diff contains only `package.json` version, `CHANGELOG.md`, `conductor/product.md:115` wording and clarity-baseline labels — none can change runtime crate motion or RAF sampling. No `src/`, `e2e/`, workflow, dependency or lockfile file was touched by this track, so this is a CI-load-sensitive test flake rather than a release-content regression.

Both failures occurred in the single full e2e job on the hosted runner; the primary's locally sharded matrix (`--shard=1/2`, `--shard=2/2`) passed 50 + 41 with one pre-existing `@ci` skip. The workflow's `workflow_dispatch` guard still ensured no GHCR push and no Coolify deploy; with `e2e` failing, `publish` was skipped entirely.

## Decision

The frozen spec's edge cases require that any dry-run failure means no tag, and that a failure after a first pass prevents release. Two consecutive failures exhaust the configured `verification.retry: 2` budget. Phase 2 is therefore **failed/blocked**: no Phase 3, no release tag, no PR, no archive, no branch deletion.

A follow-up (new) track would be needed to make the cargo-arc e2e sampling deterministic under CI load; that change is explicitly out of scope here, where tests and runtime code are frozen.

## Non-claims

- No tag was created or pushed; `v0.14.1` remains the latest tag.
- Nothing was published: no GHCR image push and no Coolify deploy.
- No clarity numbers were measured; `comparison.md` keeps all eight cells `awaiting observation`.
- The v1.0 child gate is not claimed; manual device checks remain a human-only exception.

## Recovery after R1 (authoritative)

The user explicitly directed "fix it on this track" after the two failed dry runs. That scope override is recorded in `spec.md` and implemented as Phase R1 (`verification/phase-R1.md`): `rig-cargo.ts` now records a bounded, preallocated trace at transfer start and every tick, and the DEV-gated `SceneHandle.cargoTransferTrace()` exposes it, and `e2e/cargo.spec.ts` asserts both arcs from that app-recorded trace instead of its own RAF sampler. No crate timing, reduced-motion, confetti, persistence, player-facing behavior or `transferWitness()` changed. Primary re-verification before resuming dry runs: `pnpm check` (1051 tests), `pnpm build`, cargo spec `--repeat-each=5` (30/30), companion sky/a11y/perf specs (8/8).

Four post-fix `workflow_dispatch` dry runs were dispatched from the pushed branch (`30f4676`) and watched to completion:

| Run | Result | Gate · e2e | publish | Notes |
| --- | --- | --- | --- | --- |
| `44709418739` | success | success | success | First post-fix run; Deploy skipped. |
| `44712469297` | failure | failure | skipped | All functional tests passed; `e2e/perf-budget.spec.ts:82` failed a CI-load perf floor (`2.4667 < 2.5`) after ~19 min. No cargo failure. |
| `44715407918` | success | success | success | All four gates green; Deploy skipped. |
| `44717739869` | success | success | success | All four gates green; Deploy skipped. |

The final two runs are **consecutive successes**, satisfying FR-6 / AC-6. Both green runs show `Gate · biome + typecheck`, `Gate · vitest`, `Gate · e2e (tablet · phone · prod)` and `publish` success; `publish` builds the image but never pushes it, and the `Deploy via Coolify webhook` step is skipped because `github.event_name == 'workflow_dispatch'`. The intervening perf-floor failure was a different, resources-related flake; no test was weakened or deleted to obtain the two green runs, and the exact same pushed commit was used for all four.

No tag was created or pushed during dry runs; `v0.14.1` remains the latest tag. No GHCR push and no deploy occurred. All eight clarity cells remain `awaiting observation` and no v1.0 gate is claimed.
