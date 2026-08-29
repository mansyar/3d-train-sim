# Implementation Plan — Steam Puffs

**Track ID:** `steam-puffs_20260830`  
**Type:** Feature  
**Workflow:** TDD for logic-bearing code; scene/audio/render wiring verified with smoke tests and manual checks.

## Phase 1 — Chug Rhythm Contract (logic/audio seam)

- [ ] Task: Write failing tests for the chug-beat contract
  - [ ] Define expected beat notification behavior and listener cleanup.
  - [ ] Assert one notification per rhythm beat while chugging.
  - [ ] Assert no beat notifications after `stopChug`.
  - [ ] Assert mute affects sound only and does not corrupt ride rhythm state.
  - [ ] Run the focused suite and confirm the new tests fail (Red phase).
- [ ] Task: Implement the minimal reusable chug-beat signal
  - [ ] Preserve existing Howler playback, mute, fade, and rate behavior.
  - [ ] Provide a stable subscription/disposal seam for the scene.
  - [ ] Avoid allocations in the recurring beat callback path.
- [ ] Task: Refactor and verify logic coverage
  - [ ] Keep the rhythm contract small and independently testable.
  - [ ] Run `CI=true pnpm test -- --coverage`.
  - [ ] Confirm >80% coverage for new logic-bearing code.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Pooled Steam-Puff Emitter

- [ ] Task: Write failing tests for pool and animation logic
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
