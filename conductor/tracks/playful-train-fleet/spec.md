# Specification — Playful Train Fleet

**Track ID:** `playful-train-fleet`  
**Type:** Feature

## Overview

Tiny Tracks currently has one locomotive and a placeholder 🚂 toybox slot. This track adds a small train collection: three visually distinct locomotives that children can choose from before watching their track come alive.

The feature extends the existing toybox, scene renderer, ride controller, audio system, and world persistence without changing track pathing or scenery behavior.

## Functional Requirements

1. **Train catalog**
   - Define exactly three train kinds in a pure TypeScript catalog.
   - Each train provides a stable kind identifier, local model asset URL, icon-only UI representation and accessible label, matching whistle/audio personality, and visual personality metadata such as body color, steam style, or other lightweight presentation data.
   - Catalog logic must remain free of Three.js and browser dependencies.
2. **Train selection UI**
   - Replace the current 🚂 “coming soon” toybox button with an active train drawer.
   - Display three large, touch-friendly train choices using icon-only controls.
   - Clearly indicate the selected train through visual state and accessibility attributes.
   - Selecting a train updates the parked locomotive.
   - The drawer must follow the existing one-drawer-open-at-a-time behavior.
3. **World state**
   - Add a selected train to the world state.
   - Default to the steam locomotive for new worlds.
   - Expose train selection through the existing world store.
   - Changing the selected train while riding gently stops the ride before swapping models.
   - Train selection must not affect track occupancy, scenery occupancy, the shared item cap, or path solving.
4. **Scene rendering**
   - Load the three locomotive models from local assets.
   - Keep only the selected locomotive active in the scene.
   - Preserve the existing placeholder fallback while the selected model loads.
   - Reuse the current ride motion and follow-camera behavior.
   - Apply each train’s visual personality without introducing per-frame allocations or runtime network calls.
5. **Ride behavior**
   - The selected locomotive rides the existing solved path.
   - Closed loops continue cycling; open layouts continue pausing and shuttling.
   - Existing stop, mid-ride edit, reduced-motion, and camera behavior remain intact.
   - Starting a ride with no track remains gently unavailable.
6. **Audio personality**
   - Retain the existing global mute behavior and audio unlock flow.
   - Keep the existing chug synchronization contract.
   - Give each train a matching whistle or whistle variation.
   - Train-specific audio must remain local and optional; audio failures must never block play.
7. **Persistence and compatibility**
   - Persist the selected train in the existing IndexedDB snapshot.
   - Restore the selected train after reload.
   - Older snapshots without a train field must deserialize using the default steam locomotive.
   - Invalid or unknown persisted train identifiers must also fall back safely to the default.
   - Existing track and scenery data must remain compatible.
8. **Testing**
   - Add unit tests for catalog behavior, default selection, selection changes, and save/load compatibility.
   - Extend Playwright smoke coverage to open the train drawer, select a non-default train, confirm the selected train is used for riding, reload and confirm selection persists, and confirm no console errors and no external requests.

## Non-Functional Requirements

- Touch-first controls with targets at least 64px.
- No text required for child interaction; accessible labels remain available.
- No runtime network calls; all models and audio are vendored or already local.
- Preserve the 60 FPS target on mid-spec tablets.
- Maintain the existing vanilla DOM, Three.js, Howler, IndexedDB, Vitest, and Playwright stack.
- New logic-bearing modules target greater than 80% coverage.
- Respect reduced-motion behavior and the no-fail-state product guideline.

## Acceptance Criteria

- The 🚂 toybox control opens a train drawer containing exactly three train choices.
- A child can select each train with a large touch-friendly icon.
- The selected train is visually indicated and becomes the parked locomotive.
- Changing trains while riding gently stops the ride before replacement.
- Each train has a distinct local model and matching whistle/visual personality.
- The selected train rides every existing track layout using unchanged pathing.
- Track and scenery placement continue to behave exactly as before.
- The selected train survives reload through IndexedDB.
- Old or malformed snapshots fall back to the default train without losing the world.
- `pnpm check` and Playwright smoke tests pass.
- No external network requests or console errors occur in smoke tests.

## Out of Scope

- Multiple simultaneous trains.
- Cargo wagons, train coupling, and train composition.
- Player-controlled driving.
- Track switches, branches, bridges, tunnels, or elevation.
- Train upgrades, unlocks, scoring, progression, or purchases.
- Reworking the existing path solver or scenery collision behavior.
- Cloud sync, accounts, analytics, or server APIs.
- Parent-gated reset, except where existing reset/persistence interfaces need compatibility updates.
