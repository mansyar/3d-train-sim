# Implementation Plan: Sun & Moon — Child-Controlled Time of Day

## Phase 1 — Core Logic: Phase Stepping & Preference Persistence (TDD)

- [ ] Task: Day clock `advancePhase()` (write failing tests first)
  - [ ] Test: jumping from each of the 5 phases lands on the correct next
        phase (night wraps to dawn)
  - [ ] Test: jump fires the phase-change subscription event exactly once
  - [ ] Test: after a jump, `tick()` continues drifting forward from the new
        position (fraction advances over time)
  - [ ] Implement `advancePhase()` in `src/core/day-clock.ts` by
        re-anchoring the clock's start time (no scene API changes)
- [ ] Task: Persisted day-phase preference (write failing tests first)
  - [ ] Test: `serializeWorld` round-trips an optional `dayPhase` in
        `preferences`
  - [ ] Test: `deserializePreferences` forgives missing/invalid `dayPhase`
        (defaults to mid-morning start, no throw)
  - [ ] Extend `src/core/save.ts` `DevicePreferences`
- [ ] Task: Persistence wiring in `src/state/persistence.ts` (TDD)
  - [ ] Test: day-phase changes re-save the snapshot without clobbering
        world/mute (change-gated watcher pattern)
  - [ ] Test: `restoreDayPhasePreference` applies a stored phase on boot
  - [ ] Implement watcher + restore alongside the existing mute pair
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Rail Slot UI (non-logic; acceptance criteria)

- [ ] Task: Sun/moon icon + rail slot
  - [ ] Add sun/moon SVG to `toy-icons.ts` (high-contrast, chunky)
  - [ ] Add the `toy-slot` button to the toybox rail in `app.ts` (aria-label,
        ≥64px, visible in ride mode like mute)
  - [ ] Acceptance: tap swaps icon + scale-bounces <100 ms; icon always shows
        the *next* phase; no console errors
- [ ] Task: Wire tap → `advancePhase()` + preference save through the
      ride-controller/audio-free path
  - [ ] Acceptance: repeated taps cycle all 5 phases and wrap; sky/lights/
        toys follow via the existing repaint pipeline; reduced motion
        unaffected
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — E2E & Docs

- [ ] Task: Playwright smoke spec (`e2e/sun-moon.spec.ts`)
  - [ ] Tap cycles phases and the icon flips (assert via dev
        `__tinyTracksWorld` hooks + DOM aria state)
  - [ ] Reload restores the tapped phase; clean console
- [ ] Task: Docs
  - [ ] CHANGELOG `[Unreleased]` entry (parent-friendly wording)
  - [ ] `product.md` roadmap note + `tech-stack.md` touch-ups if wiring
        shifted
- [ ] Task: Full gate run — `pnpm exec biome check . && pnpm exec tsc
      --noEmit && pnpm test` + e2e suite
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
