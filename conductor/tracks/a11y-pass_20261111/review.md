# Review: Accessibility Pass

- **Track:** `a11y-pass_20261111`
- **Type:** feature
- **Branch:** `feat/a11y-pass_20261111`
- **Range:** `0e985dbb1b7ce44b3523630e8c93857fecf0d2f8..3673bdc`
- **Date:** 2026-11-17
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track is correctly implemented and fully green. A general reviewer examined
the full 7-file code diff (small/medium volume) plus every artifact and found no
Critical or High defects: the parent-only zoom helper covers all armed/report
paths, the `role="group"` correction matches the actual `aria-pressed` tab
buttons, and axe is dev/e2e-only. One Medium finding remains — AC-3's zoom
restoration on tray disarm is implemented but only code-reviewed, not asserted
by the e2e spec — and is scheduled for Phase R1.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm check` | pass | Biome 192 files clean, tsc clean, Vitest 56 files / 988 tests |
| coverage | `pnpm test:coverage` | pass | overall 97.11% stmts / 91.16% branch / 97.79% funcs / 98.97% lines; 80% gate met |
| lint / format | `pnpm check` (Biome) | pass | 192 files clean |
| typecheck | `pnpm check` (`tsc --noEmit`) | pass | clean |
| e2e | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | pass | 1 passed — four axe states clean |
| extra regression | `pnpm exec playwright test --project=tablet --project=phone` | pass | full matrix green |
| build | `pnpm build` | pass | 114 modules, PWA precache 178 entries; pre-existing chunk warning |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `package.json`, `pnpm-lock.yaml`, `tech-stack.md:25`, `phase-1.md` | covered |
| FR-2 | P1.T2 | `src/style.css:35-38`, `e2e/a11y.spec.ts` dynamic focus assertion | covered |
| FR-3 | P1.T3 | `src/ui/parent-gate.ts:167-177` + four call sites, e2e viewport assertions | partial (F1) |
| FR-4 | P2.T1 | four axe scans in `e2e/a11y.spec.ts`, `phase-2.md` AC-4 | covered |
| FR-5 | P2.T2 | `src/ui/app.ts:87,105,107`, `src/style.css:860`, fix table in `phase-2.md` | covered |
| FR-6 | P2.T3 | `verification/contrast.md`, axe `color-contrast` enabled | covered |
| FR-7 | P2.T4 / P3.T1 | `product-guidelines.md:13`, `product.md:112` | covered |
| NFR-1 | P1.T2 / P2.T2 | diff review — no new text, gestures or targets | covered |
| NFR-2 | P1.T1 / P3.T2 | production diff review — no fetch/XHR/beacon, build clean | covered |
| NFR-3 | P1 / P3 | `pnpm check` and coverage gate green | covered |
| NFR-4 | P1.T1 | dated stack note precedes implementation | covered |
| AC-1 | P1.T1 | `integrated.md` AC table, `pnpm check` | covered |
| AC-2 | P1.T2 | dynamic focus assertion in `e2e/a11y.spec.ts` | covered |
| AC-3 | P1.T3 | tray-open and reload paths asserted; disarm restore code-reviewed only | partial (F1) |
| AC-4 | P2.T1 | four axe scans, 1 passed | covered |
| AC-5 | P2.T3 | `contrast.md`, zero color-contrast violations | covered |
| AC-6 | P2.T2 | four logged fixes in `phase-2.md` | covered |
| AC-7 | P2.T4 / P3.T1 | guidelines line 13, roadmap marker | covered |
| AC-8 | P3.T2 | `integrated.md` traceability, full gate | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — AC-3 disarm zoom restoration is not behaviorally tested**
  - **File:** `e2e/a11y.spec.ts:80-88`
  - **What:** The spec asserts `user-scalable=yes` while the parent tray is open and `user-scalable=no` after a page reload, but never asserts restoration when the tray is dismissed by tapping outside. `disarmConfirm() → setParentZoom(false)` and `clearPortableReport() → setParentZoom(false)` are implemented in `src/ui/parent-gate.ts` but were only code-reviewed.
  - **Why:** A regression in those calls would leave pinch zoom enabled after the tray closes, exposing zoom to the kid UI — the exact kid-safety property AC-3 protects — with no automated test to catch it.
  - **Fix:** In the parent-tray step, after the axe scan, tap outside the tray and assert the viewport meta content returns to `user-scalable=no`; optionally re-arm and assert `user-scalable=yes` again.
  - **Requirement:** AC-3 / FR-3
  - **Test gap:** Dynamic assertion for zoom restoration on tray disarm via tap-outside.

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All three phases have uncommented `Result`, `Checkpoint` and `Evidence` blocks,
all tasks are `[x]`, and the final diff stays within the declared Touches plus
three recorded deviations (renovate grouping, `meta-viewport` rule id, hidden
`.insights-unavailable` fallback). No task was dropped and no squash was used
because the active goal prohibits `reset`.

## Out of scope

- The hidden `.insights-unavailable` fallback contrast pair (4.28:1) is a
  pre-existing, axe-unreported pair documented in `contrast.md` for a future
  design pass; it is not changed by this track.
- Human clarity-audit sessions and their measured values remain outside this
  track.

## Debt

- None outstanding; F1 is fixed in Phase R1 rather than deferred.

## Doc sync

`pending` at review time — post-review sync will refresh `integrated.md` and
`metadata.json` after Phase R1.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 | 0 (R1 scheduled) |
