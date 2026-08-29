# Specification — Steam Puffs

**Track ID:** `steam-puffs_20260830`
**Type:** Feature

## Overview

Add a lightweight steam-puff effect to Tiny Tracks’ autonomous locomotive rides. The effect closes the product-vision gap around “whistles, steam puffs” while maintaining the project’s tablet performance goals through a fixed, reusable pool and procedural billboard geometry.

Each locomotive emits one soft white puff on every existing chug-beat event while actively riding. Puffs rise, gently expand, fade over exactly one second, and continuously face the follow camera. Existing puffs finish their animation after the ride stops; no new puffs are emitted.

## Functional Requirements

1. Render soft white, toy-like puffs using procedural billboard geometry without texture or external asset dependencies.
2. Continuously face the active camera and gently rise, expand, and fade.
3. Consume the existing ride/audio chug-rhythm event and emit at most one puff per chug beat.
4. Emit only while the train is actively riding; stop new emissions immediately when the ride ends or is stopped.
5. Preallocate a fixed pool of exactly 16 puff instances and reuse them.
6. Perform no allocations during emission or per-frame updates.
7. Gracefully drop a puff emission when all 16 instances are active.
8. Give each puff an exactly 1.0-second lifetime, then deactivate and return it to the pool.
9. Let active puffs finish fading after the ride stops.
10. Support all selectable locomotives using locomotive-specific chimney anchors where available.
11. Define documented per-locomotive fallback offsets for models without usable chimney anchors.
12. Dispose pooled resources and event subscriptions cleanly with the scene.
13. Preserve existing ride, audio, stop, whistle, persistence, and privacy behavior.

## Non-Functional Requirements

- Maintain the project’s 60 FPS target on mid-spec tablets.
- Preserve touch-first toddler-friendly presentation.
- Add no runtime network calls, analytics, identifiers, dependencies, or downloaded assets.
- Keep pure lifecycle logic independent of Three.js where practical.
- Follow existing TypeScript, Three.js, and Biome conventions.

## Acceptance Criteria

- During an active ride, every chug beat attempts exactly one steam-puff emission.
- A visible puff appears at the correct chimney location for each locomotive with a valid anchor.
- Locomotives without valid anchors use documented fallback offsets.
- Puffs are soft white procedural billboards that face the camera continuously.
- Each puff rises, expands gently, and fades completely after 1.0 second.
- Stopping the train prevents further emissions while existing puffs finish fading.
- The pool contains exactly 16 reusable instances.
- Emission gracefully skips when all instances are active.
- No allocations occur in puff emission or per-frame update paths.
- Biome, TypeScript, Vitest, and relevant Playwright smoke checks pass.
- Manual tablet/emulation verification confirms readable puffs, correct stop behavior, and no visible performance regression.

## Out of Scope

- New puff textures, downloaded assets, or third-party particle libraries.
- Smoke trails, weather, generalized particle infrastructure, or puff customization.
- Changes to locomotive models or asset files.
- Changes to chug audio timing or ride-state semantics.
- New UI controls, persistence, branching tracks, or other gameplay changes.
