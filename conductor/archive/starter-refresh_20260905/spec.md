# Spec — Starter Refresh

**Track ID:** `starter-refresh_20260905` · **Type:** Feature · **Branch:** `track/starter-refresh_20260905`
**Builds on:** `starter-railway_20260903` (cozy oval + 3-preset parent-gated gallery), `hills-ramps_20260903`, `switches-branches_20260903`, `wagon-workshop_20260904`

## Overview

The starters feel stale: the 3 gallery presets are flat closed loops with no hills / switches / tunnels by design (starter-railway FR2 excluded adventure pieces), while the drawer now sells hills, bumps, corners, switches, and the crossing gate. First-run still lands well (cozy oval), but the gallery never showcases what the meadow can do.

This polish track adds ONE 4th showcase starter — **Hilltop Junction**: hill trio (`slope-up` / `hill` / `slope-down`) on the far straight + a passing loop on the near straight (TWO right-`switch`es joined by a station siding, so the ride alternates main/siding laps whichever way the solver runs) — keeps parent reset to EMPTY, preserves train + per-train wagon picks across gallery apply, and keeps the crossing gate out of starters.

## Functional Requirements

- **FR1 — 4th preset `hilltop-junction`:** pure builder in `src/core/starters.ts` returning ordinary `WorldData`:
  - Closed loop, one-tap rideable (`rideComponentsOf` yields one closed component; `▶` rides instantly).
  - ≤ ~20 toys, one toy per cell, 16×16 meadow, dry-land legal (`terrainErrorFor` / `isWater` — hills + switch dry only, bridges only over water; this preset uses no bridges).
  - Composition: hill trio on the far straight + a passing loop on the near straight — TWO OPPOSITELY-FACING right-`switch`es in series (west switch stem-west / diverge-south, east switch stem-east / diverge-north) joined by a zigzag 3-piece siding (corner / straight / corner) dipping one row below and rising back, so the alternating ride covers main + siding laps whichever way the solver runs (same-facing switches only ever serve the siding in one direction); 1 station beside the loop on dry land + 2 trees; 17 rail + 3 decor = 20 toys.
  - No gate, no tunnel, no bumps/corners (keep scope to hill trio + one switch).
- **FR2 — Gallery 4th pick:** parent-gated preset tray gains one icon-only pick (reuse hill/switch SVG language, ≥64px, no text). Lives inside the armed confirm step — toddler taps can never reach it. Muted / reduced-motion behavior unchanged.
- **FR3 — Preserve train + consist on apply:** applying ANY gallery preset keeps current `train` + per-train wagon `consist`; only rails / scenery / deliveries swap. Today `starter()` hard-codes `train: 'steam'` + `defaultConsist()` (see `src/core/starters.ts:44-46`) which would undress the kid's workshop picks. Fix: builders return rails/scenery/deliveries; apply layer carries train/consist forward.
- **FR4 — Undoable replace (unchanged rule):** gallery apply replaces the world as ONE single-undo mutation (existing `WorldStore` pending-undo rule); `↩️` restores prior pieces, scenery, train, consist, deliveries exactly.
- **FR5 — Reset stays EMPTY:** parent-gate reset still clears to an empty meadow (starter-railway AC5 preserved). No re-seed.
- **FR6 — Ordinary-world persistence:** 4th preset serializes through today's `serializeWorld` (snapshot v3 — no version bump, no migration). Once applied it is an ordinary autosaved editable world.

## Non-Functional Requirements

- Pure builders in `src/core/` (no three.js) — TDD'd, >80% coverage on new logic; `src/state/` replace/preserve logic TDD'd likewise.
- Zero per-frame cost (seed/apply at tap time only); no render-loop allocations; 60 FPS preserved.
- No new GLBs, no new audio, no runtime network (airplane-safe, nothing leaves device).
- Kid UX per `product-guidelines.md`: icon-only, tap + drag only, ≥64px targets, <100ms feedback, no fail states — preset always rides.

## Acceptance Criteria

1. Wiped IndexedDB → boot still shows Cozy Oval; gallery offers 4 picks; 4th pick applies and rides with one `▶` tap (loop + station pause), clean console.
2. Apply 4th preset with diesel + coal duo selected → rails change, train + coal duo preserved; reload keeps everything exactly.
3. Gallery apply → `↩️` restores prior build (pieces, scenery, train, consist, deliveries) exactly.
4. Parent reset → empty meadow (not starter); reload stays empty.
5. `pnpm check` (biome + typecheck + vitest) green; Playwright starter spec extension green (tablet + phone); manual tablet touch check passes.

## Out of Scope

- Crossing-gate in any starter; road-traffic story (separate track).
- 5th preset, kid-visible gallery tab / toybox section.
- Preset-defined train/consist; reset-to-starter behavior.
- Bumps, banked corners, tunnels in presets; new sounds, confetti, celebration choreography.
- Save-schema bump or migration.
