# Plan — Mobile UX Polish

Execution roadmap for the approved spec. All work is DOM/scene/glue or
config (non-logic per workflow.md), so tasks carry recorded acceptance
criteria and are verified via e2e + manual checks instead of unit tests.

## Phase 1 — Small-screen shell (FR1, FR6.1) [checkpoint: e05cfc7]

- [x] Task: Add `viewport-fit=cover` to the viewport meta tag
- [x] Task: Rail wraps to two rows below ~520px keeping ≥64px targets; safe-area insets top/left/right (parent gate, grid anchor)
- [x] Task: Toybox + train drawers fit ≥360px without clipping (panel centering, tab strip guard)
- [x] Task: Acceptance criteria recorded (rail wraps, no horizontal clipping at ≥360px)
  - Acceptance: at viewport widths from 360px up, (1) every interactive target stays fully within the viewport horizontally, (2) the rail and drawers never cause horizontal scrolling, (3) the rail wraps to a second row on narrow screens with targets still ≥64px, (4) notched devices keep the rail, parent gate, and grid toggle clear of unsafe areas.
- [x] Task: E2E — add phone viewport project (iPhone-size, touch) + no-horizontal-overflow assertions
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 30/30 (tablet + phone). Manual check confirmed by user: rail wraps without clipping at 390px, drawers sit above the rail, no horizontal scroll; tablet still one row. Fix discovered during phase: smoke-spec drop coordinates were tablet-hard-coded, off-viewport on phone — made viewport-relative so the same walkthrough runs on both projects.
  - Notes: `viewport-fit=cover` added; rail `flex-wrap` + side/top/bottom safe-area insets; drawers get `max-width` + train drawer wraps, lifted above the wrapped rail on ≤540px; corner controls use safe-area insets; Playwright gained a `phone` project (iPhone 13) and `e2e/phone-shell.spec.ts` asserts no horizontal clipping at ≥360px. Files: `index.html`, `src/style.css`, `playwright.config.ts`, `e2e/phone-shell.spec.ts` (new), `e2e/smoke.spec.ts`.

## Phase 2 — Tap-to-rotate + click sound (FR2) [checkpoint: 2f88695]

- [x] Task: Add `click` sound: `public/audio/click.ogg` + `click.mp3`, register in howler-voice, expose `click()` on AudioController
  - Acceptance: one `click()` call plays the click handle once; while muted it stays silent (shared mute rule).
- [x] Task: Acceptance criteria recorded (per-step bounce + click; silent while muted)
- [x] Task: Tap-vs-drag disambiguation in `app.ts` (~12px movement threshold) — tap on placed toy rotates 90°, press-drag lifts
- [x] Task: Rotation step feedback: bounce animation + click + snap (unchanged 4-fold model)
- [x] Task: Remove the rotate knob (markup, CSS, wiring); desktop `R`-key rotation stays
- [x] Task: `prefers-reduced-motion` respected (instant snap, no bounce)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 24/24 audio incl. new click-one-shot + click-muted · Playwright 32/32 (tablet + phone) incl. new "quick tap rotates 90°" test.
  - Notes: added click.ogg/mp3 (synthesized soft tick, CC0); howler-voice `click` voice (0.7 volume, under others); `AudioController.click()`; app.ts reworked: press-then-move lifts (12px threshold), release-without-move rotates placed toy in place via same-cell relocate, rotate-bounce feedback, knob removed, R key kept; CSS remove .rotate-knob, add .rotate-bounce + keyframes + reduced-motion. Files: `public/audio/click.*`, `public/audio/CREDITS.md`, `src/audio/howler-voice.ts`, `src/audio/audio-controller.ts`, `src/audio/audio-controller.test.ts`, `src/ui/app.ts`, `src/style.css`, `e2e/smoke.spec.ts`.

## Phase 3 — Delete on the toy (FR3) [checkpoint: 2ff19c8]

- [x] Task: ✕ chip overlay travels with a lifted placed toy; tap deletes silently (consistent with trash)
  - Acceptance: lifting a placed toy shows a ✕ chip beside it; tapping it bins the toy silently (no ding, no scolding); the chip stays a fixed target (anchored to the toy's home cell) so it cannot dodge the tap.
- [x] Task: Trash bin grows/pulses while a lifted toy hovers over the rail; widened invisible drop zone
  - Acceptance: dragging a toy near the bin grows/pulses it; a drop within the widened zone deletes; a drop on the rail away from the bin still wobble-returns; reduced-motion users get no pulse.
- [x] Task: Acceptance criteria recorded (chip visible while lifted, tap deletes, drag-to-trash still works)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 34/34 (tablet + phone) incl. new "✕ chip deletes on tap" test both projects. Debugging note: the chip initially chased the drag pointer/cell and dodged taps — fixed by anchoring to the toy's home cell and clearing drag state before mutating so a trailing pointerup cannot cancel the delete.
  - Files: `src/scene/track-renderer.ts` (new `cellToScreen` projection + handle), `src/scene/init-scene.ts` (SceneHandle `cellToScreen`), `src/ui/app.ts` (delete chip element, placeChip, home-cell anchor, widened trash zone, setTrashHover, click/pointerdown delete), `src/main.ts` (wire cellToScreen), `src/style.css` (.delete-chip, .trash-slot.is-hovering pulse, reduced-motion), `e2e/smoke.spec.ts` (chip-delete test).

## Phase 4 — Portrait camera framing (FR4) [checkpoint: 8958fcb]

- [x] Task: Aspect-aware overview framing in `init-scene.ts` resize — full 16×16 meadow in view in tall viewports; landscape unchanged; ride/follow untouched
  - Acceptance: in portrait the whole meadow stays framed with the same oblique angle; in landscape the existing overview is unchanged; ride follow and reduced-motion fixed view are unaffected.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 34/34 (tablet + phone). Debugging: two-phase fix — (1) pullback applied only in portrait (landscape untouched) and camera position applied immediately; (2) `cellToScreen` rejected meadow NDC z≈1 (meadow sits at the camera's far plane) — switched to a finite-coordinate check so the ✕ chip anchor and tests work on phones. Tests moved from blind 24px sweeps/ratios to exact `cellToScreen` targets.
  - Files: `src/scene/init-scene.ts` (mutable overviewBase, frameOverview on resize, portrait-only pullback), `src/scene/track-renderer.ts` (cellToScreen finite check + camera matrix refresh), `e2e/smoke.spec.ts` (tap/delete/walkthrough use cellToScreen).

## Phase 5 — Production hygiene (FR5) [checkpoint: 6841097]

- [x] Task: Document `@fontsource/baloo-2` in `tech-stack.md` (before implementation)
  - Acceptance: tech-stack.md lists @fontsource/baloo-2 as the bundled kid-font source (no runtime font download).
- [x] Task: Add `@fontsource/baloo-2`, import in `main.ts`, keep fallback stack
  - Acceptance: the app bundles Baloo 2 (offline-safe) and renders the playful font; fallback stack stays for the rare non-loaded case.
- [x] Task: Gate the debug grid toggle to `import.meta.env.DEV`
  - Acceptance: production builds mount no `#` grid toggle; dev builds and e2e still see it.
- [x] Task: iOS PWA meta (`apple-mobile-web-app-capable`, `apple-touch-icon`, status bar style)
  - Acceptance: an iOS Add-to-Home-Screen installs as standalone with a proper icon and themed status bar.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 34/34 dev (toggle present) + production build served and asserted no `.grid-toggle`, rail intact. `pnpm build` green (font bundled, PWA regenerated).
  - Files: `conductor/tech-stack.md` (font row), `package.json`/`pnpm-lock.yaml` (@fontsource/baloo-2 ^5.3.0), `src/main.ts` (font import), `src/ui/app.ts` (toggle gated to DEV + guarded wiring), `index.html` (apple meta + touch icon), `e2e/smoke.spec.ts` (PROD_E2E toggle-absent guard).

## Phase 6 — E2E gesture coverage (FR6.2) [checkpoint: bf81e55]

- [x] Task: Scripted touch test — place piece → tap rotates → lift-drag to ✕ chip/trash deletes; console-error and zero-external-request assertions
  - Acceptance: (1) tap-rotate covered by the Phase 2 smoke test, (2) ✕-chip delete covered by the Phase 3 smoke test, (3) drag-to-trash covered by a new trash-drop smoke test, all with zero console errors; zero external requests asserted at boot.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Verification Report (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 36/36 (18 tablet + 18 phone) — tap-rotate, ✕-chip delete, and drag-to-trash each pass on both projects.
  - Files: `e2e/smoke.spec.ts` (drag-to-trash test using cellToScreen start + trash bin center drop).

## Final gate ✅

- [x] Task: `biome check`, `tsc --noEmit`, vitest, full Playwright suite (tablet + phone) green
  - Acceptance: every gate passes on a clean run; the production build (`pnpm build`) also succeeds.
  - Verification (2026-08-30): biome clean · tsc clean · vitest 221/221 · Playwright 36/36 (tablet + phone) · `pnpm build` succeeded (precache 138 entries).

## Phase: Review Fixes

- [x] Task: Apply review suggestions 8e968a0
