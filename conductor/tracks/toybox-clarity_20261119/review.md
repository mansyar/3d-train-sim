# Review: Toybox Clarity and Outside-Drag Removal

- **Track:** `toybox-clarity_20261119`
- **Type:** feature
- **Branch:** `feat/toybox-clarity_20261119`
- **Range:** `6d762f35363010f0abd6f360850fa060d414b6ad..8e18980b79232387017e4612b2914a60c55bb642`
- **Date:** `2026-11-18T22:59:01Z`
- **Verdict:** PASS WITH FINDINGS

## Summary

The track fully implements paged dense tabs, accessible dots and swipe, session-only per-tab page memory, outside-board removal with preview and one-tap undo, trash removal, and deterministic GLB-derived icons. The full configured matrix is green. Two non-blocking findings remain: AC-2's tab-switch-and-back preservation is implemented but not asserted by e2e, and several distinct pieces render byte-identical generated icons, weakening icon-only scanability.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm test` | pass — 57 files, 1015 tests | `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — 97.07% stmts / 91.21% branches / 97.41% funcs / 98.87% lines | `verification/integrated.md` |
| lint | `pnpm exec biome check .` | pass — 199 files, no fixes | primary re-run on final HEAD |
| format | `pnpm exec biome check .` | pass — no fixes | primary re-run on final HEAD |
| typecheck | `pnpm exec tsc --noEmit` | pass | primary re-run on final HEAD |
| generator | `node scripts/generate-piece-icons.mjs --check` | pass — 19 silhouettes, no diff | `verification/integrated.md` |
| build | `pnpm build` | pass — Vite 116 modules, PWA 178 precache entries | `verification/integrated.md` |
| e2e | `pnpm exec playwright test` | pass — 82 passed, 1 pre-existing `@ci` skip, 0 failed | `verification/integrated.md` |
| audit | `pnpm audit --audit-level=high` | pass — 1 low, 4 moderate below threshold | `verification/integrated.md` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | `src/core/drawer.ts`, P1.T1 | `src/core/drawer.test.ts`, AC-1 | covered |
| FR-2 | `src/ui/toy-drawer.ts`, P2.T1 | `e2e/toybox-clarity.spec.ts`, AC-2/AC-3/AC-9 | covered |
| FR-3 | `src/ui/toy-drawer.ts`, P2.T1.4 | `e2e/toybox-clarity.spec.ts`, AC-2 | partial — F1 |
| FR-4 | `src/ui/toy-drag.ts`, `src/ui/app.ts`, P2.T2 | e2e toybox/smoke/undo, AC-4/AC-5/AC-6 | covered |
| FR-5 | `src/ui/toy-drag.ts`, `src/style.css`, P2.T2.3 | e2e toybox, AC-4 | covered |
| FR-6 | `src/ui/app.ts`, `src/style.css`, P2.T2.4 | e2e prod/smoke/ride-toybox-flow, AC-7 | covered |
| FR-7 | P1/P2 verification | `verification/integrated.md`, AC-8 | covered |
| FR-8 | generator + generated icons + `toy-icons.ts`, P1.T2 | generator check + unit generation assertion, AC-10 | covered — F2 quality note |
| NFR-1 | whole diff | integrated scope check | covered |
| NFR-2 | accessible dots, no kid reading | a11y sweep unmodified, AC-9 | covered |
| NFR-3 | tap/drag only, undo preserved | e2e smoke/undo | covered |
| NFR-4 | full verification matrix | `verification/integrated.md` | covered |
| NFR-5 | no disclosure/parent/viewport/catalog/release changes | diff scope | covered |
| NFR-6 | deterministic offline generator | `--check`, phase-1 evidence | covered — F2 quality note |
| AC-1 | P1.T1.3 | `drawer.test.ts` | covered |
| AC-2 | P2.T1 | `toybox-clarity.spec.ts` | partial — F1 |
| AC-3 | P2.T1.2 | `toybox-clarity.spec.ts:170-195` | covered |
| AC-4 | P2.T2.1/P2.T2.2 | e2e toybox/smoke/undo | covered |
| AC-5 | P2.T2.2 | `toybox-clarity.spec.ts:257-267` | covered |
| AC-6 | P2.T2.2 | `toybox-clarity.spec.ts:241-247` | covered |
| AC-7 | P2.T2.4 | e2e + source grep | covered |
| AC-8 | P2.T3 | `verification/integrated.md` | covered |
| AC-9 | P2.T1.1/P2.T3.2 | e2e dots + unmodified axe sweep | covered |
| AC-10 | P1.T2 | generator check + generated-icon unit assertion | covered |

## Findings

### Critical

<none>

### High

<none>

### Medium

#### F1 — AC-2 tab-switch page memory is not asserted

- **File:** `e2e/toybox-clarity.spec.ts:101-146`
- **What:** The first test moves Rails to a non-first page, then clicks Nature and Critters and never returns to Rails; the second test covers reload reset only. No e2e assertion covers switching away from a paged tab and back.
- **Why:** `verification/phase-2.md` claims AC-2 was verified, but `FR-3`/AC-2 include preserving the selected page across a tab switch. A regression in `revealPage`/remembered page would pass the suite.
- **Fix:** After moving Rails to a non-first page, click Nature, click Rails again, and assert the same dot has `aria-current="page"` and the expected slots are in the viewport.
- **Requirement:** AC-2, FR-3
- **Test gap:** Add the tab-switch-away-and-back assertion to `e2e/toybox-clarity.spec.ts`.

### Low

#### F2 — Several distinct pieces share identical generated icons

- **File:** `src/ui/generated-piece-icons.ts:45-80`
- **What:** `slope-up` equals `hill`, `bump-up` equals `hill-half`, `slope-down` equals `bump-down`, and `straight` equals `bridge` because both ship the same GLB. The generator derives faithfully but does not use the spec's allowed per-piece framing/line-weight differentiation.
- **Why:** Adjacent Rails page 2 icons are indistinguishable in an icon-only kid UI, a regression from the previous hand-drawn icons and a minor erosion of scanability. `FR-8` remains literally satisfied, so this is Low.
- **Fix:** In `scripts/generate-piece-icons.mjs`, detect identical projected silhouettes and apply deterministic per-piece framing or line-weight tweaks, regenerate the committed file, and add a unit check that no two PieceTypes sharing a drawer page have identical icon strings.
- **Requirement:** FR-8, NFR-6
- **Test gap:** Add a generated-icon uniqueness assertion within each paged drawer page.

## Overrides

<none>

## Plan compliance

Both implementation phases are `verified`, checkpoints `6fbbe35740af28388ba112b1050f8ddaf80f4838` and `475bbe0b1390c1020e9f2d3ec2ed9a44c9d3b938`, all 22 task lines `[x]`. One primary decision is recorded: `e2e/prod.spec.ts` was added to Phase 2 Touches because it asserted the old trash bin. A review fix phase is required for F1 and F2 under strict mode.

## Out of scope

Station cargo visuals, richer sky, longer trains, new piece types, release workflow, manual device work, and any v1.0 audit gate claim. The one-child session remains informal qualitative feedback only.

## Debt

<none>

## Doc sync

pending — roadmap annotation was added pre-review; post-review sync will confirm it and update this line.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 1 | 0 |
