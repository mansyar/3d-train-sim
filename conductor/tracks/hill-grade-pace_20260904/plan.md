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

  Notes (Phase 1 implementation — commit `ee67db6`, plus ramp rework below):
  - Red: `pace.test.ts` (14 tests) failed on missing `./pace` module;
    Green: new `src/core/pace.ts` (`gradePaceFactor`, `personalityPace`,
    `livePaceFactor`, `easePaceFactor` + `PACE_CLIMB/DESCENT/MIN/EASE`
    constants) — 14/14 green.
  - Coverage: `pace.ts` 100% lines/funcs, 92% stmts, 87% branches
    (>80% gate holds). `tsc --noEmit` clean; `biome check` clean
    (one import-sort + one format fix via `--write`, tests re-green).
  - Full unit suite: 35 files / 580 tests green, zero regressions.
  - Rework (during Phase 2, uncommitted at the time): the per-frame
    `easePaceFactor(current, target, dt)` converges exponentially — ~42%
    of the gap still open after 0.5 s, muting the Moderate grade. Replaced
    with a true timed ramp: pure `easePaceRamp(from, target, progress)`
    in core + ramp state (`paceFrom`/`paceRamp`/`paceLastTarget`) in the
    motion, so pace always lands exactly ~0.5 s after a grade change.
    Core tests updated (15 tests); motion tests settle exactly.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 1):
  - Scope: pure `src/core/pace.ts` + `pace.test.ts` only — matches plan,
    no scene/audio/save changes, no spec drift.
  - Auto: vitest 580/580 green (incl. 14 new); biome + tsc clean.
  - Manual tablet: N/A this phase — no visual/audio behavior changes
    yet (scene unwired); tablet verification deferred to Phase 3 e2e.
  - Checkpoint: `ee67db6`.

## Phase 2 - Scene Ride + Audio Wiring

- [x] Task: `ride-motion.ts` live speed — `RIDE_SPEED × personality ×
  grade` in `update()`, eased ~0.5s, brake protection (boost eases out
  before `BRAKE_DISTANCE`), station 2s / cargo / confetti untouched,
  no per-frame alloc, camera follow unchanged
- [x] Task: Per-train chug tempo + puff rate — per-train puff tempo via
  per-rig accumulators; ONE capped chug loop riding the filmed train's
  live pace (user decision 2026-09-04: replaces spec FR4's per-train
  loops — 4 concurrent loops fight the gentle/capped audio guideline);
  mute-respecting, no pitch jumps; acceptance: diesel chugs faster than
  steam on the same oval
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  Verification Report (Phase 2 — accepted 2026-09-04):
  - Scope: `ride-motion.ts` + tests, `audio-controller.ts` + tests,
    `pace.ts` ramp rework + tests, `init-scene.ts` wiring, spec FR4
    amendment (filmed-train chug decision), plan notes. No save/UI/
    product/asset changes — matches plan, no drift.
  - Auto: vitest 592/592 green (incl. 11 new); `tsc --noEmit` clean;
    `biome check` clean (1 auto-fix, within the 2-fix budget).
  - Manual tablet: deferred — no visual/audio proof at this phase;
    covered by Phase 3 e2e (headless browser) + tablet pass.
    Explicit user yes to continue.
  - Checkpoint: `bd034ad`.

  Notes (Phase 2 implementation — uncommitted):
  - Motion (`src/scene/ride-motion.ts`): `setKind()` + `pace()` on the
    `RideMotion` interface; per-segment natural heights (`gradeEntry` /
    `gradeExit`) built in `beginRide`; timed ramp in `update()` restarts
    on target change; both advance sites use
    `RIDE_SPEED × paceFactor × speedScale`; brake glide targets
    personality only (boost yields directionally through the short
    0.66-unit glide; docking exactness still via distance snap).
    Default kind tram ⇒ flat rides byte-identical (only the hill-climb
    timing test changed, rewritten pace-aware).
  - Motion tests (+6 its): flat personality pace per kind, default tram
    identity, per-kind climb pace (0.585 / 0.65 / 0.78), diesel-vs-steam
    dead-end race (diesel first, both arrive), max pace jump < 0.15,
    downhill-into-station docks exactly (ding-ding, on-rails, softened,
    pace < 1.25, resumes after 2 s).
  - Audio (`src/audio/audio-controller.ts`, TDD +5 tests): `setChugRate`
    clamped [0.5, 1.5], multiplies with the pause dip, silent while
    parked/muted, `stopChug` resets to full voice.
  - Scene (`src/scene/init-scene.ts`): `TrainRig.puffAcc` accumulator per
    rig (emit every 0.5 s of *paced* time, parked rigs reset); global
    `onChugBeat` puff loop removed; frame loop drives
    `audio.setChugRate(filmed ?? primary pace)`; `swapRigKind` forwards
    `setKind`. No per-frame alloc (locals only).
  - Gates: 592/592 vitest green, `tsc --noEmit` clean, `biome check`
    clean (1 auto-fix).

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
