# Spec — Hills & Ramps (Elevation)

**Track ID:** `hills-ramps_20260903` · **Type:** Feature · **Branch:** `track/hills-ramps_20260903`

## Overview

The meadow gains real elevation: a three-piece **hill run** — `slope-up`
climbs, `hill` cruises along the crest, `slope-down` comes back down
(Kenney kit assets, measured ≈1.1 units tall). Kids compose
rise/cruise/descent chains of any length; the train puffs up over the top
and back down, chase camera following. Placement stays rule-free — hills
go anywhere a straight goes — and where heights disagree at a joint, the
train eases gently instead of popping. In winter, the hills wear snow
crowns, in the same language as the tunnel's snow cap and the frozen
river.

## Functional Requirements

**FR1 — Three piece types.** `slope-up`, `hill`, `slope-down` join the
piece catalog. Each rides like the straight it mirrors: one cell, two
endpoints on opposite edges, 90° rotatable, normal speed, counts against
the 64-piece cap, dry land only (ghost red over water),
placeable/liftable/trashable, in the toybox drawer. Direction convention:
at yaw 0 a `slope-up` climbs from its south edge to its north edge (world
north = −z), rotating with the piece; `slope-down` is its mirror; `hill`
rides identically in both directions.

**FR2 — Height profiles (pure core).** Each new type maps ride progress
t ∈ [0, 1] → height above the flat rail plane, piecewise-linear from the
measured GLB geometry: `slope-up` 0 → H across the cell, `hill` constant
H, `slope-down` H → 0, with H calibrated to the kit rail line (≈1.1) so
wheels sit on rails. Every existing type is flat (0). Pure functions in
`src/core` — no three.js.

**FR3 — Paths carry heights.** The ride-path solver annotates each step
with entry/exit heights from FR2. Connectivity, pathing, shuttling,
multi-train ranking: unchanged. Hills never alter the graph.

**FR4 — Gentle auto-blend at joints.** Where consecutive steps disagree
in height (hill crest into a plain straight; `slope-up` into `slope-up`;
a lone slope at a dead end — reversed riding included), the train eases
between heights over a bounded, deterministic window. Never a pop, never
a float, never a failure.

**FR5 — Ride & camera.** Wagons (and their crates) follow the engine over
the crest with today's spacing. The chase camera tracks position **+
height** with its existing easing; the overview camera is unchanged. No
new ride states.

**FR6 — Kit assets wired.** The three GLBs register in the renderer
(`PIECE_URLS`, `BASE_YAW`, `KIT_ANCHORS`) on the straight's mounting
measurements (4-unit module; rails meet neighbours flush, trestle-bridge
convention).

**FR7 — Snow caps (Blender shells).** A deterministic, checked-in Blender
recipe exports a thin white crown shell per hill piece (toggled by named
nodes, `tunnel_snow_cap` precedent): visible while snow falls, hidden
when it clears, event-driven.

**FR8 — Drawer & labels.** The Rails tab auto-populates from the catalog;
three hand-drawn SVG icons + labels in the established style.

**FR9 — Saves stay whole.** Additive type strings only: no snapshot
version bump, no migration; pre-hill worlds load exactly as they were; a
world with hills round-trips. Snow state is weather-derived, never saved.

## Non-Functional Requirements

- New logic (profiles, path heights, blending) in `src/core/` — pure,
  TDD'd, >80% coverage on new logic; zero scene coupling.
- No per-frame allocations in the render loop; height sampling is
  arithmetic; snow toggling is event-driven.
- No new downloads beyond precache entries (kit GLBs already in repo,
  ~40–50 KB each; snow shells target < 15 KB each); nothing loads from
  the network at runtime.
- Kid UX per `product-guidelines.md`: drag/tap only, ghost feedback, no
  fail states — a lone slope dead-ends exactly like a straight (shuttle
  ride, height returns to grade).
- 60 FPS: height math is trivial; no changes to the quality tier system.

## Acceptance Criteria

1. The three pieces drag from the Rails tab, snap on land, ghost red over
   water, lift/trash like track.
2. `slope-up → hill → slope-down` rides smoothly up, along the crest, and
   down; wheels sit on the rails — no float, no clip.
3. Mismatched joints (hill into plain straight; slope into slope; lone
   slope dead end, forward and reversed) ride with a gentle ease — no
   pops.
4. Multi-train layouts with hills stay in step; wagons and crates follow
   the engine over the crest.
5. The chase camera tracks the train over the crest smoothly; overview
   unchanged.
6. Winter shows snow crowns; clearing weather removes them.
7. Old saved worlds restore unchanged; a world with hills restores with
   hills.
8. `pnpm check` + Playwright smoke green (new hill e2e: place the run,
   start the train, clean console); manual tablet check passes.

## Out of Scope

- `bump-up` / `bump-down` pieces (bump-down dips 0.5 below the meadow mat)
- Elevated corners / corner-ramps; half-height cruise variant
- Visual merging of hills with tunnels or other hills
- Hill sounds (chug strain, crest dings)
- Terrain elevation semantics (scenery under viaducts, elevated ghost
  rules)
- Any bridge/tunnel behavior change (they stay single-height at grade)
