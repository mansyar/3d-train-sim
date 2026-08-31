# Plan: Tunnels

Feature track per `spec.md`. Phase 1 is logic-bearing (TDD per
`workflow.md`); Phases 2–3 are scene/audio wiring verified by smoke tests
and manual verification; Phase 4 closes with e2e, docs, and final gates.

## Phase 1 - Core: Tunnel Piece Type & Tunnel-Run Logic (TDD)

- [~] Task: Add the `tunnel` piece type (tests first in `pieces.test.ts`,
      `track-graph.test.ts`, `save.test.ts`)
  - [ ] `PIECE_TYPES` gains `'tunnel'`; `BASE_ENDPOINTS.tunnel = ['north', 'south']`
  - [ ] Terrain rule: dry land only (default branch — assert ghost-red-over-water via `validatePlacement`)
  - [ ] Save round-trip: v2 snapshot with tunnels; v1/v2 pre-tunnel snapshots load unchanged
- [ ] Task: Tunnel-run boundaries — new pure module `src/core/tunnels.ts`
      (TDD: `tunnels.test.ts`)
  - [ ] `tunnelRunsOf(pieces)`: which portal faces of each tunnel cell open
        into air (arch rendered) vs. into another tunnel (merged)
  - [ ] Works for any rotation; lone tunnel = both portals open; runs of 2+
        = inner faces merged
- [ ] Task: Inside-tunnel detection for the ride (TDD)
  - [ ] Pure helper mapping ride-path steps to tunnel coverage (used for
        hiding, audio duck, portal glow)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Tunnel Asset & Scene Mounting

- [ ] Task: Model the tunnel GLB in Blender
  - [ ] Grassy dome + rounded arch; named nodes: dome body, entry/exit
        portal arches, snow cap
  - [ ] Measured to the straight kit's rail height/track width (trestle-bridge
        convention); export `public/assets/train-kit/tunnel.glb`
        (target < ~150 KB)
- [ ] Task: Mount & toggle in `track-renderer.ts`
  - [ ] Register the `tunnel` type in the GLB mount table; toggle portal
        nodes per `tunnelRunsOf`; wire snow-cap visibility to the weather state
  - [ ] Toybox entry in `ui/app.ts` (draggable, ghost feedback — inherits
        existing wiring)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
