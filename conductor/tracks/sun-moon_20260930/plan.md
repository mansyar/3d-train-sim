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
  on the clock. A jump lands on the *center* of the target phase (read off the
  shared `PHASE_BOUNDS` table) so the tapped phase reads at full mood, and the
  clock keeps a mutable `anchor` fraction instead of a fixed `START_FRACTION` —
  re-anchoring by time offset moved the day backwards, which two tests caught.
  (This center-vs-start choice was originally wrong — see the Phase 2 fix
  below.)
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

- [x] Task: Sun/moon icon + rail slot — 96f45d0
  - [x] Add sun/moon SVG to `toy-icons.ts` (high-contrast, chunky)
  - [x] Add the `toy-slot` button to the toybox rail in `app.ts` (aria-label,
        ≥64px, visible in ride mode like mute)
  - [x] Acceptance: tap swaps icon + scale-bounces <100 ms; icon always shows
        the *next* phase; no console errors

  Notes: Used ☀️/🌙 emoji rather than hand-rolled SVG — the adjacent mute
  button is emoji (🔊/🔇), so this keeps one visual language, and the spec
  called for no new tweening. The button is a `.day-toggle` styled as a clone
  of `.mute-toggle` (72×75 px measured in-browser, over the 64px guideline).
  The icon had to follow the drift, not just the tap, so `subscribeDayPhase`
  is threaded ambience → `SceneHandle` → `AppOptions`; the click handler no
  longer refreshes the icon itself, because the clock emits synchronously.
  Caught one real bug `tsc` could not: `watchWorldPersistence`'s 3rd positional
  param is `save`, not the day reader, and `() => DayPhase` is assignable to
  `(snapshot) => void` — so the call compiled while silently disabling world
  autosave. Fixed by passing `saveWorldSnapshot` explicitly.
- [x] Task: Wire tap → `advancePhase()` + preference save through the
      ride-controller/audio-free path — 96f45d0
  - [x] Acceptance: repeated taps cycle all 5 phases and wrap; sky/lights/
        toys follow via the existing repaint pipeline; reduced motion
        unaffected

  Notes: `advanceDay()` calls `clock.advancePhase()` and then `paint()`s
  immediately rather than waiting for the next frame — the frame loop can be
  suspended, and the toy should answer the tap on the spot. `main.ts` adapts
  the scene's clock to the plain clock shape `persistence.ts` already wanted,
  so the tested signatures needed no churn.
- [x] Task: Fix: land phase jumps at phase centers, not phase starts — c3d3dbf

  Notes: Found by screenshotting each phase in a real browser — the only check
  that could catch it. Jumping to night painted a **maroon ember sky**, because
  a jump landed on night's first moment (0.72), which sits 30% into the
  dusk→night color blend. `sky-palette.ts` keys its colors to phase *midpoints*
  (its own type comment says so: 0.06 / 0.285 / 0.525 / 0.66 / 0.86 are exactly
  the `PHASE_BOUNDS` midpoints), so landing on a boundary showed the outgoing
  mood's palette. Changed `PHASE_STARTS` to `PHASE_CENTERS`, still derived from
  the one bounds table. Two tests I had written in Phase 1 pinned the wrong
  behavior and were corrected (red first: 3 failed, then green); one more of my
  own expectations was arithmetically wrong — noon ends at 0.6, so drifting 0.1
  of a day from its 0.525 center leaves noon — and was corrected to 0.05.
  After: 753 passing, and all five phases repaint to their true palettes.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Verification Report — Phase 2 (pending manual sign-off)

- Automated: `biome check .` clean · `tsc --noEmit` clean · 753 tests passing
  (40 files) · `e2e/sun-moon.spec.ts` 4/4 green on the tablet and phone
  projects · zero console errors in-browser and in the spec.
- Browser-verified (agent, Chromium): button present at 72×75 px; taps turn
  the day and the icon always previews the phase a tap brings; night survives
  a full reload; a save with `preferences` deleted boots back to mid-morning.
  The `null` preferences reads seen mid-investigation were correct behavior —
  mid-morning is the default and `serializeWorld` omits defaults, so a day that
  drifted home legitimately writes no preferences.
- Screenshots of all five phases confirmed sky, meadow, window glow, headlight
  and fireflies all follow — and caught the phase-center bug above.

## Phase 3 — E2E & Docs

- [x] Task: Playwright smoke spec (`e2e/sun-moon.spec.ts`) — c3d3dbf
  - [x] Tap cycles phases and the icon flips (assert via dev
        `__tinyTracksScene.dayPhase` + the button's text)
  - [x] Reload restores the tapped phase; clean console
  - [x] Legacy save with no preferences boots to mid-morning

  Notes: Written first as a throwaway screenshot script, then promoted to a
  real spec once it was passing. Deliberately drift-proof: the day moves on its
  own every 150 s, so no assertion pins a starting phase or counts a fixed
  number of turns — the icon invariant is read as "icon and phase agree right
  now", and the reload witness parks on `night` (the longest phase) so drift
  cannot outrun it. Cycle *order* is left to the unit tests, which already pin
  it exhaustively. 60 s budgets per `e2e/README.md`.
- [ ] Task: Docs
  - [ ] CHANGELOG `[Unreleased]` entry (parent-friendly wording)
  - [ ] `product.md` roadmap note + `tech-stack.md` touch-ups if wiring
        shifted
- [ ] Task: Full gate run — `pnpm exec biome check . && pnpm exec tsc
      --noEmit && pnpm test` + e2e suite
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
