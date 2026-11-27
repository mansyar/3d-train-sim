# B. Expression — paint/sticker liveries — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The child makes the train *theirs*: any of the six locomotives and their wagons
can be repainted from 6 chunky color swatches and stamped with 4 sticker shapes,
all inside the train drawer they already know. Every livery persists per-train
across reloads. No new buttons on the control rail, no reading, no downloads.

## Problem / Motivation

Today the child picks from six fixed engines and four preset wagon outfits —
they choose, but they don't *create*. The product thesis is "creator, not
consumer": the layout is already theirs, but the hero of every ride still looks
showroom-identical for every child. If this isn't solved, the most-loved object
in the world stays generic and a core Phase 3 expression direction stays
unshipped.

## Goals & Success Metrics

- **Goal:** a 2–4 year-old can repaint and sticker their whole consist
  unassisted, and it is still theirs tomorrow.
- **Metric:** agent-verified — all six locomotives repainted + stickered in e2e
  with zero console errors; livery round-trips a reload byte-identical; taps
  respond in <100 ms. Human-observed delight stays with continuous parent
  feedback (no gate).

## Scope

### In Scope

- Livery section in the train drawer: 6 paint swatches, 4 sticker shapes, one
  restore-default swatch — icon-only, ≥64 px targets
- Whole-body repaint of the selected loco/wagon on one tap (instant, with
  scale-bounce)
- Tap-sticker-then-vehicle stamping on side anchors; full anchors evict the
  oldest with a soft pop
- Per-train persistence across reloads; restore-default clears one vehicle back
  to stock
- Mute-respecting reward sounds (soft pop / happy ding)

### Out of Scope

- Painting scenery, track, or buildings
- Per-part zones, freehand painting, drag-to-place stickers (banned precision)
- New control-rail buttons or new tabs; new GLB downloads (stickers are
  procedural/SVG textures)
- Parent gate for livery changes (nothing is destroyed, so no gate is needed)
- Shared Play (RM-004) and new piece/loco types (RM-006/RM-007)

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Train drawer shows a livery section: 6 paint swatches, 4 sticker shapes, 1 restore-default swatch, all icon-only | must |
| FR-2 | Tapping a paint swatch repaints the whole body of the currently selected loco/wagon instantly | must |
| FR-3 | Tapping a sticker shape then a loco/wagon stamps it on the next free side anchor; when anchors are full the oldest sticker pops off | must |
| FR-4 | Each vehicle's livery (paint + stickers) persists across reloads, per-train | must |
| FR-5 | Restore-default returns one vehicle to its stock paint with stickers cleared | must |
| FR-6 | Paint and stamp play a mute-respecting reward sound with a scale-bounce on the vehicle | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every tap gives visible feedback in <100 ms (guidelines: instant feedback) |
| NFR-2 | Zero new downloads — stickers are procedural/SVG textures; offline-complete and precache-neutral |
| NFR-3 | Under reduced motion, stickers appear in their final state with no pop/bounce animation |
| NFR-4 | No reading required anywhere in the flow — swatches and vehicle selection only |
| NFR-5 | Save stays additive: livery rides in the snapshot preferences block like wagon outfits; the portable world-only export excludes it |
| NFR-6 | 60 FPS guardrail holds with all six consists fully liveried — no per-frame allocations for anchors/stickers |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | E2E repaints all six locomotives + wagons, taps each sticker shape, zero console errors | FR-1, FR-2, FR-3 |
| AC-2 | Reload round-trip: livery of every vehicle byte-identical after reload | FR-4 |
| AC-3 | Stamping beyond the anchor count evicts the oldest sticker, exactly one pop, count stays capped | FR-3 |
| AC-4 | Restore-default returns vehicle to stock paint with zero stickers | FR-5 |
| AC-5 | Muted run: paint/stamp change the livery with zero audible plays | FR-6 |
| AC-6 | Reduced-motion run: stickers land in final state, no animation frames asserted | NFR-3 |
| AC-7 | Offline prod build: full livery flow works with network disabled, no new precache entries | NFR-2, NFR-5 |

## Edge Cases

- All anchors full on rapid sticker taps — cap holds, oldest-first eviction, no duplicates stacking on one anchor
- Switching selected train mid-flow keeps each train's own livery; selecting a never-painted train shows stock
- Save snapshot predating liveries boots every vehicle stock (missing key = default)
- Full reset (parent-gated) clears all liveries with the world
- Six fully-liveried consists on screen: frame budget holds on the tablet profile
- Sticker stamped while its train is riding — lands on the moving vehicle without console errors

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** 4 side anchors per vehicle (two per side); eviction is oldest-first. Flagged for approval, not a gate.
- **Assumption:** paint/stamp sounds are a soft pop + happy ding through the existing Howler path, mute-respecting.
- **Assumption:** livery lives in the snapshot `preferences` block per train id (same rule as wagon outfits) and is excluded from the portable world-only file.
- **Assumption:** stickers render as flat camera-facing sprites offset just off the body sides (no geometry changes, no new GLBs).

## References

- Roadmap RM-003 (Later, P2); product.md Phase 3; wagon-workshop precedent (per-train cosmetic persistence)
