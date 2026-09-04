# Spec — Mirror Switch (Left-Hand Y)

**Track ID:** `mirror-switch_20260904` · **Type:** Feature · **Branch:** `track/mirror-switch_20260904`

## Overview

The meadow's tracks can split right — now they split left too. A new
**switch-mirror** piece mirrors the shipped right-hand Y-junction
(`switch`: stem S / through N / diverging E) as a left-hand Y (stem S /
through N / diverging W at yaw 0), unlocking symmetric junctions:
double loops sharing one stem, mirrored spurs into dead ends, and
chained mirror/right switches. Each train alternates branches every
stem pass exactly like the existing switch, and the mirror's point
blades visibly flip to the chosen road. Everything the ride world
already does composes unchanged: closed layouts loop, dead ends
shuttle back, one train per connected track, 4-train cap unchanged.

## Functional Requirements

**FR1 — One mirror piece type.** `switch-mirror` joins the piece
catalog. One cell, three endpoints — at yaw 0: stem on the **south**
edge, straight-through branch on **north**, diverging branch on
**west** (diverges to the left of the through-road) — 90° rotatable,
normal speed, dry land only (ghost red over water),
placeable/liftable/trashable, in the Rails tab as a **separate entry**
with its own mirrored hand-drawn SVG icon, counts against the 64-piece
cap.

**FR2 — Mirror semantics (pure core).** Same deterministic rules as the
shipped switch, applied to mirrored geometry:

- Entering from the **stem** → exits through a branch chosen by the
  mirror's **alternation counter**: first pass straight, next pass
  diverging, and so on. One counter per placed mirror, session-only.
- Entering from **either branch** → exits through the **stem** (merge).
- Reverse riding (shuttling) follows the same entry-based rules; a
  reverse pass only advances the counter when entering from the stem.

**FR3 — Solver handles mirrored Y topologies.** The ride-path solver
covers mirrored Y exactly like right-hand Y: two loops sharing a
mirror ride as alternating laps; a mirrored branch into a dead end
rides out and shuttles back; chained mirror/right switches compose.
Closed components loop forever; open ones shuttle; one train per
component, ranking and 4-train cap unchanged. Solver never fails,
stays deterministic, stays in pure `src/core`.

**FR4 — Smooth ride through the mirror branch.** Within the mirror cell
the train rides the geometry of its chosen branch (straight or curved
left leg) — no pause, no slowdown at the points. Wagons (and crates)
follow the engine through either branch with today's spacing.

**FR5 — Animated point blades.** The mirror's moving blades visibly
flip to the chosen branch on alternation (short tween; instant snap
under `prefers-reduced-motion`). Event-driven — no per-frame cost
outside the tween. The ride layer tells the scene which branch is set;
the renderer animates the named blade node.

**FR6 — Kit-grade Blender asset.** A deterministic, checked-in recipe
(mirror of `scripts/blender-switch.py`, e.g.
`scripts/blender-switch-mirror.py`) authors the left-hand Y on kit
measurements (4-unit module, rails meet neighbours flush, kit
straight's rails/sleepers as the through-road, mirrored curved
diverging road), with the same named blade node contract (`switch_blades`).
Exported GLB precached like every piece (target ≤ ~60 KB), verified via
GLB JSON chunk + render checks.

**FR7 — Drawer & labels.** Rails tab gains a second switch entry with a
mirrored hand-drawn SVG icon and a parent-facing label (e.g. "Left
switch track piece"), in the established style. Icon-only for kids; no
reading required.

**FR8 — Saves stay whole.** Additive type string only (`switch-mirror`):
no snapshot version bump, no migration; pre-mirror worlds load exactly
as they were; a world with mirrors round-trips. Blade positions and
alternation counters are session-only, never saved.

## Non-Functional Requirements

- New logic (mirror endpoints, routing handedness, solver coverage)
  lives in `src/core/` — pure, TDD'd, >80% coverage on new logic; zero
  scene coupling.
- Ride-motion changes keep zero per-frame allocations; blade animation
  is tweened, event-driven.
- One new GLB download, precached; nothing loads from the network at
  runtime.
- Kid UX per `product-guidelines.md`: no fail states — every mirrored Y
  topology rides, dead ends included; ghost feedback unchanged.
- 60 FPS preserved; no quality-tier changes.

## Acceptance Criteria

1. The mirror drags from the Rails tab, snaps on land, ghosts red over
   water, lifts/trashes like track.
2. A symmetric double-loop mirror layout rides one loop, then the other,
   alternating — both branches ridden, wheels on rails through stem and
   both branches.
3. The blades visibly flip when the branch alternates; instant under
   reduced motion.
4. A mirrored branch into a dead end rides out and shuttles back without
   popping.
5. Chained mirror/right switches ride correctly; multi-train layouts with
   mirrors stay in step; wagons/crates follow through branches.
6. Old saved worlds restore unchanged; a world with mirrors restores
   with mirrors.
7. `pnpm check` + Playwright green (new mirror e2e: place a mirrored
   double-loop, ride, assert both branches ridden, reload restores, zero
   external requests, clean console, tablet + phone); manual tablet
   check passes.

## Out of Scope

- Motorized/lever-operated switching (no toddler control over the
  points — trains alternate on their own)
- Double-slips, three-way junctions, crossings-with-curves
- Switch sounds (clack/points thunk)
- Switches combined with elevation pieces (a mirror on a hill run) —
  both systems compose at joints, but mirror geometry stays at grade
  this track
