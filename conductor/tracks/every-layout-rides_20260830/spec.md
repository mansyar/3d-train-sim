# Spec — Every Layout Rides

**Track ID:** `every-layout-rides_20260830` · **Type:** Feature · **Status:** new
**Branch:** `track/every-layout-rides` · **Created:** 2026-08-30

## Problem

Only one train exists and `solvePath` rides only the smallest-keyed connected
component (`src/core/pathing.ts:104-148`). Any second loop a toddler builds
sits dead — violating the product rule "every arrangement of pieces works."

## Goal

Every connected track component comes alive with its own autonomous train
(capped), and a camera button lets the kid switch the chase camera between
riding trains and the overview.

## Requirements

- **R1 — Per-component paths:** `solveRidePaths(pieces)` returns one
  `TrainPath` per connected component; each component uses the existing
  deterministic walk, unchanged. Empty world → `[]`.
- **R2 — Ride selection & cap:** on ▶, start one train per component, at most
  **4 concurrent**; components are ranked (most pieces first, cell-key
  tiebreak). Beyond-cap components stay static scenery (no fail state).
- **R3 — One train kind for all:** the 🚂 drawer choice (steam/diesel/tram)
  applies to every train; switching kind swaps all locomotives in place.
- **R4 — Scoped mid-ride edits:** adding/moving/removing a piece soft-stops
  only the affected component's train; it re-solves on the next ▶.
- **R5 — Camera cycling:** a 🎥 button joins the toolbar next to 🎺, visible
  only while ≥2 rides run; each tap cycles filmed train → next train →
  overview → wrap. Reduced motion hides the button.
- **R6 — Whistle targets the filmed train:** 🎺 whistles + puffs on the
  train currently filmed; filming the overview → nearest train answers.
- **R7 — Shared chug:** one chug loop plays while any train rides (no
  overlapping loops); per-train one-shots (whistle, station ding) still fire
  per train.
- **R8 — Autosave unchanged:** save format unchanged (pieces + selected
  train kind); trains are ephemeral, rebuilt from the graph on ▶.

## Non-Goals

- Per-component train kinds or per-train selection UI.
- Collision avoidance (trains never share track).
- Switches/turnouts, pinch/zoom, new sounds — future tracks.

## Testing Gates

- Unit tests first (TDD) for all logic in `src/core` + `src/state`
  (multi-component solver, ride registry, camera-target cycling).
- Playwright smoke: two disjoint loops → two trains ride; camera button
  cycles; zero console errors; zero external requests.
- Gates: `pnpm biome check .` ✅ · `tsc --noEmit` ✅ · Vitest suite ✅.
