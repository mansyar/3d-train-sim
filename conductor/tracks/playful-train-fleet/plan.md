# Implementation Plan — Playful Train Fleet

**Track ID:** `playful-train-fleet`  
**Spec:** `conductor/tracks/playful-train-fleet/spec.md`

## Phase 1 — Train Catalog and World State (TDD) [checkpoint: dfb3463]

- [x] Task: TDD — Red: add unit tests for the three-train catalog
  - [x] Assert exactly three stable train kinds are exposed
  - [x] Assert every train has a local model URL, accessible label, icon, and personality metadata
  - [x] Assert catalog helpers are total and pure
  - Notes: Added `src/core/trains.test.ts`; the Red run failed because the catalog module was absent, confirming the test exercised new behavior.
- [x] Task: TDD — Red: add world-store tests for train selection
  - [x] Assert new worlds default to the steam locomotive
  - [x] Assert selecting each catalog train updates the selected train
  - [x] Assert invalid train identifiers fall back safely
  - [x] Assert selection changes notify subscribers and do not alter pieces or scenery
  - Notes: Added train-selection coverage to `src/state/world.test.ts`; Red exposed the missing API while all existing world behavior stayed green.
- [x] Task: Implement the pure train catalog and world-store selection API
  - Notes: Added `src/core/trains.ts` and extended `src/state/world.ts` with default steam selection, validated selection, notification, and hydration support. Commit `dfb3463`.
- [x] Task: Refactor catalog/state code for clarity without changing behavior
  - Notes: Biome import organization applied to changed implementation files.
- [x] Task: Verify >80% coverage for new logic-bearing catalog and state code
  - Notes: `pnpm exec tsc --noEmit`, Biome checks, and the full Vitest suite pass: 13 files / 114 tests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: `pnpm exec biome check`, `pnpm exec tsc --noEmit`, and `pnpm test` all pass.
  - Manual verification pending: run the tablet walkthrough after scene/UI integration is complete.

## Phase 2 — Save/Load Compatibility (TDD) [checkpoint: dfb3463]

- [x] Task: TDD — Red: extend save tests for selected-train serialization
  - [x] Assert snapshots include the selected train
  - [x] Assert round trips preserve the selected train
  - [x] Assert snapshots missing the train field restore the default
  - [x] Assert unknown train identifiers restore the default without losing track/scenery data
  - Notes: Updated `src/core/save.test.ts` and persistence fixtures; legacy snapshots retain their world and default to steam.
- [x] Task: Implement version-compatible save and deserialize behavior
  - Notes: `src/core/save.ts` now serializes and validates train selection while preserving version-1 compatibility.
- [x] Task: Update IndexedDB persistence wiring to save the selected train
  - Notes: `watchWorldPersistence` now persists the selected train and hydration restores it.
- [x] Task: Verify >80% coverage for changed save/persistence logic
  - Notes: Focused and full Vitest suites pass; TypeScript and Biome gates are clean.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: `pnpm exec biome check`, `pnpm exec tsc --noEmit`, and `pnpm test` all pass.
  - Manual verification pending: confirm selection survives an actual browser reload in the Phase 4 smoke test.

## Phase 3 — Train Models and Ride Integration

- [ ] Task: Define and vendor three local locomotive model assets or approved local fallbacks
  - [ ] Keep all assets inside the repository and document provenance
  - [ ] Confirm asset scale/orientation matches the existing ride-motion assumptions
- [ ] Task: Extend scene locomotive loading to manage the selected model
  - [ ] Load local templates without runtime external requests
  - [ ] Keep the placeholder visible while the selected model is unavailable
  - [ ] Replace the parked model when selection changes
  - [ ] Dispose inactive models and resources safely
- [ ] Task: Integrate selection with ride lifecycle
  - [ ] Stop an active ride gently before swapping the selected locomotive
  - [ ] Preserve path solving, motion, camera follow, and reduced-motion behavior
  - [ ] Apply lightweight train-specific visual personality without per-frame allocations
- [ ] Task: Extend audio personality wiring
  - [ ] Select a local whistle variation per train
  - [ ] Preserve global mute, iOS unlock, chug synchronization, and failure tolerance
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Train Drawer UI and End-to-End Coverage

- [ ] Task: Implement the train drawer in the toybox
  - [ ] Replace the placeholder 🚂 control with an expandable train drawer
  - [ ] Render exactly three icon-only, at-least-64px choices
  - [ ] Expose selected state with `aria-pressed` or equivalent accessible state
  - [ ] Preserve one-drawer-open-at-a-time behavior
  - [ ] Ensure selection while riding stops before replacement
- [ ] Task: Extend Playwright smoke coverage
  - [ ] Open the train drawer and assert exactly three choices
  - [ ] Select a non-default train and assert visible selected state
  - [ ] Place track, start riding, and assert the selected train presentation is active
  - [ ] Reload and assert the selected train persists
  - [ ] Assert clean console and zero external requests
- [ ] Task: Perform manual tablet verification
  - [ ] Verify touch targets, drawer interaction, selection feedback, and parked model replacement
  - [ ] Verify train changes during a ride feel gentle and never expose a fail state
  - [ ] Verify each train’s visual/audio personality and reduced-motion behavior
- [ ] Task: Run the full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- This plan preserves the existing path solver and scenery behavior.
- Logic-bearing modules in `src/core/` and `src/state/` require tests before implementation.
- Scene, DOM, and audio glue are validated through Playwright and manual tablet verification per `conductor/workflow.md`.
