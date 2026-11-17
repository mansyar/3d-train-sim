# Phase R1 Verification — Review Fixes

- **Track:** `a11y-pass_20261111` — Accessibility Pass
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-17
- **Branch:** `feat/a11y-pass_20261111`
- **Base commit:** `f6aa8fc166b3b39823d0d6418975a9070c1d4bcb`
- **Head commit:** `940fb5c953c6bffab8b78b21b610303d0fa6e5dc` (test-only F1 fix; this evidence file is committed immediately after)
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| E2E (axe) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 0 | `1 passed` (14.3s) — four axe states clean; tray-open zoom, new disarm-restoration assertions, and the pre-existing reload assertion all pass. |
| Static | `pnpm check` | 0 | Biome 192 files clean, `tsc --noEmit` clean, Vitest 56 files / 988 tests passed. |

Both verification commands were run exactly as written and passed on the first attempt;
no retry was needed.

## Finding-to-change

| Finding | Source | Change | Verification |
| --- | --- | --- | --- |
| F1 (Medium) — AC-3 disarm zoom restoration not behaviorally tested | `review.md` F1 (`e2e/a11y.spec.ts:80-88`) | In the existing parent-tray step, after the unchanged axe scan and `user-scalable=yes` assertion, tap outside both `.parent-gate` and `.preset-tray` with `page.mouse.click(5, 5)`, then assert `.preset-tray` is hidden and `meta[name="viewport"]` content matches `/user-scalable=no/`. Added a short comment tying the assertion to F1 / AC-3. | New assertions pass dynamically in `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` (exit 0, `1 passed`), proving `disarmConfirm() → setParentZoom(false)` restores the kid-safe viewport. |

The tap coordinate `(5, 5)` lands above/left of `.parent-gate` (absolute at `left: 12px`, `top: 12px`, min 64×64) and above `.preset-tray` (`top: 88px`), so the window `pointerdown` handler in `src/ui/parent-gate.ts:388-397` calls `disarmConfirm()`. The post-tap assertions verify this rather than assuming it; the passing run confirms the coordinate disarms reliably, so no retry or alternate geometry was needed.

No assertion was weakened or removed. The existing tray-open axe scan, the `user-scalable=yes` assertion while the tray is open, and the pre-existing reload step with its `user-scalable=no` assertion were all kept intact. No hold, test case, dependency, or product-code change was added.

## Evidence

- `e2e/a11y.spec.ts` — parent-tray step now covers F1 / AC-3 (disarm restoration).
- Test commit: `940fb5c` (`test(a11y): assert zoom restored on parent tray disarm (F1)`), 11 insertions, 1 file.
- Command outputs: exit 0 for both commands as recorded in the Commands table above.

## Deviations

- None.

## Notes

- Product source under `src/**`, the spec, review verdict files, `plan.md`, and all other tests were left unchanged.
- The tap-outside path exercises `disarmConfirm()`; the `clearPortableReport() → setParentZoom(false)` path remains code-reviewed only, consistent with the scope of F1.
- Commit rule observed: test change committed with a conventional `test(a11y):` message; this evidence file is committed separately.

## Primary verification (4.7)

- **Date:** 2026-11-17
- **Checkpoint:** `37e65ec` (no squash — the active goal prohibits `reset`; both reported commits retained)
- **Tree / diff:** clean; `f6aa8fc..37e65ec` limited to `e2e/a11y.spec.ts` (+11, no deletions) and this evidence file — the declared R1 Touches.
- **Primary re-runs:** `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` exit 0 (1 passed); `pnpm check` exit 0 (Biome 192 files, tsc clean, Vitest 56 files / 988 tests).
- **Re-review:** two independent read-only re-reviews of the R1 diff returned PASS — F1 resolved, no new findings, existing assertions unchanged, no production code changed (`review.md` round 2).
- **Deviations:** none.
