# Contrast Evidence — Phase 2

- Track: `a11y-pass_20261111` — Accessibility Pass
- Phase: 2 — Axe sweep and bounded fixes
- Date: 2026-11-17
- Branch: `feat/a11y-pass_20261111`

## Palette tokens (`:root`, `src/style.css`)

| Token | Hex | Role |
| --- | --- | --- |
| `--toy-brown` | `#6b4226` | primary text / borders |
| `--toy-cream` | `#fff8e7` | page background / light text |
| `--toy-green` | `#2ec4b6` | ride-button fill |
| `--toy-orange` | `#ff9f1c` | accent fill / focus ring |
| `--toy-steel` | `#8d99ae` | parent-note borders |

Literal colors that pair with the tokens: `#e63946` (delete chip), `#f4c95d` (train/wagon slot),
`#d9a066` (piece slot), `#8fbf6b` (scenery slot), `#ffffff` (recovery-dismiss button).

## Method

Ratios are computed with the WCAG relative-luminance formula
(`L = 0.2126·R + 0.7152·G + 0.0722·B` on linearised sRGB channels;
`ratio = (L_lighter + 0.05) / (L_darker + 0.05)`). For an element with `opacity: α`
whose background is transparent, the effective foreground is the token colour
composited over its backdrop: `α·fg + (1 − α)·bg`. Decimal values were
calculated, not estimated. AA thresholds applied: **4.5:1** normal text,
**3:1** large text (≥18pt / 14pt bold) and non-text UI components.

## Text / UI pairs actually used

The four scanned states contain these text-bearing token pairs (emoji/SVG glyphs
are exposed to assistive tech through `aria-label`, not as CSS-coloured text, so
axe's `color-contrast` rule does not evaluate their glyph colour).

| Foreground (as rendered) | Background | Ratio | Threshold | Result | Where |
| --- | --- | --- | --- | --- | --- |
| `--toy-brown` `#6b4226` | `--toy-cream` `#fff8e7` | 8.15:1 | 4.5 | pass | body, rail button text, `.recovery-note`, `.portable-note`, `.portable-export`, `.portable-import`, `.recovery-dismiss`, `.insights-panel`, `.insights-heading`, `.insights-list dd` |
| `--toy-brown` @0.8 → `#89664d` | `--toy-cream` `#fff8e7` | 4.87:1 | 4.5 | pass | `.insights-list dt` — raised from 0.75 (was 4.28:1, the one axe finding) |
| `--toy-brown` `#6b4226` | `#ffffff` | 8.63:1 | 4.5 | pass | `.recovery-dismiss` |
| `--toy-cream` `#fff8e7` | `--toy-green` `#2ec4b6` | 2.05:1 | 4.5 | n/a — glyph only | `.ride-toggle` SVG icon (`RIDE_ICONS.play`), `aria-label="Ride the train"` |
| `--toy-cream` `#fff8e7` | `--toy-orange` `#ff9f1c` | 1.94:1 | 4.5 | n/a — glyph only | `.ride-toggle.is-riding` SVG icon, `aria-label` present |
| `--toy-cream` `#fff8e7` | `#e63946` | 3.94:1 | 4.5 | n/a — glyph only | `.delete-chip` `✕` during a drag (not in scanned states) |
| `--toy-steel` `#8d99ae` | `--toy-cream` `#fff8e7` | 2.72:1 | 3.0 (UI) | note | decorative note borders; not a text pair, and axe's wcag2a/aa tag set has no non-text-contrast rule |

### Pre-existing pair outside the reported findings

| Foreground | Background | Ratio | Threshold | Status |
| --- | --- | --- | --- | --- |
| `--toy-brown` @0.75 → `#907056` | `--toy-cream` | 4.28:1 | 4.5 | `.insights-unavailable` (hidden fallback, never visible in the four states). axe reported no violation for it; per the phase rule "fix only where axe reports a violation" it was left unchanged. Flagged here for a future design pass to lift its opacity to 0.8+. |

## Axe `color-contrast` result — all four states

The rule is **enabled** in every scan (only `meta-viewport` is disabled; see
`e2e/a11y.spec.ts`). Tags: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`.

| State | `color-contrast` violations | Result |
| --- | --- | --- |
| Idle (app ready) | 0 | pass |
| Toy drawer open | 0 | pass |
| Parent tray open (2 s hold) | 0 | pass (after the `.insights-list dt` opacity fix) |
| Riding (real running train, `is-riding`) | 0 | pass |

Before the bounded fix, the drawer-open scan was clean and the parent-tray scan
reported six `color-contrast` nodes (`Sessions`, `Longest session`, `Resets`,
`Unexpected closes`, `Storage`, `Last save` — all `.insights-list dt`, `#907056`
on `#fff8e7`, 4.27:1 vs 4.5 required). Raising the opacity to 0.8 made them
4.87:1 and cleared the rule.
