# Spec — Soft Shadows & Light Tuning

**Track ID:** `soft-shadows-light-tuning` · **Type:** Chore (visual polish / render upgrade) · **Branch:** `track/soft-shadows-light-tuning`

## Overview

The product guidelines call for a "sunlit playroom: warm palette, rounded forms, **soft shadows**" — but the scene currently has zero shadows (`src/scene/lights.ts` is one ambient + one directional light, nothing casts or receives), and bright toy surfaces can blow out. This track adds real shadow-mapped lighting and a full light-tuning pass so the meadow feels grounded and warm. No new toys, no features, no core logic changes — everything stays in `src/scene/`.

## Functional Requirements

1. **Shadow-mapped key light** — the directional "sun" casts soft shadows (`PCFSoftShadowMap`). Shadow camera frustum is tuned to the play area (16×16 grid region, not the whole 60×60 plane) for crisp texel density at a modest map size (1024). Bias tuned to avoid acne/peter-panning on chunky toy geometry.
2. **Everything casts, the ground receives** — train, cargo wagons, track pieces, and scenery cast shadows; the ground plane receives them. Drag ghosts remain non-casting.
3. **Full light tuning** — warm the ambient toward the playroom palette; add a hemisphere fill light (sky-tinted from above, warm bounce from below) so toy undersides aren't flat; adjust sun angle/position for pleasant toy-table shadow shapes; enable neutral tone mapping on the renderer so white/bright toys don't clip.
4. **Existing colors preserved** — tuning must not change the meadow green, track, or toy colors into a different palette; it adjusts light, not materials.

## Non-Functional Requirements

- 60 FPS target on mid-spec tablets (2020+ iPad, mid-range Android) still holds with the shadow pass enabled (shadow frustum + map size chosen for this).
- No per-frame allocations in the render loop; pixel-ratio cap and battery-aware behavior unchanged.
- Reduced-motion static-frame rendering still works (shadow map renders once, no flicker).
- Zero external requests; offline PWA unaffected.

## Acceptance Criteria

- Train visibly casts a soft directional shadow that moves with it; wagons cast too.
- Trees/houses/critters/track pieces ground themselves with soft shadows.
- Toy undersides and shadowed sides read warm, not black; no blown-out highlights.
- `pnpm check` gates pass; Playwright smoke passes with zero console errors and zero external requests; manual tablet check recorded in `plan.md`.

## Out of Scope

- Blob/fake shadow systems, multiple light sources (time of day), elevation/height shadows, material or color overhaul, day/night cycle.
