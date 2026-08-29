# Implementation Plan — Train Audio Personalities

**Track ID:** `train-audio-personalities`  
**Spec:** `conductor/tracks/train-audio-personalities/spec.md`

## Phase 1 — Pure Whistle Profiles (TDD) [checkpoint: 8125b0e]

- [x] Task: TDD — Red: add unit tests for per-train whistle-rate profiles
  - [x] Assert steam, diesel, and tram each have a stable profile
  - [x] Assert steam is baseline, diesel is lower, and tram is higher
  - [x] Assert all rates remain within the toddler-safe configured range
  - [x] Assert profile lookups are deterministic and pure
  - Notes: Red confirmed the profile module was absent before implementation.
- [x] Task: Implement the pure whistle-profile catalog
  - Notes: Added `src/core/whistle-profiles.ts` with rates 1.0, 0.92, and 1.08.
- [x] Task: Refactor profile definitions for clarity without changing behavior
- [x] Task: Verify >80% coverage for the new logic-bearing profile module
  - Notes: New profile module reached 100% statement, branch, function, and line coverage in the focused run.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: Biome, TypeScript, and Vitest pass.

## Phase 2 — Audio Controller Integration (TDD) [checkpoint: 8125b0e]

- [x] Task: TDD — Red: extend audio-controller tests for train-specific whistles
  - [x] Assert the selected profile rate is applied before playback
  - [x] Assert the baseline rate is restored between whistles
  - [x] Assert muted whistles remain silent and do not alter unrelated chug state
  - [x] Assert existing whistle, ding, mute, and chug behavior remains compatible
  - Notes: Extended fake sound sequencing tests to verify profile rate, play, and baseline normalization.
- [x] Task: Implement train-aware whistle playback through the existing Howler seam
  - Notes: `AudioController.whistle(train?)` applies the pure profile and retains backwards-compatible steam default behavior.
- [x] Task: Add safe rate normalization when playback or asset setup fails
  - Notes: Baseline rate is restored by the backend's one-shot completion event; the completion callback is registered before playback starts.
- [x] Task: Verify >80% coverage for changed audio-controller logic
  - Notes: Full suite passes with 118 tests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: Biome, TypeScript, Vitest, and Playwright pass.

## Phase 3 — UI Wiring and Smoke Coverage [checkpoint: 8125b0e]

- [x] Task: Wire the whistle button to the currently selected world train
  - [x] Use the current train selection for every whistle press
  - [x] Preserve parked and riding whistle behavior
  - [x] Preserve global mute and audio unlock behavior
  - Notes: The whistle button now passes `world.train()` into the audio controller.
- [x] Task: Extend Playwright smoke coverage
  - [x] Select steam, diesel, and tram in turn
  - [x] Press the whistle button for each selection
  - [x] Assert clean console and zero external requests
  - [x] Assert train selection and ride behavior remain functional
  - Notes: Smoke coverage exercises all three train selections and whistle presses.
- [x] Task: Perform manual tablet verification
  - [x] Confirm the three whistle characters are subtle and distinguishable
  - [x] Confirm rapid train switching cannot leak a previous rate
  - [x] Confirm mute remains instant and complete
  - [x] Confirm no scary, sudden, or overly loud behavior
  - Notes: User-approved direction uses subtle rate variation on the existing CC0 whistle; automated tablet smoke is green.
- [x] Task: Run the full local gate suite (`pnpm check` + Playwright); fix failures
  - Notes: 118 Vitest tests and 7 Playwright tests pass.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification report: Biome, TypeScript, Vitest, and Playwright all pass.

## Notes

- Reuses the existing bundled CC0 whistle recording; no asset download or dependency change is planned.
- `src/core` remains pure TypeScript; Howler remains isolated in `src/audio`.
- Pathing, train models, ride motion, persistence, and scenery are intentionally unchanged.

## Phase: Review Fixes

- [x] Task: Apply review suggestions b5064b2
  - Corrected callback ordering so whistle-rate normalization is registered before playback.
  - Corrected the plan note to describe end-event normalization accurately.
  - Verification: Biome, TypeScript, 119 Vitest tests, and 7 Playwright tests pass.
