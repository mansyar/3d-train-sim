# Specification — Track Placement (Build Mode)

**Track ID:** `track-placement`
**Status:** Pending
**Created:** 2026-08

## Goal

Make the meadow buildable: the toddler drags chunky track pieces from the
toybox, they snap to the grid, and every placement is tracked in a pure track
graph — the foundation all later V1 features (pathing, autosave, play mode)
consume.

## Motivation

"Creator, not consumer" is the product's core promise, but today the toybox
buttons are placeholders and nothing can be placed. The bootstrap track
delivered the stage (scene, toybox rail, `snapToGrid` primitive, Kenney GLBs
on disk). This track turns the stage into a toy: the first true gameplay loop
step — Build.

## In Scope

1. **Track graph core** (TDD, pure TypeScript — no three.js imports)
   - `src/core/pieces.ts` — piece catalog: straight + 90° corner; endpoint
     geometry per rotation (0/90/180/270°), grid-cell footprint.
   - `src/core/track-graph.ts` — placed-piece records `{type, cell, rotation}`,
     endpoint computation, connectivity edges where endpoints coincide,
     occupancy + grid-bounds validation, 64-piece cap check.
   - >80% coverage per workflow.
2. **World state** (TDD, logic-bearing)
   - `src/state/world.ts` — in-memory world: placed pieces, change listeners.
     Persistence arrives with the autosave track.
3. **Toybox drawer UI** (non-logic)
   - Track tab of the existing toybox rail opens a drawer with chunky (≥64px)
     icon-only buttons: straight, corner. Icon = piece silhouette, no text.
4. **Drag-place interaction** (non-logic glue + smoke-verified)
   - Pointer Events only (touch + mouse). Ghost follows finger <100 ms.
   - Validity tint on ghost: amber = placeable, desaturated = blocked cell.
   - Release on a valid cell → snap to grid + scale-bounce. Invalid drop →
     piece returns to the drawer with a gentle wobble (world never modified).
   - Tap a placed piece → it lifts as a ghost; releasing without moving snaps
     it back exactly where it was (accident-proof); dragging to a free cell
     relocates it; dragging onto the toybox rail returns it to the drawer.
   - Tap-to-rotate: ghost rotates in 90° steps via a rotate affordance.
   - 64-piece cap: drawer buttons dim when full — no error, no text.
   - `prefers-reduced-motion`: no wobble/ghost-pulse; placement stays instant.
5. **Scene rendering** (non-logic)
   - `src/scene/` renders placed pieces from `railroad-straight.glb` /
     `railroad-corner-small.glb`, cloned per placement from one loaded
     template per type; incremental add/remove/relocate; yaw per rotation.
6. **E2E** — extend `e2e/smoke.spec.ts`: open drawer, drag-place a piece on
   the meadow, assert zero console errors + zero external requests.

## Out of Scope (deferred)

- Crossings, bends, hills/ramps pieces (kit lacks a crossing GLB).
- Placement adjacency enforcement — placement is free-grid; the graph records
  connectivity, it never rejects layouts ("every arrangement works").
- Train, pathing, play/stop/whistle, follow camera.
- Autosave / IndexedDB (world stays in-memory this track).
- Audio, scenery, parent-gated reset, starter-loop preset.

## Acceptance Criteria

1. Tablet viewport: drawer opens from the toybox; dragging a piece onto the
   meadow snaps it to the grid and renders the correct Kenney GLB.
2. Ghost follows the finger with validity tint; invalid drops never modify
   the world and return the piece to the drawer.
3. Tap-without-drag on a placed piece leaves the world unchanged (snap-back).
4. Rotation reflects in both the rendered model and the track graph.
5. 64-piece cap dims drawer buttons; no error state exists at any point.
6. `pnpm check` green (Biome + `tsc --noEmit` + Vitest); new `src/core` and
   `src/state` modules >80% covered; existing grid tests untouched.
7. Playwright smoke passes with the new interaction, console clean,
   requests localhost-only.
8. With `prefers-reduced-motion`, no placement animations run.
9. No per-frame allocations in the drag/render path; 60 FPS maintained.

## Decisions

- **Piece set:** straight + 90° corner only (V1; more shapes in later tracks).
- **Free-grid placement:** connectivity is recorded, never required.
- **Tap-to-rotate** over auto-orient: predictable for non-readers.
- **Accident-proof tap:** guideline 5 ("accidental touches must never cause
  destructive changes") refines "tap removes piece" into lift → snap-back.
- **Visual-only feedback** until the audio track lands.
- **Template cloning:** one GLB load per piece type, cloned per placement.

## Guidelines Checkpoints (from `product-guidelines.md`)

- No fail states: invalid drops return pieces gently; cap dims, never errors.
- No reading required: icon-only drawer.
- Instant feedback: ghost tracking <100 ms; snap scale-bounce.
- Toddler-proof gestures: tap + drag only; ≥64px targets; snap-back on
  accidental taps; no hover/long-press/pinch.
- Destruction parent-gated: no clear-all anywhere in this track.
- Performance: template cloning, capped pixel ratio untouched, no per-frame
  allocations.
- Privacy: zero runtime network calls (assets already bundled).
