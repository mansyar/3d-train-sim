# Spec — Living Meadow

**Track ID:** `living-meadow_20260830` · **Type:** Feature (idle & feedback polish) · **Branch:** `track/living-meadow`

## Overview

V1 gameplay is complete, but the scene only feels alive while the kid is actively doing something. The product guidelines demand a "sunlit playroom" that rewards touch with instant feedback; today the meadow is static when idle (only critter breathing runs), the whistle button plays a sound with zero visual response, and a backgrounded tab keeps the chug loop playing (no `visibilitychange` handling exists anywhere in `src/`). This track makes the meadow feel inhabited — a gentle attract mode when the kid steps away, steam puffs on the whistle, and battery-aware pausing when the tab is hidden. No new toys, no new UI, no core gameplay changes.

## Functional Requirements

1. **Idle attract mode** — after a quiet period (~25 s with no touch and no ride running), the world gently comes alive on its own:
   - The overview camera drifts very slowly (eased micro-pan/tilt, amplitude kept inside the meadow, no jitter, no sudden moves).
   - Rarely (randomized every 15–45 s) a soft meadow sound plays — one of the existing critter chirps (`oink-pig`, `baa-sheep`, `woof-pug`) at low volume — and the matching critter does a hop.
   - Any touch, press, or ride start exits attract instantly (<100 ms); the camera returns to its normal intended view.
   - Attract sounds respect the global mute and stay well below the chug's voice (no sudden or loud sounds).
   - Reduced motion disables the camera drift; sounds and hops are unaffected.
   - The idle/attract decision logic is pure (injectable clock + RNG) and unit-testable.
2. **Whistle steam burst** — pressing the Whistle button visibly puffs steam at the locomotive's chimney, reusing the existing pooled steam-puff emitter (16-pool). Pool discipline preserved: no per-frame allocations, bursts recycle.
3. **Tab-hide pause** — when the document becomes hidden (`visibilitychange`), the render loop stops, the chug audio pauses, and idle timers pause; when visible again, everything resumes seamlessly — ride position continuity is preserved, the chug resumes at the correct phase, and a fresh frame renders. No lingering audio in a hidden tab.

## Non-Functional Requirements

- 60 FPS target on mid-spec tablets unchanged; zero per-frame allocations in the render loop (attract drift uses precomputed parameters, not per-frame math objects).
- Mute stays instant and is respected by every new sound.
- Battery-aware: hidden tab → no rendering, no audio, no timers (guideline: "pause rendering when the tab is hidden").
- Offline-first: no new assets — attract sounds reuse bundled critter chirps; whistle burst reuses the steam-puff pool. Zero external requests.
- Reduced motion respected (drift off); no flashes, shakes, or rapid camera moves (visual guidelines).

## Acceptance Criteria

- After ~25 s of no input, the camera slowly drifts and a rare soft critter chirp/hop plays; the first touch returns the view to normal immediately.
- Pressing Whistle visibly puffs steam at the chimney; the puffs dissipate and recycle.
- Switching tabs mid-ride pauses rendering and the chug; switching back resumes the ride exactly where it was, with no background audio while hidden.
- All new behavior respects mute and reduced motion.
- `pnpm check` gates pass; Playwright smoke passes with zero console errors and zero external requests; manual tablet check recorded in `plan.md`.

## Out of Scope

- First-run starter layouts / onboarding hints.
- Asset-failure placeholders & WebGL fallback ("No White Screens").
- PWA update-toast flow (`workbox-window`).
- Per-train chug variation, wagon sway, station dwell animation.
- Performance refactor of `canPlaceAt` / `hasHolderAt`; dead-code cleanup (`connectionsFor`, `trainWhistle`, etc.).