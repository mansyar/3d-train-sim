# Phase 3 Verification — End-to-end verification

- **Track:** `install-onboarding_20261111` — Install Onboarding
- **Phase:** 3 — End-to-end verification
- **Date:** 2026-11-18
- **Branch:** `feat/install-onboarding_20261111`
- **Phase base commit:** `a00605ffbfce71be9d373585f54abc48b6292794`
- **Head commit at verification:** `0fc280d` (rework source fix; this evidence commit follows)
- **Result:** verified (after rework 1)

## Commands

All runs used the exact verification command:
`pnpm check && pnpm build && pnpm exec playwright test e2e/install-onboarding.spec.ts e2e/a11y.spec.ts`

| Run | Layer | Exit | Summary |
| --- | --- | --- | --- |
| 1 (initial) | Biome | 1 | `lint/suspicious/useIterableCallbackReturn` on the `.preset-tray` removal `forEach`, plus a line-wrap diff in the standalone `page.evaluate`. Fixed in the spec. |
| 2 (initial) | TypeScript | 1 | `e2e/install-onboarding.spec.ts(13,3): error TS2322: Type 'Promise<JSHandle<boolean>>' is not assignable to type 'Promise<void>'` in `waitForReady`. Rewrote as an async block awaiting `page.waitForFunction`. |
| 3 (initial) | Playwright | 1 | 1 passed / 3 failed. Also exposed a wrong spec expectation (hint is present in the closed tray before the hold); replaced `toHaveCount(0)` with `toBeHidden()`. |
| 4 (initial) | Playwright | 1 | 2 passed / 2 failed — AC-5 dismiss and NFR-3 axe violation. Details preserved in the "Initial failure" section below. |
| 5 (rework) | Biome + tsc + unit + build + Playwright | 0 | Biome clean (195 files), tsc clean, 57 test files / 1009 unit tests passed, `vite build` succeeded, Playwright **4 passed / 0 failed** in 30.2 s (tablet). No retries needed after the rework fix. |

Final Playwright result (verbatim counts):

```
Running 4 tests using 2 workers
  ok 1 [tablet] › e2e\install-onboarding.spec.ts:84:1 › parent hold reveals a tray-only install hint with iOS instructions (5.8s)
  ok 2 [tablet] › e2e\a11y.spec.ts:57:1 › four tablet states are axe-clean with visible focus and parent-only zoom @smoke (11.6s)
  ok 3 [tablet] › e2e\install-onboarding.spec.ts:123:1 › standalone emulation renders no hint at all (6.1s)
  ok 4 [tablet] › e2e\install-onboarding.spec.ts:170:1 › dismiss survives reload and a world reset restores the hint (14.3s)

  4 passed (30.2s)
```

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | Standalone emulation renders no hint element before or after the hold. | `standalone emulation renders no hint at all` passed; `addInitScript` wraps only `(display-mode: standalone)` and sets `navigator.standalone`; emulation asserted active before the hint count checks. | verified |
| AC-3 | No hint before the hold; after the hold the tray shows icon and iOS instruction. | `parent hold reveals a tray-only install hint…` passed: tray and hint hidden before the hold; after the hold `.install-hint-icon` = `📲`, text contains `Share` and `Add to Home Screen`, dismiss control labelled. | verified |
| AC-4 | Hint nested in `.preset-tray`; kid-facing shell unchanged. | Same passing test: `page.locator('.preset-tray .install-hint')` count 1, and the normalized non-tray shell signature is byte-identical before and after the hold. | verified |
| AC-5 | Dismiss → reload → hidden; reset → hint returns. | `dismiss survives reload and a world reset restores the hint` passed: dismiss removes the element immediately, the flag is read from the existing `worlds`/`current` snapshot with no install-related `localStorage` key, reload keeps it hidden, and the parent-gate reset restores it. | verified |
| NFR-3 | Existing axe sweep stays clean in four tablet states. | Unmodified `e2e/a11y.spec.ts` passed all four states including the parent-tray state; no rule disabled or filtered. | verified |

## Rework (attempt 1)

The two failures from the initial run were fixed with an explicitly authorized minimal change to
`src/ui/parent-gate.ts` only (recorded in Deviations):

1. **Dismiss listener on the boot element.** `refreshInstallHint()` bound `.install-hint-dismiss`
   only on the insertion path; browsing boots already have the element from `mountShell()`, so the
   `if (hintElement) return;` branch skipped binding forever. Added a small `bindHintDismiss()`
   helper called once for the pre-existing element and once for each newly inserted element. Each
   element instance is bound exactly once, so no duplicate listeners.
2. **Accessible name/visible text mismatch.** Changed the dismiss button's visible text from `OK`
   to `Dismiss`, which is contained in its unchanged `aria-label="Dismiss the Add to Home Screen hint"`.
   The class and label asserted by the e2e spec are unchanged.

No e2e assertion was weakened; `e2e/a11y.spec.ts` was not edited.

### Initial failure (for the record)

Final initial run: Biome/tsc/unit/build passed, Playwright 2 passed / 2 failed:

- AC-5: after clicking `.install-hint-dismiss`, `expect(locator('.install-hint')).toHaveCount(0)`
  received `1` (dismiss did nothing).
- NFR-3: one serious axe violation `label-content-name-mismatch`, target `.install-hint-dismiss`,
  html `<button class="install-hint-dismiss" type="button" aria-label="Dismiss the Add to Home Screen hint">OK</button>`,
  message `Text inside the element is not included in the accessible name`, tags `wcag21a`, `wcag253`.

## Evidence paths

- `e2e/install-onboarding.spec.ts`
- `src/ui/parent-gate.ts` (rework fix)
- `conductor/tracks/install-onboarding_20261111/verification/phase-3.md`

## Deviations

- `src/ui/parent-gate.ts` — explicitly authorized rework deviation from the Phase 3 Touches.
  Two minimal fixes were required to satisfy AC-5 and NFR-3: bind the dismiss button on the
  boot-rendered hint, and change its visible text from `OK` to `Dismiss` so axe's
  `label-content-name-mismatch` clears. No other source file was touched.

## Notes

- All five ACs covered by this phase are now green at browser level.
- Standalone emulation uses only a scoped `matchMedia` wrapper plus `navigator.standalone`, with no source changes.
- Console errors were clean in all three install-onboarding e2e tests.
- The only remaining warnings are pre-existing Vite native-config and Three.js shadow-map deprecation notices.
