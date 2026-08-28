# Specification — Bootstrap Tiny Tracks

**Track ID:** `bootstrap-tiny-tracks`
**Status:** Pending
**Created:** 2026-08

## Goal

Establish the permanent technical foundation of Tiny Tracks and prove the full
development loop — scaffold, quality gates, rendered 3D scene, tested core
logic — by bootstrapping the application and loading the first 3D asset.

## Motivation

Every future track (snapping, driving, audio, deploy) needs a working base:
a dev server, strict TypeScript, automated gates, an installable PWA shell,
and a proven asset pipeline. This track builds that base and demonstrates it
works end to end.

## In Scope

1. **Scaffold** (per `conductor/tech-stack.md`)
   - pnpm project, Vite 8, TypeScript ~7.0 strict mode
   - Folder skeleton exactly as defined in `tech-stack.md` (src/core, src/scene, src/ui, src/audio, src/state, public/assets/train-kit, e2e/)
   - Biome config (`biome.json`), wired scripts
2. **Quality gates**
   - Vitest 4 running a real (tiny) logic-bearing test in `src/core/` — written test-first per `workflow.md`
   - `tsc --noEmit` clean
   - `pnpm exec biome check .` clean
   - GitHub Actions CI running all gates on push/PR
3. **PWA shell**
   - Web manifest + service worker (vite-plugin-pwa), installable on home screen
   - Vanilla TS DOM overlay: minimal app frame (canvas + empty toybox rail) — structure only
4. **3D scene**
   - Three.js ^0.185 scene, tablet-first touch viewport, capped pixel ratio
   - Spinning placeholder object proving the render loop
5. **First asset**
   - Download Kenney Train Kit (CC0, kenney.nl/assets/train-kit), commit to `public/assets/train-kit/`
   - Load the **locomotive** `.glb` via GLTFLoader and render it in the scene

## Out of Scope (deferred to later tracks)

- Deploy pipeline (Dockerfile, GHCR push, Coolify trigger)
- Track-piece snapping and the track graph
- Train driving/pathing, audio, smoke particles
- Parent gate, settings, autosave
- Scenery placement

## Acceptance Criteria

1. `pnpm install && pnpm dev` serves the app; opening it on a tablet-viewport
   browser shows the scene with the locomotive visible (placeholder may remain
   alongside).
2. The app is installable as a PWA (manifest valid, service worker registered).
3. All gates pass locally: `pnpm exec biome check . && pnpm exec tsc --noEmit && CI=true pnpm test`
4. Playwright smoke test boots the app in a touch-emulated tablet viewport and
   asserts zero console errors.
5. CI workflow is green on GitHub for this branch.
6. `src/core/` contains at least one logic module with test-first coverage.
7. No runtime network calls (verified by the smoke test asserting no external requests).

## Decisions

- First model: **locomotive** (the star of the show).
- Assets are **committed to the repo** (CC0 permits; offline PWA requires bundling).
- CI without deploy job — deployment arrives in its own track before first release.

## Guidelines Checkpoints (from `product-guidelines.md`)

- Privacy: zero runtime network calls.
- Performance: capped pixel ratio; no per-frame allocations in the render loop.
- Tablet: touch-first viewport; no hover-dependent UI.
