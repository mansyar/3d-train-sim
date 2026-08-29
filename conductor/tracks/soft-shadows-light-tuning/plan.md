# Implementation Plan — Soft Shadows & Light Tuning

**Track ID:** `soft-shadows-light-tuning` · **Branch:** `track/soft-shadows-light-tuning`

Workflow: scene wiring only — verified via acceptance criteria + smoke tests +
manual tablet check (`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Shadowed Sun & Tuned Light (lighting foundation) [checkpoint: d2b9a68]

**Verification Report:** Automated — biome ✅, `tsc --noEmit` ✅, 193 unit
tests ✅ (2026-08-30, `pnpm test` single run). Manual — user confirmed the
tuned warm/fill lighting and tone mapping meet expectations (2026-08-30);
shadow visibility itself is deferred to Phase 2 when casters are wired.

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
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Phase changes are scene-only (`lights.ts`, `init-scene.ts`) — no unit
    tests required; acceptance criteria verified manually + via smoke later.
  - User confirmed 2026-08-30. Checkpoint: d2b9a68 (last functional commit).

## Phase 2: Casters & Receiver (scene objects) [checkpoint: 1f0ab96]

**Verification Report:** Automated — biome ✅, `tsc --noEmit` ✅, 193 unit
tests ✅ (2026-08-30, `pnpm test` single run). No unit tests required — all
phase changes are scene wiring. Manual — user confirmed 2026-08-30: track
pieces and scenery cast soft shadows; ghost previews do not cast; train and
wagons cast while riding; shadows are soft with warm undersides.

- [x] Task: Mark cast/receive flags in `src/scene/track-renderer.ts`,
      `load-locomotive.ts`, `load-wagons.ts`, and `ground.ts` (1f0ab96)
  - Acceptance criteria:
    - Track pieces and scenery cast shadows (set on GLB templates so clones
      inherit; traverse clones defensively where templates are shared).
    - Locomotive and cargo wagons cast; the train's soft shadow visibly
      follows it while riding.
    - Ground plane receives shadows; drag ghosts never cast.
  - Commit `feat(scene): Ground the toys with cast shadows`.
  - Notes: New `src/scene/shadows.ts` helpers (`enableCastShadows` /
    `disableShadows`) traverse an object tree and set mesh flags. Track and
    scenery GLB templates are marked casting on load in `track-renderer.ts`,
    so every placed clone inherits the flag via `clone(true)`; drag ghosts
    explicitly opt out with `disableShadows` (clones copy the template's
    casting flag). `load-locomotive.ts` / `load-wagons.ts` mark the train
    models casting at load (locomotive templates are cloned per show, wagons
    are added directly). `ground.ts` sets `receiveShadow`. Gates: biome ✅,
    `tsc --noEmit` ✅, 193 unit tests ✅. Also: `biome.json` now ignores the
    local `.freebuff` worktree dir, which had begun tripping Biome's
    nested-root-config error (committed separately, b7cf4b2).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Phase changes are scene-only — no unit tests required; acceptance
    criteria verified manually + user confirmed 2026-08-30.
  - Checkpoint: 1f0ab96 (last functional commit).

## Phase 3: Verification, Performance & Polish [checkpoint: 1f0ab96]

**Verification Report:** Automated — biome ✅, `tsc --noEmit` ✅, 193 unit
tests ✅, 12 Playwright smoke ✅ with zero console errors and zero external
requests (2026-08-30, single runs). Manual — user confirmed 2026-08-30 with
a dev-server screenshot (station houses, trees, sheep critter, parked train
and lumber wagon all cast soft directional shadows with warm undersides and
no blown highlights), plus the ride/performance/reduced-motion checklist:
train shadow moves with it during a ride, 60 FPS feel holds, reduced-motion
renders a static frame with shadows present. Docs sync — the guidelines'
"sunlit playroom … soft shadows" visual principle is met; no `product.md`
or `tech-stack.md` changes (no new dependencies, product scope unchanged).

- [x] Task: Run full gates + Playwright smoke suite
  - `biome check` + `tsc --noEmit` + vitest + Playwright: zero console
    errors, zero external requests, shadows present in the smoke run's
    screenshots.
  - Notes: All 12 Playwright smoke tests pass (zero console errors, zero
    external requests); biome ✅, `tsc --noEmit` ✅, 193 unit tests ✅.
    Shadow-visibility investigation: headless-Chromium (SwiftShader)
    screenshots showed no shadow map output even though the scene state was
    fully correct (verified via a temporary debug hook + minimal repro —
    real-browser rendering was fine throughout). The user's dev-server
    screenshot confirms soft shadows on houses, trees, the train, and
    critters. Headless SwiftShader shadow rendering is therefore treated as
    a known tooling limitation, not an app bug; smoke assertions (console,
    requests, interactions) remain the automated gate, and shadow visuals
    are verified manually. Temp debug artifacts removed; suite re-run green.
- [x] Task: Manual tablet verification & record report
  - `pnpm dev` on tablet (iPad Safari / Android Chrome, or touch emulation):
    shadows soft and moving with the train; undersides warm not black; no
    blown highlights; 60 FPS feel with a ride running; reduced-motion
    unaffected. Record the verification report in `plan.md`.
  - Notes: User confirmed 2026-08-30 — soft moving shadows during ride,
    60 FPS feel holds, warm undersides, no blown highlights, reduced-motion
    static frame with shadows present (see the phase report above).
- [x] Task: Docs sync check
  - Confirm the guidelines' "soft shadows" principle is met; no
    `tech-stack.md` deviation expected (no new dependencies).
  - Notes: `product-guidelines.md` visual principle 1 ("sunlit playroom …
    soft shadows") is met — no guideline edit required (the track
    implemented the documented bar). `product.md` and `tech-stack.md`
    unchanged: visual polish only, zero new dependencies.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - User confirmed 2026-08-30. Checkpoint: 1f0ab96 (last functional commit).
