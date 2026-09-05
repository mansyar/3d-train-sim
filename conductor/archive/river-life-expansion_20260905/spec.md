# Specification: River Life Expansion

**Track ID:** `river-life-expansion_20260905` · **Type:** Feature · **Branch:** `track/river-life-expansion_20260905`

## Overview

The meadow's river gains two new kinds of life: a **cargo barge** that drifts the S-curve day in, day out (passing under the trestle bridges), and **frogs on lily pads** — a new placeable critter scenery piece that hops and ribbits when a train passes. Purely additive ambience in the "living meadow" spirit: no new rules for the child, no fail states, no text. Builds on the proven duck (`scene/duck.ts`) and critter (`scene/critter-life.ts`) patterns.

## Functional Requirements

- **FR1 — Drifting barge.** A chunky toy barge (Blender-authored via a deterministic, checked-in recipe `scripts/blender-barge.py` → `barge.glb`, following the house rules in `tech-stack.md`) drifts along `riverDriftPath()` north ↔ south, ping-pong style, slower and steadier than the duck (~0.15 cells/s). It bobs gently on the swell, faces its travel direction, and passes **under** the trestle bridges without clipping (authored to the bridge clearance).
- **FR2 — Barge moods.** Same bedtime as the duck (`BEDTIME_NIGHT 0.6`): no drifting at night. At `FROZEN_SNOW 0.5` the river ices over and the barge sits motionless in the ice, freed again when the snow melts. The gentle bob never stops (consistent with the duck).
- **FR3 — Frog-on-lily-pad scenery piece.** New scenery kind **`frog`** (critter tab): a frog sitting on a lily pad, Blender-authored via `scripts/blender-frog.py` → `frog.glb`. Draggable, grid-snapping, trashable, ↩️-undoable through the existing scenery pipeline (`SCENERY_KINDS` in `src/core/scenery.ts`, drawer category `critter`, SVG icon in `ui/app.ts`).
- **FR4 — Frogs may float on water.** The frog is the **one scenery kind allowed on river cells** — the pad floats on the water (a level-tolerance so it reads as sitting in the water, not on it); on grass it sits as a pond-side pad. All other scenery stays land-only. Placement ghost coloring follows the same valid/invalid language as today.
- **FR5 — Reactive frogs.** Tracked by `critter-life.ts` like pig/sheep/pug: squash-and-stretch hop + ribbit voice chirp (mute-respecting) when a riding train passes within the critter radius; rain shrinks the hop radius; bedtime stills them; idle breathing keeps them alive before ▶.
- **FR6 — Additive saves.** Older saved railways open unchanged — no save-version bump; `save.ts` validation accepts the new kind via `SCENERY_KINDS` automatically. The barge is world ambience (like the duck) and is **not** serialized.

## Non-Functional Requirements

- 60 FPS target: all motion writes straight onto transforms — zero per-frame allocations (`duck.ts` / `critter-life.ts` discipline).
- `src/core` stays pure TypeScript (no three.js imports).
- New GLB assets precached by the PWA (offline-first); no runtime network fetches; privacy untouched.
- New unit tests for any logic-bearing additions (e.g., water-placement rule in core); scene motion covered by Playwright smoke + manual verification.
- Ribbit/barge audio is soft, mute-respecting, and follows the existing audio registry.

## Acceptance Criteria

1. A barge drifts the river continuously during the day, passing under a placed bridge without clipping.
2. At night the barge stops; in winter it sits frozen in the ice; both recover automatically with the day/weather cycle.
3. A frog-on-pad can be dragged from the critter tab onto water **and** grass, snaps, is undoable and trashable, and survives reload (autosave).
4. A passing train makes the frog hop with a ribbit (silenced when muted); critters keep their existing behavior.
5. Old saved worlds load unchanged; e2e + unit suites pass; manual tablet check passes (60 FPS).

## Out of Scope

- Barge ↔ train interactions (toots, cargo exchange) or a tappable barge.
- Frogs leaping into water / splash particles.
- Separate lily-pad pieces, multiple boats, river shape changes, or any new track pieces.
- Save format changes or migrations.
