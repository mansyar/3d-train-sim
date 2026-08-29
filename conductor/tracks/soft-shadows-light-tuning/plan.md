# Implementation Plan — Soft Shadows & Light Tuning

**Track ID:** `soft-shadows-light-tuning` · **Branch:** `track/soft-shadows-light-tuning`

Workflow: scene wiring only — verified via acceptance criteria + smoke tests +
manual tablet check (`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Shadowed Sun & Tuned Light (lighting foundation)

- [x] Task: Tune the key light and add fill lights in `src/scene/lights.ts` (b4b710f)
  - Acceptance criteria (non-logic — record & verify manually / via smoke):
    - Key "sun" directional light casts soft shadows; shadow camera frustum
      confined to the 16×16 grid play area (derived from core grid constants,
      not the full 60-unit meadow); map size 1024; bias tuned so chunky toy
      geometry shows no acne or peter-panning.
    - Ambient warmed toward the sunlit-playroom palette; hemisphere fill
      added (sky-tinted above, warm bounce below).
    - Teardown disposes all added lights.
  - Commit `feat(scene): Cast soft shadows from the key light`.
  - Notes: `lights.ts` now builds three lights — warm ambient (0xffeecf, 0.7),
    a hemisphere fill (sky 0xbfe0ff above, warm bounce 0xffe2b0 below, 0.55),
    and the shadowed "sun" directional (0xfff6e6, 1.15 at (24, 34, 16)).
    Shadow frustum is derived from grid constants (`MEADOW_CELLS × CELL_SIZE`
    = the buildable meadow) rather than hard-coded, mapSize 1024, ortho
    near/far 8/110, bias −0.0002 + normalBias 0.1 against acne/peter-panning.
    Teardown removes and disposes all three lights. Gates: biome ✅,
    `tsc --noEmit` ✅, 193 unit tests ✅.
- [x] Task: Enable renderer shadow maps + neutral tone mapping in `src/scene/init-scene.ts` (d2b9a68)
  - Acceptance criteria:
    - `shadowMap.enabled` with `PCFSoftShadowMap`; neutral tone mapping so
      bright toy surfaces don't clip.
    - Reduced-motion static frame still renders the shadow map once (no
      flicker); pixel-ratio cap and no-per-frame-allocation rules unchanged.
  - Commit `feat(scene): Enable shadow maps and neutral tone mapping`.
  - Notes: `init-scene.ts` sets `shadowMap.enabled` + `PCFSoftShadowMap` and
    `toneMapping = NeutralToneMapping` right after the pixel-ratio cap —
    one-time renderer config, no per-frame cost beyond the shadow pass
    itself; reduced-motion's single rendered frame still computes the map
    once. Pixel-ratio cap (2) untouched. Gates: biome ✅, `tsc --noEmit` ✅,
    193 unit tests ✅.
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Casters & Receiver (scene objects)

- [ ] Task: Mark cast/receive flags in `src/scene/track-renderer.ts`,
      `load-locomotive.ts`, `load-wagons.ts`, and `ground.ts`
  - Acceptance criteria:
    - Track pieces and scenery cast shadows (set on GLB templates so clones
      inherit; traverse clones defensively where templates are shared).
    - Locomotive and cargo wagons cast; the train's soft shadow visibly
      follows it while riding.
    - Ground plane receives shadows; drag ghosts never cast.
  - Commit `feat(scene): Ground the toys with cast shadows`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Verification, Performance & Polish

- [ ] Task: Run full gates + Playwright smoke suite
  - `biome check` + `tsc --noEmit` + vitest + Playwright: zero console
    errors, zero external requests, shadows present in the smoke run's
    screenshots.
- [ ] Task: Manual tablet verification & record report
  - `pnpm dev` on tablet (iPad Safari / Android Chrome, or touch emulation):
    shadows soft and moving with the train; undersides warm not black; no
    blown highlights; 60 FPS feel with a ride running; reduced-motion
    unaffected. Record the verification report in `plan.md`.
- [ ] Task: Docs sync check
  - Confirm the guidelines' "soft shadows" principle is met; no
    `tech-stack.md` deviation expected (no new dependencies).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
