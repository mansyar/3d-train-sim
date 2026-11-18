# Toybox Clarity and Outside-Drag Removal — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Make the toddler toybox easier to scan and make removing a placed toy obvious
without reading. Dense toybox tabs are split into small icon-only pages, and a
placed toy is removed by dragging it beyond the board edge and releasing. The
existing trash bin is removed; undo remains. No new storage, catalog content,
or parent controls are added.

## Problem / Motivation

The current drawer has five top-level tabs, but Rails still shows 10 similarly
styled SVG pieces and Adventure and Town are also crowded. A parent reported
that this makes choosing a track piece confusing. The same parent reported that
their child had difficulty deleting a placed track piece: the current
drag-to-trash path is indirect and the bin competes with the toybox rail.

If this is not solved, children can become stuck before they ever build a loop,
and the v1.0 clarity gates cannot be observed fairly. This track addresses only
piece discovery and removal. Station cargo visuals, sky richness, and longer
trains are separate, later ideas.

## Goals & Success Metrics

- **Goal:** A child can find a desired piece and remove a placed piece without adult explanation.
- **Metric:** Automated checks prove at most four visible slots on dense tabs, working dots and swipe, and outside-drag removal with undo on tablet and phone. A real one-child session may be observed informally, but no three-child v1.0 gate is claimed here.

## Scope

### In Scope

- A pure paged model for dense drawer tabs: Rails, Adventure, and Town.
- Four or fewer visible toy slots per page, with tappable page dots and swipe on empty drawer space.
- An offline generator that derives static track-piece SVGs from the shipped GLB geometry and commits the output for every `PieceType`; no runtime WebGL.
- Per-tab page memory for the current session only; reload starts at page 1.
- Removing a placed piece or scenery item by dragging it beyond the board edge and releasing.
- A visible “leaving” preview while a placed item is outside the board; returning inside cancels.
- Soft removal animation plus the existing undo chip; one undo restores the removed item.
- Removing the `.trash-slot` markup, styles, wiring, and test references.
- Unit tests for paged data and removal eligibility; Playwright coverage on tablet and phone.

### Out of Scope

- Station pickup/delivery visual polish.
- Richer sky visuals: clouds, sun, thunder, weather detail.
- Variable train length or additional wagons/locomotives.
- Live 3D previews in icon slots, baked PNG thumbnails, or regenerating scenery/critters icons.
- New piece types, changed unlock rules, or changes to the piece catalog ordering beyond paging.
- Persisted page state, new storage keys, telemetry, network calls, or parent-gate changes.
- Viewport/zoom policy, kid-UI text, long-press gestures, or removal of undo.
- Changes to save format, scene rendering beyond the drag preview/removal animation, or release workflow.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Dense drawer tabs expose their toys in pages of at most four visible slots; Nature and Critters remain single-page. | must |
| FR-2 | The drawer renders accessible page dots and supports swipe on empty drawer space; starting a drag from a toy slot still places that toy. | must |
| FR-3 | The selected page is remembered per tab for the session; a reload starts each tab at page 1. | must |
| FR-4 | Dragging an already-placed piece or scenery item beyond the board edge shows a removable preview; releasing outside removes it, returning inside cancels, and dragging a new toy from the drawer outside never deletes a world item. | must |
| FR-5 | Removal uses a soft animation and the existing undo chip; one undo restores the removed item. | must |
| FR-6 | The `.trash-slot` UI, styles, wiring, and selectors are removed; existing tests are updated, not disabled or skipped. | must |
| FR-7 | The change is covered by the configured static, unit, build, and e2e checks without weakening an existing gate. | must |
| FR-8 | Every track-piece icon is a static SVG generated offline from that piece's shipped GLB geometry, with a deterministic regeneration check and no runtime WebGL renderer. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No telemetry, network calls, UA sniffing, new storage keys, or world save-format changes. |
| NFR-2 | The kid UI remains icon-only: no visible reading is added; page dots have accessible names for assistive technology. |
| NFR-3 | Keep the toddler interaction rules: tap/drag only, no kid long-press, no fail states, autosave, and undo. |
| NFR-4 | `pnpm check`, `pnpm test:coverage`, `pnpm build`, and the Playwright suite pass; coverage stays above the 80% gate on `src/core` and `src/state`. |
| NFR-5 | No changes to disclosure gating, parent tray, viewport policy, piece/scenery catalogs, or release workflow. |
| NFR-6 | The icon generator is dev-only and deterministic: regenerating from the committed GLB geometry reproduces the committed SVG output with no diff. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A unit test asserts Rails, Adventure, and Town page into groups of at most four items and Nature/Critters remain single-page. | FR-1 |
| AC-2 | On tablet and phone, Rails shows four slots and page dots; tapping a dot or swiping empty drawer space changes the page, switching tabs and back preserves the page, and reload starts at page 1. | FR-2, FR-3 |
| AC-3 | A Playwright check confirms dragging a toy slot starts a placement drag and does not trigger page swipe. | FR-2 |
| AC-4 | On tablet and phone, dragging a placed toy beyond the board edge shows the removable preview; releasing there removes it and one undo restores it. | FR-4, FR-5 |
| AC-5 | Dragging a new toy from the drawer and releasing it outside the board does not remove any existing world item. | FR-4 |
| AC-6 | Dragging a placed toy outside and then back inside before release leaves the world unchanged. | FR-4 |
| AC-7 | No `.trash-slot` selector remains in production source or active e2e tests; the trash bin is absent from the toybox rail. | FR-6 |
| AC-8 | The full configured verification matrix passes with all existing gates intact. | FR-7 |
| AC-9 | The page dots have accessible names and the unmodified a11y sweep reports no new violations; no visible reading is added to the kid UI. | FR-2, NFR-2 |
| AC-10 | Regenerating icons from the shipped GLB geometry produces no diff, every `PieceType` has a generated SVG, and no runtime WebGL icon renderer is introduced. | FR-8, NFR-6 |

## Edge Cases

- A dense tab has a partially filled final page; dots count only pages that contain visible items.
- Progressive disclosure changes the visible item set; page count and current page clamp when advanced items unlock.
- A placed item dragged outside while the board is at `MAX_PIECES` can still be removed; cap dimming applies only to drawer slots.
- Cancelling a drag by returning inside the board leaves the item exactly where it was.
- Pointer loss, window blur, or an interrupted drag cancels removal rather than deleting.
- Reduced-motion users get instant removal with no bounce and no sound change.
- If a piece silhouette is not distinguishable at 48×48, the offline generator may adjust camera framing and line weight for that piece while preserving its real geometry.
- A missing or renamed GLB makes the icon generation check fail rather than silently falling back to a hand-drawn icon.
- Scenery items are treated like placed track pieces because the current trash accepted both.
- The phone profile has the same paging and outside-drag behaviour as tablet.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** “Dense tabs” means Rails (10), Adventure (8), and Town (7); Nature (3) and Critters (4) remain single-page.
- **Assumption:** “Placed piece” includes both track pieces and scenery items, matching the current trash behaviour.
- **Assumption:** “Outside the board” means beyond the visible meadow/board edge, not merely outside the toy drawer.
- **Assumption:** Page position is session-only and per tab, so a reload starts at page 1 and adds no saved state.
- **Assumption:** Undo remains the only recovery mechanism; no parent confirmation is added for single-item removal.
- **Assumption:** Geometry-derived icons apply to track pieces only; scenery and critter SVGs remain unchanged.

## References

- `conductor/archive/clarity-audit_20261110/report.md` — informal parent-reported friction notes.
- `src/core/drawer.ts` — current tab model and piece grouping.
- `src/ui/toy-drawer.ts` — current tab strip, panels, gating, and cap dimming.
- `src/ui/app.ts` — current toybox rail and trash slot markup.
- `src/ui/toy-icons.ts` — current hand-authored `PIECE_ICONS` to replace with generated output.
- `src/scene/track-catalog.ts` and `scripts/blender-*.py` — shipped model URL/source contracts for geometry-derived icons.
- `e2e/smoke.spec.ts`, `e2e/undo.spec.ts`, `e2e/ride-toybox-flow.spec.ts` — current drag/trash coverage to update.
- `conductor/product-guidelines.md` — no-reading, tap/drag-only, autosave, and undo rules.
