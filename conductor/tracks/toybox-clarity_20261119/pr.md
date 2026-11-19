## Summary

Dense toybox tabs now show four pieces at a time with page dots and swipe, with page choice remembered per tab for the session. Placed toys are removed by dragging them beyond the board with a removable preview and one-tap undo; the old trash bin is gone. Track-piece icons are curated, hand-authored SVGs restored from the pre-track source so each piece reads intuitively at 48×48; the temporary GLB generator pipeline was removed, with no runtime WebGL or new dependencies.

## Track

- **ID:** `toybox-clarity_20261119`
- **Type:** `feature`
- **Spec:** [`conductor/archive/toybox-clarity_20261119/spec.md`](conductor/archive/toybox-clarity_20261119/spec.md)
- **Plan:** [`conductor/archive/toybox-clarity_20261119/plan.md`](conductor/archive/toybox-clarity_20261119/plan.md)
- **Review:** [`conductor/archive/toybox-clarity_20261119/review.md`](conductor/archive/toybox-clarity_20261119/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Paged drawer model and geometry icons | Add a pure paging model | verified | `6fbbe35740af28388ba112b1050f8ddaf80f4838` | One rework for generator write mode and an import-order fix; superseded by R2 |
| 2: Paged drawer UI and outside-drag removal | Ship dots/swipe paging, session page memory, outside-board removal, and trash removal | verified | `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938` | Added `e2e/prod.spec.ts` to Touches because it asserted the old trash bin; `e2e/a11y.spec.ts` was left unchanged |
| R1: Review Fixes | Assert tab-switch page memory and differentiate colliding generated icons | verified | `d110f58f7bac3127b1be5d3771e0ebba662830e1` | Fixed F1 (Medium) and F2 (Low) in strict mode; superseded by R2 |
| R2: Hand-Drawn Icon Clarity | Restore intuitive hand-authored SVG icons and delete the generator pipeline | verified | `081da87665f797a39c2a418a01689f30e6bc34eb` | Parent rejected geometry-derived silhouettes; generator and generated module removed; spec/product rule updated |

## Requirements

- [x] `FR-1` — Rails/Adventure/Town page at most four slots at a time (test: `e2e/toybox-clarity.spec.ts`)
- [x] `FR-2` — Page dots and empty-space swipe change pages; Nature/Critters stay single-page (test: `e2e/toybox-clarity.spec.ts`)
- [x] `FR-3` — Page choice is kept per tab for the session and resets on reload (test: `e2e/toybox-clarity.spec.ts`)
- [x] `FR-4` — A lifted placed piece beyond the board shows a removable preview and is deleted on release (test: `e2e/toybox-clarity.spec.ts`)
- [x] `FR-5` — Re-entry, pointer loss, and fresh drawer toys never remove a placed piece (test: `e2e/toybox-clarity.spec.ts`)
- [x] `FR-6` — The trash bin is removed from markup, styles, wiring, and selectors (test: `e2e/toybox-clarity.spec.ts`, `e2e/prod.spec.ts`)
- [x] `FR-7` — Removal keeps the existing one-tap undo and a soft animation (test: `e2e/smoke.spec.ts`, `e2e/undo.spec.ts`)
- [x] `FR-8` — Every track piece has a hand-authored, intuitive static SVG icon in `src/ui/toy-icons.ts` (test: `src/core/drawer.test.ts`, `e2e/toybox-clarity.spec.ts`)
- [x] `NFR-1` — No telemetry, network calls, storage keys, or save-format changes
- [x] `NFR-2` — Kid UI remains icon-only with tap/drag inputs; no new reading or long-press
- [x] `NFR-3` — Configured lint, typecheck, unit, coverage, build, e2e, and audit gates pass
- [x] `NFR-4` — No disclosure, parent-gate, viewport, catalog, gating, or release-workflow changes
- [x] `NFR-5` — Manual-device feel remains explicitly human-only
- [x] `NFR-6` — No generator module, generated icon module, baked PNG, runtime WebGL, or new dependency remains
- [x] `AC-1` — Unit tests prove page grouping
- [x] `AC-2` — Tablet and phone e2e prove dots, swipe, page memory, and tab-switch-and-back
- [x] `AC-3` — Slot pointer presses still place toys while empty-space drags only page
- [x] `AC-4` — Lifted placed toys preview removal beyond the board and release deletes them
- [x] `AC-5` — Fresh drawer toys dragged outside never remove a placed piece
- [x] `AC-6` — Re-entry and pointer loss cancel pending removal
- [x] `AC-7` — No `.trash-slot` selector remains in active source or e2e
- [x] `AC-8` — Full configured matrix passes on final branch content
- [x] `AC-9` — Dots are accessible and the unchanged four-state axe sweep passes
- [x] `AC-10` — All `PieceType` icons are distinct hand-authored SVGs with no generator or runtime WebGL

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint | `pnpm exec biome check .` | Pass — 198 files, no fixes | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| typecheck | `pnpm exec tsc --noEmit` | Pass | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| unit | `pnpm test` | Pass — 57 files, 1016 tests | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| coverage | `pnpm test:coverage` | Pass — 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| build | `pnpm build` | Pass — Vite 115 modules, PWA 178 precache entries | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| e2e | `pnpm exec playwright test` | Pass — 84 passed, 1 pre-existing `@ci` skip, 0 failed across tablet/phone/prod | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |
| audit | `pnpm audit --audit-level=high` | Pass — 5 vulnerabilities (1 low, 4 moderate), no high | `conductor/archive/toybox-clarity_20261119/verification/integrated.md` |

## Media

Captured at final hand-authored-icon state on `feat/toybox-clarity_20261119`: the Rails tab shows four colorful, recognizable piece icons and three page dots; page three shows the reduced final page; a lifted placed piece shows the beyond-board removal preview with the undo control still available.

![Toybox paging and outside-board removal](.conductor/media/toybox-clarity_20261119/toybox-clarity.gif)

## Review

- **Verdict:** `PASS`
- **Rounds:** 3
- **Fixed:** F1 Medium (tab-switch page-memory assertion), F2 Low (colliding generated icons), F1-R2 Low (stale generator bullet in spec)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Several `node`, `git rm`, and verification commands were denied to phase subagents by the tool permission layer and were executed verbatim by the primary, with outputs appended to the phase briefs and evidence.
- Feedback came from one informal parent observation only. No timing numbers, three-child gate claims, or measured v1.0 results are asserted.
- Manual iPad Safari / Android Chrome feel remains human-only.
- Phase 1/R1 used a generated-icon pipeline that was later rejected by the parent and fully removed in R2; its checkpoints are retained for traceability only.

## Follow-ups

- `conductor/product.md` now records the piece/icon contract: whenever a track piece is added or changed, its icon must be updated in the same change.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No data migration or feature flag. The removal interaction uses the existing world remove/undo path, and reverting restores the previous trash-slot interaction without changing saved worlds.
