# Spec — Track Switches & Branches

**Track ID:** `switches-branches_20260903` · **Type:** Feature · **Branch:** `track/switches-branches_20260903`

## Overview

The meadow's tracks can now split. A new **switch** piece — a Y-junction
with a straight-through road and a curved diverging branch — lets kids
build two loops sharing one junction, spur lines into dead ends, and
switch-after-switch chains. Each train takes a different branch every
time it passes through the switch from the stem, and the switch's **point
blades visibly flip** to the chosen road — cause and effect, right on the
rails. Everything the ride world already does composes unchanged: closed
layouts loop, dead ends shuttle back, one train per connected track.

## Functional Requirements

**FR1 — One switch piece type.** `switch` joins the piece catalog. One
cell, three endpoints — at yaw 0: stem on the **south** edge,
straight-through branch on **north**, diverging branch on **east**
(diverges to the right of the through-road) — 90° rotatable, normal
speed, dry land only (ghost red over water), placeable/liftable/
trashable, in the Rails tab, counts against the 64-piece cap.

**FR2 — Switch semantics (pure core).** Riding rules, fully
deterministic:

- Entering from the **stem** → the train exits through a branch chosen by
  the switch's **alternation counter**: first pass takes the straight
  branch, next pass the diverging branch, and so on. One counter per
  placed switch, session-only.
- Entering from **either branch** → exits through the **stem** (merge —
  no choice, no counter).
- Reverse riding (shuttling) follows the same entry-based rules; a
  reverse pass through the switch only advances the counter when it
  enters from the stem.

**FR3 — Solver handles Y topologies.** The ride-path solver generalizes
from its current single-path walk so every Y topology yields one
continuous, periodic ride that covers **both** branches: two loops
sharing a switch are ridden as alternating laps; a branch into a dead end
rides out and shuttles back through the switch; chained switches
compose. Closed components still loop forever; open ones still shuttle;
one train per component, ranking and the 4-train cap unchanged. The
solver never fails, stays deterministic, and stays in pure `src/core`.

**FR4 — Smooth ride through the branch.** Within the switch cell the
train rides the geometry of its chosen branch: straight through, or the
curved diverging road — no pause, no slowdown at the points. Wagons (and
crates) follow the engine through either branch with today's spacing.

**FR5 — Animated point blades.** The switch's moving blades visibly flip
to the chosen branch when the route alternates (a short tween; instant
snap under `prefers-reduced-motion`). Event-driven — no per-frame cost
outside the tween. The ride layer tells the scene which branch is set;
the renderer animates the named blade node.

**FR6 — Kit-grade Blender asset.** A deterministic, checked-in recipe
(`scripts/blender-switch.py`) authors the switch on kit measurements
(4-unit module, rails meet neighbours flush, kit straight's warped
rails/sleepers as the through-road, curved diverging road), with a named
blade node for FR5. Exported GLB precached like every piece (target
≤ ~60 KB).

**FR7 — Drawer & labels.** Rails tab entry with a hand-drawn SVG icon and
a parent-facing label ("Switch track piece"), in the established style.

**FR8 — Saves stay whole.** Additive type string only: no snapshot
version bump, no migration; pre-switch worlds load exactly as they were;
a world with switches round-trips. Blade positions and alternation
counters are session-only, never saved.

## Non-Functional Requirements

- New logic (semantics, solver generalization, route periodicity) lives in
  `src/core/` — pure, TDD'd, >80% coverage on new logic; zero scene
  coupling.
- Ride-motion changes keep zero per-frame allocations; blade animation is
  tweened, event-driven.
- One new GLB download, precached; nothing loads from the network at
  runtime.
- Kid UX per `product-guidelines.md`: no fail states — every Y topology
  rides, dead ends included; ghost feedback unchanged.
- 60 FPS preserved; no quality-tier changes.

## Acceptance Criteria

1. The switch drags from the Rails tab, snaps on land, ghost red over
   water, lifts/trashes like track.
2. A train through a two-loop Y layout rides one loop, then the other,
   alternating — both branches ridden, wheels on rails through stem and
   both branches.
3. The blades visibly flip when the branch alternates; instant under
   reduced motion.
4. A branch into a dead end rides out and shuttles back through the
   switch without popping.
5. Chained switches ride correctly; multi-train layouts with switches
   stay in step; wagons/crates follow through branches.
6. Old saved worlds restore unchanged; a world with switches restores
   with switches.
7. `pnpm check` + Playwright green (new switch e2e: place a Y layout,
   ride, assert both branches ridden, reload restores, zero external
   requests, clean console, tablet + phone); manual tablet check passes.

## Out of Scope

- **Left-hand mirror switch** (any left-Y layout can be mirrored;
  rotations cover all four orientations of the right-hand piece)
- Motorized/lever-operated switching (no toddler control over the points
  — trains alternate on their own)
- Double-slips, three-way junctions, crossings-with-curves
- Switch sounds (clack/points thunk)
- Switches combined with elevation pieces (a switch on a hill run) —
  both systems compose at joints, but switch geometry stays at grade this
  track
