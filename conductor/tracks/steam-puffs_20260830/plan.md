# Implementation Plan — Steam Puffs

**Track ID:** `steam-puffs_20260830`  
**Type:** Feature  
**Workflow:** TDD for logic-bearing code; scene/audio/render wiring verified with smoke tests and manual checks.

## Phase 1 — Chug Rhythm Contract (logic/audio seam) [checkpoint: f56e3d2]

**Verification Report:** Automated — `CI=true pnpm test -- --coverage` passed with 197 tests; `pnpm exec biome check .` passed across 55 files; `pnpm exec tsc --noEmit` passed; full `CI=true pnpm test` passed (2026-08-30). Manual — user confirmed the ride/chug lifecycle, repeated start/stop behavior, mute behavior, and clean runtime/network behavior meet expectations (2026-08-30).

- [x] Task: Write failing tests for the chug-beat contract (2c1f9e3)
  - [x] Define expected beat notification behavior and listener cleanup.
  - [x] Assert one notification per rhythm beat while chugging.
  - [x] Assert no beat notifications after `stopChug`.
  - [x] Assert mute affects sound only and does not corrupt ride rhythm state.
  - [x] Run the focused suite and confirm the new tests fail (Red phase).
  - Notes: Added an injectable `subscribeToChugBeat` source and an `onChugBeat` consumer API. The controller forwards beats only while chugging; mute leaves rhythm state untouched and consumer unsubscribe is independent. Red phase showed 3 new failures with the existing 193 tests green; Green phase passed 196 tests, strict TypeScript, and Biome. Files: `src/audio/audio-controller.ts`, `src/audio/audio-controller.test.ts`.
- [x] Task: Implement the minimal reusable chug-beat signal (7382432)
  - [x] Preserve existing Howler playback, mute, fade, and rate behavior.
  - [x] Provide a stable subscription/disposal seam for the scene.
  - [x] Avoid allocations in the recurring beat callback path.
  - Notes: Added a fixed 500 ms visual beat clock to the Howler voice and explicit controller lifecycle hooks. The controller forwards beats only while chugging; audio mute/softening behavior remains unchanged. The source timer is created once per voice, starts/stops idempotently with the chug, and does not allocate on each beat. Verification: 197 focused/full Vitest tests passed, strict TypeScript passed, and Biome passed. Files: `src/audio/audio-controller.ts`, `src/audio/audio-controller.test.ts`, `src/audio/howler-voice.ts`.
- [x] Task: Refactor and verify logic coverage (pending plan commit)
  - [x] Keep the rhythm contract small and independently testable.
  - [x] Run `CI=true pnpm test -- --coverage`.
  - [x] Confirm >80% coverage for new logic-bearing code.
  - Notes: No additional refactor was needed after review. Coverage run passed with 197 tests; full Biome check passed across 55 files; strict TypeScript passed; full test suite passed. The new rhythm seam remains isolated to the audio boundary and introduces no runtime dependency or persistence change.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Pooled Steam-Puff Emitter

- [~] Task: Write failing tests for pool and animation logic
  - [ ] Assert exactly 16 reusable puff slots.
  - [ ] Assert emission uses an inactive slot and drops gracefully when saturated.
  - [ ] Assert a puff expires at exactly 1.0 second.
  - [ ] Assert position rises, scale expands, and opacity fades over its lifetime.
  - [ ] Assert stopping emission does not remove already-active puffs.
  - [ ] Assert update/emission paths use stable storage without per-frame allocations.
  - [ ] Run the focused suite and confirm the new tests fail (Red phase).
- [ ] Task: Implement pure puff lifecycle logic
  - [ ] Add a Three.js-independent pool/state module under `src/core/` or `src/state/` following existing boundaries.
  - [ ] Use fixed-size state and deterministic lifecycle updates.
  - [ ] Implement graceful saturation drops.
- [ ] Task: Verify >80% coverage for the new lifecycle logic
  - [ ] Run focused coverage and then the full Vitest suite.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Procedural Billboard Scene Integration

- [ ] Task: Add the procedural puff renderer and fixed scene pool
  - [ ] Create reusable procedural billboard geometry/material resources.
  - [ ] Create exactly 16 reusable scene instances with no per-emission geometry/material/node allocation.
  - [ ] Continuously orient active puffs toward the follow camera.
  - [ ] Animate rise, scale, opacity, and deactivation using the pure lifecycle state.
- [ ] Task: Add locomotive chimney placement
  - [ ] Resolve valid per-locomotive chimney anchors where available.
  - [ ] Add documented fallback offsets for steam, diesel, and tram.
  - [ ] Ensure fallback offsets are static and allocation-free at runtime.
- [ ] Task: Connect ride/audio lifecycle
  - [ ] Start emission only when the ride is active.
  - [ ] Emit one puff per chug beat.
  - [ ] Stop new emissions immediately on ride stop while allowing active puffs to finish.
  - [ ] Dispose subscriptions and pooled resources with the scene.
- [ ] Task: Record observable acceptance criteria in `plan.md`
  - [ ] Confirm visual appearance, camera-facing behavior, placement, lifecycle, and stop fade behavior.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E Smoke and Full Quality Gates

- [ ] Task: Extend Playwright smoke coverage
  - [ ] Start a ride and assert the puff system is active through a dev-only diagnostic seam or observable scene state.
  - [ ] Stop the ride and assert no new puffs appear while active puffs can expire.
  - [ ] Switch among all three locomotives and verify each has a puff origin.
  - [ ] Assert no console errors and zero external requests.
- [ ] Task: Perform manual tablet/emulation verification
  - [ ] Confirm soft white puffs are readable but not visually noisy.
  - [ ] Confirm puffs rise, expand, fade, and face the camera.
  - [ ] Confirm all locomotives use plausible chimney/fallback positions.
  - [ ] Confirm stop behavior and no visible frame-rate regression.
- [ ] Task: Run the full quality gate
  - [ ] `pnpm exec biome check .`
  - [ ] `pnpm exec tsc --noEmit`
  - [ ] `CI=true pnpm test`
  - [ ] `pnpm exec playwright test`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes and Boundaries

- No new dependency or texture asset.
- No persistence changes; active puffs are transient.
- No changes to train pathing, locomotive models, UI, or audible chug content.
- If implementation requires a tech-stack change, update `conductor/tech-stack.md` before implementation.
- The plan separates pure pool logic from Three.js scene wiring so the zero-allocation requirement can be tested without a browser.
