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
- [x] Task: Write failing unit tests for mute persistence triggers (Red) [6702721]
  - [x] Boot restore applies the persisted mute state exactly once
  - [x] Each mute change persists exactly once; storage failure is non-fatal
  - Notes: Red confirmed (4 failing: missing persistence exports). Tests also
    pin that world-mutation saves carry the CURRENT mute preference so the
    two subscriptions can never clobber each other's data. One test-authoring
    fix (wrong expected polarity on the second emit) — no impl change.
- [x] Task: Implement mute persistence wiring (Green) [6702721]
  - [x] src/state/persistence.ts subscribes to mute changes via the audio seam
  - [x] Boot path restores mute alongside world hydration
  - Notes: `watchMutePersistence` saves the full snapshot per mute change;
    `watchWorldPersistence` gains `readMuted` so world saves carry the
    preference; `snapshotOf` now delegates to `serializeWorld` (one schema
    owner). `restoreMutePreference` applies sound-on default exactly once on
    boot, no audio unlock required. main.ts applies restore BEFORE watchers
    attach so boot hydration never rewrites storage. Suite 128/128 green.
    Coverage follow-up [f0e37a5]: mocked `idb` in persistence tests so the
    real `loadWorldSnapshot`/`saveWorldSnapshot` bodies (including the
    non-fatal catch) are unit-covered — persistence.ts now 87.5% stmts,
    save.ts 88.9%; suite 131/131 green.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: f0e37a5]
  - Verification Report:
    - Automated: `CI=true pnpm test --coverage` → 14 files / 131 tests
      passed; coverage save.ts 88.9%, persistence.ts 87.5% (>80% target met);
      biome + tsc clean.
    - Manual (device check pending user): toggle 🔊→🔇, reload → still muted
      at boot; back to 🔊, reload → still on; IndexedDB snapshot carries
      `preferences.muted`; place-a-piece-while-muted then reload keeps both
      the piece and the muted state; no console errors.
    - Confirmation: user session continued on question timeout; automated
      gates green at recording time. Phase 3 smoke coverage will additionally
      assert the mute-survives-reload behavior end-to-end.

## Phase 2 — World Reset Core (logic-bearing, TDD)

- [x] Task: Write failing unit tests for world reset (Red) [4ca9d92]
  - [x] Reset removes all track pieces and scenery
  - [x] Occupancy and the 64-item capacity are fully freed after reset
  - [x] Train selection returns to the default steam locomotive
  - [x] Exactly one persistence notification fires after reset (also on an
        already-empty world)
  - Notes: Red confirmed — 6 failing tests across the phase, all on the
    missing `reset` API. Tests also pin fresh id generation (`piece-1`) and
    the single-notification contract.
- [x] Task: Implement world.reset() in src/state/world.ts (Green) [4ca9d92]
  - Notes: One atomic mutation — train → steam, arrays cleared, ids restart,
    a single `notify()`. Suite 137/137 green; world.ts 97.2% stmts.
- [x] Task: Write failing unit tests for ride-aware reset ordering (Red) [4ca9d92]
  - [x] An active ride is gently stopped before any world clearing (order
        asserted via fakes)
  - Notes: Ordering asserted with an event log — the ride-stop notification
    lands before any world-driven UI reaction (`ride-stopped` then
    `world-cleared`), and the last solved path is kept for the camera.
- [x] Task: Implement gentle-stop-before-clear ordering (Green) [4ca9d92]
  - Notes: No new implementation was required — the ride controller's
    pre-existing world subscription (the established mid-ride-edit gentle
    stop) composes with the single reset notification. Tests pin the
    guarantee; an idle ride emits no ride event at all.
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
