# Phase 1 Verification — Toolchain, focus and zoom policy

- **Track:** `a11y-pass_20261111` — Accessibility Pass
- **Phase:** 1 — Toolchain, focus and zoom policy
- **Date:** 2026-11-17
- **Branch:** `feat/a11y-pass_20261111`
- **Base commit:** `16d049043e30c5141086cb8a8645611d89bdb865`
- **Head commit:** `f5338b1` (final implementation commit; this evidence file is committed immediately after)
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Package | `pnpm add -D @axe-core/playwright` | 0 | Added `@axe-core/playwright@4.14.0` to `devDependencies`; `pnpm-lock.yaml` updated (+20 lines). No other dependency changed. |
| Lint / format | `pnpm exec biome check .` (via `pnpm check`) | 0 | 191 files checked, no fixes applied. |
| Types | `pnpm exec tsc --noEmit` (via `pnpm check`) | 0 | No type errors. |
| Unit tests | `pnpm test` / `vitest run` (via `pnpm check`) | 0 | 56 files, 988 tests passed. |
| Full gate | `pnpm check` | 0 | `biome check . && tsc --noEmit && vitest run` all green (final run). |

The first `pnpm check` run exited 1: `src/core/renovate-config.test.ts` reported that the new
devDependency belonged to no renovate group. The smallest necessary fix — adding
`@axe-core/playwright` to the existing "test tooling" group — was applied and the re-run exited
0. No further fix attempts were needed.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | axe is installed as a dev-only e2e tool, the stack change is documented, and `pnpm check` exits 0 | `package.json` contains `"@axe-core/playwright": "^4.14.0"` under `devDependencies`; `pnpm-lock.yaml` carries the matching importer/dev entry; `conductor/tech-stack.md` "Code quality & dev tools" table has a dated 2026-11-17 note; final `pnpm check` exit 0. | PASS |
| AC-2 | Visible keyboard focus on all interactive controls, quiet pointer taps, no target under 64px | `src/style.css` adds `.scene-canvas:focus-visible, button:focus-visible { outline: 3px solid var(--toy-orange); outline-offset: 3px; }`. Every interactive control (toy/piece/scenery slots, presets, tray toggles, day/night, mute, whistle, undo, trash, drawer tabs, train picker, parent gate) is a `<button>`; the canvas carries `.scene-canvas`, so both selectors cover the interactive surface. `:focus-visible` matches keyboard/AT focus but not pointer taps. No sizing, padding or layout declaration was touched, no `!important`, no kid-visible text; the existing palette token `--toy-orange` is reused. | PASS |
| AC-3 | Zoom off at idle/riding, on while the parent tray is visible, restored after disarm and reload | `src/ui/parent-gate.ts` adds a viewport helper targeting only `meta[name="viewport"]` with the exact strings `width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover` (kid) and `width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover` (parent). `setParentZoom(true)` in `armConfirm()` and `showPortableReport()` (the `is-reporting` note path); `setParentZoom(false)` in `disarmConfirm()` and `clearPortableReport()`. `index.html` keeps the no-zoom string as the boot/reload default and was not edited. No persistence, no long-press, `HOLD_MS` unchanged at 2000. | PASS |

## Evidence paths

- `package.json` — `@axe-core/playwright` devDependency
- `pnpm-lock.yaml` — resolved lockfile entry
- `conductor/tech-stack.md` — dated dev-tool note
- `src/style.css` — `:focus-visible` ring (after the `body` rule)
- `src/ui/parent-gate.ts` — viewport helper and four call sites
- `renovate.json` — deviation: axe grouped under "test tooling"
- `conductor/tracks/a11y-pass_20261111/verification/phase-1.md` — this report

Task commits:

- **P1.T1:** `868bd58` (`chore(deps): Add @axe-core/playwright for a11y e2e scans`) plus `f5338b1` (renovate grouping fix)
- **P1.T2:** `42c64c5` (`feat(ui): Add visible keyboard focus ring to controls and canvas`)
- **P1.T3:** `d5c97b3` (`feat(ui): Enable zoom only while the parent tray is visible`)

## Deviations

- **`renovate.json` (outside Touches):** added `@axe-core/playwright` to the existing "test tooling"
  `matchPackageNames` array. Required because `src/core/renovate-config.test.ts` asserts every direct
  dependency belongs to exactly one group; the new devDependency otherwise fails `pnpm check`. This is
  the smallest necessary change — no rule added and no group renamed — and the test documents that
  extra group members are allowed. No product or design decision was involved.

## Notes

- This phase installs and documents axe but **does not run an axe scan yet**. Phase 2 owns the
  four-state tablet scan (FR-4..FR-7, AC-4..AC-7).
- The focus ring uses an existing palette token and `outline` + `outline-offset`, so it never changes
  layout or touch-target geometry.
- `index.html` was deliberately not edited: it is the canonical kid-safe default and is not in Touches.
- The canvas has no `tabindex`. The `.scene-canvas:focus-visible` rule is included per the brief, but
  making the canvas itself keyboard-focusable would need an `app.ts` edit (outside Touches) and is not
  required for the representative-button control in AC-2.
- `vitest run` emitted a pre-existing Vite `configLoader: 'native'` warning; it is unrelated to this
  phase and did not affect the exit code.
