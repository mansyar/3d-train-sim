# Implementation Plan: Sun & Moon — Child-Controlled Time of Day

## Phase 1 — Core Logic: Phase Stepping & Preference Persistence (TDD) [checkpoint: bd2df8a]

- [x] Task: Day clock `advancePhase()` (write failing tests first) — b8e4574
  - [x] Test: jumping from each of the 5 phases lands on the correct next
        phase (night wraps to dawn)
  - [x] Test: jump fires the phase-change subscription event exactly once
  - [x] Test: after a jump, `tick()` continues drifting forward from the new
        position (fraction advances over time)
  - [x] Implement `advancePhase()` in `src/core/day-clock.ts` by
        re-anchoring the clock's start time (no scene API changes)

  Notes: Added `DAY_PHASES`, `nextPhase()`, and `setPhase()`/`advancePhase()`
  on the clock. A jump lands on the *first* moment of the target phase (read
  off the shared `PHASE_BOUNDS` table) so the tapped phase reads at full
  mood, and the clock keeps a mutable `anchor` fraction instead of a fixed
  `START_FRACTION` — re-anchoring by time offset moved the day backwards,
  which two tests caught.
- [x] Task: Persisted day-phase preference (write failing tests first) — b622dc8
  - [x] Test: `serializeWorld` round-trips an optional `dayPhase` in
        `preferences`
  - [x] Test: `deserializePreferences` forgives missing/invalid `dayPhase`
        (defaults to mid-morning start, no throw)
  - [x] Extend `src/core/save.ts` `DevicePreferences`

  Notes: `DevicePreferences` gained an optional `dayPhase`; `serializeWorld`
  takes it as a trailing optional arg, so the snapshot version stays 3 and
  every existing caller is untouched. Mid-morning is exported as
  `DEFAULT_DAY_PHASE` and is omitted from storage (it is what a save without
  the field restores to), matching the existing "omit the default" pattern
  for mute. An unknown phase string is dropped without losing mute state.
- [x] Task: Persistence wiring in `src/state/persistence.ts` (TDD) — 7bd77ae
  - [x] Test: day-phase changes re-save the snapshot without clobbering
        world/mute (change-gated watcher pattern)
  - [x] Test: `restoreDayPhasePreference` applies a stored phase on boot
  - [x] Implement watcher + restore alongside the existing mute pair

  Notes: `watchDayPhasePersistence` + `restoreDayPhasePreference` mirror the
  mute pair. `watchWorldPersistence` gained a 4th `readDayPhase` arg (default
  `() => DEFAULT_DAY_PHASE`) so a later track edit keeps the child's chosen
  phase instead of dropping it. Drifting the clock emits no save — only a
  real phase change persists. Two of my own test expectations were wrong
  (0.25 + 0.3 of a day is already noon, and one jump from morning is noon,
  not dusk); the implementation was right. Full suite: 752 passing.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 1

- Automated: `biome check .` clean · `tsc --noEmit` clean · 752 tests
  passing (40 files) · coverage on changed logic all >80% —
  `day-clock.ts` 95.7% stmts / 97.6% lines, `save.ts` 91.9% / 98.6%,
  `persistence.ts` 87.8% / 91.9% (uncovered lines are pre-existing
  unreachable guards).
- Manual (user-confirmed): `pnpm dev` at tablet size — place/remove track
  and scenery behaves normally, autosave fires, a page reload restores the
  built world, the day still starts at mid-morning (no `dayPhase` written
  yet, as expected), console clean.

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
