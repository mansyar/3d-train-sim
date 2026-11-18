## Summary

Adds a dev-only interactive-ready mark and two tablet-only `@ci` Playwright
specs that hard-fail when boot exceeds 5000 ms or the CI-calibrated frame-tick
floor of **2.5 ticks/s** is not met. The production bundle is unchanged, and
both failure paths are proved by passing negative tests. No player-facing,
dependency, telemetry, storage, or config change.

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
| R1 — CI floor recalibration (fix round 1) | verified | `4729935185ab252a8c027ac2f798882f1cfcb97b` | `verification/phase-R1.md` |

P1 added `performance.mark('tiny-tracks-interactive')` inside the existing DEV
block and a tablet observation spec. P2 added the hard gate with both negative
proofs. GitHub Actions run `44283047563` then failed shard 1/2 at 2.65
ticks/s against the locally calibrated floor of 15; R1 recalibrated the floor
from the six authoritative CI samples (min 2.65, σ 0.0457, `min−2σ 2.5586`
rounded down to 2.5, 0.15 ticks/s headroom) and changed the low-tick negative
proof from 14.9 to 2.4.

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
| e2e (full suite) | `CI=1 pnpm exec playwright test --workers=1` | 73 passed, 0 failed on unchanged source head `f5cfb9e` |
| e2e (R1 recheck) | `CI=1 pnpm check && pnpm build && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/frame-contract.spec.ts` | 4 passed; mark 990 ms; both negative proofs exact |
| Audit | `pnpm audit --audit-level=high` | pass, one pre-existing dated ignore |
| Production mark | `grep -R -n "tiny-tracks-interactive" dist` | no matches |

## Review

- Verdict: PASS
- Rounds: 2 (round 1 PASS; round 2 PASS with one Low fixed)
- Findings fixed: 1 (stale pre-squash hashes in R1 evidence)
- Deferred: none

## Deviations and risks

- P2 needed one primary handoff because a supplementary `CI=1` command was
  denied to the phase subagent by the permission layer; the primary ran the
  exact command and the subagent finalized evidence. No code rework.
- The first CI run failed because the FPS floor was calibrated from local
  software-rendered samples. Per the frozen spec, this triggered a Conductor
  fix round rather than a waiver; the floor is now derived from authoritative
  GitHub CI samples. Local two-worker full-suite runs also hit unrelated
  pre-existing flakes; the final full-suite evidence uses `--workers=1`.
- Shard 2/2 of the first CI run failed during browser install with apt errors
  (`fonts-tlwg-loma-otf`, `fonts-freefont-ttf`) — runner infrastructure, not a
  code defect. The new CI run is the authority for both shards.
- Real-device feel, audio unlock, and frame rate remain human-only per the
  project workflow; this CI gate does not replace them.

## Follow-ups

- Watch the GitHub Actions e2e shards with the recalibrated floor. If CI still
  reports a sample below 2.5 ticks/s, open another Conductor fix round using
  the raw sample evidence rather than silently lowering the floor.

## Rollback

Squash merge: `git revert --no-edit <squash-commit>`.
