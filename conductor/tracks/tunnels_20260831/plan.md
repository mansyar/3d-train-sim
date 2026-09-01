# Plan: Tunnels

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`); Phases 2–3 are scene/audio wiring verified by smoke tests
and manual verification; Phase 4 closes with e2e, docs, and final gates.

## Phase 1 - Core: Tunnel Piece Type & Tunnel-Run Logic (TDD) [checkpoint: e87da45]

- [x] Task: Add the `tunnel` piece type (tests first in `pieces.test.ts`,
      `track-graph.test.ts`, `save.test.ts`)
  - [x] `PIECE_TYPES` gains `'tunnel'`; `BASE_ENDPOINTS.tunnel = ['north', 'south']`
  - [x] Terrain rule: dry land only (default branch — assert ghost-red-over-water via `validatePlacement`)
  - [x] Save round-trip: v2 snapshot with tunnels; v1/v2 pre-tunnel snapshots load unchanged
  - **Summary:** Tests written first (Red): catalog set, tunnel endpoint
    geometry mirroring the straight at all four rotations, dry-land-only
    terrain rule via `validatePlacement` (water ghost-red), end-to-end
    tunnel↔tunnel and tunnel↔straight connections, and v2 save round-trip +
    verbatim restore. Green in `src/core/pieces.ts` only: `'tunnel'` added to
    `PIECE_TYPES` and `BASE_ENDPOINTS` (`['north','south']`) — terrain
    (default non-bridge branch), connections, pathing, and save parsing all
    inherit it unchanged. Catalog ripple completed with the bridge's
    placeholder pattern: `drawer.ts` `TAB_FOR_KIND.tunnel = 'rails'`,
    `track-renderer.ts` placeholder `BASE_YAW`/`KIT_ANCHORS`/`PIECE_URLS`
    (straight GLB until the tunnel model lands in Phase 2), and `ui/app.ts`
    label + toybox SVG icon (grassy dome with dark arch). Drawer tests
    updated: Rails tab holds five track pieces, catalog coverage +5.
    Gates: biome clean, `tsc --noEmit` clean, vitest 27 files / 353 tests
    passed (was 338; +15 tunnel tests). *(commit c6d9037)*
- [x] Task: Tunnel-run boundaries — new pure module `src/core/tunnels.ts`
      (TDD: `tunnels.test.ts`)
  - [x] `tunnelRunsOf(pieces)`: which portal faces of each tunnel cell open
        into air (arch rendered) vs. into another tunnel (merged)
  - [x] Works for any rotation; lone tunnel = both portals open; runs of 2+
        = inner faces merged
  - **Summary:** Red first: 12 failing tests pinning portal semantics —
    lone tunnel arches both ends (any rotation), end-to-end pairs share one
    seam (arches only at run ends), three-tunnel runs merge both inner
    faces, side-by-side hills with no shared rail stay separate, plain-track
    neighbours never merge, one entry per tunnel in piece order. Green in
    new `src/core/tunnels.ts`: tunnel ends world-oriented from
    `baseEndpointsFor` + rotation (same label-advance rule as pathing);
    seams = boundary keys carrying exactly two tunnel ends (the
    track-graph's own connection condition, tunnel-only); portals split
    open/merged per end. *(part of commit e87da45)*
- [x] Task: Inside-tunnel detection for the ride (TDD)
  - [x] Pure helper mapping ride-path steps to tunnel coverage (used for
        hiding, audio duck, portal glow)
  - **Summary:** `tunnelFlagsForPath(pieces, path)` — one boolean per
    `TrainPath` step, true where the train rides a tunnel cell, in ride
    order; solved via real `solvePath` rides (mixed open line, closed 2×3
    perimeter loop with the tunnel on its bottom side — a test fix during
    Red revealed an opposite-edge piece can't take a loop corner — long
    two-tunnel run, empty path). Hiding itself stays geometric (the opaque
    dome occludes through depth testing); these flags feed the chug duck,
    whistle echo, and night portal glow in Phase 3. *(part of commit
    e87da45)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Automated — `pnpm test` 28 files / 365 tests passed (338
    pre-track, +27 tunnel tests); `pnpm exec biome check .` clean;
    `pnpm exec tsc --noEmit` clean; coverage on new logic `tunnels.ts`
    100% and `pieces.ts` 100% (statements/branches/functions/lines).
    Manual — Task 1's visible surface (toybox tunnel slot with dome icon,
    red water ghost, straight-rider placeholder until the Phase 2 model)
    verified by the user at the in-flight checkpoint; Tasks 2–3 are pure
    core logic with no new visible surface, pinned by 12 unit tests
    (three-tunnel runs, side-by-side separation, closed-loop rides). User
    confirmed proceeding to Phase 2 (2026-08-31).

  **Verification Report — Phase 1 (2026-08-31):**
  Automated: `pnpm test` — 28 files / 365 tests passed; biome + typecheck
  clean; coverage `tunnels.ts` 100%, `pieces.ts` 100%. Manual: toybox
  surface verified by the user; run-boundary and ride-flag logic unit-
  pinned. User confirmed Phase 1 complete (2026-08-31). Checkpoint at
  e87da45.

## Phase 2 - Tunnel Asset & Scene Mounting [checkpoint: ac213a6]

- [x] Task: Model the tunnel GLB in Blender
  - [x] Grassy dome + rounded arch; named nodes: dome body, entry/exit
        portal arches, snow cap
  - [x] Measured to the straight kit's rail height/track width (trestle-bridge
        convention); export `public/assets/train-kit/tunnel.glb`
        (target < ~150 KB)
  - **Summary:** Authored in the user's Blender (5.2 LTS, via MCP addon) in
    a dedicated `TunnelAsset` collection — the house-authoring scene left
    untouched. Straight kit measured first: 4-unit module (Blender y −4..0
    = glTF/three z 0..4), bed 1.0 wide, rails 0.1 wide centred x ±0.3 with
    crowns z −0.9, mat/underside z −1 (matches KIT_ANCHORS). Piece built
    with pure bmesh (booleans proved flaky over remote round-trips and
    twice ate the dome): squashed hemisphere dome (24×12, rx 1.35, ry 1.9,
    crown z +0.9) with the rim kept flush at the mat plane — the first cut
    (z < −0.995) deleted the equator ring too and left the dome floating
    half a unit above the track, caught in review and rebuilt (z < −1.001,
    rim z exactly −1.0); portal arch rings with a real hole the train
    passes through, built as extruded arcs (r_out 1.0, r_in 0.78) at both
    dome ends; snow cap as a proud shell over the top third (first cut
    swallowed the whole crown — rebuilt at z 0.55); cream bed + steel rails
    through the bore. Verified from entry 3/4, top-down, east side, and
    exit 3/4 with material shading. Dirt/snow exported double-sided so the
    far ring face reads as the dark tunnel interior through a portal hole.
    Export `tunnel.glb` 34,464 bytes; nodes `tunnel_{bed,dome,
    portal_entry,portal_exit,rails,snow_cap}`; materials `tunnel_*`.
    *(commit f6a4e26)*
- [x] Task: Mount & toggle in `track-renderer.ts`
  - [x] Register the `tunnel` type in the GLB mount table; toggle portal
        nodes per `tunnelRunsOf`; wire snow-cap visibility to the weather state
  - [x] Toybox entry in `ui/app.ts` (draggable, ghost feedback — inherits
        existing wiring)
  - **Summary:** `PIECE_URLS.tunnel` → the real GLB; BASE_YAW/KIT_ANCHORS
    comments updated from placeholder to the real mount semantics. New
    `syncTunnelPortals` runs on reconcile (event-driven, never per frame):
    core seam data (`tunnelRunsOf`) decides which portal nodes render —
    merged seams stay wall-less so end-to-end runs read as one continuous
    hill. Snow cap hidden at template load; new `setTunnelSnow(visible)` on
    the `TrackRenderer` interface toggles the cap across the template and
    all placed clones, wired in `init-scene.ts` to the shared frozen gate
    (`base.snow >= FROZEN_SNOW`, same gate as the river ice and the duck).
    Toybox entry was completed in Phase 1 (label + dome SVG icon +
    `TAB_FOR_KIND`); it inherits the drag/ghost/lift wiring unchanged.
    Gates: biome clean, `tsc --noEmit` clean, vitest 28 files / 365 tests
    passed, production build green. *(commit f6a4e26)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Automated — biome clean, `tsc --noEmit` clean, vitest 28
    files / 365 tests passed, production build green (Phase 2 touched only
    scene/glue code plus the asset, so no new unit tests per workflow; the
    toggles ride existing interface coverage). Asset corrected in-flight
    after user review found the dome covered the opening: rebuilt with a
    real boolean arch bore, dark dirt interior walls, portal bands wrapping
    each mouth; re-exported GLB 70,856 bytes with the six expected nodes.
    The rebuild is captured in the re-runnable `scripts/blender-tunnel.py`
    after the unsaved Blender session was reset. *(commit ac213a6)*

  **Verification Report — Phase 2 (2026-09-02):**
  Automated: biome + typecheck clean; `pnpm test` 28 files / 365 tests
  passed; `pnpm build` green. Manual steps proposed (toybox drag, dry-land
  snap, red water ghost, portal merging on end-to-end runs, ride-through
  visibility, winter snow cap). User confirmed Phase 2 complete
  (2026-09-02). Checkpoint at ac213a6.

## Phase 3 - Ride Delight: Hidden Train, Echo, Night Portals

- [ ] Task: Chug duck + whistle echo inside a tunnel run
  - [ ] Reuse `setChugSoftened` for the inside-duck; synthesized echo tail on
        inside whistles; mute-respecting
- [ ] Task: Headlight portal glow at night
  - [ ] Portal glow keyed to night factor + engine proximity to a tunnel
        entry/exit (reuses `headlight.ts` conventions)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Smoke, Docs & Final Verification

- [ ] Task: Playwright smoke — place a tunnel, run the train through it,
      assert no console errors
- [ ] Task: CHANGELOG `[Unreleased]` — parent-readable tunnel bullet
- [ ] Task: Final gates (`pnpm check`, e2e) + manual tablet checklist +
      phase checkpoint
