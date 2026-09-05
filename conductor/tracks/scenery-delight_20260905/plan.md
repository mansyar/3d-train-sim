# Plan — Scenery Delight: Three Animated Toys

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, scene wiring) are verified via render/verify
> gates, Playwright smoke, and manual verification.

## Phase 1 — Pure logic (TDD, `src/core`)

- [ ] Task: Extend scenery catalog
  - [ ] Write failing unit tests for new kinds `windmill`/`carousel`/`balloon` in `src/core/scenery.ts` (present in `SCENERY_KINDS`, category `town`, scale/lift entries, aria labels, URLs)
  - [ ] Implement catalog additions in `src/core/scenery.ts`
  - [ ] Verify: tests green, `tsc --noEmit` clean, coverage >80% on changed module
- [ ] Task: Balloon wander state machine
  - [ ] Write failing unit tests for `src/core/balloon-wander.ts`: drift stays within ~2–3 cell radius, altitude easing bounds, lands periodically, deterministic with injected RNG, landed ⇄ flying transitions
  - [ ] Implement `src/core/balloon-wander.ts` (pure, injected RNG)
  - [ ] Verify: tests green, `tsc --noEmit` clean, coverage >80%
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase 2 — Blender authoring (non-logic; render/verify gated)

- [ ] Task: Windmill
  - [ ] Recipe `scripts/blender-windmill.py` (build/render_checks/export/verify structure, z-up, named Principled double-sided materials)
  - [ ] Headless renders viewed as PNGs; side-by-side style check vs accepted pieces
  - [ ] Fit render: ride-scale wagon clears windmill base (×1.6 clearance)
  - [ ] `verify-glb.py --require windmill_sails --require windmill_snow_cap` passes; GLB ≤150 KB; exported to `public/assets/train-kit/`
- [ ] Task: Carousel
  - [ ] Recipe `scripts/blender-carousel.py` (canopy + poles + 2–3 horses under `carousel_spin`)
  - [ ] Headless renders + style check; fit render vs ride scale
  - [ ] `verify-glb.py --require carousel_spin --require carousel_snow_cap` passes; GLB ≤150 KB; exported
- [ ] Task: Hot-air balloon
  - [ ] Recipe `scripts/blender-balloon.py` (`balloon_basket` assembly; `balloon_snow_cap` inside the assembly)
  - [ ] Headless renders + style check; landed envelope clears wagon cab height
  - [ ] `verify-glb.py --require balloon_basket --require balloon_snow_cap` passes; GLB ≤150 KB; exported
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

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
