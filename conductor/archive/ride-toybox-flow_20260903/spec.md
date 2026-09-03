# Specification — Build-to-Ride Flow & Toybox Clarity

**Track:** `ride-toybox-flow_20260903` · **Type:** Feature · **Status:** new
**Branch:** `track/ride-toybox-flow_20260903`

## Overview

Combine the Ride-mode flow and Toybox clarity pass into one toddler-safe
build → play loop. Today the same 8-button rail shows during build and ride,
so mid-ride fumbles can soft-stop the train — which reads as failure to a
2-year-old (against Guideline #1). The Rails tab holds 9 pieces and wraps to
two rows on phones (≥360px), covering the meadow. Scenery and train buttons
are still emoji stand-ins (`SCENERY_ICONS` in `app.ts` notes "until the toys
get their GLB thumbnails") while track pieces enjoy chunky inline SVGs.

This track makes build and ride feel like two friendly modes, gives every toy
a chunky readable home, and celebrates the moment a layout becomes rideable —
all icon-only, no reading, no new gestures.

## Problem

1. **One rail for two jobs.** Toybox triggers (🧸/🚂), trash, undo ↩️, and the
   delete-chip stay live while riding. An accidental drag mid-ride soft-stops
   the train and kills the joy moment.
2. **Rails tab overflow.** 9 rail kinds (straight, corner, crossing, bridge,
   tunnel, slope-up, hill, slope-down, switch) share one `rails` tab in
   `src/core/drawer.ts`. On phones the panel wraps to 2 rows over the meadow.
3. **Emoji vs toy inconsistency.** `SCENERY_ICONS` (🌳🌿🪨🏠🛖🚉🐷🐑🐶) and
   `trainIcon` (🚂🚆🚋) are emoji; `PIECE_ICONS` are chunky SVGs in the
   `var(--toy-*)` palette. Breaks "chunky, readable silhouettes" at arm's
   length.
4. **No ride-ready invitation.** The ride button only dims on empty. A toddler
   never gets a nudge that *now* is the moment to press ▶.

## Solution

- **Ride-mode rail:** when `rideMode === riding`, hide build tools and lock
  building; rail keeps only ⏹ stop, whistle 🎺, film 🎥 (when ≥2), mute 🔊,
  and the parent gate ♻️.
- **Split Rails tab:** `drawer.ts` grows 4 → 5 tabs. `rails` 🛤️ keeps
  straight/corner/crossing; new `adventure` 🌉 holds
  bridge/tunnel/slope-up/hill/slope-down/switch. Nature/town/critter unchanged.
- **Chunky SVG icons:** replace scenery + train emoji with inline SVGs in the
  `PIECE_ICONS` style. Aria labels unchanged.
- **Loop-closure celebration:** empty → non-empty pulses the ride button;
  closing a graph cycle plays one happy ding (mute-respecting) + button pop.
  Silent and still under mute / reduced-motion.

## Functional Requirements

- **FR1 — Ride-mode rail (hide build tools):**
  - On riding: hide toybox triggers (🧸/🚂 drawers), trash slot, undo ↩️,
    delete-chip, and dev grid-toggle. Train drawer cannot open; canvas
    lift/drag/delete taps are ignored.
  - Rail keeps: ride toggle (⏹), whistle, film (existing ≥2 rule),
    mute, parent gate.
  - On stop: all tools return, world exact, no loss, no re-save side effects
    beyond the ordinary stop.
- **FR2 — Split Rails tab:**
  - `DRAWER_TABS` becomes
    `['rails', 'adventure', 'nature', 'town', 'critter']`.
  - `TAB_FOR_KIND`: straight/corner/crossing → `rails`;
    bridge/tunnel/slope-up/hill/slope-down/switch → `adventure`.
  - Tab icon `adventure` = 🌉, aria `Adventure toys`. Order: rails,
    adventure, nature, town, critter.
  - Each panel holds ≤6 toys in a single row; on narrow viewports the row
    scrolls sideways (swipe) instead of wrapping over the meadow.
- **FR3 — Chunky SVG icons:**
  - New inline SVGs for tree, bush, rock, house, cottage, station, pig,
    sheep, pug + three locomotives, matching `PIECE_ICONS` construction
    (48×48 viewBox, `var(--toy-*)` fills, brown outline, steel accents).
  - ≥44px glyphs, ≥64px targets unchanged, aria labels unchanged, no emoji
    remains in kid UI.
- **FR4 — Loop-closure celebration:**
  - Pure detector `src/core/ride-ready.ts`: `isRideable(pieces)` (≥1 piece)
    and `closesLoop(before, after)` (new piece creates a graph cycle, via
    `track-graph` connections).
  - `app.ts` subscribes to world edits: empty → non-empty adds
    `is-ready-pulse` CSS class to the ride toggle; placement with
    `closesLoop === true` fires one ding + `pop` class (removed on
    animationend).
  - Muted audio → no ding. `prefers-reduced-motion` → no pulse/pop classes
    applied. Never blocks input, never shows text.

## Non-Functional Requirements

- Icon-only, no reading; only tap + drag; ≥64px kid targets; ~48px drag
  tolerance preserved.
- Every touch <100ms: scale-bounce and/or sound, as today.
- Gentle eased motion only — no shake, flash, strobe, or rapid cuts.
- 60 FPS mid-tablets during play; no per-frame allocations in detector
  (runs only on edit, not per frame); CSS animations GPU-cheap
  (transform/opacity).
- Autosave stays silent and exact; airplane-mode functional; nothing leaves
  the device.
- TDD for `drawer.ts` changes and `ride-ready.ts` (>80% coverage,
  `src/core/`). UI glue (`app.ts`, CSS) verified by smoke + tablet checks,
  no unit tests per workflow.

## Acceptance Criteria

- **AC1:** Start ride → toybox/trash/undo/chip/grid hidden; tap-drag on
  meadow moves nothing and never stops the train; ⏹/whistle/mute still work;
  stop → tools return, world exact.
- **AC2:** Drawer shows 5 tabs in order; Rails holds 3, Adventure holds 6;
  panels stay one row at 360px (Adventure swipes sideways); no wrap.
- **AC3:** No emoji glyphs in toybox/train drawer; SVGs crisp at arm's
  length, contrast-kept, targets ≥64px.
- **AC4:** Place first piece → ride button pulses; close an oval → one ding
  + pop; muted → silent; reduced-motion → still.
- **AC5:** `CI=true pnpm test`, `tsc --noEmit`, `biome check` clean;
  Playwright smoke (ride hides tools, 5 tabs, loop pop) with zero console
  errors.

## Out of Scope

- Starter worlds, tutorials, text hints, or onboarding copy.
- Driving mode, scoring, timers, levels (non-goals stand).
- Multi-step undo / redo / persisted undo.
- New pieces (left-mirror switches, bump-up/down, corner-ramps).
- Time-of-day / weather; wagon color variants; motorized levers.
