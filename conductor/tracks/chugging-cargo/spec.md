# Specification — Chugging Cargo

**Track ID:** `chugging-cargo`  
**Type:** Feature

## Overview

Tiny Tracks locomotives currently ride alone. This track gives every locomotive a proper little train: two bundled Kenney cargo wagons that trail the selected engine along the solved path — riding, pausing at stations, reversing at dead ends, and easing to a stop together. No kid UI, no persistence changes; the joy is purely visual.

## Functional Requirements

1. **Wagon catalog**
   - Define exactly two cargo wagon slots in a pure TypeScript catalog (no Three.js/browser dependencies), extending the existing `trains.ts` data pattern.
   - Each slot resolves to a bundled Kenney Train Kit cargo wagon model (local GLB, CC0) — varied cargo (e.g., lumber, boxes).
   - Wagons apply to all three locomotive kinds; no per-train wagon variation.
2. **Composition & placement**
   - Every selected locomotive pulls exactly two wagons; the count is fixed and not kid-configurable.
   - Wagons are **not meadow items**: they occupy no cells, count against no caps, and cannot be lifted, dragged, or trashed.
   - Wagons attach to whichever locomotive is selected; switching trains swaps the wagon set too.
3. **Ride following**
   - Wagons follow the solved path at a fixed negative distance offset behind the locomotive, reusing the segment geometry built once per ride start.
   - All existing ride behaviors apply to the whole train: closed loops cycle, open layouts shuttle with the end pause, mid-ride edits ease everything to a gentle standstill, station stops pause the entire train.
   - Reversing (shuttle) keeps wagons in tow behind the travel direction.
4. **Parked behavior**
   - While parked (idle), the wagon set sits in its last known pose behind the locomotive, forming a complete little train at rest.
   - When a train is selected with no ride started, wagons rest in a sensible default pose behind the parked engine.
5. **Scene rendering**
   - Load both wagon models from local assets in the `load-locomotive.ts` pattern; keep only the active set in the scene; dispose cleanly on train switch.
   - Preserve the existing placeholder fallback if wagon models fail to load; loading failures never block play or the ride.
   - No per-frame allocations in the render loop; wagon updates use the existing tick pattern.
6. **Persistence & compatibility**
   - Fixed composition means **no autosave format change**: existing snapshots load unchanged; no new fields required.
   - Path solving, station stops, audio, camera, and all placement behavior remain untouched.
7. **Testing**
   - Unit tests for the pure catalog logic (slot resolution, model URLs, fixed-count invariants).
   - Extend Playwright smoke coverage: start a ride with wagons present, confirm no console errors, no external requests; train switch keeps the wagon set consistent.

## Non-Functional Requirements

- Preserve 60 FPS on mid-spec tablets; wagons add two static-ish transforms per frame.
- No new binary assets beyond the already-bundled kit wagons (`train-carriage-lumber.glb`, `train-carriage-box.glb` verified in `public/assets/train-kit/`); CC0 license already bundled.
- Touch-first unchanged; no new gestures; no kid-facing text.
- Respect existing audio, camera, and reduced-motion contracts.
- New logic-bearing modules target >80% coverage.

## Acceptance Criteria

- [ ] Every locomotive visibly pulls two cargo wagons while riding, pausing at stations, shuttling, and easing to a stop.
- [ ] Parked trains show the complete little train at rest; switching trains swaps wagons correctly.
- [ ] Wagons occupy no grid cells and don't affect placement, caps, or path solving.
- [ ] Existing saved worlds load unchanged; behavior is identical across save versions.
- [ ] Wagon model load failure falls back gracefully and never blocks play.
- [ ] `pnpm check` and Playwright smoke tests pass; no console errors or external requests.

## Out of Scope

- Kid-configurable wagon count or composition persistence.
- Tinting wagons per locomotive (Blender-prepped variants).
- Tap-to-detach or any wagon interaction.
- Passenger carriages, tankers, or new wagon kits.
- Multi-train, driving mode, coupling physics, or path-solver changes.

## Decisions

- Fixed 2 wagons (user choice) — zero UI, zero autosave changes.
- Bundled kit cargo wagons as-is (user choice) — no Blender prep, no new kits.
- No kid interaction (user choice) — purely visual, autonomous-train principle untouched.
- Following implemented as negative-distance offsets on the existing ride segments.
