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

- [x] Task: Ride integration (elevated corners route, half-height blending, shuttle parity) [8dbd15d]
  - [x] Acceptance: forward + reverse rides, no pops, composes with switches/tunnels/bridges
  - Notes: Elevated corners ride the flat corner's quarter-arc pivot via new core `isCornerPiece` predicate (TDD: catalog test + arc-pivot test per type); arc + `easedHeightAt` compose through the existing orthogonal pose path, so no hill branching was needed. Bump `heightAt` profiles + type-aware `lowEdgeOf` came from Phase 1 — reverse/shuttle parity free. Unit proof: 4 crest-detector tests (ding once per visit each way, silent over full hills and flats). Smoke proof: tmp e2e probe rides a bump run 6s+ on phone + tablet, still riding, screenshots differ, console clean.
- [x] Task: Follow-camera over new elevation [8dbd15d]
  - [x] Acceptance: camera eases over bumps/corners like hills, no cuts or shakes
  - Notes: No code change needed — `updateCamera` (init-scene.ts) copies the engine model's full 3D position (Y included) with exponential ease and `lookAt`; reduced-motion keeps the fixed overview. Verified by the 6s+ riding smoke (frames differ = camera gliding) + manual check below.
- [x] Task: Crest pop reusing soft voice (mute-respecting, capped) [8dbd15d]
  - [x] Acceptance: audible only when unmuted, never startling
  - Notes: Height-triggered detector in `poseTrain` (new optional `onBumpCrest` callback, wired to a single `audio.ding()`): fires once climbing past `HILL_HALF_HEIGHT − 0.05` on bump-family segments only (new `isBumpPiece` predicate), re-arms below 0.15 or off bump pieces — full-height hills stay silent. `ding()` is already mute-respecting and capped; single pop (not the station ding-ding). No deviation from spec FR3.
- [x] Task: Rails-tab entries + drawer wiring (≥64px, icon-only) [8dbd15d]
  - [x] Acceptance: tap/drag placement on touch emulation
  - Notes: Done as Phase 1 head-start (`TAB_FOR_KIND` + labels + 6 icon-only SVGs); phone + tablet probe placements all went through the touch-capable dev handle onto dry cells. Icon-only, no emoji — matches toybox conventions.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report: automated gates green — 588/588 tests pass (`CI=true pnpm test`); new core code at 100% coverage (`pieces.ts` 100/100/100/100; logic gate >80% holds — scene files excluded per workflow); `tsc --noEmit` clean; `biome check` clean. Scope: 7 files since checkpoint `63b5eb2` (2 core logic + tests, 2 scene + tests, 1 scene wiring, 1 tmp e2e probe, plan). E2E smoke (tmp probe, phone + tablet): 6 GLBs load, bump run rides 6s+ still riding with differing frames, console clean.
  - Manual verification confirmed by user with explicit "yes" (Rails-tab placement, crest pop muted/unmuted, chase camera, banked corners, clean console).
  - Checkpoint: [checkpoint:8dbd15d]

## Phase 4 — E2E, docs & final gates

- [x] Task: Playwright smoke (`e2e/hills-phase2.spec.ts`) — ride each piece + reload, clean console [6f99b58]
  - Notes: Merged `origin/main` (`fa3b8ca`) mid-phase — pulled in the e2e-stability track (`helpers.ts`: `clearMeadow`, `watchConsoleErrors` with the WebKit blob-texture allowlist; my spec already imported `clearMeadow`), the hill-grade-pace track (new pure `core/pace.ts`: personality × grade factor; height-based so all 6 new pieces compose for free — bump climbs ≈0.83x, corner climbs like full hills; crest detector unaffected, it keys on height not speed), and release-v0.7.0. Conflicts resolved: `ride-motion.ts` imports (union of pace + bump/corner — detector lines intact), `tracks.md` rows, CHANGELOG (my entry back under fresh `Unreleased`). Migrated my spec's strict `collectConsole` to `watchConsoleErrors` [6f99b58]; `rails: 9` count fix for `ride-toybox-flow` kept through the merge. Result: my spec 6/6, FULL suite 105/105 green.
- [x] Task: Docs — CHANGELOG Unreleased note, strike elevation leftovers in `product.md` [25b093f]
  - Notes: CHANGELOG Unreleased entry (parent wording: bumps + banked corners, crest pop, snow crowns, additive saves) re-anchored above 0.7.0 after the merge; product.md elevation leftover struck.
- [x] Task: Final gates — `biome check`, `tsc --noEmit`, `vitest`, tablet manual check [6f99b58]
  - Notes: `tsc --noEmit` clean; `biome check` clean (3 format nits auto-fixed post-merge); `CI=true pnpm test` 614/614 across 35 files; full Playwright 105 passed / 0 failed (8.5 min). Tablet manual check proposed below — awaiting explicit yes.
- [x] Task: Phase Verification & Checkpoint (Phase 4) [6f99b58]

## Verification Report — Phase 4 (2026-09-05)
- Scope since Phase 3 checkpoint (`8dbd15d`): main merge (`fa3b8ca`), spec helper migration + format fixes (`6f99b58`).
- Automated: unit 614/614 (35 files, incl. main's pace/audio suites); tsc clean; Biome clean; hills-phase2.spec 6/6 (phone + tablet); FULL e2e 105/105, incl. previously flaky wagon-workshop tablet — the stability allowlist held.
- Manual: confirmed by user 2026-09-05 (tablet 5-step check passes).
[checkpoint:6f99b58]
