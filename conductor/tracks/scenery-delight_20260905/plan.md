# Plan — Scenery Delight: Three Animated Toys

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, scene wiring) are verified via render/verify
> gates, Playwright smoke, and manual verification.

## Phase 1 — Pure logic (TDD, `src/core`)

- [x] Task: Extend scenery catalog (a8bedb6)
  - Expected behavior: kinds `windmill`/`carousel`/`balloon` join `SCENERY_KINDS`, categorized `town`, served from `/assets/train-kit/<kind>.glb`, scaled to toy proportions, lifted off the mat, aria-labeled, voiceless.
  - Notes:
    - TDD: added failing tests to `src/core/scenery.test.ts` first (catalog count 12, town grouping, train-kit URLs) — confirmed 3 failures, then implemented.
    - Changes: `src/core/scenery.ts` (kinds/URLs/categories/scales/lifts/aria; doc comment now mentions delight toys), `src/core/drawer.ts` (TAB_FOR_KIND town entries), `src/ui/app.ts` (three chunky inline SVG drawer icons in the established 48×48 `var(--toy-*)` style), plus expectation updates in `scenery.test.ts` and `drawer.test.ts` (town tab order).
    - Why: catalog is the single source of truth — drawer, renderer, and world store all read from it; adding kinds here is the pure-data foundation before any GLB exists.
    - Scales chosen: windmill 1.1 (landmark), carousel 1, balloon 0.9; lifts 0.02.
  - [ ] Write failing unit tests for new kinds `windmill`/`carousel`/`balloon` in `src/core/scenery.ts` (present in `SCENERY_KINDS`, category `town`, scale/lift entries, aria labels, URLs)
  - [ ] Implement catalog additions in `src/core/scenery.ts`
  - [ ] Verify: tests green, `tsc --noEmit` clean, coverage >80% on changed module
- [x] Task: Balloon wander state machine (de61f7d)
  - Expected behavior: `createBalloonWanderer` in `src/core/balloon-wander.ts` — pure module, injected RNG; starts landed at base; takes off, cruises ≤ maxHeight, drifts within `radius` (default 2.5 cells), lands periodically; deterministic for a given RNG.
  - Notes:
    - TDD: wrote `src/core/balloon-wander.test.ts` first (7 tests with mulberry32 seeded PRNG, dt=1/30, 600 s simulations) — confirmed red at missing module, then implemented.
    - Design: phase machine `rest → rise → drift → descend → rest` with smoothstep altitude easing (CLIMB_SECONDS=3), jittered rest (5 s) and flight (10 s) timers, drift target sampled inside `radius` via sqrt-uniform disc pick, cruise altitude 60–100% of `maxHeight` (default 1.6). Poses are plain `{x, z, altitude, flying}` in cells; scene applies transforms.
    - Tests: starts landed at (0,0,0); takes off and cruises; altitude clamped [0, maxHeight]; drift ≤ radius; ≥5 takeoffs & landings per 600 s; no jump >0.25 cells/frame; seed-deterministic over 1000 steps.
    - Verify: 7/7 green, `tsc --noEmit` clean, coverage 100% stmts / 96.55% branch on `balloon-wander.ts`.
  - [x] Write failing unit tests for `src/core/balloon-wander.ts`: drift stays within ~2–3 cell radius, altitude easing bounds, lands periodically, deterministic with injected RNG, landed ⇄ flying transitions
  - [x] Implement `src/core/balloon-wander.ts` (pure, injected RNG)
  - [x] Verify: tests green, `tsc --noEmit` clean, coverage >80%
- [x] Task: Phase Verification & Checkpoint (refer to workflow.md)
  - Notes:
    - Files changed since previous checkpoint (base 1c0cb14): `src/core/scenery.ts`, `src/core/scenery.test.ts`, `src/core/drawer.ts`, `src/core/drawer.test.ts`, `src/ui/app.ts`, `src/core/balloon-wander.ts`, `src/core/balloon-wander.test.ts` (+ plan/registry docs).
    - Logic-bearing files all TDD-covered: scenery catalog additions (tests updated first, red → green), balloon-wander (7 tests, red → green). No missing tests.
    - Gates: full suite `38 files / 665 tests` green via `CI=true pnpm test -- --coverage`; `tsc --noEmit` clean; coverage on new core modules 100% stmts (balloon-wander 96.55% branch) — above the 80% bar.
  - Verification Report:
    - Automated: `CI=true pnpm test -- --coverage` → all green; `tsc --noEmit` → clean; biome → clean (Task 1).
    - Proposed manual verification (Phase 1 touches only data/logic — nothing renders yet):
      1. `pnpm dev` → open the app → open the toybox drawer → **Town tab**: three new buttons appear after station, in order windmill → carousel → hot-air balloon, each with its chunky SVG icon.
      2. Hover/tab-focus each new button → aria labels read "Windmill", "Carousel", "Hot-air balloon" (icon-only UI, no new text).
      3. Expected (not a bug): placing any of the three shows no model yet — the GLBs are authored in Phase 2.
  - [checkpoint: e8ff4bc]

## Phase 2 — Blender authoring (non-logic; render/verify gated)

**Gate 1.1 — Measurement table (mount: meadow mat, scenery cells are track-free; occupant = locomotive standing beside, ride ×1.6):**

| Quantity | Value | Source |
|---|---|---|
| Authored unit | 1 unit ≈ 1 meadow cell (scenery template convention) | tech-stack § authoring; `SCENERY_SCALES` multipliers |
| Mat top (authored) | z = −1.0; toys rest on it | kit convention (switch/station recipes: `GROUND_Z`) |
| Rail crown (context) | ~0.18 above mat (z ≈ −0.82) | tech-stack rule 2 |
| Occupant bounding box | locomotive ≈ 2.3 wide × 2.7 tall at ride ×1.6 asset units | tech-stack rule 3 |
| Windmill footprint | 1 cell; tower base Ø ≤ 0.85; total ~2.4 tall × scale 1.1 ≈ 2.6 world — chunky landmark, taller than house (1.0) | spec F1 |
| Carousel footprint | 1 cell; platform Ø 1.1, canopy Ø 1.35, total ~1.35 tall × scale 1.0 | spec F1 |
| Balloon footprint | 1 cell; basket 0.3 wide, envelope Ø 0.95; landed total ~1.5 tall × scale 0.9; flies ≤ maxHeight 1.6 cells above base (scene) | spec F3 |
| Clearance rationale | scenery cells never carry rail (one-toy-per-cell placement); no bore to clear — fit check = locomotive parked beside each toy at ×1.6, reading scale + no visual clipping | Phase 1 measurement |

**Node-name contracts (greppable, exactly once in each GLB):** `windmill_sails`, `windmill_snow_cap`, `carousel_spin`, `carousel_snow_cap`, `balloon_basket`, `balloon_snow_cap`. Palettes (author-chosen, warm toy range, accepted on the windmill): cream (0.95, 0.86, 0.68), toy red (0.78, 0.18, 0.10), orange (1.0, 0.62, 0.11), warm brown (0.42, 0.26, 0.15), steel (0.55, 0.60, 0.68), snow (0.94, 0.96, 0.93). Render env: `view_transform = "Standard"`, sun 2.0 (matches app tone response; accepted on windmill).

- [x] Task: Windmill (470e6a3)
  - Notes:
    - Recipe `scripts/blender-windmill.py`: cream tapered tower (r0 0.5 → r1 0.36, h 1.9) + red cap + red 4-blade sails on named `windmill_sails` empty (blades sweep the vertical plane; scene spins about local +y), door/window dressing, `windmill_snow_cap` blanket cone. REPO derived from `__file__`.
    - Fix loop (3 attempts): (1) blade bmesh used wrong extents → slabs instead of blades, also spin axis corrected from +z to horizontal hub +y; (2) snow cap floated → now blankets the cap cone; (3) renders washed out → `view_transform = "Standard"` (AgX desaturates; app uses NeutralToneMapping) + sun 2.0 + deeper albedo. Palette re-rendered faithful to albedo; user accepted style (Layer 3).
    - Gates: renders viewed (top/quarter/fit-with-loco-at-×1.6/winter); `verify-glb.py` PASS — 20.0 KB, Y-up extents ok, 10 nodes, `windmill_sails` + `windmill_snow_cap` exactly once.
  - [x] Recipe `scripts/blender-windmill.py` (build/render_checks/export/verify structure, z-up, named Principled double-sided materials)
  - [x] Headless renders viewed as PNGs; side-by-side style check vs accepted pieces
  - [x] Fit render: ride-scale wagon clears windmill base (×1.6 clearance)
  - [x] `verify-glb.py --require windmill_sails --require windmill_snow_cap` passes; GLB ≤150 KB; exported to `public/assets/train-kit/`

- [x] Task: Carousel (d47ac75)
  - Notes:
    - Recipe `scripts/blender-carousel.py` mirrors the accepted windmill structure (REPO from `__file__`, same accepted render env).
    - Design: cream base disc + red rim platform (Ø 1.1), steel column, `carousel_spin` empty at platform top carrying red canopy cone, orange knob, 6 steel poles, 3 chunky cream horses with orange saddles; `carousel_snow_cap` blankets the canopy.
    - Fix loop (2 attempts): (1) `_horse` signature/parenting slips fixed pre-run; (2) first render exposed Blender parenting semantics — children of the spin empty are positioned in PARENT-LOCAL space, so canopy/poles/horses/knob sank 0.88 into the ground; re-positioned children relative to `PLATFORM_TOP`.
    - Gates: renders (top/quarter/fit/winter) viewed; style gate passed (user accepted); `verify-glb.py` PASS — 133.4 KB (budget 150), Y-up extents plausible, 22 nodes / 5 materials, `carousel_spin` + `carousel_snow_cap` exactly once.
  - [x] Recipe `scripts/blender-carousel.py` (canopy + poles + 2–3 horses under `carousel_spin`)
  - [x] Headless renders + style check; fit render vs ride scale
  - [x] `verify-glb.py --require carousel_spin --require carousel_snow_cap` passes; GLB ≤150 KB; exported

- [x] Task: Hot-air balloon (bddfabb)
  - Notes:
    - Recipe `scripts/blender-balloon.py`: named empty `balloon_basket` at the ground anchor carrying the whole assembly (brown basket, 4 ropes, orange teardrop envelope scaled z 1.15, cream equator band, `balloon_snow_cap` hemisphere on the crown); scene drives wander transforms on the root, so its origin stays at ground centre.
    - Fix loop (3 attempts — loop cap reached, then resolved): (1) all renders blank — `to_track_quat("-Z","Y")` needs the LOOK direction (target − camera); (2) envelope rendered lemon-gold → deepened orange; fit shot still missing loco; (3) root cause: `_import_loco` left every imported object `hide_render = True`; unhide for the fit shot only.
    - Gates: renders (quarter/top/fit/winter) viewed; style gate passed (user accepted); `verify-glb.py` PASS — 57.2 KB (budget 150), Y-up extents plausible, 9 nodes / 4 materials, `balloon_basket` + `balloon_snow_cap` exactly once.
  - [x] Recipe `scripts/blender-balloon.py` (`balloon_basket` assembly; `balloon_snow_cap` inside the assembly)
  - [x] Headless renders + style check; landed envelope clears wagon cab height
  - [x] `verify-glb.py --require balloon_basket --require balloon_snow_cap` passes; GLB ≤150 KB; exported

- [~] Task: Phase Verification & Checkpoint (refer to workflow.md)
  - Notes:
    - Files changed since previous checkpoint (base 8666b90): `scripts/blender-windmill.py`, `scripts/blender-carousel.py`, `scripts/blender-balloon.py`, `public/assets/train-kit/windmill.glb`, `public/assets/train-kit/carousel.glb`, `public/assets/train-kit/balloon.glb` (+ plan docs).
    - No logic-bearing code in this phase — all three Blender recipes and GLBs; no unit tests required. Test suite still green.
    - Gates: all three GLBs pass `verify-glb.py` (20.0 / 133.4 / 57.2 KB, contract nodes exactly once, Y-up, no hygiene failures); every toy passed headless render inspection + user style acceptance; fit renders show the ×1.6 ride-scale locomotive clears each toy.
  - Verification Report:
    - Automated: `CI=true pnpm test` → 38 files / 664 tests green; `tsc --noEmit` clean (assets and recipes are outside the TS graph, sanity-checked anyway).
    - Proposed manual verification (asset-level; in-scene wiring lands in Phase 3):
      1. Open `public/assets/train-kit/windmill.glb`, `carousel.glb`, `balloon.glb` in any glTF viewer (or Blender import) — each loads, shows named nodes from its recipe contract, Y-up.
      2. Optional `pnpm dev` sanity check: drawer Town tab still shows the three toys; placing them still shows no model (expected until Phase 3 registers the URLs).
  - [checkpoint: bddfabb]

## Phase 3 — Scene wiring (non-logic; smoke verified)

- [ ] Task: Register GLBs & motion appliers
  - [ ] Register `windmill.glb`, `carousel.glb`, `balloon.glb` in the scenery loader path (URLs per kind from `SCENERY_URLS`)
  - [ ] Motion appliers: sail spin (~0.5 rev/s), carousel turn (~0.25 rev/s), balloon applier driving `balloon-wander` transforms per placed balloon
  - [ ] All motion respects reduced-motion; no per-frame allocations; dispose chain covers new objects
- [ ] Task: Winter wiring
  - [ ] Snow-cap nodes hidden at load; toggled by the shared frozen gate (pattern of `setTunnelSnow`/`setHillSnow`/`setCrossingSnow`)
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase 4 — E2E, gates & wrap-up

- [ ] Task: Playwright smoke
  - [ ] Place each toy via `__tinyTracksWorld`; toggle winter; assert balloon airborne over time; assert no console errors
- [ ] Task: Full quality gates + manual verification
  - [ ] `pnpm exec biome check . && pnpm exec tsc --noEmit && CI=true pnpm test` (coverage >80% on new `src/core` modules)
  - [ ] Manual tablet verification: place toys, watch motion, winter caps, reduced-motion freeze
- [ ] Task: Docs — note the three toys in `conductor/product.md` shipped list
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Notes
