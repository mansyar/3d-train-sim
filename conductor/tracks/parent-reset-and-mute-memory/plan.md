# Plan — Parent Reset & Mute Memory

Implementation follows workflow.md: TDD for logic-bearing code (src/core,
src/state), smoke/manual verification for UI wiring. Phases end with a
verification checkpoint per the Phase Completion protocol.

## Phase 1 — Save Format & Mute Persistence (logic-bearing, TDD)

- [x] Task: Write failing unit tests for preferences-aware snapshots (Red) [0b5fa03]
  - [x] Snapshot round-trip preserves the mute preference
  - [x] Snapshot without a preferences field deserializes to sound-on default
  - [x] Invalid/unknown preference values fall back to sound-on without throwing
  - [x] Confirm new tests fail before implementation
  - Notes: Red confirmed (4 failing: missing `deserializePreferences` export,
    ignored 4th serialize arg). Green added an optional
    `preferences: { muted }` to `WorldSnapshot`; `serializeWorld` gains a
    `muted` param and omits the field when sound is on so every existing
    snapshot test stayed green unchanged. New pure `deserializePreferences`
    falls back to sound-on for missing/invalid values, never throwing.
- [x] Task: Extend snapshot schema in src/core/save.ts (Green) [0b5fa03]
  - [x] Optional device-preferences object on the versioned snapshot
  - [x] All existing save/load tests remain green
- [ ] Task: Write failing unit tests for mute persistence triggers (Red)
  - [ ] Boot restore applies the persisted mute state exactly once
  - [ ] Each mute change persists exactly once; storage failure is non-fatal
- [ ] Task: Implement mute persistence wiring (Green)
  - [ ] src/state/persistence.ts subscribes to mute changes via the audio seam
  - [ ] Boot path restores mute alongside world hydration
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — World Reset Core (logic-bearing, TDD)

- [ ] Task: Write failing unit tests for world reset (Red)
  - [ ] Reset removes all track pieces and scenery
  - [ ] Occupancy and the 64-item capacity are fully freed after reset
  - [ ] Train selection returns to the default steam locomotive
  - [ ] Exactly one persistence notification fires after reset (also on an
        already-empty world)
- [ ] Task: Implement world.reset() in src/state/world.ts (Green)
- [ ] Task: Write failing unit tests for ride-aware reset ordering (Red)
  - [ ] An active ride is gently stopped before any world clearing (order
        asserted via fakes)
- [ ] Task: Implement gentle-stop-before-clear ordering (Green)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Parent Gate UI & Kid-Facing Feedback (non-logic, smoke + manual)

- [ ] Task: Record observable acceptance criteria in this plan for manual/
      smoke verification
- [ ] Task: Build the corner parent-gate control
  - [ ] ≥64px target, visually muted, pointer-events hold with 2s progress fill
  - [ ] Small drift tolerated; early release cancels silently
  - [ ] Reduced-motion fallback for the progress fill
- [ ] Task: Add the icon-only confirm step
  - [ ] State change after successful hold; accessible labels for parents
  - [ ] Outside tap dismisses silently
- [ ] Task: Wire the reset action end-to-end
  - [ ] Gentle ride stop → world reset → celebratory scale-down pop + happy
        placement ding
  - [ ] Fresh default meadow renders; reduced-motion respected
- [ ] Task: Wire mute toggle to the persisted state on boot
- [ ] Task: Extend Playwright smoke coverage
  - [ ] Mute → reload → still muted; toggle reflects restored state
  - [ ] Full gate flow clears a placed piece, reverts train to steam, empty
        world persists across reload
  - [ ] Early release cancels with no state change
  - [ ] No console errors or external requests
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Track Completion

- [ ] Task: Run full local gates (biome check, tsc --noEmit, Vitest with
      coverage, Playwright)
- [ ] Task: Verify new logic-bearing modules exceed 80% coverage
- [ ] Task: Review against product-guidelines checklist (no fail states,
      parent-gated destruction, instant feedback, privacy)
- [ ] Task: Update tracks.md registry + metadata.json status, archive-ready
      summary in this plan
