# Phase 2 verification — Drawer controls

Track: `20261128-longer-trains` · Phase: 2 · Date: 2026-11-28 · Executor: subagent (no commits, working tree left for primary verification)

## TDD — Red first

The e2e spec was written before any drawer code was changed.

Command: `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts`
Exit code: **1**

Output summary:

```
Running 3 tests using 1 worker
  x  1 [tablet] ... the + slot grows the consist to four wagons and then silently stops (8.5s)
  x  2 [tablet] ... the + slot dims without a fitting loop and re-enables when the loop grows (8.5s)
  x  3 [tablet] ... wagon taps select for dressing and tapping the last wagon removes it (8.3s)

Error: expect(locator).toBeVisible() failed
Locator: locator('.consist-row')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
...
3 failed
```

All three tests failed at the same intended red assertion: the consist strip did not exist yet.

## Green

Command: `pnpm check`
Exit code: **0**

```
Checked 229 files in 428ms. No fixes applied.
 RUN  v4.1.11 D:/Projects/3d-train-sim
 Test Files  63 passed (63)
      Tests  1121 passed (1121)
```

Command: `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts`
Exit code: **0**

```
Running 3 tests using 1 worker
  ok 1 [tablet] ... the + slot grows the consist to four wagons and then silently stops (5.3s)
  ok 2 [tablet] ... the + slot dims without a fitting loop and re-enables when the loop grows (4.8s)
  ok 3 [tablet] ... wagon taps select for dressing and tapping the last wagon removes it (7.4s)
  3 passed (23.4s)
```

Regression guard (existing specs that use the legacy `[data-wagon]` pair presets and the drawer):
Command: `pnpm exec playwright test e2e/cargo.spec.ts e2e/starter-railway.spec.ts e2e/liveries-drawer.spec.ts`
Exit code: **0** — 12 passed (2.0m).

## Tests written

1. **Growth and cap** — `+` grows 2 → 3 → 4, tally and visible chip count follow, `aria-disabled` flips at 4, a fifth tap is a silent no-op, and the target is at least 64 × 64 px. Screenshot captured here.
2. **Fit gate** — no closed loop dims `+`; a tiny 4-cell loop holds the locomotive + two wagons but not a third, so `+` dims and ignores direct clicks; an 8-cell loop re-enables it and the tap grows to 4.
3. **Selection and removal** — middle chip selects for dressing, preset dresses only that wagon (legacy pair preset untouched), tapping the last chip removes it, the final wagon cannot be removed, and switching trains clears the selection and re-aims the pair presets. Console errors are asserted empty in every test.

## Screenshot

`.conductor/media/20261128-longer-trains/plus-tap-states.png` — tablet drawer at four wagons: four chip slots, dimmed grey `+`, tally `4`, no clipping or overlap. Gitignored (`.conductor/`), never committed.

## Commands run (chronological)

| # | Command | Exit |
|---|---------|------|
| 1 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts` (Red) | 1 |
| 2 | `pnpm check` (biome formatter feedback) | 1 |
| 3 | `pnpm check` (biome formatter feedback) | 1 |
| 4 | `pnpm check` | 0 |
| 5 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts` (first Green attempt) | 1 |
| 6 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts` (second Green attempt) | 1 |
| 7 | `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts` (Green) | 0 |
| 8 | `pnpm check` (final, after spec edits) | 0 |
| 9 | `pnpm exec playwright test e2e/cargo.spec.ts e2e/starter-railway.spec.ts e2e/liveries-drawer.spec.ts` | 0 |

Attempts 2–3 were Biome formatter line-wrap corrections; attempt 5 failed because Playwright refuses ordinary clicks on `aria-disabled` buttons and on hidden chips (spec switched to `dispatchEvent('click')` for dimmed no-ops and to the still-visible chip for the final-wagon no-op); attempt 6 failed because a 4-cell loop legitimately fits two wagons with one spare cell, so the fit-gate test now starts at three wagons.

## Files changed

- `src/ui/train-picker.ts` — consist strip (4 fixed chips, `+`, tally), fit-gated add, last-chip removal, per-wagon preset dressing, selection reset on train change; one delegated click listener, no new subscriptions.
- `src/style.css` — scoped `.consist-row`, `.wagon-chip`, `.add-wagon`, `.wagon-tally` rules with 64 px targets, dimmed state and phone horizontal swipe.
- `e2e/longer-trains-drawer.spec.ts` — new three-test Playwright spec.
- This evidence file.

## Primary verification (independent, 2026-11-28)

- Tree vs phase_base `113f550` matches Touches exactly: `M src/ui/train-picker.ts`,
  `M src/style.css`, new `e2e/longer-trains-drawer.spec.ts`, new evidence file.
  No deviations, no other files touched.
- `pnpm check` re-run by the primary: exit 0 — 63 files / 1121 tests passed.
- `pnpm exec playwright test e2e/longer-trains-drawer.spec.ts` re-run by the
  primary: exit 0 — 3 passed (only pre-existing THREE shadow-map deprecation
  warnings, no console errors).
- AC check: FR-1 (grow 2→3→4, cap silent no-op), FR-3 drawer half (dimmable `+`
  via `consistFitsLoop` on the closed `solvePath` loop length, re-enables as
  the loop grows), FR-5 drawer half (middle-chip select for dressing, last-chip
  removes, final wagon protected, selection resets on train switch). Screenshot
  at `.conductor/media/20261128-longer-trains/plus-tap-states.png` (gitignored,
  not committed).

## Notes

- No commits made, as instructed. Working tree: two modified source files plus the new spec and evidence file.
- No product/design decisions were needed; the planned selectors and behaviour from the brief were followed.
- No new audio, network, or three.js work; no add/remove animation was added, so reduced-motion users land in the final state immediately.
