# Plan — Hills Phase 2: Bumps, Corners & Half-Height Cruises

Source of truth: `spec.md`. Workflow: `conductor/workflow.md` (TDD for `src/core`/`src/state`, smoke + manual for scene/UI).

## Phase 1 — Core elevation + catalog (TDD)

- [x] Task: Extend piece catalog (TDD) [d9d00f7]
  - [x] Write failing tests for new piece types, endpoints, rotations (`pieces.test.ts`)
  - [x] Implement `PIECE_TYPES` / `BASE_ENDPOINTS` additions
  - Notes: 6 new types — bump run (`bump-up`/`hill-half`/`bump-down`, straight-like N/S) + elevated corner run (`corner-up`/`hill-corner`/`corner-down`, corner-like N/E). Red: 5 failures on catalog expectation; Green: all pass.
- [x] Task: Elevation profiles for bumps / corners / half-height (TDD) [d9d00f7]
  - [x] Write failing tests for `heightAt` / `rideHeightAt` / `easedHeightAt` on new types
  - [x] Implement profiles + half-height crest, keep `HILL_BLEND_FRACTION` gentle
  - Notes: `HILL_HALF_HEIGHT = HILL_HEIGHT / 2` (0.55); bumps ramp 0→HALF, corners climb 0→H around the bend. `lowEdgeOf` is now type-aware (corner-like base-start = north leg, straight-like = south edge); existing straight behavior unchanged. Blend fraction untouched at 0.25.
- [x] Task: Save stays additive (TDD) [d9d00f7]
  - [x] Write failing round-trip tests for worlds containing new pieces
  - [x] Implement deserialization without version bump
  - Notes: no version bump needed — `save.ts` validates against `PIECE_TYPES` generically, so new types pass for free; round-trip test pins it. Terrain rule (`track-graph.ts`) also generic: new pieces dry-land only, water rejected; tests added pin both.
  - Early (Phase 3 head-start, same commit): Rails-tab wiring done — `TAB_FOR_KIND` + `PIECE_LABELS` + `PIECE_ICONS` (6 icon-only SVGs, no emoji) so dev builds stay tsc-clean; renderer maps use Phase-1 stand-in GLBs (hill run / corner reuse) until Phase 2 authors real assets. No deviation from spec.
- [x] Task: Phase Verification & Checkpoint (Phase 1) [d9d00f7]
  - Verification Report: automated gates green — 581/581 tests pass (`CI=true pnpm test`); coverage core 97.2% / state 96.5% (>80% gate); `tsc --noEmit` clean; `biome check` clean. Scope: 10 files since checkpoint `0f97616` (5 logic files each with updated tests + renderer stand-ins + Rails-tab UI). Manual verification (Rails-tab icons, snap/blend placement, water rejection, clean console) confirmed by user with explicit "yes".
  - Checkpoint: [checkpoint:d9d00f7]

## Phase 2 — Blender assets + renderer wiring (smoke)

- [ ] Task: Deterministic Blender recipes for new pieces + snow shells
  - [ ] Author on kit measurements (4-unit module, z-up, `export_yup=True`), named-node contract, < ~150 KB
- [ ] Task: Renderer wiring (`PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS`)
  - [ ] Acceptance: each GLB loads via dev handle with clean console
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Ride, camera, audio, toybox (smoke + manual)

- [ ] Task: Ride integration (elevated corners route, half-height blending, shuttle parity)
  - [ ] Acceptance: forward + reverse rides, no pops, composes with switches/tunnels/bridges
- [ ] Task: Follow-camera over new elevation
  - [ ] Acceptance: camera eases over bumps/corners like hills, no cuts or shakes
- [ ] Task: Crest pop reusing soft voice (mute-respecting, capped)
  - [ ] Acceptance: audible only when unmuted, never startling
- [ ] Task: Rails-tab entries + drawer wiring (≥64px, icon-only)
  - [ ] Acceptance: tap/drag placement on touch emulation
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E, docs & final gates

- [ ] Task: Playwright smoke (`e2e/hills-phase2.spec.ts`) — ride each piece + reload, clean console
- [ ] Task: Docs — CHANGELOG Unreleased note, strike elevation leftovers in `product.md`
- [ ] Task: Final gates — `biome check`, `tsc --noEmit`, `vitest`, tablet manual check
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
