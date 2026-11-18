## Summary

Adds a dev-only interactive-ready mark and two tablet-only `@ci` Playwright
specs that hard-fail when boot exceeds 5000 ms or the calibrated frame-tick
floor of 15 ticks/second is not met. The production bundle is unchanged, and
both failure paths are proved by passing negative tests. No player-facing,
dependency, telemetry, storage, or threshold-beyond-calibration change.

## Track

- **ID:** `perf-budget_20261111`
- **Type:** Feature
- **Spec:** [conductor/archive/perf-budget_20261111/spec.md](../../archive/perf-budget_20261111/spec.md)
- **Plan:** [conductor/archive/perf-budget_20261111/plan.md](../../archive/perf-budget_20261111/plan.md)
- **Review:** [conductor/archive/perf-budget_20261111/review.md](../../archive/perf-budget_20261111/review.md)

## What happened

| Phase | Result | Checkpoint | Evidence |
| --- | --- | --- | --- |
| P1 — Interactive mark and CI observation | verified | `4f5eb3a7aee92d179134bbedf89252a073f6fca3` | `verification/phase-1.md` |
| P2 — Calibrated FPS floor and hard gate | verified | `6ba1ffe5e116924eafb8f65bb5c12e2e9965c62d` | `verification/phase-2.md` |

P1 added `performance.mark('tiny-tracks-interactive')` inside the existing DEV
block and a tablet observation spec recording three raw tick samples. P2 fixed
the floor at 15 ticks/second from six CI observations (min 20.70, σ 2.49,
min−2σ 15.71 rounded down, 5.70 ticks/s headroom), added the hard gate, and
proved both negative paths with a shared pure assertion helper.

## Requirements

- [x] FR-1 — dev-only interactive mark at the boot-ready path
- [x] FR-2 — tablet `@ci` mark ≤ 5000 ms
- [x] FR-3 — sample `scene.frameSystems()` tick counters
- [x] FR-4 — FPS floor from ≥3 samples with derivation recorded
- [x] FR-5 — both assertions hard-fail
- [x] FR-6 — production-safe diff
- [x] NFR-1 — check/coverage/build/e2e green
- [x] NFR-2 — no telemetry/network/storage/UA sniff
- [x] NFR-3 — no kid-UI/parent-gate/viewport/a11y change
- [x] NFR-4 — manual-device frame rate stays human-only
- [x] NFR-5 — raw samples and derivation reproducible
- [x] AC-1..AC-9 — all covered (see review.md)

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| Static | `pnpm exec biome check .`, `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | 57 files / 1009 tests pass |
| Coverage | `pnpm test:coverage` | 97.05% stmts / 91.19% branches / 97.39% funcs / 98.86% lines |
| Build | `pnpm build` | pass, PWA service worker generated |
| e2e | `CI=1 pnpm exec playwright test --workers=1` | 73 passed, 0 failed (mark 982 ms; ticks 24.09/21.99/25.92) |
| Audit | `pnpm audit --audit-level=high` | pass, one pre-existing dated ignore |
| Production mark | `grep -R -n "tiny-tracks-interactive" dist` | no matches |

## Review

- Verdict: PASS
- Rounds: 1
- Findings fixed: 0
- Deferred: none

## Deviations and risks

- P2 needed one primary handoff because a supplementary `CI=1` command was
  denied to the phase subagent by the permission layer; the primary ran the
  exact command and the subagent finalized evidence. No code rework.
- Local two-worker full-suite runs hit unrelated pre-existing flakes
  (parent-gate hold timing, switch-angle sampling) and, under heavy parallel
  browser load, one low tick sample (4.49 ticks/s). Targeted reruns passed;
  the final full-suite evidence uses `--workers=1` and is fully green. Per the
  frozen spec, GitHub Actions CI is the authority for the FPS floor. A lower
  CI sample triggers a fix round, not a waiver or an unreviewed threshold
  change.
- Real-device feel, audio unlock, and frame rate remain human-only per the
  project workflow; this CI gate does not replace them.

## Follow-ups

- Watch the GitHub Actions e2e shards for the calibrated floor on CI hardware.
  If any sample falls below 15 ticks/second, open a Conductor fix round using
  the raw sample evidence rather than silently lowering the floor.

## Rollback

Squash merge: `git revert --no-edit <squash-commit>`.
