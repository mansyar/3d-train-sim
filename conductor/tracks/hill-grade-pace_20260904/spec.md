# Spec: Hill-Grade Pace

## Overview

Today every ride runs at a constant `RIDE_SPEED = 2.2` world-units/s
(`src/scene/ride-motion.ts`) — height from `src/core/elevation.ts`
(`HILL_HEIGHT = 1.1`) is visual-only. Hills look tall but feel flat.

This track makes pace grade-aware and per-loco while keeping the train
fully autonomous: climbs labor, descents breeze, and each loco keeps its
own personality pace. No buttons, no slider, no save change — the same
`Go / Stop / Whistle` toy, just alive on hills.

## Functional Requirements

- **FR1 — Grade factor (pure core):** new pure `src/core/pace.ts`
  (no three.js) computes a live factor from signed grade
  (`PathStep.entryHeight / exitHeight` via `stepHeights` +
  `rideHeightAt`, symmetric through `isReversedSpan`):
  climb `-35%`, descent `+25%` (Moderate), eased over ~0.5s, floored so
  the train never stalls, stops, or rolls back. Zero grade = `1.0`
  exactly (flat rides byte-identical).
- **FR2 — Loco personalities (pure core):** base pace factors
  `steam 0.9x (~2.0), tram 1.0x (2.2), diesel 1.2x (~2.6)` — Wide spread.
  Extends `train-audio-personalities` (whistle pitch) to pace.
  Multi-train ranking (`selectRideComponents`, most-pieces-first, cap 4)
  unchanged.
- **FR3 — Scene application:** `ride-motion.ts` `update()` scales live
  speed = `RIDE_SPEED × personality × grade`, with brake protection:
  descent boost eases out before `BRAKE_DISTANCE` so the 2s station
  `ding-ding` glide, cargo load/deliver, and confetti land exactly.
  Open-shuttle reverse rides the same slope symmetrically
  (climb becomes descent on the way back). Camera follow, tunnels,
  bridges, switches, `END_PAUSE` / `STOP_EASE` unchanged.
- **FR4 — Sound + puffs follow:** chug interval and steam-puff emission
  rate scale with live speed, per-train tempo (up to 4 concurrent),
  mute-respecting, no pitch jumps or loud shifts. Shared-chug replaced
  by per-train voices so diesel + steam stay truthful side by side.
- **FR5 — Composition:** composes with loops, shuttles, tunnels
  (chug-duck/echo), hills auto-blend, switches alternation,
  river-bridge, cargo 8-crate flow, day/weather ambience. Ephemeral —
  no save-schema change, reload changes nothing.

## Non-Functional Requirements

- Core TDD, `>80%` coverage on new `pace.ts`; core stays pure
  (no three.js, no per-frame alloc; scene reuses scratch objects).
- 60 FPS guardrails hold; cold load `<5s`; precache unchanged.
- Gentle motion only: eased pace shifts, instant `Go/Stop/Whistle`
  `<100ms`, station `2s` pause preserved, no fail/dead-end/stall.
- Mute persists; no new network (airplane-safe PWA).

## Acceptance Criteria

- Same hill loop: train visibly labors up, breezes down, never stops
  mid-slope; flat oval timing unchanged vs `main`.
- Same oval, different loco: diesel laps clearly faster than steam,
  tram in the middle; 2-train ride keeps both tempos truthful.
- Downhill into station still docks exactly, cargo + confetti fire.
- Shuttle layout: forward climb = backward descent on the same piece.
- `pnpm check` (biome + `tsc --noEmit` + vitest) green; e2e hill-pace
  spec green on tablet + phone, clean console, zero external requests.

## Out of Scope

- Speed slider / pace buttons / driving mode (breaks autonomous-only
  + tap-and-drag-only toddler rules — explicitly rejected).
- Stall / rollback / derail physics, load-weight simulation.
- Save-schema bump, new GLBs, camera changes, whistle restyle.
