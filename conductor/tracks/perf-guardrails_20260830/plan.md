# Plan: Performance Guardrails

Feature track — `src/core` logic is TDD'd; scene wiring is verified via
acceptance criteria + smoke tests per `workflow.md`.

## Phase 1 — FPS Probe & Quality Controller (core, TDD)

- [ ] Task: Write failing unit tests for the FPS probe
  - [ ] Ring buffer behavior: preallocated capacity, wraps without allocating
  - [ ] Verdict thresholds: `healthy` / `strained` / `critical` over a ~4 s rolling window
  - [ ] Hidden-tab pause: samples ignored while paused; resuming doesn't count the gap
- [ ] Task: Write failing unit tests for the quality controller
  - [ ] Sustained strain degrades L0→L1→L2; single-verdict dips do not
  - [ ] Cooldown between level changes (no flapping)
  - [ ] Recovery after sustained health is slower than degradation; never skips levels upward
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
