# Phase 2 Verification — Axe sweep and bounded fixes

- **Track:** `a11y-pass_20261111` — Accessibility Pass
- **Phase:** 2 — Axe sweep and bounded fixes
- **Date:** 2026-11-17
- **Branch:** `feat/a11y-pass_20261111`
- **Base commit:** `6b395d0ed0c5d3f98592d0c195d521d5a07bfec6`
- **Head commit:** `ebe1aed788cac1f0235e0193613dfe9cc4ace6eb` (final implementation commit; this evidence file is committed immediately after)
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| E2E (diagnostic 1) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 1 | axe rejected the literal rule id `viewport` (`unknown rule`) — corrected to axe-core 4.14's WCAG 2 AA id `meta-viewport`. |
| E2E (diagnostic 2) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 1 | `aria-required-children` (critical, wcag2a) on `.drawer-tabs` `role="tablist"`; fixed as recorded below. |
| E2E (diagnostic 3) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 1 | 6 × `color-contrast` on `.insights-list dt` and 2 × `label-content-name-mismatch` on the save/load buttons; fixed as recorded below. |
| E2E (final verification) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 0 | `1 passed` — all four tablet states axe-clean; zoom and focus assertions pass. |
| Static (first pass) | `pnpm check` | 1 | Biome formatting diff in `e2e/a11y.spec.ts`; reformatted to the project style. |
| Static (final) | `pnpm check` | 0 | Biome 192 files clean, `tsc --noEmit` clean, Vitest 56 files / 988 tests passed. |

The verification command was run exactly as specified; its final exit was 0. A failing fix
was retried at most twice per defect (each defect fixed once, then re-scan).

## Acceptance criteria

| AC | Requirement | Result | Evidence |
| --- | --- | --- | --- |
| AC-4 | Four tablet states have zero axe violations (idle, drawer open, tray open, riding) | verified | `e2e/a11y.spec.ts`: four `AxeBuilder` scans with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, only `meta-viewport` disabled, `color-contrast` enabled; final run `1 passed`. |
| AC-5 | Contrast passes; computed token ratios documented | verified | `contrast.md` — calculated ratios and AA thresholds; `color-contrast` 0 violations in all four states after the `.insights-list dt` fix (4.28 → 4.87:1). |
| AC-6 | Every ARIA fix logged with file + reason | verified | Table below lists all four axe-reported fixes with file, line, rule and reason. |
| AC-7 | Product guidelines record the settled zoom resolution | verified | `conductor/product-guidelines.md` line 13: kid-mode `user-scalable=no` by default, pinch zoom only while the parent tray is visible via the existing viewport helper, restored on disarm/reload; toddler experience stays zoom-free. E2E asserts `user-scalable=yes` with the tray visible and `user-scalable=no` after reload. |

AC-2 is also proven dynamically in the same spec: keyboard focus of the representative
`.whistle-toot` yields `outlineStyle === 'solid'` and `outlineWidth === '3px'`; a pointer
tap on the same control does not match `:focus-visible`. No kid-visible text or target
size was changed.

## Every axe-reported fix

| # | File : line | axe rule | Before → after | Reason |
| --- | --- | --- | --- | --- |
| 1 | `src/ui/app.ts:87` | `aria-required-children` (critical, wcag2a / 1.3.1) | `role="tablist"` → `role="group"` on `.drawer-tabs` | The five drawer buttons use `aria-pressed` toggle semantics and control `hidden` panels; they are not `role="tab"` (no `aria-controls`, no tabpanel, no arrow-key contract). A labelled `group` matches the existing `.toy-drawer` / `.preset-tray` groups and the actual behaviour. Minimal: one attribute; no redesign or new controls. |
| 2 | `src/ui/app.ts:105` | `label-content-name-mismatch` (serious, wcag21a / 2.5.3) | `.portable-export` `aria-label="Save the meadow as a file"` → `"Save meadow — save the meadow as a file"` | The visible text "Save meadow" must be part of the accessible name. Kept the parent-facing description while satisfying the rule. |
| 3 | `src/ui/app.ts:107` | `label-content-name-mismatch` (serious, wcag21a / 2.5.3) | `.portable-import` `aria-label="Load a meadow from a file"` → `"Load meadow — load a meadow from a file"` | Same as #2 for the visible text "Load meadow". |
| 4 | `src/style.css:860` | `color-contrast` (serious, wcag2aa / 1.4.3) | `.insights-list dt` `opacity: 0.75` → `0.8` | The six parent-panel labels rendered `#907056` on `#fff8e7` (4.28:1 vs 4.5 required). At 0.8 they render `#89664d` (4.87:1). Smallest change that clears the rule without altering layout, text or control set; `color-contrast` remains enabled. |

No product or design decision was required; no fix was blocked. No changes outside the
phase's Touch list.

## Evidence paths

- `e2e/a11y.spec.ts` — four axe scans, viewport assertions, dynamic AC-2 focus proof.
- `conductor/tracks/a11y-pass_20261111/verification/contrast.md` — palette token pairs, computed WCAG ratios, AA thresholds, axe results.
- `conductor/tracks/a11y-pass_20261111/verification/phase-2.md` — this report.

## Deviations

- The brief's literal `disableRules(['viewport'])` is not accepted by the installed axe-core 4.14 (`unknown rule 'viewport' in options.rules`). The WCAG 2 AA viewport rule's actual id in this version is `meta-viewport`; the spec uses `disableRules(['meta-viewport'])`. This is the smallest tooling-accurate correction: still exactly one disabled rule, still justified by kid mode being intentionally zoom-free with parent zoom asserted directly. `meta-viewport-large` is `best-practice` tagged and not in the selected tag set, so it is not disabled.

## Notes

- Phase 1 artifacts (`@axe-core/playwright`, the `:focus-visible` ring, the viewport helper) were verified through this phase's e2e and not re-implemented.
- The ride scan uses the existing test route: `clearMeadow`-equivalent dev-handle reset, a 2×2 corner loop via `world.place`, `.ride-toggle` click, then assertions on `.is-riding` and `__tinyTracksScene.ridingTrainCount() === 1` before scanning.
- `contrast.md` records one pre-existing low-contrast pair (`.insights-unavailable`, opacity 0.75 → 4.28:1) that is hidden in all four scanned states and was not reported by axe; per the "fix only where axe reports a violation" rule it was left unchanged and flagged for a future design pass.
- Task commits: `5104acc` (P2.T1), `8cf2cbb` (P2.T2), `459532a` (P2.T3), `ebe1aed` (P2.T4). This evidence file follows in a separate documentation commit.
