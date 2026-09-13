# Spec — Delight Toys Polish: Windmill, Carousel & Balloon (`delight-toys-polish_20260913`)

**Type:** Feature

## Overview
The three animated "living town" toys — windmill, carousel, hot-air balloon — get a quality pass: smoother, rounder, more toy-realistic models (same silhouettes, palette, and node contracts) and a calmer pace (windmill and carousel spins halved). No new interactions, content, or systems — the same three toys simply look and feel like nicer objects.

## Functional Requirements

**F1 — Windmill polish (`scripts/blender-windmill.py` → `public/assets/train-kit/windmill.glb`)**
- Smoother surfaces: higher segment counts and smooth shading with angle-based sharp edges on tower and cap; subtle rounded edges on box details.
- Crisp details inside the current silhouette: door and window frames, a small roof finial.
- Sails: tapered frames with a few chunky lattice slats per blade (kept thick to avoid shimmer at tablet distance); all blade parts stay parented under `windmill_sails`.
- Node contracts preserved exactly once: `windmill_sails`, `windmill_snow_cap` (plus all existing static names); new parts added to the export list.
- Snow cap follows the new cap shape; still authored visible, hidden at load, shown by the shared snow gate.
- ≤ ~150 KB; deterministic headless recipe; z-up authoring, `export_yup`, export by selection; named double-sided Principled materials; palette unchanged.

**F2 — Carousel polish (`scripts/blender-carousel.py` → `public/assets/train-kit/carousel.glb`)**
- Smoother platform, rim, column, and canopy (higher segments, smooth shading, rounded rim).
- Horses rebuilt until they unmistakably read as horses: rounded body, simple legs, head with snout and ears, mane and tail — still toy-simple and chunky; saddles refined. Horse parts rotate with `carousel_spin`.
- Scalloped cream valance under the red canopy edge (classic carousel read), parented to the spin group; poles and knob neatened.
- Contracts preserved: `carousel_spin`, `carousel_snow_cap`; export list updated for new parts.
- ≤ ~150 KB (currently 133 KB — budget watched closely); same deterministic gates.

**F3 — Balloon polish (`scripts/blender-balloon.py` → `public/assets/train-kit/balloon.glb`)**
- Envelope gets classic alternating vertical gores (orange/cream, ~16 panels assigned per face on the existing `balloon_envelope` mesh — node name unchanged) and a finer sphere; neater equator band and a crown ring under the snow cap.
- Crisper basket (rounded edges + rim band) and ropes.
- Contracts preserved: `balloon_basket`, `balloon_snow_cap`; wander motion untouched.
- ≤ ~150 KB; same deterministic gates.

**F4 — Subtle material distinction (all three recipes)**
- Flat colors kept (no textures, no gradients); roughness and tone vary slightly per surface so painted wood, steel, fabric, and painted roof read differently in sunlight.
- Materials stay named, Principled, double-sided; palette unchanged.

**F5 — Spin retune (`src/scene/delight-motion.ts` + recipe comments)**
- Windmill sails 0.5 → 0.25 rev/s (`Math.PI` → `Math.PI / 2` rad/s); carousel 0.25 → 0.125 rev/s (`Math.PI / 2` → `Math.PI / 4` rad/s).
- Update the charm-rate comment in `delight-motion.ts` and the rev/s references in the three recipe headers.
- Balloon yaw/wander untouched; reduced-motion freeze untouched; no per-frame allocations.

**F6 — Verification & docs**
- Each recipe re-run headless and render-checked (top, quarter, fit beside the locomotive at ×1.6, winter); `verify-glb.py` gates pass; palette/rubric checks pass.
- Existing `e2e/delight-toys.spec.ts` stays green on tablet + phone, unchanged.
- `CHANGELOG.md` `[Unreleased]` gains a short parent-facing changed note.

## Non-Functional Requirements
- **Performance:** no added per-frame cost (constants only); triangle counts stay modest; GLB sizes reported.
- **Privacy/offline:** no new assets, textures, dependencies, or network requests.
- **Product alignment:** chunky readable silhouettes, warm flat palette, gentle motion; toddler-safe; nothing new to learn.
- **Regenerability:** deterministic recipes, reproducible re-runs (Blender 5.2); GLBs never hand-edited.
- **Compatibility:** node contracts unchanged (runtime `getObjectByName`); old saves load unchanged.

## Acceptance Criteria
1. Three recipes re-run headless; `verify-glb.py --max-kb 150` passes with `--require windmill_sails --require windmill_snow_cap` (windmill), `--require carousel_spin --require carousel_snow_cap` (carousel), `--require balloon_basket --require balloon_snow_cap` (balloon); sizes reported.
2. Renders reviewed for each toy: visibly smoother/rounder; slats read on the sails; horses read instantly as horses; gores read on the balloon; palette gate passes; chunky-silhouette rubric passes with one sentence of evidence per line.
3. In-app: the three toys place, stand, spin, and show winter/night/reduced-motion behavior exactly as before; no seating/origin regressions (ground contact checked in the running app).
4. Spin feel: windmill ≈ 0.25 rev/s (≈4 s/turn), carousel ≈ 0.125 rev/s (≈8 s/turn), observed in-app; balloon motion unchanged.
5. `pnpm exec biome check .`, `tsc --noEmit`, `CI=true pnpm test` green; full Playwright (tablet + phone, incl. delight toys) green; zero console errors; zero external requests.
6. Old saves load unchanged; scene scales, placement rules, and persistence untouched.
7. `CHANGELOG.md` `[Unreleased]` updated.

## Out of Scope
- Proportions/scale/silhouette redesign; colors beyond the accepted palette; node renames; new scenery kinds.
- Motion beyond the two spin constants: no balloon wander/yaw changes, no horse bobbing, no wind-gust systems, no easing frameworks.
- Audio; other Blender toys (station, tunnel, switch, crossing gate, barge, frog, music box); textures/PBR; LOD/bundle-diet; engine or dependency changes.

## Decisions Log
- 2026-09-13: Track chosen by user — polish the three delight toys; windmill + carousel spin slower.
- 2026-09-13: Ambition — refine current designs (same silhouettes/palette/node names), not a restyle.
- 2026-09-13: Spins — half speed: windmill 0.25 rev/s, carousel 0.125 rev/s; balloon motion unchanged.
- 2026-09-13: Balloon — classic orange/cream alternating gores.
- 2026-09-13: Windmill sails — chunky lattice slats.
- 2026-09-13: Carousel horses — must read unmistakably as horses (chunky toy style).
- 2026-09-13: Materials — subtle roughness/tone distinction; flat palette kept.
- 2026-09-13: Branch `track/delight-toys-polish_20260913` created off `main`; spec and plan approved.
