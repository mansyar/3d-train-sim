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

- [x] Task: Deterministic Blender recipes for new pieces + snow shells [63b5eb2]
  - [x] Author on kit measurements (4-unit module, z-up, `export_yup=True`), named-node contract, < ~150 KB
  - Notes: `scripts/blender-hills-phase2.py` (`build|renders|export|verify|all`) warps kit straight rails onto half-height
    smoothstep bumps (0→0.55→0) and kit corner-small rails onto banked corner climbs (0→1.1→0, arc progress from the
    NW-corner radius-2 survey); grass mounds lofted per ring row, snow shells where lift ≥60% of own crest. 12 GLBs,
    largest 58,924 bytes (<150KB NFR ✓), node contract `bump_up_rails|_mound` + `hill_snow_<type underscores>` verified.
    Render-verified via true east-side profile (composites mislead: end-on foreshortening + a rails/mound slot-stagger
    bug in the check layout, both fixed). Debug scripts (`inspect-corner.py`, TEMP PNGs) deleted, not committed.
- [x] Task: Renderer wiring (`PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS`) [63b5eb2]
  - [x] Acceptance: each GLB loads via dev handle with clean console
  - Notes: `PIECE_URLS` points at the 6 real GLBs (Phase-1 stand-ins retired); `HILL_SNOW_URLS` gains 6 shells; fixed a
    latent snow-crown lookup (`hill_snow_${type}` → `type.replaceAll('-','_')`) that also restores invisible slope-up /
    slope-down crowns — shared-path fix, no spec change. Attach path generic, untouched. Temp probe
    `e2e/phase2-tmp.spec.ts` (untracked, deleted before merge): all 6 place on dry land, all 6 GLBs load, console clean.
    Earlier `openEdges.map` TypeError traced to a stale preview server (old dist without the 6 types); current
    `world.place` validates before push+notify so subscribers never see unknown types — no app change needed.
- [x] Task: Phase Verification & Checkpoint (Phase 2) [63b5eb2]
  - Verification Report (Phase 2): automated — 581/581 unit tests pass, tsc + biome clean, temp e2e probe green
    (6/6 place, 6/6 GLBs load, console clean), largest GLB 58,924 bytes (<150KB NFR ✓); scope `d9d00f7..63b5eb2`
    (renderer + recipe + 12 GLBs). Manual check (Rails-tab tiles, dry-land snap/blend, ▶ ride-over, clean console)
    confirmed by user.
  - Checkpoint: [checkpoint:63b5eb2]

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
