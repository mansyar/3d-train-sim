# Spec: River & Bridge (`river-bridge_20260830`)

## Overview
A hand-shaped S-curve river winds across the meadow as the toy world's first
real terrain feature. Track can no longer sit in the water — instead, a new
**wooden trestle bridge** toy (in the track tab) spans it, water-only. The
river reflects the living sky, freezes under snow, babbles softly, and hosts a
little duck that drifts the current and wiggles happily when a train rolls
past. Existing saved worlds migrate gracefully: old track lying where the
water now flows quietly renders as bridges. Nothing is ever lost.

## Functional Requirements

**River terrain**
- **FR1 — River body:** a hand-authored S-curve band (~3 cells wide) flows
  edge-to-edge across the meadow, leaving generous build space on both banks.
  A pure `river.ts` core module owns the water-cell set (`isWater(cell)`),
  art-directed against the 60-unit grid.
- **FR2 — Water is an obstacle:** track pieces and scenery ghosts turn
  invalid (existing red-ghost pattern) over water cells; placement is
  rejected. Bridges are the one exception (FR3).

**Bridge piece**
- **FR3 — Trestle bridge toy:** a new `bridge` piece type in the **track tab**
  of the drawer. Water-only validity: its footprint must lie fully on water,
  ends meeting land (ghost red on grass). Wooden-trestle look: plank deck,
  side railings, stilt legs into the water — Kenney-kit aesthetic.
- **FR4 — Riding over water:** trains cross bridges at normal speed and
  height — **no elevation, no new physics**; the kinematic path system is
  untouched. Water flows visually beneath the deck.

**Living water**
- **FR5 — Sky reflection:** water color tracks the sky palette (dawn oranges →
  midday blue → night navy) via the existing `sky-palette` module.
- **FR6 — Winter freeze:** under snow intensity the surface pales to ice
  (ducks and babble stand down); melts as snow clears. Follows the ambience
  frame path (reduced motion → static frame).
- **FR7 — River babble:** a whisper-quiet synthesized babble bed that fades in
  only near the water — lazy AudioContext, mute-respecting, suspended with the
  tab hidden (same pattern as `ambience-audio.ts`).
- **FR10 — Water polish:** the river reads as water, not a blue sticker.
  **Shore gradient:** water cells near the banks shade lighter (shallow), the
  river's spine shades deeper — pure palette math driven by each cell's
  distance from the river's center line. **Flow stripes:** soft highlight
  bands drift slowly downstream (with the duck's north→south drift),
  allocation-free per frame; stripes freeze when the river ices over and hold
  still under reduced motion.

**Duck**
- **FR8 — River companion:** one little yellow duck drifts slowly along the
  S-curve, bobbing gently. **Train-reactive:** a happy tail-wiggle when a
  riding train passes near (reuses the critter-life mood pipeline). Unlike
  land critters, the duck **stays out in the rain** (it's a duck) but is
  off-duty at night (bedtime gate).

**Save migration**
- **FR9 — Auto-bridge on load:** on first load after this update, any existing
  straight/corner whose cells now intersect the river renders as a bridge.
  Zero world data lost; autosave never breaks a built world. Save version
  bumps via the existing `save.ts` migration pattern.

## Non-Functional Requirements
- Pure logic (`river.ts`, migration, duck pathing math) is **TDD'd, ≥90%
  coverage**.
- Zero per-frame allocations in the render loop (scratch-object pattern, as
  established in review).
- No new downloaded assets: bridge/duck assembled from kit parts/simple
  geometry; audio synthesized.
- New e2e: bridge placement rules (valid on water, invalid on grass),
  migration of a pre-river world, console-clean long-run with river active.
- 60 FPS target unchanged on mid-spec tablets.

## Acceptance Criteria
1. Fresh world shows the S-curve river; ghosts go red over water for
   track/scenery.
2. A bridge drags, snaps, and is valid only spanning water; a train rides
   across it smoothly with water visible below.
3. Water hue follows the day cycle; at night it glows dark navy; under snow
   it ices over and the duck/babble stand down. The surface reads as water:
   shallows shade lighter toward the banks, and highlight bands drift slowly
   downstream (frozen when iced, still under reduced motion).
4. A pre-river autosave loads with all pieces intact; water-crossing track
   renders as trestle bridges.
5. Duck drifts, bobs, wiggles for passing trains, sleeps at night, paddles in
   the rain.
6. River babble whispers near the bank, respects mute, and suspends with the
   tab.
7. Full gates green: `pnpm check`, unit suite, Playwright suite (fresh
   servers — no orphan-port reuse).

## Out of Scope
Boats/fish beyond the duck · curved bridges · tunnels & elevation ·
waterfalls/foam edge art · procedural rivers · parent-gate or camera changes.
