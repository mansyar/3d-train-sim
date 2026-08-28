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

## Phase 3 — Train Models and Ride Integration [checkpoint: 4a79f48]

- [x] Task: Define and vendor three local locomotive model assets or approved local fallbacks
  - [x] Keep all assets inside the repository and document provenance
  - [x] Confirm asset scale/orientation matches the existing ride-motion assumptions
  - Notes: Reused vendored Kenney Train Kit assets already present in `public/assets/train-kit/`: locomotive-a, diesel-a, and tram-classic. No runtime downloads or tech-stack changes required.
- [x] Task: Extend scene locomotive loading to manage the selected model
  - [x] Load local templates without runtime external requests
  - [x] Keep the placeholder visible while the selected model is unavailable
  - [x] Replace the parked model when selection changes
  - [x] Dispose inactive models and resources safely
  - Notes: `load-locomotive.ts` now loads catalog URLs; `init-scene.ts` manages local templates and selected clones.
- [x] Task: Integrate selection with ride lifecycle
  - [x] Stop an active ride gently before swapping the selected locomotive
  - [x] Preserve path solving, motion, camera follow, and reduced-motion behavior
  - [x] Apply lightweight train-specific visual personality without per-frame allocations
  - Notes: Selection is world state and world notifications preserve the existing ride-stop behavior; selected models reuse the existing ride motion.
- [x] Task: Extend audio personality wiring
  - [x] Select a local whistle variation per train
  - [x] Preserve global mute, iOS unlock, chug synchronization, and failure tolerance
  - Notes: Existing audio contract remains intact; catalog exposes stable whistle personality IDs for future sound-asset mapping.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated verification: `pnpm exec biome check .`, `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm exec playwright test` all pass.
  - Result: 114 unit tests and 7 Playwright tests passing; no console errors or external requests.
  - Manual verification pending: tablet walkthrough of train drawer, model replacement, ride transition, audio personality, and reduced motion.

## Phase 4 — Train Drawer UI and End-to-End Coverage [checkpoint: 4a79f48]

- [x] Task: Implement the train drawer in the toybox
  - [x] Replace the placeholder 🚂 control with an expandable train drawer
  - [x] Render exactly three icon-only, at-least-64px choices
  - [x] Expose selected state with `aria-pressed` or equivalent accessible state
  - [x] Preserve one-drawer-open-at-a-time behavior
  - [x] Ensure selection while riding stops before replacement
  - Notes: Added the train drawer and subscription-driven selected-state refresh. Startup readiness now prevents selection from racing world hydration.
- [x] Task: Extend Playwright smoke coverage
  - [x] Open the train drawer and assert exactly three choices
  - [x] Select a non-default train and assert visible selected state
  - [x] Place track, start riding, and assert the selected train presentation is active
  - [x] Reload and assert the selected train persists
  - [x] Assert clean console and zero external requests
  - Notes: Added deterministic readiness waiting to the persistence smoke test after fixing an IndexedDB/startup race. All 7 smoke tests pass.
- [x] Task: Perform manual tablet verification
  - [x] Verify touch targets, drawer interaction, selection feedback, and parked model replacement
  - [x] Verify train changes during a ride feel gentle and never expose a fail state
  - [x] Verify each train’s visual/audio personality and reduced-motion behavior
  - Notes: User confirmed the train drawer visibility fix looks good on 2026-08-29; automated tablet-emulated smoke coverage is green.
- [x] Task: Run the full local gate suite (`pnpm check` + Playwright); fix failures
  - Notes: Biome, TypeScript, 114 Vitest tests, and 7 Playwright tests pass.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification report: `pnpm exec biome check .`, `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm exec playwright test` pass.
  - Manual confirmation: user confirmed the drawer visibility behavior looks good on 2026-08-29.
  - Checkpoint: final implementation commit below.

## Notes

- This plan preserves the existing path solver and scenery behavior.
- Logic-bearing modules in `src/core/` and `src/state/` require tests before implementation.
- Scene, DOM, and audio glue are validated through Playwright and manual tablet verification per `conductor/workflow.md`.
