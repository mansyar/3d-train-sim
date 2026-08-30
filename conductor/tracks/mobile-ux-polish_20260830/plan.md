# Plan — Mobile UX Polish

Execution roadmap for the approved spec. All work is DOM/scene/glue or
config (non-logic per workflow.md), so tasks carry recorded acceptance
criteria and are verified via e2e + manual checks instead of unit tests.

## Phase 1 — Small-screen shell (FR1, FR6.1)

- [ ] Task: Add `viewport-fit=cover` to the viewport meta tag
- [ ] Task: Rail wraps to two rows below ~520px keeping ≥64px targets; safe-area insets top/left/right (parent gate, grid anchor)
- [ ] Task: Toybox + train drawers fit ≥360px without clipping (panel centering, tab strip guard)
- [ ] Task: Acceptance criteria recorded (rail wraps, no horizontal clipping at ≥360px)
- [ ] Task: E2E — add phone viewport project (iPhone-size, touch) + no-horizontal-overflow assertions
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Tap-to-rotate + click sound (FR2)

- [ ] Task: Add `click` sound: `public/audio/click.ogg` + `click.mp3`, register in howler-voice, expose `click()` on AudioController
- [ ] Task: Acceptance criteria recorded (per-step bounce + click; silent while muted)
- [ ] Task: Tap-vs-drag disambiguation in `app.ts` (~12px movement threshold) — tap on placed toy rotates 90°, press-drag lifts
- [ ] Task: Rotation step feedback: bounce animation + click + snap (unchanged 4-fold model)
- [ ] Task: Remove the rotate knob (markup, CSS, wiring); desktop `R`-key rotation stays
- [ ] Task: `prefers-reduced-motion` respected (instant snap, no bounce)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Delete on the toy (FR3)

- [ ] Task: ✕ chip overlay travels with a lifted placed toy; tap deletes silently (consistent with trash)
- [ ] Task: Trash bin grows/pulses while a lifted toy hovers over the rail; widened invisible drop zone
- [ ] Task: Acceptance criteria recorded (chip visible while lifted, tap deletes, drag-to-trash still works)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Portrait camera framing (FR4)

- [ ] Task: Aspect-aware overview framing in `init-scene.ts` resize — full 16×16 meadow in view in tall viewports; landscape unchanged; ride/follow untouched
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Production hygiene (FR5)

- [ ] Task: Document `@fontsource/baloo-2` in `tech-stack.md` (before implementation)
- [ ] Task: Add `@fontsource/baloo-2`, import in `main.ts`, keep fallback stack
- [ ] Task: Gate the debug grid toggle to `import.meta.env.DEV`
- [ ] Task: iOS PWA meta (`apple-mobile-web-app-capable`, `apple-touch-icon`, status bar style)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — E2E gesture coverage (FR6.2)

- [ ] Task: Scripted touch test — place piece → tap rotates → lift-drag to ✕ chip/trash deletes; console-error and zero-external-request assertions
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Final gate

- [ ] Task: `biome check`, `tsc --noEmit`, vitest, full Playwright suite (tablet + phone) green