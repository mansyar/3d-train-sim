# Phase 2 Verification — Drawer livery section

- **Track:** 20261128-expression-liveries
- **Phase:** 2 — Drawer livery section (B. Expression — paint/sticker liveries)
- **Date:** 2026-11-28
- **Branch:** `feat/20261128-expression-liveries`
- **Head commit (unchanged, no commits made):** `e413bcead6362b6fb4ab214b488b19e8f786fbaf`
- **Result:** verified

## Goal

The train drawer shows an icon-only livery section for the selected vehicle: six paint
swatches, four sticker shapes and one restore-default control, all ≥64 px with visible
feedback on every tap (FR-1, NFR-1, NFR-4, AC-1).

## Tasks

| Task | Title | Status | Evidence |
| --- | --- | --- | --- |
| P2.T1 | Livery tray section | done | `src/ui/train-picker.ts` — `.livery-section` wraps as its own flex row; 6 colour discs, 4 glyphs, 1 reset glyph, wordless tally dots; all 11 buttons are inline-styled 72×72 px with `aria-label`s and no visible words. |
| P2.T2 | Vehicle targeting | done | Tray targets `locoVehicleId(world.train())`, refreshed inside the existing `refreshTrainChoices` world subscription and on every store notification for the current id. Per-train isolation proven in the DOM by the fourth e2e test. `liveryStore` is module-scoped and exported so later phases share one source of truth. |
| P2.T3 | Drawer spec | done | `e2e/liveries-drawer.spec.ts` — 4 tests, Red run failed on the missing `.livery-section`, Green run 4/4 passed on `[tablet]`. |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Red — spec first | `pnpm exec playwright test e2e/liveries-drawer.spec.ts` | 1 | All 4 tests failed at `expect(locator('.livery-section')).toBeVisible()` — the section did not exist yet. Expected Red. |
| Green — implementation | `pnpm exec playwright test e2e/liveries-drawer.spec.ts` | 0 | 4 passed on `[tablet]` (12.9 s). |
| Static gates, first run | `pnpm check` | 1 | Biome only: import sort in both touched files plus three formatter line-wrap findings. No tsc or vitest errors. |
| Formatter fix attempt | `pnpm exec biome check --write src/ui/train-picker.ts e2e/liveries-drawer.spec.ts` | n/a | Shell permission denied; the identical safe fixes were applied with the `edit` tool instead. No workaround outside Touches. |
| Static gates, final | `pnpm check` | 0 | `biome check .` clean (222 files), `tsc --noEmit` clean, `vitest run` 63 files / 1091 tests passed. |
| Final regression | `pnpm exec playwright test e2e/liveries-drawer.spec.ts` | 0 | 4 passed (12.6 s) after the formatting edits. |
| Git inspection | `git rev-parse HEAD`; `git status --short`; `git diff --stat` | 0 | HEAD unchanged; only `M src/ui/train-picker.ts` and `?? e2e/liveries-drawer.spec.ts` (plus this evidence file). No commits made. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Six paints, four stickers, one restore in the drawer | Test 1 asserts exact `6/4/1` counts and 11 buttons total; paints use `PAINT_SWATCHES` ids and aria strings from the shared catalogue. | verified |
| NFR-1 | Visible feedback <100 ms per tap | `tapAndTime` measures `performance.now()` across a real `button.click()` in one browser task; every paint, sticker and restore tap asserts `<100` ms, plus a drawn 4 px highlight, changed background and same-task WAAPI bounce (skipped when `prefersStill`). | verified at drawer level |
| NFR-4 | No reading required | Every one of the 11 buttons has an accessible name but a trimmed `textContent` of at most one glyph; paint faces are colour discs, stickers are glyphs, restore is `↺`; a dot row shows stamp count wordlessly. | verified |
| AC-1 | Tap → immediate drawer reaction | Paint selection outline, most-recent-sticker outline and the live `data-sticker-count` / tally update synchronously in the same click task. | verified |
| — | Per-train state, no cross-talk | Test 4 paints + stamps steam, switches to diesel (no paint pressed, count 0), switches back (cherry pressed, count 1). | verified |
| — | Clean console | All four tests use `watchConsoleErrors(page)` and assert zero errors. | verified |

## Files changed

- `src/ui/train-picker.ts` — livery section, store creation, click wiring, store subscription, in-place refresh helpers.
- `e2e/liveries-drawer.spec.ts` — new targeted drawer spec (Red first).
- `conductor/tracks/20261128-expression-liveries/verification/phase-2.md` — this evidence file (outside Touches, expressly permitted).

## Deviations

None. All source/test changes stayed inside the two phase Touches; the stylesheet, store,
save plumbing, `app.ts` and `main.ts` were not edited.

## Open questions

1. **Shared store ownership.** No app-owned livery store instance is wired anywhere yet — Phase 1 created only the pure factory plus save plumbing. Phase 2 therefore creates and exports `liveryStore` from `train-picker.ts`. Scene repaint (Phase 3) and reload hydration (Phase 5) must import this instance or hoist it into app scope, which will likely widen those phases' Touches to `src/ui/app.ts` / `src/main.ts`. No product decision was needed here.
2. **Wagon targeting.** The brief mentions `wagonVehicleId(kind, slot)` alongside `locoVehicleId(kind)`, but the drawer has only a loco row and a wagon-preset row — there is no per-wagon selection to aim at. This phase targets the selected locomotive only; wagon-side application belongs to the scene-side phase.
3. **Drawer layout crowding.** The livery row is added inside `.train-drawer` with inline styles because `src/style.css` is outside Touches. If the third row crowds small screens in visual review, a follow-up CSS task should tune it rather than expanding this phase.

## Notes

- The tray updates in place and is never rebuilt, so the single `liveryStore.subscribe` listener cannot accumulate on a re-render; no second `world.subscribe` was added — livery re-aim rides the existing `refreshTrainChoices`.
- Scene material changes and sound rewards remain explicitly out of scope; the drawer itself supplies the instant feedback, so NFR-1 is proven at the layer this phase owns.
- `button.animate` is feature-detected and skipped for `prefersStill`; it does not affect the synchronous attribute/style writes the spec measures.
- The Vite `configLoader: 'native'` and `THREE.WebGLShadowMap` warnings are pre-existing and unrelated to this phase.
- No commits were made, per the brief.

## Primary verification (independent, 2026-11-28)

- Tree vs Touches: working tree holds exactly `M src/ui/train-picker.ts`,
  `?? e2e/liveries-drawer.spec.ts`, `?? verification/phase-2.md`. No other files.
- `pnpm check` re-run by the primary: exit 0 (biome + tsc + 63 files / 1091 tests).
- `pnpm exec playwright test e2e/liveries-drawer.spec.ts` re-run by the primary:
  exit 0 — 4 passed.
- AC check: P2.T1–T3 cover FR-1 (section renders, 6+4+1 icon-only ≥64px), NFR-1
  (drawer-level selected-state feedback on every tap), NFR-4 (no visible text;
  aria-labels only), P2.T2 per-train isolation (switching selection re-renders
  from the store).
- Accepted notes on the executor's open questions:
  1. `liveryStore` instance lives in `train-picker.ts`; Phase 3/5 briefs will widen
     Touches if they need to import or hoist it.
  2. Tray targets the selected loco only — the drawer has no wagon-selection UI,
     so there is nothing to follow; wagon liveries apply at scene level (Phase 3)
     and are proven in the Phase 5 six-train evidence. Recorded as accepted scope.
  3. Inline styles in the livery row (style.css out of Touches) accepted; visual
     tuning, if needed, is a separate task.
- Decision: ACCEPT.
