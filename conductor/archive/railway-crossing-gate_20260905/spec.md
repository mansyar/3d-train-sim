# Spec: Railway Crossing Gate

**Track:** `railway-crossing-gate_20260905` · **Type:** Feature ·
**Branch:** `track/railway-crossing-gate_20260905`

## Overview

A chunky, toy-like railway crossing joins the track toybox: a straight rail
piece with a road strip, a red-and-white crossbuck post, and two short
striped barrier gates that swing down as any train nears, with a real
(gently softened) crossing bell and a blinking lantern. The world gains a
new cause-and-effect moment a toddler recognizes from real life — *train
comes, gates drop, bell rings, train goes, gates lift.*

## Functional Requirements

1. **Piece & placement** — New track piece (`crossing-gate`): one tile,
   straight road-across-rail, placed from the toybox **Rails tab** with a
   drawn chunky icon. Snaps, lifts, moves, and trashes exactly like any
   track piece. Ghost/preview rules identical to other rails (red over
   water; cannot span water). Blender-authored via a deterministic,
   checked-in recipe (`scripts/blender-crossing-gate.py`).
2. **Ride behavior** — Trains roll through at normal speed; **no pausing,
   ever**. Gates never block the train. Works with all trains, switches,
   hills, tunnels, and the ride camera.
3. **Proximity trigger** — When *any* train approaches within a defined
   warning distance of the crossing (per-crossing, all crossings
   independent, up to 4 concurrent trains): gates swing closed with an
   eased motion + squash-and-stretch, lantern blinks red, bell rings. When
   the last train clears the exit distance, gates lift back up and the
   bell stops. Gate state is **derived from train positions at runtime —
   never saved**.
4. **Sound** — Bundle a **real railroad-crossing bell recording**
   (CC0/public-domain preferred) softened and volume-capped per audio
   principles; attribute in `public/audio/CREDITS.md` if the license
   requires; fully local (no runtime network). Falls back to a synthesized
   two-tone bell if no suitable real recording is found. Mute-respecting
   and instant.
5. **Night & winter house style** — Winter adds a snow cap (same pattern
   as tunnels/hills). At night, the lantern **blinks softly even when
   idle**; while active (gate closing or train on it) the lantern **blinks
   in any time of day**.

## Non-Functional Requirements

- Instant feedback (<100 ms) on trigger; eased, gentle motion (no shakes).
- No per-frame allocations in the render loop; animation state pooled.
  60 FPS target on mid-spec tablets.
- **Additive save**: new piece type with no save-version bump; old worlds
  open unchanged; crossing placement persists via autosave.
- Icon-only UI, no text; ≥64px toybox target.

## Acceptance Criteria

- [ ] Crossing appears in the Rails tab, snaps/moves/trashes like other
      rails.
- [ ] Any approaching train lowers gates + blinking lantern + bell; gates
      lift after it passes; two trains near different crossings trigger
      independently.
- [ ] Night: idle soft blink; winter: snow cap.
- [ ] Bell is a real recording (or documented synthesized fallback),
      muted by the mute toggle, credited appropriately.
- [ ] Reload restores the placed crossing; pre-feature saves load
      unchanged.
- [ ] TDD core logic (proximity state machine, piece registration, save
      round-trip) in Vitest; dedicated `e2e/crossing-gate.spec.ts`
      proving close/ring/lift, reload persistence, and winter/night
      variants — per house standard.

## Out of Scope

- No roads/car network beyond the crossing's own road strip.
- No pausing trains at crossings.
- No double-track crossings or 3-way variants.
- No kid-controlled gate button.
