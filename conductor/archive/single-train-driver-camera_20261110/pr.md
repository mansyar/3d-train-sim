# Single Train and Driver Camera

## Summary

Only one train rides at a time now. The ride picks the longest looped track — a closed path beats any open line, even a longer one — and only falls back to the longest track when there is no loop. The pick happens on ▶ / world change and never swaps mid-ride.

The 🎥 button now also cycles a driver view from the cab, looking down the track ahead (Overview → Chase → Driver → wrap). It is visible at ≥1 ride, hidden when idle or under reduced motion. This is not a driving mode — no controls were added.

Single train supersedes the up-to-4 multi-train behaviour in `conductor/product.md` (now marked superseded).

## Track

- Spec: [`./spec.md`](./spec.md)
- Plan: [`./plan.md`](./plan.md)
- Review: [`./review.md`](./review.md)

### What happened

| Phase | Checkpoint | Result |
|---|---|---|
| 1. Single-train selection (logic) | `5b8d3a3` | `selectRideComponents` filters to `path.closed` when any exist else all, ranks by pieces then anchor; ride layer caps to 1 with never-swap guard; TDD Red→Green, 904 tests |
| 2. Driver camera and 🎥 cycle | `10e2163` | `driver` filmed target at cab eye (+forward*0.6 +2.2), look +forward*12; 🎥 `hidden = count<1`; e2e single-loop driver (1063) + open-line (1182) tablet+phone |
| 3. Docs sync and full matrix | `a09bb87` | product.md one-train + Overview→Chase→Driver + superseded marker; README + CHANGELOG `[Unreleased]`; coverage 97.24%/90.34%/97.84%; matrix 59 passed / 1 skipped |
| R1. Review fixes | `dfa8120` | three Low doc drifts fixed (style.css, pathing.ts, park-pose.ts) |

## Requirements

- [x] FR-1 exactly one ride selected via `selectRideComponents(...,1)`
- [x] FR-2 loop-then-longest rule (closed first, else most pieces, anchor tie-break)
- [x] FR-3 pick on startAll/world change, never swaps mid-ride
- [x] FR-4 🎥 Overview→Chase→Driver at cab looking forward
- [x] FR-5 🎥 visible at ≥1, hidden idle/reduced-motion
- [x] FR-6 stop returns to overview
- [x] FR-7 parked opener follows new pick via `findParkSpot`
- [x] NFR-1 no per-frame allocation in driver view
- [x] NFR-2 no new dep/network
- [x] NFR-3 coverage ≥80%
- [x] NFR-4 save format unchanged

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` | pass — 182 files |
| Types | `pnpm exec tsc --noEmit` | pass |
| Unit | `pnpm test` | pass — 52 files / 904 tests |
| Coverage | `pnpm test:coverage` | pass — 97.24 / 90.34 / 97.84 / 99.37 (core 97.66/92.12, state 95.88/82.89) |
| Build | `pnpm build` | pass — PWA precache 178 |
| E2E smoke | `pnpm e2e` | pass — 21 passed tablet+phone |
| Full matrix | `pnpm exec playwright test --project=tablet --project=phone` | pass — 59 passed, 1 skipped (@ci) |
| CI | `gh pr checks` | see checks on this pull request |

## Media

P3.T2.3 GIF planned but not generated in-phase. E2E driver journeys are the proof (smoke.spec 1063, 1182).

## Review

PASS WITH FINDINGS, 1 round — no Critical/High/Medium; 3 Low doc drifts fixed in Phase R1 with `pnpm check` green (biome + tsc + 904).

## Deviations and risks

- `src/scene/init-scene.ts` exposes `filmedView()/cameraSpot()` e2e witnesses (smallest-necessary, AC-4 provability).
- `src/style.css` stale two-train comment noted then fixed in R1.
- `pnpm e2e` run by primary (executor shell scope was `pnpm check` only).

## Follow-ups

- None filed (no CI-blocking findings; issues enabled and checked — `gh issue list` empty).

## Rollback

`git revert` the squash commit. No save migration — ride selection and camera only.
