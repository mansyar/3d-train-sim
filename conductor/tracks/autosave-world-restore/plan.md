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
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Persistent World Store (src/state, TDD)

- [ ] Task: TDD — Red: write failing tests for hydration, autosave after successful mutations, and non-fatal storage failures
  - [ ] Test hydration restores tracks and scenery while preserving shared occupancy and capacity rules
  - [ ] Test placement, relocation, and removal schedule one persisted snapshot per successful mutation
  - [ ] Test failed persistence does not prevent in-memory mutations or throw to callers
- [ ] Task: TDD — Green: integrate the existing `idb` dependency with the world store and controlled hydration
- [ ] Task: Ensure restored IDs advance the generated-ID counter without collisions
- [ ] Task: Verify coverage >80% for new persistence/state logic
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Startup Restore and Smoke Coverage (src/main.ts, e2e)

- [ ] Task: Wire asynchronous startup loading so the latest valid world is restored during app boot
  - [ ] Empty or unavailable storage starts a usable empty meadow
  - [ ] Invalid storage is ignored without an uncaught error or kid-facing failure state
  - [ ] Existing ride, scenery rendering, and interaction behavior remain intact
- [ ] Task: Playwright smoke test — place track and scenery, reload, and verify both persist with zero console errors and zero external requests
- [ ] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Manual tablet walkthrough (place, relocate, remove, reload, then ride) — user-confirmed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Persistence is intentionally local-only and uses the existing `idb` dependency
  and `worlds` object store specified by `conductor/tech-stack.md`.
- Corrupt or unavailable storage is treated as an empty world, never as a
  toddler-visible failure.
