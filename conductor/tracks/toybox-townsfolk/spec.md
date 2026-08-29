# Specification: Toybox Townsfolk

## Problem Statement
The meadow toybox holds only three scenery items (tree, bush, rock). Toddlers
exhaust the decoration variety quickly, and the world feels static — nothing
in it responds to the train, the product's central cause-and-effect joy.

## Goal
Grow the toybox from 3 to ~8–10 chunky toys and make the world feel alive:
new buildings (station + houses), new critters that watch the train, and a
station the train pauses at with a happy ding-ding.

## Non-Goals
- No new track/rail pieces (rails drawer untouched).
- No skeletal GLB animation; all critter motion is procedural in Three.js.
- No new kits beyond Fantasy Town Kit + Kenney Animal Pack.
- No per-category piece caps; the single global cap stays.

## Functional Requirements

### FR1 — Bigger toybox
- Add **station** + **2 house variants** from Kenney Fantasy Town Kit
  (CC0), and **2–3 critters** (e.g., bird, sheep, rabbit) from Kenney
  Animal Pack (CC0) as placeable scenery types.
- All new items: draggable from the toybox, grid-snapped, liftable,
  trashable — identical interaction rules to existing scenery.
- New item types are **autosave-compatible**: existing worlds keep loading;
  saves persist new types via the same IndexedDB persistence path.

### FR2 — Tabbed drawer
- The scenery toybox drawer groups items by category with chunky,
  icon-only tabs: **Rails / Nature / Town / Critters**.
- Tabs are toddler-operable: big touch targets, no reading, tap or swipe
  between groups; active tab visually obvious.
- Rails tab replaces the current rails drawer behavior exactly.

### FR3 — Reactive critters
- When the train passes within ~1–2 cells, a critter performs a
  **procedural hop** (bounce with squash-and-stretch) and plays its
  **per-critter chirp** (bird tweet, sheep baa, …) through the existing
  Howler voice system, volume-capped per the sound guidelines.
- Idle: critters breathe/bob very subtly (~1–2% scale sway) so the world
  feels alive before ▶ is pressed.
- Critters do NOT sit on track cells and never block the train.

### FR4 — Station stop
- When the ride passes the station cell, the train gently decelerates,
  pauses ~2 seconds with a happy "ding-ding" and optional steam puff,
  then smoothly accelerates onward.
- Station stop works on both loop and out-and-back ride modes; multiple
  stations each get a stop; behavior must not retrigger mid-stop.

## Non-Functional Requirements
- **60 FPS budget:** idle sway and hops use the shared spin-loop/tick
  pattern with no per-frame allocations; N critters animate cheaply.
- **Sound guidelines:** chirps respect the global mute; volume capped so
  station ding + chirp + chug loop never clip.
- **Assets:** all new GLBs prepped in Blender (scaled to cell size,
  origin at base, orientation verified via viewport screenshots) before
  committing; licenses included with the kits.
- **Toddler Test:** reactions are instant, forgiving, and impossible to
  "fail" — a critter near the path may hop; nothing is required.

## Acceptance Criteria
- [ ] Toybox shows Rails / Nature / Town / Critters tabs; all ~8–10 items
      draggable, snappable, liftable, trashable.
- [ ] Existing saved worlds load unchanged; new items save and restore.
- [ ] Critter near the track hops + chirps as the train passes; subtle
      idle sway otherwise; mute silences chirps.
- [ ] Train pauses ~2s at each station with a ding-ding, on loops and
      shuttles, without double-triggering.
- [ ] Full unit-test suite passes (logic: pieces catalog, drawer model,
      station-stop pathing, persistence round-trip); e2e smoke test for
      the tabbed drawer added or updated.
- [ ] New GLBs verified in Blender (scale/origin/orientation) and licenses
      present.

## Decisions
- Animation: procedural Three.js transforms (user choice).
- Kits: Kenney Fantasy Town Kit + Kenney Animal Pack (CC0).
- Station is ride-aware (train pauses), not passive.
- Blender used to prep + visually verify all new GLBs.
