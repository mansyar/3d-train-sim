# Spec — Time of Day & Weather

**Track ID:** `time-of-day-weather_20260830` · **Type:** Feature · **Status:** new
**Branch:** `track/time-of-day-weather` · **Created:** 2026-08-30

## Problem

The meadow is static: one lighting rig, one clear sky, forever. The roadmap names
"Time of day and weather" as the next big mood lever, and the Toddler Test rewards
worlds that feel alive — the train already chugs, critters hop, but the sky never
changes and rain never falls.

## Goal

A zero-UI, always-on ambience system: the meadow drifts through a gentle
~2.5-minute day (sun arc → cozy twilight → dawn) while weather drifts between
clear, cloudy, rain, and snow — with reacting critters, soft ambience sounds, and
a whitening ground. No buttons, no save changes, no fail states.

## Requirements

- **R1 — Day cycle (pure logic):** `day-clock.ts` maps elapsed seconds → phase
  (dawn → mid-morning → noon → dusk → night), starting **mid-morning** each
  session, **~2.5 min per full day**, fully deterministic for TDD (precedent:
  `attract-clock.ts`).
- **R2 — Sky:** gradient sky dome with a **sun disc by day and moon at night**
  arcing across it; cloud puffs whose density follows the weather state.
- **R3 — Lighting:** scene lights (ambient/directional) lerp color + intensity by
  phase; night is **deep-blue twilight** — never near-black — with **warm
  emissive glows** on house windows and stations from dusk to dawn.
- **R4 — Weather machine (pure logic):** `weather-cycle.ts` drifts clear →
  cloudy → rain → snow → clear with **soft 5–8 s cross-fades**, shifting roughly
  every 30–45 s; never an abrupt switch.
- **R5 — Particles:** instanced rain streaks and snowflakes (small fixed budgets,
  zero per-frame allocations); **`prefers-reduced-motion` hides the drift**
  (static or off).
- **R6 — Snow settles:** while snowing, the ground material lerps toward soft
  white; track pieces keep their colors; it melts back after.
- **R7 — Critters react:** critters hop less (or shelter) during rain and are
  off-duty at night, replaced by **fireflies** — small glowing drifters near the
  track (extends `critter-life.ts`).
- **R8 — Ambience audio:** soft rain patter and gentle wind fade in/out with
  weather via the existing audio stack; **mute silences everything** as today.
- **R9 — Train headlight:** at night the locomotive shows a warm emissive lamp
  plus a subtle forward spotlight cone; off by day.
- **R10 — Ephemeral:** save format, autosave, reset, and the parent gate are
  untouched; the clock restarts at mid-morning every session.

## Non-Functional

- **60 FPS on mid-spec tablets:** instanced particles (rain ≤ ~600, snow ≤ ~400),
  no per-frame allocations in the hot loop, ≤ 1 dynamic light added (headlight).
- **TDD:** R1 and R4 are pure functions with vitest coverage (phase boundaries,
  transition ramps, reduced-motion flag); scene wiring is thin.
- **Conflict hygiene:** touches `scene/` (+ new modules), `critter-life.ts`,
  audio fade API only — deliberately orthogonal to the in-flight
  `every-layout-rides` pathing work.

## Acceptance Criteria

1. Within ~3 idle minutes the meadow shows a full day and every weather, with
   soft transitions and no console errors.
2. Night is cozy: track and UI remain clearly visible; house/station windows
   glow; headlight reads from the follow-camera.
3. Muting silences weather ambience; reduced-motion hides particle drift.
4. Snowing visibly whitens the meadow and melts back; critters reduce activity
   in rain and yield to fireflies at night.
5. All existing unit tests + Playwright smoke stay green; pure-logic coverage
   ≥ 90%.

## Out of Scope

Thunder/lightning/storms, wind-bent trees, seasons, elevation/bridges/tunnels,
persisting time or weather, any new toolbar/parent UI, steam-puff changes,
multi-train behavior (owned by `every-layout-rides`).
