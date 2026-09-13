# Spec — Switchyard: Three-Way Junction & Motorized Levers

**Track ID:** `switchyard_20260913` · **Type:** Feature · **Branch:** `track/switchyard_20260913`

## Overview

The meadow's rails can split right, and they can split left — now they split **both ways at once**. A new **`switch-3way`** piece lands in the Rails tab: one stem, three roads (straight, and one diverging to each side), cycling fairly so every road gets equal turns. It composes with everything: loops sharing a stem ride as alternating laps, spurs shuttle, chains with the Y switches work untouched. And closing the roadmap's "motorized levers" item, **every switch piece gains a chunky trackside lever** whose arm swings to the road the points are set for — flipped by the train itself, pure cause-and-effect scenery, never a control.

## Functional Requirements

**FR1 — One new piece type `switch-3way`.** Joins `src/core/pieces.ts` as a one-cell piece with four open ends: at yaw 0 the **stem is on south**, exits on **north** (straight), **east** (right), **west** (left). 90° rotatable, dry land only (ghost red over water), placeable/liftable/trashable, counts against the 64-piece cap, renders through the standard piece pipeline (model URL + mount anchor), and gets its own entry + hand-drawn SVG icon in the **Rails** tab (adventure mapping; aria label "Three-way switch track piece").

**FR2 — Routing semantics (pure core).** `switches.ts` extends its entry-based rules to the new type:

- Entering from the **stem** → exits by a **three-state rotation counter**: pass 0 straight (north), pass 1 right (east), pass 2 left (west), repeat — first pass always straight.
- Entering from **any branch** → merges straight through the stem; the counter does not move.
- Reverse shuttling follows the same entry-based rules; only stem passes advance the counter; it folds to 0|1|2 and is session-only, never serialized (fresh at 0 on load — same precedent as the Y switches).
- The two Y switches' routing stays byte-for-byte unchanged (existing truth tables stay green).

**FR3 — Solver handles three-road junctions.** `pathing.ts`'s live-counter simulation extends to the 3-way: periodic cycles cover all three roads (e.g., loops returning to different branches alternate laps), spurs ride out and shuttle, 3-way + Y chains compose, results are order-independent, and the solver never fails (frozen straight-through fallback past the step cap unchanged).

**FR4 — Smooth ride through the chosen road.** Straight rides straight; side roads ride the same corner-small quarter arc the Y switches share — no pause, no slowdown at the points; wagons and crates follow with today's spacing. The ride layer signals the scene through the existing `onSwitchRoad` seam.

**FR5 — Motorized levers on all three switch pieces.** New named node contract **`switch_lever`** joins `switch_blades` on every switch GLB (right Y, mirror Y, 3-way):

- One chunky trackside lever per piece whose **arm points at the set road**: 2 poses on the Y switches (through/diverge), 3 on the 3-way (north/east/west). Authored so its swing is a pure local-Y rotation after export (the blades precedent), so the renderer's existing `rotation.y` tween path applies.
- Blades and lever flip **together in one shared event-driven tween** (~180 ms ease-out, matching today), instant snap under `prefers-reduced-motion`, no per-frame cost outside the tween.
- **Automatic only** — no gesture, no toddler control over the points; branch→stem merges keep the last set road; a missing lever node fails soft (blades still animate), exactly as missing blade nodes are tolerated today.

**FR6 — Kit-grade Blender assets.** Deterministic, checked-in recipes: new `scripts/blender-switch-3way.py` (kit straight unmoved + one corner-small arc flipped into each quarter-arc — east like `blender-switch.py`, west like `blender-switch-mirror.py` — plus `switch_blades` tips 0/−0.21/+0.21 and the lever); `blender-switch.py` and `blender-switch-mirror.py` re-cut with the same lever contract (blades/through geometry unchanged). All three: z-up authoring, `export_yup=True`, verified renders, the `verify-glb.py` gate (skill-bundled), ≤ ~150 KB each, named double-sided Principled materials.

**FR7 — Persistence & world integration.** Placed 3-ways serialize like every piece (type/rotation/cell) and restore exactly; undo/trash/ghost preview work; autosave unchanged. No counter or lever state is ever persisted.

**FR8 — Docs reflect completion.** `product.md` roadmap: motorized levers ✅ and 3-way ✅; the remaining named item becomes double-slip. `tech-stack.md`: new recipe listed, `switch_lever` contract documented. CHANGELOG Unreleased note.

## Non-Functional Requirements

- 60 FPS unchanged; no per-frame allocations; tweens only on route events.
- Logic coverage >80% on touched modules (`switches`, `pathing`); TDD first.
- Zero console errors; zero external requests; no new dependencies.
- Icon-only UI (no reading required); labels aria-only.
- Assets ≤ ~150 KB each; recipes re-runnable deterministically.

## Acceptance Criteria

- Unit truth tables: 3-way routing across all 4 rotations — stem cycle 0/1/2, branch merges, counter fold; Y switches unchanged.
- Solver specs: three-road cycles, spurs shuttling, 3-way + Y chains, order-independence.
- Save/load round-trips a 3-way; counters start fresh after restore.
- e2e `switch-3way.spec.ts` on tablet + phone: place, connect, ride, watch blades + lever flip; reduced-motion snap; `switches.spec.ts` and `switch-mirror.spec.ts` stay green.
- `verify-glb.py` passes on all three GLBs; renders inspected; node contracts present.
- Manual tablet: Toddler Test — kid watches the rotation with no reading, no dead ends, 60 FPS spot check.

## Out of Scope

- Double-slip pieces (remain on the roadmap).
- Tappable/pre-set points, any toddler control, lever sound effects.
- Starter-layout changes (discoverability via the Rails tab).
- Snow-cap variants for switches (hills-only feature).
- Wagon, fleet, audio, and camera systems untouched.

## Decisions Log

- User picks (switchyard survey, 2026-09-13): **3-way only** (double-slip deferred), **levers on all switch pieces**, **one lever per piece pointing at the set road**, **automatic only**, **no starter changes**.
- Branch `track/switchyard_20260913` cut from clean `main`; track artifacts to be committed on it.
