# Spec — Tunnels

**Track ID:** `tunnels_20260831` · **Type:** Feature · **Branch:** `track/tunnels`

## Overview

The meadow gains a **tunnel**: a chunky grassy dome with a rounded arch the
train rides through. Kids drag it from the toybox like any track piece; it
snaps on dry land only (the river stays open — that's what bridges are for).
The train disappears into the hill and pops out the far side — the classic
Brio-tunnel anticipation moment. Adjacent tunnels merge into **continuous
long tunnels** with portals only at the run's ends.

## Functional Requirements

**FR1 — Tunnel piece type.** A new `tunnel` entry in the piece catalog. It
rides exactly like the straight it mirrors: endpoints north/south (rotatable
in 90° steps), normal speed, normal ride path. Terrain rule: dry land only
(ghosts red over water, like every non-bridge piece). Counts against the
64-piece cap. Placeable/liftable/trashable like any track piece; appears in
the toybox drawer.

**FR2 — Continuous tunnels.** Tunnels connected end-to-end form one
continuous hill: portal arches render only at the two ends of a tunnel
*run*, inner boundaries stay wall-less. A pure core function computes run
boundaries from the placed pieces (which portal faces another tunnel vs.
open air). Any ride path through a tunnel run — loop, shuttle, either
direction — works with no pathing changes.

**FR3 — Hidden train.** While the engine is inside a tunnel cell, it is not
visible; it reappears at the far portal. Wagons occlude on the same rule as
each enters/leaves the run. No new ride-camera behavior (the dome itself
occludes the follow view).

**FR4 — Blender-authored asset.** A single GLB at
`public/assets/train-kit/tunnel.glb`, original work (no attribution
burden), loaded via the existing GLTFLoader. Named nodes: dome body,
entry/exit portal arches (separately toggleable for FR2 merging), and a
snow-cap mesh. Mount measured against the straight kit's rail height/track
width per the trestle-bridge convention so rails meet neighbours flush.

**FR5 — Whistle echo inside.** While inside a tunnel run, the chug loop is
gently ducked and a whistle triggered inside gains a soft echo (short
delay/feedback). Reuses the ride-audio module; respects mute instantly; no
new audio files downloaded (synthesized tail).

**FR6 — Snow cap in winter.** When snow falls, the snow-cap node becomes
visible, in the same winter language as the river freezing; it hides when
the snow clears.

**FR7 — Headlight at the portals at night.** At night, the headlight's glow
catches the portals as the train enters/exits — a warm flash keyed to the
existing night factor and portal proximity. Purely visual.

**FR8 — Saves stay whole.** The piece type is additive: no snapshot version
bump, no migration; pre-tunnel worlds load exactly as they were (v1 and
v2). A v2 snapshot containing tunnels round-trips.

## Non-Functional Requirements

- Core logic (run boundaries, inside-tunnel detection) lives in `src/core/`
  — pure, no three.js, TDD'd, >80% coverage on new logic.
- No per-frame allocations in the render loop; portal/snow toggling is
  event-driven, not per-frame.
- GLB stays small (target < ~150 KB); nothing loads from the network at
  runtime.
- Kid UX per `product-guidelines.md`: drag/tap only, ghost feedback, no fail
  state (a lone tunnel with open ends is just a hill the train rides through
  — same dead-end semantics as a straight).

## Acceptance Criteria

1. Tunnel drags from the toybox, snaps on land, ghosts red over water,
   lifts/trashes like track.
2. Train enters the dome, is hidden, exits visibly; a run of 2–3 adjacent
   tunnels stays hidden the whole way with portals only at the ends.
3. Whistle inside echoes, chug softens; mute silences instantly.
4. Winter shows the snow cap; clear weather removes it.
5. Night: portals catch the headlight glow as the train passes.
6. Old saved worlds restore unchanged; a world with tunnels restores with
   tunnels.
7. `pnpm check` + Playwright smoke green; manual tablet check passes.

## Out of Scope

- Elevation/sloped tunnels (flat grid only); curved tunnels (straight runs
  only in V1)
- Tunnel interior decoration, torches, windows
- New scenery kinds or a second tunnel visual variant
- Changes to river/bridge behavior
