# Plan — Delight Toys Polish: Windmill, Carousel & Balloon

> Methodology per `conductor/workflow.md`. All tasks are non-logic (deterministic Blender recipes, scene constants, docs) — verified via render + `verify-glb.py` gates, Playwright, and manual verification. Existing unit tests must stay green; no new unit tests expected.
> Track branch: `track/delight-toys-polish_20260913`.

## Phase 1 — Asset polish (non-logic; render/verify gated)

**Gate 1.1 — Measurements & contracts (mount: meadow mat; scenery cells are track-free; occupant = locomotive parked beside, ride ×1.6):**

| Quantity | Value | Source |
|---|---|---|
| Authored unit | 1 unit ≈ 1 meadow cell | scenery template convention |
| Mat top (authored) | z = −1.0; scenery stands on its origin (base z = 0) | kit convention (`GROUND_Z`), canonical `blender-station.py` |
| Occupant bounding box | locomotive ≈ 2.3 wide × 2.7 tall at ride ×1.6 | tech-stack rule 3 |
| Windmill footprint | 1 cell; tower base Ø ≤ 0.85; total ~2.4 tall × scale 1.1 | unchanged by this track (refine-only) |
| Carousel footprint | 1 cell; platform Ø 1.1, canopy Ø 1.35, total ~1.35 tall × scale 1.0 | unchanged |
| Balloon footprint | 1 cell; basket 0.3, envelope Ø 0.95, ~1.5 tall × scale 0.9 | unchanged |
| Budgets (today) | ≤ 150 KB per GLB — windmill 20.0 · carousel 133.4 (watch) · balloon 57.2 KB | `verify-glb.py --max-kb 150` |
| Contracts | windmill: `windmill_sails`, `windmill_snow_cap` · carousel: `carousel_spin`, `carousel_snow_cap` · balloon: `balloon_basket`, `balloon_snow_cap` (exactly once each) | runtime `getObjectByName` |
| Render env | `view_transform = "Standard"`, sun 2.0, 900×700; views: top / quarter / fit (loco ×1.6) / winter | accepted on the original track (matches app tone response) |
| Palette ref | cream (0.95, 0.86, 0.68), toy red (0.78, 0.18, 0.10), orange (1.0, 0.62, 0.11), brown (0.42, 0.26, 0.15), steel (0.55, 0.60, 0.68), snow (0.94, 0.96, 0.93) — unchanged | accepted on the original track |

**Tooling notes:** `blender` is not on PATH → `& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python scripts/blender-<toy>.py`. Gates live in the `threejs-blender-asset` skill (`C:\Users\Ansyar\.agents\skills\threejs-blender-asset\scripts\{verify-glb,palette}.py`).

- [x] Task: Windmill polish — slatted sails, smoother finish, crisp details (20fb096)
  - Expected behavior: sails show chunky lattice slats; tower/cap smooth-shaded with rounded edges; door/window frames and roof finial read; snow cap follows the new cap; same footprint; contracts intact; ≤ 150 KB.
  - [x] Baseline: run the current recipe once; capture top/quarter/fit/winter renders; `palette.py --extract` the accepted palette
  - [x] Edit `scripts/blender-windmill.py`: smoother tower/cap (segments + smooth shading), door + window frames, roof finial, chunky lattice-slat sails (no shimmer), subtle material distinction; keep contracts; update export list
  - [x] Re-run headless → `public/assets/train-kit/windmill.glb`
  - [x] `verify-glb.py --max-kb 150 --require windmill_sails --require windmill_snow_cap` → PASS (record size)
  - [x] Render review vs baseline: smoothness + details read; `palette.py --match` pass; rubric notes (one sentence per line)
  - [x] Commit (recipe + GLB)
  - Notes:
    - Baseline re-run was byte-identical (deterministic on Blender 5.2) — the committed GLB stayed untouched; baseline renders + per-view palettes archived in the session scratch dir (`…/opencode/delight-polish/{baseline,palette,polished}`).
    - Polish: tower 48-seg + smooth, cap 48-seg smooth, snow cap 40-seg smooth; lattice sails (2 rails + 4 rungs per blade, one mesh per blade, rails parallel — keeps slats chunky and aliasing-safe); door = brown surround + cream panel; window = brown surround + orange pane; roof finial (cream post + orange ball); orange hub ball; per-material roughness (cream 0.95 / red 0.8 / orange 0.75 / brown 0.7 / snow 0.9).
    - Learned fix: with solid-slab framing the panel/pane must sit slightly proud of its surround, or it is invisible inside the surround's volume — the first pass was fully embedded and was caught by a close-up render, not by the four standard views.
    - The standard renders freeze the sails at spin 0, so the down blade covers the centered window in all four; a spun detail render proves the window reads (and it is visible in-app whenever the sails turn).
    - Deviations: parallel rails instead of tapered; two added accents within the accepted palette (orange hub/finial balls, brown window frame).
  - Verification Report:
    - Automated: `verify-glb.py --max-kb 150 --require windmill_sails,windmill_snow_cap` → PASS (66.9 KB, 15 nodes, 5 materials; extents 1.38 × 1.90 × 1.00). `palette.py --match` → PASS ×4 views vs accepted baselines (distance 0). GLB 20.5 KB → 66.9 KB (budget 150 KB).
    - Manual: renders reviewed vs baseline — turned-wood tower, trellis sail shadows, framed door/window, finial; fit render (loco ×1.6) unchanged in scale and clipping; no artifacts.
    - Result: GREEN.
- [x] Task: Carousel polish — horses that read as horses, scalloped valance, smoother body (0d55dfd)
  - Expected behavior: three horses unmistakably read as horses (rounded body, legs, snout + ears, mane, tail — still chunky); scalloped cream valance under the red canopy; smoother platform/rim/column/canopy; poles/knob neatened; contracts intact; ≤ 150 KB (watch — closest to budget).
  - [x] Baseline: run current recipe once; capture renders; `palette.py --extract`
  - [x] Edit `scripts/blender-carousel.py`: horse rebuild (parts parented to `carousel_spin`), valance parented to spin, surface smoothing, refined saddles, material distinction; keep contracts; update export list
  - [x] Re-run headless → `public/assets/train-kit/carousel.glb`
  - [x] `verify-glb.py --max-kb 150 --require carousel_spin --require carousel_snow_cap` → PASS (record size)
  - [x] Render review vs baseline: horses read; smoothness/details; `palette.py --match`; rubric notes
  - [x] Commit (recipe + GLB)
  - Notes:
    - Horse rebuild: each horse is now ONE mesh (cream + orange slots) — rounded body, four grounded legs, neck, head with muzzle + two ears, orange mane strip, hanging orange tail, rounded orange saddle pad; chunky primitives throughout. The old horse+head+saddle node trio collapsed to one node per horse (dressing names are free; `carousel_spin`/`carousel_snow_cap` contracts untouched).
    - Valance: one mesh — flared cream band (r 0.64→0.70 at local z 0.72–0.83) plus 12 scallop beads (r 0.045) along the lower edge, parented to the spin group.
    - Smoothing: base/canopy/snow 40-seg smooth, column/poles/knob smoothed; per-material roughness (steel 0.5, red 0.8, orange 0.75, cream 0.95, snow 0.9).
    - Z-fighting fix (flagged by the vision review of the quarter render, confirmed in close-up): the base top was exactly coplanar with the rim top — white patches at the platform edge. Base top now 5 mm under the rim top, rim lip 4 mm proud of the base side, column sunk 20 mm, pole + horse feet sunk 5 mm: no coplanar faces left.
    - Bounded iteration: v1 saddle read as a blocky crate and the tail floated; v2 = rounded pad + tucked tail; v3 = rim z-fight fix. Each round re-rendered and reviewed.
    - Deviation: horse node structure changed (single mesh per horse). Size went DOWN: 133.4 KB → 114.8 KB despite the added detail (smooth normals share vertices).
  - Verification Report:
    - Automated: `verify-glb.py --max-kb 150 --require carousel_spin,carousel_snow_cap` → PASS (114.8 KB, 17 nodes, 16 meshes, 5 materials; extents 1.500 × 1.355 × 1.500). `palette.py --match` → PASS ×4 views.
    - Manual: vision review of the quarter render — three figures, "read as toy horses", no malformations, scalloped white trim present; close-up renders confirm head/ears/saddle/tail and a clean platform rim; fit render vs loco ×1.6 unchanged, no clipping.
    - Result: GREEN.
- [x] Task: Balloon polish — classic gores, crisper basket and ropes (4b7680e)
  - Expected behavior: envelope shows classic alternating orange/cream gores (~16 panels, same `balloon_envelope` node); finer sphere; neater equator band + crown ring; crisper basket (rounded edges + rim) and ropes; contracts intact; ≤ 150 KB.
  - [x] Baseline: run current recipe once; capture renders; `palette.py --extract`
  - [x] Edit `scripts/blender-balloon.py`: per-face gore materials on the envelope, finer sphere, band/crown, basket rim + rounded edges, tidy ropes, material distinction; keep contracts; update export list
  - [x] Re-run headless → `public/assets/train-kit/balloon.glb`
  - [x] `verify-glb.py --max-kb 150 --require balloon_basket --require balloon_snow_cap` → PASS (record size)
  - [x] Render review vs baseline: gores read; smoothness/details; `palette.py --match`; rubric notes
  - [x] Commit (recipe + GLB)
  - Notes:
    - Envelope: 48×20 smooth sphere (z-scale baked into the mesh), cream accent stripes assigned per face by longitude — 16 cream stripes with two orange segments between each (2:1 pattern).
    - First pass used equal alternating stripes; the palette gate failed because the stripes scattered the orange tones until the extractor's top-8 palette lost the accepted bright orange — the render no longer showed the toy's orange identity. Rebalanced to 2:1 orange:cream; all four views then passed and the toy reads orange-dominant like before. Design tune, not a gate bypass.
    - Crown: small cream collar (r 0.06, h 0.03) on the apex; sits under the snow cap in winter.
    - Band: r +0.018, h 0.12, 32-seg smooth. Ropes: 4 angled ropes (r 0.016) from the basket rim (0.13) into the envelope underside (0.19 at local z 0.47), embedded at both ends. Basket: beveled box + cream binding strip across the top edge.
    - Materials gain the same light roughness distinction as the siblings (cream 0.95, orange 0.75, brown 0.7, snow 0.9).
    - Learned fix: detail renders via `--python-expr` must exec the recipe into an explicit namespace (`{"__name__": "detail", "__file__": …}`) — a bare `exec(compile(...))` runs the recipe's `__main__` block and dies in the loco import step.
    - Size 57.2 KB → 80.7 KB (budget 150 KB).
  - Verification Report:
    - Automated: `verify-glb.py --max-kb 150 --require balloon_basket,balloon_snow_cap` → PASS (80.7 KB, 11 nodes, 10 meshes, 4 materials; extents 0.906 × 1.000 × 0.906). `palette.py --match` → PASS ×4 views (after the gore rebalance).
    - Manual: quarter/top/detail/fit renders reviewed — pinstripe gores crisp, pinwheel crown from above, band and crown collar clean, ropes visibly tied into basket and envelope, beveled basket with binding strip, scale vs loco ×1.6 unchanged, no artifacts. Winter render is identical to quarter by design (snow authored visible in both).
    - Result: GREEN.
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase 2 — Spin retune, docs & wrap-up (non-logic; smoke verified)

- [ ] Task: Halve the windmill and carousel spin rates
  - Expected behavior: sails ≈ 0.25 rev/s (≈ 4.0 s/turn), carousel ≈ 0.125 rev/s (≈ 8.0 s/turn); balloon yaw/wander and reduced-motion freeze untouched; comments match reality.
  - [ ] `src/scene/delight-motion.ts`: `Math.PI` → `Math.PI / 2` (windmill), `Math.PI / 2` → `Math.PI / 4` (carousel); update charm-rate comment; update rev/s references in the three recipe headers
  - [ ] `pnpm exec biome check .` + `pnpm exec tsc --noEmit` + `CI=true pnpm test`
  - [ ] Commit
- [ ] Task: Changelog + full verification
  - [ ] `CHANGELOG.md` `[Unreleased]`: parent-facing note (smoother toys, calmer spins)
  - [ ] Full Playwright (tablet + phone), incl. `e2e/delight-toys.spec.ts`; zero console errors; zero external requests
  - [ ] Manual: place all three toys in `pnpm dev` — seating/ground contact, spin feel (~4 s / ~8 s per turn), winter toggle, reduced-motion freeze; tablet pass if available
  - [ ] Commit
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Notes

(empty — filled during implementation)
