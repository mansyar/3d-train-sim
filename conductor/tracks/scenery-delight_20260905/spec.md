# Spec — Scenery Delight: Three Animated Toys (`scenery-delight`)

## Overview
Add three original, high-delight, gently animated scenery toys to Tiny Tracks — a **Windmill**, a **Carousel**, and a **Hot-air Balloon** — authored as deterministic Blender recipes following the `threejs-blender-asset` pipeline, registered in the scenery catalog under the existing **town** drawer tab, each with a **snow cap** for the winter weather story and a **named-node contract** the scene animates.

## Functional Requirements

### F1 — Assets (one Blender recipe per toy, `scripts/`)
- `blender-windmill.py`, `blender-carousel.py`, `blender-balloon.py` — each independently re-runnable headless; z-up authoring; export by selection; `export_yup=True`; named Principled double-sided materials; each `build_* / render_checks / export_* / verify_glb` structured like existing recipes.
- **Node contracts (exactly once each, verified by `verify-glb.py --require`):**
  - Windmill: `windmill_sails` (spins), `windmill_snow_cap`
  - Carousel: `carousel_spin` (canopy + poles + **2–3 chunky horses** rotate as one group), `carousel_snow_cap`
  - Balloon: `balloon_basket` (whole flying assembly: envelope + basket — the node the scene moves), `balloon_snow_cap` (parented inside the assembly so it travels with it)
- **Budget:** each GLB ≤ 150 KB; chunky low-poly toy style.
- **Palettes:** author-chosen toy palettes (windmill: warm red/cream; carousel: candy stripes; balloon: bright primary panels); style gate = side-by-side headless renders against accepted pieces (station/tunnel), silhouette/scale/readability rubric — no pixel gating.
- **Fit checks:** clearance verified against train ride scale (×1.6) — a wagon passing the windmill/carousel base never clips; balloon envelope clears wagon cab height when landed.

### F2 — Catalog registration (`src/core/scenery.ts`, pure + unit-tested)
- New kinds `windmill`, `carousel`, `balloon` in `SCENERY_KINDS`, category `town`, with scale/lift and aria labels; appear in the existing **town** tab of the drawer. Placements persist via the existing scenery autosave (no new persistence code).

### F3 — Motion (`src/core` logic + `src/scene` appliers)
- Windmill sails: constant gentle spin (~0.5 rev/s). Carousel: slower turn (~0.25 rev/s).
- Balloon wander: pure state machine `src/core/balloon-wander.ts` — placable toy; the assembly **lifts off, drifts randomly within a ~2–3 cell radius of its grounded base, lands to rest, takes off again**, with smooth altitude easing. Injected RNG, deterministic in tests.
- Scene appliers: cheap transforms only — no per-frame allocations; 60 FPS on mid tablets.
- **Reduced-motion:** all three toys freeze (same handling as steam/confetti).

### F4 — Winter story
- Snow caps hidden at load; toggled by the shared frozen-weather gate (pattern of `setTunnelSnow`/`setHillSnow`/`setCrossingSnow`) so the toys whiten consistently with the world.

### F5 — Verification gates
- Recipe gates: headless renders viewed as PNGs; `verify-glb.py --require <contract nodes>` per toy.
- `tsc --noEmit`, `biome check .`, `CI=true pnpm test` clean; >80% coverage on new `src/core` modules (`balloon-wander.ts`, scenery data additions).
- E2E smoke: place each toy via `__tinyTracksWorld`, toggle winter (snow caps appear), balloon visibly airborne over time, no console errors.

## Non-Functional Requirements
- Toddler Test: toys are instant fun with zero reading; placement = instant feedback; no fail states.
- Privacy: nothing new leaves the device. Performance: 60 FPS guardrails respected; quality applier unaffected (motion is transform-only).
- Balloon wander state is **ephemeral** — not persisted; a reload simply restarts the wander.

## Acceptance Criteria
1. Three GLBs pass all recipe gates and are registered in `SCENERY_URLS`; each ≤ 150 KB with contract nodes present exactly once.
2. Drawer (town tab) offers the three toys with labels; placing works by drag like existing scenery and persists across reload.
3. Windmill and carousel visibly, gently turn; balloon periodically flies, wanders ≤ ~3 cells, and lands.
4. With winter on, all three show snow caps; with reduced-motion on, all motion pauses.
5. All CI gates green; e2e smoke passes.

## Out of Scope
- Palette audit / re-tinting of existing kit assets; new scenery variants (trees, etc.); new drawer tab; balloon drifting beyond its radius or ambient (unplacable) behavior; fixing `blender-crossing-gate.py` REPO path or PATH tooling (environment prerequisite only); new audio.

## Decisions Log
- 2026-09-05: Type confirmed **Feature**. Assets chosen: windmill, carousel, hot-air balloon (windmill/carousel/balloon over lighthouse/market stall).
- 2026-09-05: Snow caps **yes**; drawer placement = existing **town** tab.
- 2026-09-05: Three separate recipes (one per toy, matches existing `scripts/blender-*.py` convention).
- 2026-09-05: Balloon is placable with a wander state machine (landed ⇄ flying around its base, ~2–3 cell radius) — not ambient.
- 2026-09-05: Motion respects reduced-motion. Author-chosen toy palettes (no palette measurement pass). Carousel includes horses. Strict scope: 3 toys only, no riders.
