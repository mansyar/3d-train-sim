# Plan — Hills Phase 2: Bumps, Corners & Half-Height Cruises

Source of truth: `spec.md`. Workflow: `conductor/workflow.md` (TDD for `src/core`/`src/state`, smoke + manual for scene/UI).

## Phase 1 — Core elevation + catalog (TDD)

- [ ] Task: Extend piece catalog (TDD)
  - [ ] Write failing tests for new piece types, endpoints, rotations (`pieces.test.ts`)
  - [ ] Implement `PIECE_TYPES` / `BASE_ENDPOINTS` additions
- [ ] Task: Elevation profiles for bumps / corners / half-height (TDD)
  - [ ] Write failing tests for `heightAt` / `rideHeightAt` / `easedHeightAt` on new types
  - [ ] Implement profiles + half-height crest, keep `HILL_BLEND_FRACTION` gentle
- [ ] Task: Save stays additive (TDD)
  - [ ] Write failing round-trip tests for worlds containing new pieces
  - [ ] Implement deserialization without version bump
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
