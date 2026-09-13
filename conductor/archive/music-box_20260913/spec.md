# Spec — Music Box: Singing Town Toy (`music-box_20260913`)

**Type:** Feature

## Overview
Tiny Tracks gains a fourth "living town" delight: a wooden **music box** scenery toy.
When a riding train passes close, the box winds itself and plays a short, synthesized
nursery melody while a little figurine twirls on its lid. It rewards exactly the play
the game already celebrates — trains sweeping past scenery — with warmth and sound,
adding nothing new to learn: no controls, no reading, no fail states.

## Functional Requirements

**F1 — Asset (`public/assets/train-kit/music-box.glb`)**
- Deterministic Blender recipe `scripts/blender-music-box.py` (z-up authoring,
  `export_yup=True`, export by selection, named double-sided Principled materials)
  following the `threejs-blender-asset` pipeline used by the other town toys: measure
  the mount first, verify with real renders, `verify_glb()` gate.
- ≤ ~150 KB. Node-name contract, each exactly once: `musicbox_figure` (the twirling
  figurine assembly), `musicbox_snow_cap` (snow blanket, authored visible).
- Authored on the meadow mount (mat top z = −1.0; 1 unit ≈ 1 cell) and fit-checked
  beside a locomotive at ride scale ×1.6.

**F2 — Catalog & drawer (`src/core/scenery.ts`, `src/ui/*`)**
- New scenery kind `music-box`: town category, dry land only, toy scale/lift, aria
  label. Drawer town tab gains a hand-drawn chunky SVG icon.
- Placement persists through the existing scenery autosave (additive; old saves load
  unchanged).

**F3 — Melody data (`src/core/melodies.ts`, pure)**
- Four public-domain nursery tunes: ABC/Twinkle, Mary Had a Little Lamb, London Bridge,
  Row Row Row Your Boat — instrumental only, no vocals; each a signature phrase of
  ~8–12 s at a gentle tempo (~100 BPM).
- `pickNextTune(previous, random)` chooses the next tune with an injected RNG and never
  picks the immediately previous tune.

**F4 — Synthesized voice (`src/audio/music-box-audio.ts`)**
- Music-box chimes synthesized with Web Audio (bell partials, fast soft attack,
  exponential decay, capped gain) — **no audio files, zero downloads**.
- Respects game mute instantly; lifecycle mirrors the existing synth voices
  (`ambience-audio.ts` / `river-babble.ts`): lazy context on first gesture,
  suspend/resume with the ride and tab visibility, dispose, silent-but-playable
  fallback if Web Audio is unavailable.

**F5 — Winding behavior (`src/scene/music-box.ts` + wiring)**
- While a ride is running, a box within ~1.5 cells of any loco starts winding once per
  pass; cooldown = phrase length + short rest.
- `musicbox_figure` twirls while winding, easing in and out.
- A different tune every winding (per-box rotation); never the immediate previous.
- Day and night both play; winter snow cap joins the shared frozen gate.
- Mute → still twirls, no sound. Reduced motion → no twirl, tune still plays.
- ⏹ mid-tune or box removal → the phrase finishes/fades gently; the figure eases to
  rest.
- No new controls, text, or fail states anywhere.

**F6 — Winter & persistence**
- Snow cap follows the shared delight snow state at template load (asset-race settle)
  and via the snow gate.
- Saves remain additive; no new persistence code.

## Non-Functional Requirements
- **Performance:** zero per-frame allocations in the update path; no added per-frame
  cost when no music box is placed; audio scheduled ahead on the Web Audio clock (no
  per-note timers on the main thread).
- **Audio etiquette:** gentle by design — chimes capped well under the chug; mute
  instant and persistent; no sudden or loud sounds; nothing audible while muted or
  hidden.
- **Privacy/offline:** no network at runtime, no new files fetched, no new dependencies.
- **Product alignment:** toddler-safe (no text, no fail states); 60 FPS guardrail
  respected; PWA offline behavior unchanged.

## Acceptance Criteria
1. `biome check .`, `tsc --noEmit`, `pnpm test` all green; `melodies.ts` coverage >80%
   (TDD).
2. `verify-glb.py --require musicbox_figure --require musicbox_snow_cap` passes; GLB
   ≤ ~150 KB; renders match the warm toy style.
3. Placing the box, starting a ride, and having a train pass plays a recognizable
   phrase once per pass and the figure twirls; a second pass plays a different tune.
4. Mute silences instantly; the figure keeps twirling. Reduced motion keeps the melody
   but stills the figure.
5. Day/night and winter behavior correct (snow cap toggles with the shared gate; audio
   unaffected by darkness).
6. Old saves load unchanged; placement persists across reload; removal mid-phrase
   leaves no artifacts.
7. `e2e/music-box.spec.ts` passes (tablet + phone): winding witnessed via dev probe,
   snow toggle, zero console errors, zero external requests.

## Out of Scope
- Tap-to-wind interaction or any direct control over the box; lyrics/vocals;
  full-length songs; extra tunes beyond the four; harmonization/arrangement beyond
  simple chimes; music for other objects (station chimes, carousel music); idle or
  attract-mode playback (music only responds to trains); any new UI text.

## Decisions Log
- 2026-09-13: Form chosen — music-box town toy, train-pass triggered (user pick after
  five-option survey).
- 2026-09-13: Sound approach — synthesized Web Audio chimes of public-domain nursery
  melodies only (user asked for "children songs like ABC"; copyrighted tunes avoided;
  instrumental, no vocals).
- 2026-09-13: Repertoire — ABC/Twinkle, Mary Had a Little Lamb, London Bridge, Row Row
  Row Your Boat (user multi-select).
- 2026-09-13: Plays day and night; twirling figurine; ~8–12 s signature phrase; ⏹
  winds down gently (phrase finishes, figure eases to rest).
- 2026-09-13: Branch `track/music-box_20260913` created off `main`; spec and plan
  approved.
