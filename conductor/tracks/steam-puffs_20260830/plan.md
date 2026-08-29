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
- [x] Task: Refactor and verify logic coverage (f56e3d2)
  - [x] Keep the rhythm contract small and independently testable.
  - [x] Run `CI=true pnpm test -- --coverage`.
  - [x] Confirm >80% coverage for new logic-bearing code.
  - Notes: No additional refactor was needed after review. Coverage run passed with 197 tests; full Biome check passed across 55 files; strict TypeScript passed; full test suite passed. The new rhythm seam remains isolated to the audio boundary and introduces no runtime dependency or persistence change.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Pooled Steam-Puff Emitter

- [x] Task: Write failing tests for pool and animation logic (7735143)
  - [x] Assert exactly 16 reusable puff slots.
  - [x] Assert emission uses an inactive slot and drops gracefully when saturated.
  - [x] Assert a puff expires at exactly 1.0 second.
  - [x] Assert position rises, scale expands, and opacity fades over its lifetime.
  - [x] Assert stopping emission does not remove already-active puffs.
  - [x] Assert update/emission paths use stable storage without per-frame allocations.
  - [x] Run the focused suite and confirm the new tests fail (Red phase).
  - Notes: Red phase confirmed the missing module while all 197 existing tests stayed green. Added the pure fixed-size lifecycle pool and tests; the Green suite now passes 201 tests, coverage, strict TypeScript, and Biome. Files: `src/core/steam-puffs.ts`, `src/core/steam-puffs.test.ts`.
- [x] Task: Implement pure puff lifecycle logic (7735143)
  - [x] Add a Three.js-independent pool/state module under `src/core/` or `src/state/` following existing boundaries.
  - [x] Use fixed-size state and deterministic lifecycle updates.
  - [x] Implement graceful saturation drops.
  - Notes: Implemented sixteen reusable slots with one-second lifetimes, upward motion, scale expansion, opacity fade, graceful saturation drops, and emission gating. Update and emission use the preallocated slot array without temporary allocations.
- [x] Task: Verify >80% coverage for the new lifecycle logic (7735143)
  - [x] Run focused coverage and then the full Vitest suite.
  - Notes: Focused coverage and the full suite passed with 201 tests. The pure lifecycle module is fully exercised by its colocated tests.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

**Verification Report:** Automated — 201 Vitest tests and coverage passed for the pure lifecycle; Phase 2 introduced no lint, type, build, or runtime regressions (2026-08-30). Manual — behavior was validated during the Phase 3 integrated tablet verification (2026-08-30).

## Phase 3 — Procedural Billboard Scene Integration [checkpoint: 7bbf61f]

**Verification Report:** Automated — Biome passed; strict TypeScript passed; 201 Vitest tests passed; production build passed; Playwright tablet smoke passed 12/12 with no console or external-request failures (2026-08-30). Manual — user confirmed puff appearance, rise/expand/fade animation, camera readability, all locomotive placements, stop fade-out, and extended ride stability (2026-08-30).

- [x] Task: Add the procedural puff renderer and fixed scene pool (51d7cda)
  - [x] Create reusable procedural billboard geometry/material resources.
  - [x] Create exactly 16 reusable scene instances with no per-emission geometry/material/node allocation.
  - [x] Continuously orient active puffs toward the follow camera.
  - [x] Animate rise, scale, opacity, and deactivation using the pure lifecycle state.
  - Notes: Added `src/scene/steam-puff-emitter.ts` with shared procedural circle geometry/material and sixteen reusable billboard meshes. The renderer mirrors the pure pool state and updates visibility, transform, opacity, and camera-facing orientation without creating per-frame particle resources. Automated verification: Biome, TypeScript, 201 Vitest tests, production build, and 12 Playwright tablet smoke tests passed.
- [x] Task: Add locomotive chimney placement (51d7cda)
  - [x] Resolve valid per-locomotive chimney anchors where available.
  - [x] Add documented fallback offsets for steam, diesel, and tram.
  - [x] Ensure fallback offsets are static and allocation-free at runtime.
  - Notes: The emitter searches model descendants for chimney/smokestack/stack anchors and otherwise uses documented static offsets for steam, diesel, and tram. Placement is wired during locomotive composition and supports train switching.
- [x] Task: Connect ride/audio lifecycle (51d7cda)
  - [x] Start emission only when the ride is active.
  - [x] Emit one puff per chug beat.
  - [x] Stop new emissions immediately on ride stop while allowing active puffs to finish.
  - [x] Dispose subscriptions and pooled resources with the scene.
  - Notes: `init-scene.ts` subscribes to `audio.onChugBeat`, emits only during riding, updates the emitter every render frame, and disables new emissions on stop while active puffs naturally expire. Scene disposal removes the beat subscription, emitter group, and shared GPU resources.
- [x] Task: Record observable acceptance criteria in `plan.md`
  - [x] Confirm visual appearance, camera-facing behavior, placement, lifecycle, and stop fade behavior.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

**Verification Report:** Automated — Biome, TypeScript, 201 Vitest tests, production build, and 13/13 Playwright tablet smoke tests passed (2026-08-30). Manual — user confirmed soft puff readability, animation, camera-facing behavior, locomotive placement, stop fade, and extended ride stability (2026-08-30).

## Phase 4 — E2E Smoke and Full Quality Gates

- [x] Task: Extend Playwright smoke coverage (61f438d)
  - [x] Start a ride and assert the puff system is active through a dev-only diagnostic seam or observable scene state.
  - [x] Stop the ride and assert no new puffs appear while active puffs can expire.
  - [x] Switch among all three locomotives and verify each has a puff origin.
  - [x] Assert no console errors and zero external requests.
  - Notes: Added a tablet smoke test using the dev scene probe to verify active emission, stop-and-fade completion, all three train selections, clean console, and no external requests. Also corrected a stop-race and made the probe report the pure pool count.
- [x] Task: Perform manual tablet/emulation verification
  - [x] Confirm soft white puffs are readable but not visually noisy.
  - [x] Confirm puffs rise, expand, fade, and face the camera.
  - [x] Confirm all locomotives use plausible chimney/fallback positions.
  - [x] Confirm stop behavior and no visible frame-rate regression.
  - Notes: User confirmed the tablet/emulation verification on 2026-08-30.
- [x] Task: Run the full quality gate (61f438d)
  - [x] `pnpm exec biome check .`
  - [x] `pnpm exec tsc --noEmit`
  - [x] `CI=true pnpm test`
  - [x] `pnpm exec playwright test`
  - Notes: Biome passed across 58 files; strict TypeScript passed; 201 Vitest tests passed; production build passed; Playwright tablet smoke passed 13/13.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

**Verification Report:** Automated — Biome passed across 58 files; strict TypeScript passed; 201 Vitest tests passed; production build passed; 13/13 Playwright tablet smoke tests passed (2026-08-30). Manual — user confirmed the final tablet/emulation behavior and performance expectations (2026-08-30).

## Notes and Boundaries

- No new dependency or texture asset.
- No persistence changes; active puffs are transient.
- No changes to train pathing, locomotive models, UI, or audible chug content.
- If implementation requires a tech-stack change, update `conductor/tech-stack.md` before implementation.
- The plan separates pure pool logic from Three.js scene wiring so the zero-allocation requirement can be tested without a browser.
