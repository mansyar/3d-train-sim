# Phase 2 Verification — Paged drawer UI and outside-drag removal

- **Track:** `toybox-clarity_20261119` — Toybox Clarity and Outside-Drag Removal
- **Phase:** 2 — Paged drawer UI and outside-drag removal
- **Date:** 2026-11-19
- **Branch:** `feat/toybox-clarity_20261119`
- **Phase base:** `0879c9b99dba8f8239485fadd6ae01032ba043bd`
- **Code head at verification:** `912f32d10487834a6b155bc2416e1146800e6636` (`feat(toybox): page dense tabs and remove toys beyond the board`)
- **Test head at verification:** `223e7fa5caade29c71ec88a396daf1d7f26e2b76` (`test(e2e): cover paged toybox and outside-board removal on tablet and phone`)
- **Result:** verified

## Commands

| Command | Scope | Result |
| --- | --- | --- |
| `pnpm check` | `biome check .` + `tsc --noEmit` + `vitest run` | Pass — 199 files checked; 57 test files, 1015/1015 unit tests passed |
| `pnpm build` | `vite build` + PWA precache | Pass — 116 modules transformed; 178 precache entries generated |
| `pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts` | tablet + phone projects | Pass — 32 passed, 1 skipped (`@ci` frame-rate canary), 0 failed |

The verification command was run exactly as specified in the phase brief. Pre-existing warnings only: Vite `configLoader: 'native'` notice, a >500 kB bundle notice, and THREE's `PCFSoftShadowMap` deprecation log. `e2e/prod.spec.ts` was updated but is owned by the separate `prod` Playwright project and was not part of this command's file list.

## Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-2 | Pass | Rails renders three `.drawer-page` panes of at most four slots; `.page-dot` names are `Toybox page N of 3`; dot taps and empty-gap mouse swipes move `scrollLeft` and update `aria-current`; switching tabs and back preserves the remembered page; reload starts every tab at page 1. Verified on tablet and phone in `toybox-clarity.spec.ts`. |
| AC-3 | Pass | `slot presses still place toys while empty-space drags only page` drags the first Rails slot to cell (6,8), asserts one placed piece and asserts the scroller `scrollLeft` did not change. |
| AC-4 | Pass | Lifting a placed piece and moving past the board edge shows `.removal-preview`; release calls `world.remove`/`removeScenery` with a soft `.removal-puff`, and `.undo-toggle` restores the toy in one tap. Verified on tablet and phone in smoke, undo and toybox-clarity specs. |
| AC-5 | Pass | `re-entry, pointer loss and new toys never remove a placed piece` drags a fresh drawer slot to the outside point and asserts the existing piece count is unchanged. Fresh drags have `pickedId === null` and can never enter the removal branch. |
| AC-6 | Pass | Same test drifts outside (preview visible), returns to the home cell (preview hidden), then releases; the world still holds the piece. |
| AC-7 | Pass | `.trash-slot` markup, styles and wiring are gone; `grep` over `src` finds no trash-slot reference; smoke/ride/prod e2e assert `toHaveCount(0)`. The delete ✕ chip and soft return animation are retained. |
| AC-8 | Pass | Full configured matrix (Biome, TypeScript, Vitest, Vite build, Playwright tablet + phone) is green. |
| AC-9 | Pass | Dots carry `aria-label="Toybox page N of M"` and `aria-current`; `e2e/a11y.spec.ts` was **not modified** and its unmodified four-state axe sweep passes. No reading text was added to the kid UI. |

## E2E selector changes

- `e2e/smoke.spec.ts`: build-journey title and the old drag-to-`.trash-slot` step replaced with an outside-board drag that asserts `.removal-preview` visible, then absent, and undo restoration; added an absent-bin assertion.
- `e2e/undo.spec.ts`: the trash test no longer calls `world.remove(id)` directly — it drags the placed piece past the board, checks the preview, removes, then undoes and reloads.
- `e2e/ride-toybox-flow.spec.ts`: `.trash-slot` visibility assertions replaced with `toHaveCount(0)`; the old panel `scrollWidth` overflow assertion now checks `.drawer-pages` overflow and three visible `.page-dot` elements after unlock. Slot counts still count all DOM slots (paging adds no `hidden`).
- `e2e/prod.spec.ts`: trash visible assertion changed to `toHaveCount(0)`.
- New `e2e/toybox-clarity.spec.ts`: five `@smoke` tests covering dots, four-slots-per-viewport geometry, dot/swipe paging, per-tab session memory and reload reset, drag isolation, outside removal, cancel paths, new-toy safety, undo and absent bin. Every title contains `@smoke`.
- `playwright.config.ts`: phone `testMatch` allowlist now includes `**/toybox-clarity.spec.ts`; project-level `grep: /@smoke/` unchanged.
- `e2e/a11y.spec.ts`: **not modified** (unmodified AC-9 sweep).

## Scope check

Touched files: `src/ui/toy-drawer.ts`, `src/ui/toy-drag.ts`, `src/ui/app.ts`, `src/style.css`, `playwright.config.ts`, `e2e/toybox-clarity.spec.ts`, `e2e/smoke.spec.ts`, `e2e/undo.spec.ts`, `e2e/ride-toybox-flow.spec.ts`, `e2e/prod.spec.ts`, and this evidence file. All are inside the brief's Touches.

No changes to `plan.md`, `spec.md`, `metadata.json`, `tracks.md`, `conductor/index.md`, product docs, `review.md`, `pr.md`, `src/core/drawer.ts`, `src/scene/track-ghost.ts`, `e2e/a11y.spec.ts`, lockfiles or generated `dist/`. No new storage keys, telemetry, network calls, viewport/`user-scalable` changes, parent-gate changes, disclosure changes or kid-facing text.

## Deviations

None.

## Notes

- The removal preview is a DOM overlay driven by the existing `cellFromPoint` board raycast; `track-ghost.ts` and its `SceneControls` interface were left untouched because changing them would require editing `init-scene.ts` outside Touches.
- A guard in `toy-drawer.ts` skips paging setup for structural node-test fakes that expose only `querySelectorAll`; browser panels are unaffected and the existing unit harness passes unchanged.
- Page memory lives only in the `createToyDrawer` closure (per tab, session-only) and is rebuilt on reload; gating changes call `clampPages()` so remembered pages stay in range.
- Removals stay silent (no scolding sound), keep one-tap undo via `world.remove`/`removeScenery`, and re-entry, pointercancel, blur and ride-start all cancel without committing.

## Primary verification

- Re-run at `2026-11-18T22:27:18Z` on final HEAD `854013b`: clean worktree.
- `git diff --name-only 0879c9b99dba8f8239485fadd6ae01032ba043bd..HEAD` listed exactly the eleven Touch files (including the primary-added `e2e/prod.spec.ts`); no other files changed and no merge commits exist in the range.
- Commits in range matched the subagent report exactly: `912f32d` (code), `223e7fa` (e2e), `854013b` (evidence).
- Re-ran the exact verification command: `pnpm check && pnpm build && pnpm exec playwright test e2e/toybox-clarity.spec.ts e2e/smoke.spec.ts e2e/undo.spec.ts e2e/ride-toybox-flow.spec.ts e2e/a11y.spec.ts` → exit 0. Biome checked 199 files with no fixes; tsc clean; Vitest 57 files / 1015 tests passed; Vite built 116 modules with a 178-entry PWA precache; Playwright ran 33 tests on tablet and phone with 32 passed, 1 pre-existing `@ci` skip, 0 failed.
- `grep` over `src` found no `trash-slot`, `trash bin`, or `trashSlot` reference; `e2e/a11y.spec.ts` was not modified.
- Acceptance criteria AC-2 through AC-9 are satisfied. No deviation from the approved plan.
