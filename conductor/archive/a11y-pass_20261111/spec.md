# Accessibility Pass — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track makes the Toddler First quality bar explicit and testable for people
who are not toddlers: parents, carers and keyboard users. It adds a real axe
scan to the e2e suite, visible keyboard focus, a documented contrast audit, and
a settled zoom policy that keeps the kid experience zoom-free while letting a
parent enlarge parent-only text.

## Problem / Motivation

`src/style.css` has no `:focus` rule at all, so keyboard users get no visible
focus. `index.html:7` pins `user-scalable=no`, which
`conductor/product-guidelines.md:13` deliberately deferred to this track; the
decision is still open. There is no accessibility dependency or automated scan
(`package.json:23-35`), so regressions in labels, roles and contrast are found
only by inspection. Without this track, v1.0 cannot claim that every quality
claim is backed by a test, and a parent with low vision cannot read the
on-device insights panel.

## Goals & Success Metrics

- **Goal:** Four representative UI states are axe-clean, keyboard focus is
  visible, parent text can be zoomed without exposing zoom to children, and the
  decision is recorded in the project's source of truth.
- **Metric:** zero axe violations in the four states (with exactly one
  documented rule exception), all defined acceptance criteria pass, and
  `pnpm check` plus the configured coverage gate remain green.

## Scope

### In Scope

- Add `@axe-core/playwright` as a devDependency and record the deliberate stack
  change in `conductor/tech-stack.md`.
- Add a `:focus-visible` ring for all interactive controls using existing
  palette tokens; keep pointer/touch taps free of focus rings.
- Add a viewport policy that allows zoom only while the parent tray is visible,
  restoring the kid-safe value on disarm and on reload.
- Add a Playwright axe scan over four tablet states: idle, toy drawer open,
  parent tray open, and riding.
- Apply bounded ARIA/label corrections in `src/ui` when axe finds them, with
  each change recorded in the phase evidence.
- Document palette contrast ratios in the verification artifact and keep axe's
  `color-contrast` rule enabled.
- Update `product-guidelines.md` with the settled zoom decision and
  `product.md` with the roadmap Shipped marker.

### Out of Scope

- Kid-visible text, instructions, new gestures or new controls.
- Zoom available to children, or removing the kid-mode zoom lock.
- Phone e2e axe scans (tablet is the primary profile).
- New components, track pieces, locomotives or design systems.
- Runtime telemetry, analytics, CDN scripts or any new network call.
- Changing the existing reduced-motion behavior or the parent hold duration.
- Running the human clarity-audit sessions or filling in their measured values.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add `@axe-core/playwright` as a devDependency, update the lockfile and record the tool in `conductor/tech-stack.md`. | must |
| FR-2 | Every interactive control shows a clearly visible focus ring when reached by keyboard (`:focus-visible`), using existing palette tokens, while pointer and touch focus stays visually quiet. | must |
| FR-3 | The viewport meta keeps `user-scalable=no` in kid mode; zoom is enabled only while the parent tray is visible and restored when the tray closes or the page reloads. | must |
| FR-4 | A Playwright spec runs axe on four tablet states — idle, toy drawer open, parent tray open, riding — and reports zero violations, with only the `viewport` rule disabled and justified in the spec. | must |
| FR-5 | ARIA roles, labels and pressed states that axe flags in `src/ui` are corrected with minimal edits; each correction is listed in the phase evidence. | must |
| FR-6 | Axe's `color-contrast` rule passes in all four states and the palette token ratios are documented in the verification artifact. | must |
| FR-7 | `product-guidelines.md` records the settled parent-only zoom policy and `product.md` marks `a11y-pass_20261111` shipped. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | The kid UI keeps its no-reading, tap/drag-only character; touch targets remain at least 64px and no new long-press is introduced. |
| NFR-2 | Axe is dev/e2e-only; no runtime network, analytics, identifiers or CDN script is added and privacy guidelines stay unchanged. |
| NFR-3 | `pnpm check` and the 80% coverage gate on `src/core` + `src/state` remain green. |
| NFR-4 | The stack change is recorded in `tech-stack.md` before implementation depends on it, per workflow principle 2. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `@axe-core/playwright` appears in `devDependencies`, `pnpm-lock.yaml` is updated, `tech-stack.md` documents the tool, and `pnpm check` exits 0. | FR-1, NFR-4, NFR-3 |
| AC-2 | Keyboard focus on a representative control produces a visible ring; a pointer tap on the same control does not; no touch target shrinks below 64px. | FR-2, NFR-1 |
| AC-3 | Viewport meta contains `user-scalable=no` at idle and while riding, allows zoom while the parent tray is visible, and returns to the kid value after disarm and after reload. | FR-3, NFR-1 |
| AC-4 | `e2e/a11y.spec.ts` scans all four tablet states with zero axe violations; only the `viewport` rule is disabled, with a written justification. | FR-4 |
| AC-5 | The `color-contrast` axe rule passes in all four states and a token ratio table is committed in `verification/contrast.md`. | FR-6 |
| AC-6 | Every ARIA/label fix made from an axe finding is listed with file and reason in the phase evidence; no unrelated refactor is included. | FR-5 |
| AC-7 | `product-guidelines.md` records the parent-only zoom resolution and the `a11y-pass_20261111` roadmap row carries a Shipped marker. | FR-7 |
| AC-8 | Every acceptance criterion traces to an FR or NFR ID, and all configured checks pass after review. | NFR-3 |

## Edge Cases

- Reload while the parent tray is armed must still boot in kid-safe no-zoom mode.
- The portable-export note reopens the tray via `is-reporting`; zoom must track
  that visibility too, not only the hold gesture.
- The riding state hides build tools; axe must not report hidden controls as
  focusable or unlabelled.
- Advanced toy slots are hidden with the `hidden` attribute; they must not be
  scanned as visible interactive content.
- `prefers-reduced-motion` users keep the existing reduced-motion behavior;
  focus rings must not depend on animation.
- CSP forbids injecting a CDN script, so axe must come from local `node_modules`.
- A one-off WebGL shader stall must not be mistaken for an accessibility
  failure; use the project's existing generous e2e timeouts.

## Dependencies

- **Tracks:** none. Accessibility work is independently verifiable and does not
  need the human-only clarity audit data.
- **External:** npm registry for the axe dev tool at install time only; no
  runtime service, credential or API.

## Open Questions & Assumptions

- **Assumption:** four tablet states (idle, drawer open, tray open, riding) are
  representative; phone scans are deferred to keep CI cost stable.
- **Assumption:** axe's `viewport` rule is disabled with a documented reason
  because kid mode is intentionally zoom-free; parent zoom is asserted directly
  in e2e instead.
- **Assumption:** the parent tray is the only surface that needs zoom; the kid
  toybox and canvas never enable it.
- **Assumption:** any axe ARIA finding is fixed with a minimal in-scope edit,
  and a finding requiring redesign is recorded as debt rather than silently
  ignored.

## References

- `conductor/product.md:112` — roadmap row and Done-when for this track.
- `conductor/product-guidelines.md:12-13` — parent-only long-press exception and
  the deferred `user-scalable=no` decision.
- `index.html:7` — current viewport meta.
- `src/style.css` — colour tokens and absence of focus rules.
- `src/ui/parent-gate.ts` — tray arm/disarm and portable-note paths.
- `conductor/tech-stack.md` — stack and e2e tooling conventions.
- `conductor/workflow.md` — Workflow Config (`verify_phase: pnpm check`,
  coverage gate 80%, CI-aware verification).
