# Specification — Scenery Placement (Decorate the Meadow)

**Track ID:** `scenery-placement`
**Type:** Feature

## Overview

The meadow only takes track. The 🌞 rail slot is a placeholder ("coming soon").
This track makes it live: trees, bushes, and rocks drag onto the meadow exactly
like track pieces — same gestures, same forgiveness, same dings — completing the
**Decorate** step of the product's core loop (build → decorate → play).

## Functional Requirements

1. **Scenery catalog — `src/core/scenery.ts` (pure, TDD, no three.js imports):**
   - `SCENERY_KINDS = ['tree', 'bush', 'rock']` with per-kind model URL,
     ground offset (`y`-lift), and scale.
   - Labels for the drawer's aria (icon-only UI rule — no on-screen text).
2. **World store extension — `src/state/`:** scenery shares the meadow's
   occupancy rules: one item per cell across track AND scenery; same bounds
   check; the shared 64-item cap. The ride's gentle-stop-on-edit already
   applies (world subscriptions fire on scenery placement).
3. **Scene renderer — `src/scene/`:** one cloned model per placed scenery item,
   same ghost machinery as track pieces (amber tint while placeable, gray while
   blocked), cell-anchored, y-lifted onto the ground plane.
4. **Toybox drawer — `src/ui/`:** the 🌞 rail slot becomes the scenery drawer
   toggle (`data-drawer="scenery"`); the drawer gains tree/bush/rock slots with
   real icons and the existing drag pipeline.

## Non-Functional Requirements

- >80% unit coverage on `scenery.ts` (logic-bearing); scene glue verified by
  smoke + manual checks
- 60 FPS on mid-spec tablets; zero runtime network calls; no fail states; no text
- Assets: Kenney Nature Kit (CC0, glTF) — vendored subset under
  `public/assets/nature-kit/`, no attribution required (provenance noted)

## Acceptance Criteria

- Dragging a tree/bush/rock from the scenery drawer places it at a free cell;
  occupied or off-meadow drops wobble-return
- The ride path solver is untouched by scenery (non-conductive decoration)
- Full gate suite green (`pnpm check` + Playwright)
- Playwright smoke extended: scenery drag → model clone lands; console clean,
  localhost-only

## Out of Scope

Houses, animals, stations (later decorate tracks); autosave/persistence (own
track); any pathing or track-graph changes; collision between train and scenery.
