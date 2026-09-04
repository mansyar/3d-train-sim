# Spec — Wagon Workshop (DRAFT)

**Track ID:** `wagon-workshop_20260904` · **Type:** Feature · **Branch:** `track/wagon-workshop_20260904`

> DRAFT — created with the branch so work has a home. To be refined
> through interactive spec questions before implementation. Do not
> implement from this draft alone.

## Overview

Today every locomotive (`steam`, `diesel`, `tram` in `src/core/trains.ts`)
pulls the same two bundled wagons (lead `train-carriage-lumber` + rear
`train-carriage-box` per `src/core/wagons.ts:19-22`) through the same
cargo loop (`src/core/cargo.ts`: load crates at first station, confetti
deliver at next, up to 8 crates on the platform). The Kenney kit
already ships ~20 unused wagon/train GLBs in `public/assets/train-kit/`
(coal, tank, lumber, flatbed, container-red/green/blue, dirt, wood…)
that never reach the meadow.

Wagon Workshop gives kids an icon-only way to dress their freight:
pick wagon looks per train (or globally) from the train drawer, ride
with the chosen consist, keep today's cargo gameplay untouched. No
reading, no fail states, no new controls while riding.

## Context & Evidence

- `src/core/wagons.ts` — consist is fixed; wagon kinds are pure core
  (good TDD seam).
- `src/scene/load-wagons.ts` — loads the two wagon GLBs, follows the
  engine through switches/tunnels/hills via `ride-motion.ts`.
- `src/ui/app.ts` train drawer (`TRAIN_KINDS`, `trainAria/trainIcon`) —
  natural home for a wagon picker; mid-ride drawers hide (`riding`
  guard) so picks happen while building.
- `src/core/save.ts` (`SNAPSHOT_VERSION=3`) + `src/state/persistence.ts`
  — wagon choice must persist and round-trip; additive field only, no
  version bump if possible; pre-workshop worlds load with today's
  lumber+box default.
- `product.md:54,57` roadmap explicitly lists "wagon colors/other
  variants still roadmap" — this track closes it.
- Guidelines: icon-only UI, ≥64px targets, instant <100ms feedback with
  pop+ding, mute-respecting, nothing leaves the device, 60 FPS.

## Open Questions (for spec refinement)

1. Scope of choice: per-train consist (each of the 3 locos remembers its
   own wagons) vs. one global wagon set for all trains? (Recommend:
   per-train — celebrates "MY train".)
2. Picker shape: wagon pair presets (e.g. coal+tensor, container duo)
   vs. independent lead/rear slots? (Recommend: 4–6 curated pair
   presets — fewer taps, no invalid combos.)
3. Which kit GLBs make the cut (poly/size/look on tablet)? Need a
   measured shortlist + precache + PWA weight check (6MB
   `maximumFileSizeToCacheInBytes` cap in mind).
4. Does wagon choice affect cargo crates (crate look/stacking in
   `station_crate_1..8` nodes) or stay purely cosmetic?

## Functional Requirements (proposed)

- **FR1 — Curated wagon presets.** 4–6 icon-only presets join the train
  drawer (chunky hand-drawn SVG icons, parent-facing labels, no
  kid-facing text). One tap applies with pop+ding (<100ms).
- **FR2 — Pure core consist model.** Wagon choice lives in
  `src/core/` (TDD, >80% coverage), session + persisted; pre-workshop
  saves default to today's lumber+box.
- **FR3 — Ride unchanged.** Chosen wagons follow the engine through
  straights, curves, crossings, bridges, tunnels, hills, switches
  (incl. mirror) with today's spacing; cargo load/deliver/confetti/8-
  crate platform behavior identical.
- **FR4 — Saves stay whole.** Additive field only; old worlds load
  exactly; workshop worlds round-trip; wagon choice survives reload.
- **FR5 — Drawer & guidelines.** Picks only while building (hidden
  mid-ride like today); ≥64px targets; reduced-motion safe (no
  camera/particle changes); mute-respecting (ding only if sound on).

## Non-Functional Requirements (proposed)

- New logic in `src/core/` — pure, TDD'd, >80% coverage; zero scene
  coupling.
- No per-frame allocations in ride changes; precached GLBs only, no
  runtime network; 60 FPS preserved; cold load <5s.
- Kid UX per `product-guidelines.md`: no fail states — every preset
  rides every topology including dead ends.

## Acceptance Criteria (proposed)

1. Kid picks a preset from the train drawer; wagons swap with pop+ding.
2. Press ▶ — chosen consist rides a loop, a dead-end shuttle, a tunnel,
   a hill run, and a switch branch with wheels on rails, no popping.
3. Cargo still loads at the first station and confetti-delivers at the
   next; platform keeps up to 8 crates.
4. Reload restores the chosen consist; pre-workshop saves open as
   lumber+box.
5. `pnpm check` + Playwright green (new workshop e2e: pick preset, ride,
   assert consist, reload restores, zero external requests, clean
   console, tablet + phone).

## Out of Scope (proposed)

- New locomotives (the ~20 unused engines stay parked; wagons only).
- Per-wagon colors beyond curated presets; custom painters.
- Wagon physics, capacities, or gameplay effects (purely cosmetic).
- Loco-specific whistle samples; crossing/bridge sounds (separate
  soundscape track).
- Motorized/levever switching; elevation-combined wagon geometry.
