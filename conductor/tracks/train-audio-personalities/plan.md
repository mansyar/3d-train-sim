# Implementation Plan — Train Audio Personalities

**Track ID:** `train-audio-personalities`  
**Spec:** `conductor/tracks/train-audio-personalities/spec.md`

## Phase 1 — Pure Whistle Profiles (TDD)

- [ ] Task: TDD — Red: add unit tests for per-train whistle-rate profiles
  - [ ] Assert steam, diesel, and tram each have a stable profile
  - [ ] Assert steam is baseline, diesel is lower, and tram is higher
  - [ ] Assert all rates remain within the toddler-safe configured range
  - [ ] Assert profile lookups are deterministic and pure
- [ ] Task: Implement the pure whistle-profile catalog
- [ ] Task: Refactor profile definitions for clarity without changing behavior
- [ ] Task: Verify >80% coverage for the new logic-bearing profile module
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Audio Controller Integration (TDD)

- [ ] Task: TDD — Red: extend audio-controller tests for train-specific whistles
  - [ ] Assert the selected profile rate is applied before playback
  - [ ] Assert the baseline rate is restored between whistles
  - [ ] Assert muted whistles remain silent and do not alter unrelated chug state
  - [ ] Assert existing whistle, ding, mute, and chug behavior remains compatible
- [ ] Task: Implement train-aware whistle playback through the existing Howler seam
- [ ] Task: Add safe rate normalization when playback or asset setup fails
- [ ] Task: Verify >80% coverage for changed audio-controller logic
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — UI Wiring and Smoke Coverage

- [ ] Task: Wire the whistle button to the currently selected world train
  - [ ] Use the current train selection for every whistle press
  - [ ] Preserve parked and riding whistle behavior
  - [ ] Preserve global mute and audio unlock behavior
- [ ] Task: Extend Playwright smoke coverage
  - [ ] Select steam, diesel, and tram in turn
  - [ ] Press the whistle button for each selection
  - [ ] Assert clean console and zero external requests
  - [ ] Assert train selection and ride behavior remain functional
- [ ] Task: Perform manual tablet verification
  - [ ] Confirm the three whistle characters are subtle and distinguishable
  - [ ] Confirm rapid train switching cannot leak a previous rate
  - [ ] Confirm mute remains instant and complete
  - [ ] Confirm no scary, sudden, or overly loud behavior
- [ ] Task: Run the full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Reuses the existing bundled CC0 whistle recording; no asset download or dependency change is planned.
- `src/core` remains pure TypeScript; Howler remains isolated in `src/audio`.
- Pathing, train models, ride motion, persistence, and scenery are intentionally unchanged.
