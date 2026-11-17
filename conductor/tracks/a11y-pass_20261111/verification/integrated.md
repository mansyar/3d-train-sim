# Integrated Verification — Accessibility Pass

- **Track:** `a11y-pass_20261111` — Accessibility Pass
- **Branch:** `feat/a11y-pass_20261111`
- **Base:** `0e985dbb1b7ce44b3523630e8c93857fecf0d2f8`
- **Head:** post-review sync (the implementation is unchanged after `ecee2b2`; Phase R1 adds only a test assertion and verification evidence)
- **Date:** 2026-11-17
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (Phase 1) | `pnpm check` | 0 | Final run per `phase-1.md`: Biome 191 files clean, `tsc --noEmit` clean, Vitest 56 files / 988 tests passed. |
| e2e (Phase 2) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 0 | Final run per `phase-2.md`: `1 passed` — four tablet states axe-clean; zoom and focus assertions pass. |
| static + unit (Phase 2) | `pnpm check` | 0 | Biome 192 files clean, `tsc --noEmit` clean, Vitest 56 files / 988 tests passed. |
| static + unit (Phase 3 re-run) | `pnpm check` | 0 | Biome 192 files clean, `tsc --noEmit` clean, Vitest 56 files / 988 tests passed (pre-existing Vite `configLoader: 'native'` warning only). |
| e2e (Phase 3 re-run) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 0 | `1 passed` in 13.7 s — all four tablet states axe-clean; zoom and focus assertions pass. |
| build (Phase 3) | `pnpm build` | 0 | `vite build` ✓ 114 modules transformed; PWA `generateSW` precache 178 entries (10651.07 KiB), `dist/sw.js` + `dist/workbox-9c191d2f.js` generated. The >500 kB chunk-size warning is pre-existing and not a failure. |
| e2e (Phase R1) | `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` | 0 | `1 passed` — new disarm-restoration assertion (tray hidden + `user-scalable=no`) plus all pre-existing axe/zoom/reload assertions. |
| static + unit (Phase R1) | `pnpm check` | 0 | Biome 192 files clean, tsc clean, Vitest 56 files / 988 tests, after the test-only R1 change. |
| coverage (review) | `pnpm test:coverage` | 0 | 97.11% stmts / 91.16% branch / 97.79% funcs / 98.97% lines; 80% gate met. |

All three verification commands were run exactly as specified in the phase contract. Each
exited 0 on the final run; no fix retry was needed in this phase.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | axe installed as dev-only e2e tool; lockfile updated; stack documented; `pnpm check` 0 | `package.json` (`@axe-core/playwright` in `devDependencies`), `pnpm-lock.yaml`, `conductor/tech-stack.md` (dated 2026-11-17 note); `verification/phase-1.md` AC-1; Phase 3 `pnpm check` exit 0. | pass |
| AC-2 | Visible keyboard focus, quiet pointer focus, no target under 64px | `src/style.css` `.scene-canvas:focus-visible, button:focus-visible` ring using `--toy-orange` with 3px offset; dynamic proof in `e2e/a11y.spec.ts` (`outlineStyle === 'solid'`, `outlineWidth === '3px'`); `verification/phase-1.md` AC-2. | pass |
| AC-3 | Zoom off at idle/riding, on while tray visible, restored after disarm and reload | `src/ui/parent-gate.ts` viewport helper with four call sites (`armConfirm`, `showPortableReport`, `disarmConfirm`, `clearPortableReport`); `index.html` unchanged kid-safe default; e2e asserts `user-scalable=yes` with tray open, `user-scalable=no` after tap-outside disarm (R1) and after reload; `verification/phase-1.md` AC-3 and `verification/phase-r1.md`. | pass |
| AC-4 | Four tablet states have zero axe violations; only one rule disabled with justification | `e2e/a11y.spec.ts` four `AxeBuilder` scans (idle, drawer open, tray open, riding), tags `wcag2a/wcag2aa/wcag21a/wcag21aa`, only `meta-viewport` disabled with written justification; final run `1 passed`; `verification/phase-2.md` AC-4. | pass |
| AC-5 | `color-contrast` passes; computed token ratios documented | `verification/contrast.md` — token pairs, WCAG relative-luminance ratios and AA thresholds; `color-contrast` 0 violations in all four states after the `.insights-list dt` opacity fix (4.28 → 4.87:1). | pass |
| AC-6 | Every ARIA/label fix logged with file + reason | `verification/phase-2.md` "Every axe-reported fix" table lists all four fixes (tablist→group role, save/load `aria-label` content-match, `dt` opacity) with file, line, rule and reason; no unrelated refactor. | pass |
| AC-7 | Guidelines record settled zoom resolution; roadmap row carries Shipped marker | `conductor/product-guidelines.md:13` records parent-only pinch zoom; `conductor/product.md:112` carries `**Shipped 2026-11-17**` with the parent-facing summary (this phase). | pass |
| AC-8 | Every AC traces to an FR/NFR ID; all configured checks pass after review | `spec.md` acceptance table maps AC-1..AC-8 to FR/NFR IDs unchanged; this phase's commands table shows `pnpm check`, axe e2e and `pnpm build` all exit 0. | pass |

## Cross-phase integration

- Phase 1's toolchain, `:focus-visible` ring and viewport helper are the substrate for
  Phase 2: the axe scan runs from the locally installed `@axe-core/playwright` (no CDN,
  CSP-compatible), the focus ring is asserted dynamically by the same spec that runs the
  scans, and the parent-only zoom policy is asserted directly in the tray-open state because
  the axe `viewport` rule is intentionally disabled.
- Phase 2's bounded fixes (role, label and contrast corrections) feed the final gate: the
  Phase 3 axe e2e re-run confirms all four states stay axe-clean with `color-contrast`
  enabled after those edits, and `pnpm check` + `pnpm build` confirm no static or production
  regression across the integrated tree.
- No phase re-implemented another's work; each phase consumes the previous phase's artifacts
  as-is. The roadmap marker (P3.T1) is the last source change before the final gate.

## Full diff

`0e985db..HEAD --stat` — 18 files, 727 insertions(+), 7 deletions(-):

- Track artifacts: `conductor/tracks.md`, `conductor/tracks/a11y-pass_20261111/`
  (`index.md`, `metadata.json`, `plan.md`, `spec.md`, `verification/phase-1.md`,
  `verification/phase-2.md`, `verification/contrast.md`, and this `verification/integrated.md`).
- Product / docs: `conductor/product.md`, `conductor/product-guidelines.md`,
  `conductor/tech-stack.md`.
- Tooling: `package.json`, `pnpm-lock.yaml`, `renovate.json` (deviation).
- Source / tests: `src/style.css`, `src/ui/app.ts`, `src/ui/parent-gate.ts`,
  `e2e/a11y.spec.ts`.

## Deviations

- **`renovate.json` (Phase 1):** `@axe-core/playwright` was added to the existing "test
  tooling" `matchPackageNames` group. Required because `src/core/renovate-config.test.ts`
  asserts every direct dependency belongs to exactly one group; smallest necessary change.
- **`meta-viewport` rule id (Phase 2):** the brief's literal `disableRules(['viewport'])`
  is rejected by installed axe-core 4.14 (`unknown rule`); the spec disables the equivalent
  WCAG 2 AA rule `meta-viewport` instead — still exactly one disabled rule, with kid-mode zoom
  asserted directly.
- **Hidden `.insights-unavailable` pair (Phase 2):** a pre-existing low-contrast fallback
  (opacity 0.75 → 4.28:1) is hidden in all four scanned states and was never reported by axe;
  per the "fix only where axe reports a violation" rule it was left unchanged and flagged in
  `contrast.md` for a future design pass.

## Notes

- No product or design decision changed beyond the already-approved parent-only zoom
  resolution (FR-7 / guidelines zoom resolution). The roadmap marker only records shipped
  status; no version numbers or invented metrics were added.
- No runtime telemetry, analytics, identifiers, CDN script or new network call was added.
  Axe is dev/e2e-only; the production build precaches locally emitted assets.
- The Vite `configLoader: 'native'` warning is pre-existing and unrelated to this track.
- Review verdict `PASS WITH FINDINGS` (one Medium test-gap, F1, on AC-3); resolved in Phase R1 with a test-only assertion and re-reviewed PASS with no new findings. See `review.md` and `verification/phase-r1.md`. No product, guideline or tech-stack change resulted from the review.
- Task commits: Phase 1 `868bd58`, `42c64c5`, `d5c97b3`, `f5338b1` (+ evidence `9d241f7`);
  Phase 2 `5104acc`, `8cf2cbb`, `459532a`, `ebe1aed` (+ evidence `42cadac`); Phase 3
  `02f6779` (roadmap marker). This integrated evidence file is committed in `ecee2b2`.

## Primary verification (4.7)

- **Date:** 2026-11-17
- **Checkpoint:** `ecee2b2` (no squash — the active goal prohibits `reset`; both reported Phase 3 commits are retained)
- **Tree / diff:** clean; `73ae204..ecee2b2` limited to `conductor/product.md` and `verification/integrated.md` — the declared Phase 3 Touches.
- **Primary re-runs:** `pnpm check` exit 0; `pnpm exec playwright test e2e/a11y.spec.ts --project=tablet` exit 0 (1 passed); `pnpm build` exit 0. As an extra regression sweep the primary also ran the full Playwright matrix `pnpm exec playwright test --project=tablet --project=phone` exit 0.
- **Acceptance:** AC-1..AC-8 confirmed against the committed artifacts; AC-7 marker verified at `conductor/product.md:112`, AC-2 and AC-4 verified dynamically by the axe spec, AC-8 traceability unchanged in `spec.md`.
- **No new deviations:** all three inherited deviations are documented above; Phase 3 added none.
