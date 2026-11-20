# PR: Perf Floor Stability

## Summary

Make the performance hard gate deterministic. The wall-clock ticks/second floor that failed the `v0.15.0` tag workflow is removed; the hard gate now checks the interactive mark (<=5000 ms) plus the existing 12-system frame order and exactly one tick per system per observed animation frame. Throughput remains observation-only, so CI load no longer decides pass/fail. Two consecutive release dry runs are green with deploy skipped.

## Track

- [Track archive](conductor/archive/perf-floor-stability_20261120/index.md)
- [Specification](conductor/archive/perf-floor-stability_20261120/spec.md)
- [Plan](conductor/archive/perf-floor-stability_20261120/plan.md)
- [Integrated verification](conductor/archive/perf-floor-stability_20261120/verification/integrated.md)
- [Review](conductor/archive/perf-floor-stability_20261120/review.md)

## What happened

| Section | Squash commit | Outcome |
| --- | --- | --- |
| Phase 1 — Deterministic perf hard gate | `d1b46fd` | Removed wall-clock floor; added order/tick-delta gate and negative proofs; full matrix green under primary re-run. |
| Phase 2 — First post-fix dry run | `219a98f` | Run `44811466927` success; all four gates green, image built, deploy skipped. |
| Phase 3 — Second dry run and integrated evidence | `63a444f` | Run `44814318883` success; two consecutive green runs; integrated evidence recorded. |
| Review fix R1 — F1 comment accuracy | `6269342` | Corrected RAF-callback wording; delta re-review PASS. |

## Requirements

- [x] FR-1 — wall-clock ticks/second floor removed; exactly one interactive mark <=5000 ms remains hard.
- [x] FR-2 — deterministic frame-count/order gate over >=10 observed animation frames.
- [x] FR-3 — negative proofs for late mark and over-tick/wrong-order.
- [x] FR-4 — observation spec remains non-blocking with three ticks/second samples.
- [x] FR-5 — full local matrix plus two consecutive green dry runs.
- [x] FR-6 — diff confined to the two perf e2e specs plus Conductor evidence/state.
- [x] NFR-1 — no runtime/config/dependency/storage/network/UI/audio/telemetry changes.
- [x] NFR-2 — no guardrail relaxed; mark and frame contract stay hard.
- [x] NFR-3 — honest evidence, no clarity numbers or v1.0 claim, manual-device human-only.
- [x] NFR-4 — full gate chain green.
- [x] NFR-5 — `v0.15.0` immutable; no GHCR push, deploy, or retag.
- [x] AC-1 — hard throughput floor gone; late/missing mark guarded.
- [x] AC-2 — 12-system order and delta === frames verified over 30 frames.
- [x] AC-3 — both negative proofs fail closed on every repeat.
- [x] AC-4 — observation spec comment accurate; samples retained.
- [x] AC-5 — scope guard holds.
- [x] AC-6 — full matrix green; no test skipped, weakened, or deleted.
- [x] AC-7 — dry runs `44811466927` and `44814318883` green with deploy skipped.
- [x] AC-8 — non-claims and tag immutability recorded.

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` | pass — Biome 204 files clean, tsc clean, 60 files / 1051 tests |
| `pnpm test:coverage` | pass — 97.18% stmts / 91.48% branches / 97.45% funcs / 98.95% lines |
| `pnpm build` | pass — 117 modules, 819.02 kB bundle, PWA 178 precache entries |
| Playwright shards | pass — shard 1/2 50 passed + 1 pre-existing `@ci` skip, shard 2/2 41 passed |
| `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical |
| Perf specs `--repeat-each=3` | pass — 15/15; both negative proofs threw expected messages every repeat |
| Release dry runs | pass — `44811466927`, `44814318883`; all four gates green, image built, Deploy skipped |

The failed tag workflow `44730179589` (`2.3696682464454977 < 2.5`) and earlier perf-floor dry run `44712469297` (`2.4667 < 2.5`) remain in history as the motivating evidence; neither was rewritten.

## Media

No media attached. This change affects only test-gate behavior and has no player-facing visual change.

## Review

- Verdict: PASS after R1.
- Rounds: 2 (initial review + R1 delta).
- Fixed: F1 (inaccurate RAF-callback comment); F2 (stale evidence hash) corrected in post-review sync.
- No Critical/High/Medium findings. No overrides.

## Deviations and risks

- The user chose a deterministic hard gate over recalibrating the wall-clock floor; throughput is still logged for visibility but no longer gates CI.
- No manual tablet check (human-only exception); no touch/audio/frame-rate claim on physical devices.
- GHCR 403 remains unknown from earlier releases; this PR does not mutate GHCR or deploy.
- `v0.15.0` is not retagged. The failed tag workflow remains failed; this PR stabilizes the gate for a later release decision.

## Follow-ups

- None in this PR. Any new release/tag decision is separate and must be made explicitly.

## Rollback

Revert the code squashes `git revert --no-edit d1b46fd` and `git revert --no-edit 6269342`, followed by the Conductor state commits on this branch. Do not rewrite or delete the existing `v0.15.0` tag.
