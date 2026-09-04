# Plan: Hill-Grade Pace

Feature track per `spec.md`. Grade-aware autonomous pace + per-loco
personalities, no UI, no save change. Phase 1 is logic-bearing (TDD per
`workflow.md`): pure `pace.ts`. Phase 2 is scene/audio wiring
(acceptance-criteria verification). Phase 3 closes with e2e, gates,
and tablet verification.

## Phase 1 - Pure Pace Model (TDD)

- [x] Task: `pace.test.ts` Red — grade −35% / +25%, eased ramp,
  never-stall floor, symmetric reverse (via `rideHeightAt` /
  `stepHeights` / `isReversedSpan`), personalities
  steam 0.9 / tram 1.0 / diesel 1.2, flat identity (= 1.0 exactly)
- [x] Task: `pace.ts` Green + refactor — pure, total, no three.js,
  no alloc; coverage >80%; `tsc --noEmit` + `biome check` clean

  Notes (Phase 1 implementation — commit `ee67db6`):
  - Red: `pace.test.ts` (14 tests) failed on missing `./pace` module;
    Green: new `src/core/pace.ts` (`gradePaceFactor`, `personalityPace`,
    `livePaceFactor`, `easePaceFactor` + `PACE_CLIMB/DESCENT/MIN/EASE`
    constants) — 14/14 green.
  - Coverage: `pace.ts` 100% lines/funcs, 92% stmts, 87% branches
    (>80% gate holds). `tsc --noEmit` clean; `biome check` clean
    (one import-sort + one format fix via `--write`, tests re-green).
  - Full unit suite: 35 files / 580 tests green, zero regressions.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 1):
  - Scope: pure `src/core/pace.ts` + `pace.test.ts` only — matches plan,
    no scene/audio/save changes, no spec drift.
  - Auto: vitest 580/580 green (incl. 14 new); biome + tsc clean.
  - Manual tablet: N/A this phase — no visual/audio behavior changes
    yet (scene unwired); tablet verification deferred to Phase 3 e2e.
  - Checkpoint: `ee67db6`.

## Phase 2 - Scene Ride + Audio Wiring

- [~] Task: `ride-motion.ts` live speed — `RIDE_SPEED × personality ×
  grade` in `update()`, eased ~0.5s, brake protection (boost eases out
  before `BRAKE_DISTANCE`), station 2s / cargo / confetti untouched,
  no per-frame alloc, camera follow unchanged
- [ ] Task: Per-train chug tempo + puff rate — scale with live speed,
  per-train voices (up to 4), mute-respecting, no pitch jumps;
  acceptance: diesel chugs faster than steam on the same oval
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - E2E, Gates & Tablet Verification

- [ ] Task: Playwright `e2e/hill-pace.spec.ts` — hill loop labors /
  breezes, diesel laps faster than steam, flat-loop timing unchanged,
  downhill-into-station docks exactly, reload stable, clean console,
  zero external requests (tablet + phone)
- [ ] Task: Docs — CHANGELOG Unreleased parent-voice entry; no
  `product.md` / `tech-stack.md` changes expected (no new pieces,
  no save bump, no assets)
- [ ] Task: Final gates — `pnpm check` (biome + tsc + vitest),
  coverage report on `pace.ts`, full Playwright run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
