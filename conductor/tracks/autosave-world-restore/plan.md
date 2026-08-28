# Implementation Plan — Autosave & World Restore

**Track ID:** `autosave-world-restore`
**Spec:** `conductor/tracks/autosave-world-restore/spec.md`

## Phase 1 — Pure Snapshot Format and Validation (src/core, TDD)

- [x] Task: TDD — Red: write failing tests for versioned snapshots, track/scenery round trips, ordering, IDs, rotations, and malformed data
  - [x] Test valid snapshots preserve every supported field exactly
  - [x] Test invalid versions, kinds, cells, duplicate occupancy, and capacity overflow are rejected safely
  - [x] Test serialization is JSON-safe and does not depend on browser or Three.js APIs
- [x] Task: TDD — Green: implement pure serialization/deserialization in `src/core/save.ts`
- [x] Task: Refactor snapshot validation for readable, total-function behavior
- [x] Task: Verify coverage >80% for new logic-bearing save code
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `pnpm check` passed (106/106 unit tests); coverage run passed.
  - Manual: pending tablet walkthrough confirmation.
  - Checkpoint: `a9025ee`

## Phase 2 — Persistent World Store (src/state, TDD)

- [x] Task: TDD — Red: write failing tests for hydration, autosave after successful mutations, and non-fatal storage failures
  - [x] Test hydration restores tracks and scenery while preserving shared occupancy and capacity rules
  - [x] Test placement, relocation, and removal schedule one persisted snapshot per successful mutation
  - [x] Test failed persistence does not prevent in-memory mutations or throw to callers
- [x] Task: TDD — Green: integrate the existing `idb` dependency with the world store and controlled hydration
- [x] Task: Ensure restored IDs advance the generated-ID counter without collisions
- [x] Task: Verify coverage >80% for new persistence/state logic
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `pnpm check` passed (106/106 unit tests); persistence-focused tests passed.
  - Manual: pending tablet walkthrough confirmation.
  - Checkpoint: `29a087a`

## Phase 3 — Startup Restore and Smoke Coverage (src/main.ts, e2e)

- [x] Task: Wire asynchronous startup loading so the latest valid world is restored during app boot
  - [x] Empty or unavailable storage starts a usable empty meadow
  - [x] Invalid storage is ignored without an uncaught error or kid-facing failure state
  - [x] Existing ride, scenery rendering, and interaction behavior remain intact
- [x] Task: Playwright smoke test — place track and scenery, reload, and verify both persist with zero console errors and zero external requests
- [x] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Manual tablet walkthrough (place, relocate, remove, reload, then ride) — user-confirmed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Automated: `pnpm check` passed (106/106 unit tests); `pnpm exec playwright test` passed (6/6).
  - Manual: pending tablet walkthrough confirmation.
  - Checkpoint: `29a087a`

## Notes

- Persistence is intentionally local-only and uses the existing `idb` dependency
  and `worlds` object store specified by `conductor/tech-stack.md`.
- Corrupt or unavailable storage is treated as an empty world, never as a
  toddler-visible failure.
