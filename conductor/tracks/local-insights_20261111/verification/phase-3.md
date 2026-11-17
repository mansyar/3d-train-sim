# Phase 3 Evidence — Gated panel, Playwright journey and docs

- **Track:** `local-insights_20261111` (Local Insights)
- **Phase:** 3 — Gated panel, Playwright journey and docs
- **Date:** 2026-11-17
- **Branch:** `feat/local-insights_20261111`
- **Base commit:** `a47e19501b86a91855d0897e1de3aaef65ed0e36`
- **Head commit:** `22b50704c65220b67f885ca3fd783ae9dc0c3ba3`
- **Result:** blocked — all code, unit checks and the Playwright journey pass; the
  `conductor/product.md` roadmap edit (one line of P3.T3) was denied by the
  executor's tool permissions and is handed back to the primary agent.

## Summary

A read-only "On this device" panel now lives inside the existing 2 s-hold parent
tray. It has six labelled rows — Sessions, Longest session, Resets, Unexpected
closes, Storage, Last save — all written with `textContent` only. The provider is
lazy: `parent-gate.ts` calls it from `armConfirm()` with a generation guard and a
`presetTray.hidden` guard, so it is never read on boot or per frame, and a
rejection falls back to a plain "Play details are unavailable right now." line.
`main.ts` builds the view from the Phase 2 `insights` closure plus
`readStorageEstimate()`, using the Phase 1 plain-word formatters; a fresh install
still reports "No save yet." and no save is recorded on boot.

A new Playwright journey proves the panel is hidden before the hold, visible with
six populated read-only rows after it, that three resets raise `Resets` and the
value survives a reload, and that every HTTP(S) request stayed on the app origin.
No network, analytics or identifier code was added and no kid-facing control was
introduced.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 1 | First run: Biome reported 3 fixable issues (an import sort in `main.ts`, an export placement in `app.ts`, a formatter wrap in the new spec). |
| static + unit | `pnpm check` | 1 | Second run: Biome clean; `tsc` reported one error — `waitForFunction` returns `JSHandle<boolean>`, not `void` from the typed helper. |
| static + unit (Green) | `pnpm check` | 0 | Final run: Biome checked 191 files clean; `tsc --noEmit` clean; Vitest 56 files / 975 tests passed. |
| Playwright | `pnpm exec playwright test e2e/insights.spec.ts` | 1 | First run: a one-off shader-compile stall consumed the 90 s test budget on the third hold; the captured snapshot showed the tray armed with all six rows populated and `Resets = 3`, so the app logic worked. |
| Playwright (Green) | `pnpm exec playwright test e2e/insights.spec.ts` | 0 | Second run: `ok 1 [tablet] … (14.6s)`; 1 passed (24.1s). The per-test budget was raised to 180 s to absorb occasional WebGL jank across three holds and two page loads. |
| static + unit (re-check) | `pnpm check` | 0 | Re-run after the timeout edit: Biome 191 files clean; `tsc --noEmit` clean; Vitest 56 files / 975 tests passed. |

Both configured commands were run exactly as written. No lint rule was softened,
no generated file or lockfile was changed, and no fix was attempted after a
second failed iteration of either command.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | Panel renders usage/quota and last-save outcome; an unavailable estimate renders plainly rather than throwing. | `src/main.ts` `insightsProvider()` builds `storage` from `formatStorageEstimate(await readStorageEstimate())` and `lastSave` from `formatSaveOutcome(insights.lastSaveOutcome)`. Failure/absence returns `undefined` → `undefined` → the plain "Storage information is unavailable." line; `src/ui/parent-gate.ts` `renderInsights()` writes values with `textContent` and wraps the whole refresh in try/catch. The browser snapshot captured during the transient Playwright stall showed all six rows populated, including the unavailable-storage line. | verified |
| AC-5 | Values hidden until the 2 s hold arms; visible in tray; no kid-facing control exposes them. | `e2e/insights.spec.ts` first step asserts `.preset-tray`, `.insights-panel` and a diagnostic row are hidden before the hold; `holdGate()` uses a real pointer hold and then asserts the tray and panel are visible. The panel assertion checks all six `<dt>` labels appear exactly once and that the panel contains zero `button, input, select, textarea, [role="button"]`. The panel markup sits inside the preset tray, and `armConfirm()` is the only caller of `refreshInsights()`. | verified |
| AC-6 | `pnpm check` exits 0; no fetch/XHR/analytics addition; world export fixture unchanged. | Final `pnpm check` exit 0 (975/975 tests, including `no-external-urls`, `import-graph` and `boot-order`). No `fetch`, XHR, beacon, analytics or identifier was added; the panel reads only the local `insights` closure and `navigator.storage.estimate()`. Export/snapshot code and fixtures are untouched by this phase. | verified |
| AC-7 | Roadmap row carries shipped marker; README/CHANGELOG mention the parent panel. | `README.md` and `CHANGELOG.md` carry parent-worded notes (commits `22b5070`). `conductor/product.md` line 110 still lacks the `**Shipped 2026-11-17**` marker: the `edit` call returned `permission.rejected` and was not worked around. | blocked |
| AC-8 | Every AC traces to at least one FR/NFR ID. | `spec.md` acceptance table (AC-4→FR-4/NFR-5, AC-5→FR-6/NFR-4, AC-6→FR-7/NFR-1/NFR-2, AC-7→FR-8) is unchanged and still satisfies the traceability requirement. | verified |

## Evidence paths

- `src/ui/app.ts` — `InsightsView` type re-export, `AppOptions.insights` lazy provider,
  hidden-by-default panel markup with six `data-insights` rows, pass-through to
  `createParentGate`.
- `src/ui/parent-gate.ts` — `InsightsView` interface, panel query/generation/refresh
  helpers, `armConfirm()` refresh, plain unavailable fallback; `textContent` only.
- `src/style.css` — quiet `.insights-panel` rules (cream on steel, no animation,
  reduced-motion friendly); no assets.
- `src/main.ts` — local `formatLongestSession()`, `insightsProvider()` from the
  Phase 2 closure + `readStorageEstimate()`, wired as `insights:` on `mountControls`.
- `e2e/insights.spec.ts` — hidden→armed journey, six labelled read-only rows,
  three resets via `__tinyTracksWorld`, reload persistence, same-origin request audit.
- `README.md` / `CHANGELOG.md` — parent-facing documentation.
- Task commits: `97330f4` — `feat(ui): add parent-gated read-only insights panel`;
  `9efbc80` — `test(e2e): prove gated insights, persistence and local-only traffic`;
  `22b5070` — `docs: announce parent insights in README and changelog`.

## Deviations

- `src/main.ts` — not listed in the brief's `Touches`, but its contract explicitly
  requires building the view from the Phase 2 `insights` closure and passing it
  through `mountControls`. Only that wiring plus the local formatter was changed.

## Blockers

- `conductor/product.md` (line 110, the `local-insights_20261111` roadmap row) —
  the edit tool returned `permission.rejected` ("Permission denied: edit"). The
  one-line change adds `**Shipped 2026-11-17**` plus a short parent-facing summary
  to satisfy AC-7 / FR-8. The primary agent owns this Conductor-owned product doc
  and should apply it. Expected result: the roadmap row is marked shipped and no
  other Conductor state file is touched.

## Notes

- The counters are device diagnostics, not the clarity audit's human-observed
  time-to-first-ride or unassisted-session length. No automated proxy was added
  and no timing or storage-size number is asserted in the tests.
- The first-boot seeded-starter save is still a plain `saveWorldSnapshot`, so a
  fresh install reports "No save yet." rather than claiming a successful save.
- The provider is called only from `armConfirm()`; the generation and
  `presetTray.hidden` guards prevent a stale async estimate from repainting a tray
  that has already been disarmed.
- Startup tolerance in the spec is 180 s because three real 2 s holds and two
  WebGL page loads can be delayed by shader compilation on this runner; no hold
  duration was shortened and no assertion was weakened.
- This report is committed separately from the task commits as phase evidence.
