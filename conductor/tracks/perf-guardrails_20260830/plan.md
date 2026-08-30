# Plan: Performance Guardrails

Feature track — `src/core` logic is TDD'd; scene wiring is verified via
acceptance criteria + smoke tests per `workflow.md`.

## Phase 1 — FPS Probe & Quality Controller (core, TDD)

- [x] Task: Write failing unit tests for the FPS probe (0bab32c)
  - [x] Ring buffer behavior: preallocated capacity, wraps without allocating
  - [x] Verdict thresholds: `healthy` / `strained` / `critical` over a ~4 s rolling window
  - [x] Hidden-tab pause: samples ignored while paused; resuming doesn't count the gap
  - Notes:
    - Task: FPS probe specs — Red phase.
    - Added `src/core/perf-monitor.test.ts` covering: startup grace (healthy
      before enough samples), 60 fps → healthy, 35 fps → strained, 20 fps →
      critical, rolling-window eviction of stale history, ring-buffer wrap
      with a small capacity, paused sampling fully ignored, resume-gap delta
      not poisoning the next verdict, runaway-delta clamping, and constant
      exposure (`PERF_SAMPLE_CAPACITY`, `PERF_HEALTHY_FPS`,
      `PERF_STRAINED_FPS`, `PERF_WINDOW_SECONDS`).
    - Why: spec requires a pure, zero-allocation probe; tests pin verdict
      thresholds and hidden-tab safety before any implementation exists.
    - Confirmed failing (`Cannot find module './perf-monitor'`).
- [x] Task: Write failing unit tests for the quality controller (45e7fd1)
  - [x] Sustained strain degrades L0→L1→L2; single-verdict dips do not
  - [x] Cooldown between level changes (no flapping)
  - [x] Recovery after sustained health is slower than degradation; never skips levels upward
  - Notes:
    - Task: Quality controller specs — Red phase.
    - Extended `src/core/perf-monitor.test.ts` with a `createQualityController`
      describe block: starts at L0, single strained dips ignored, 2 s sustained
      strain degrades L0→L1→L2, health mid-streak resets strain progress,
      4 s cooldown freezes changes after any level change, recovery needs 6 s
      sustained health (slower than the 2 s degrade hold) and only ever moves
      one level up, and `onLevelChange` fires exactly on real changes.
    - Tests drive the controller with 0.1 s steps (frame-like updates) so the
      cooldown-freeze semantics are exercised the way the frame loop will.
    - Why: pin the toddler-gentle rules (no flapping, no jumps, slow recovery)
      before implementation.
    - Confirmed failing (`Cannot find module './perf-monitor'`).
- [ ] Task: Implement `src/core/perf-monitor.ts` to green; run coverage, target >80%
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Quality Levels & Scene Wiring (scene, acceptance criteria)

- [ ] Task: Define level presets and implement `src/scene/quality-applier.ts`
  - Acceptance: L0 reproduces today's look exactly; L1 clamps render scale
    + halves shadow map; L2 sets pixel ratio 1.0, shadows off, halves
    weather-particle spawn; transitions smooth
- [ ] Task: Wire the probe into the init-scene frame loop and the visibility-controller pause hook
  - Acceptance: hidden tab freezes the probe; no per-frame allocations in the render path
- [ ] Task: Add the `?perf=debug` overlay (fps + level)
  - Acceptance: hidden without the param; visible, readable, non-interactive with it
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Verification & Docs

- [ ] Task: Full gates — `pnpm check` + Playwright suites (`smoke`, `phone-shell`, `prod`)
- [ ] Task: Manual verification — heavy scene (4 trains, rain, night) under Chrome CPU throttling ~6×; confirm gentle degradation + recovery; spot-check on a real tablet if available
- [ ] Task: Update docs — `tech-stack.md` folder structure note, `CHANGELOG.md` `[Unreleased]` entry (parent-readable)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
