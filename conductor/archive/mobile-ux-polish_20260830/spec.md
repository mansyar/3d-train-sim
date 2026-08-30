# Spec — Mobile UX Polish

## Overview

Tiny Tracks currently targets tablets only: the bottom rail (6 × 72px controls)
overflows any phone, the camera frames the meadow for landscape, debug UI ships
to kids, rotation requires a cramped two-finger reach to a floating knob, and
deletion means a long drag to an off-screen bin. This track makes phones
(≥360px) first-class, reworks rotation/deletion for toddler fingers, and cleans
the production surface.

## Functional Requirements

### FR1 — Small-screen shell (phones ≥360px, first-class)

- **FR1.1** The bottom rail keeps ≥64px interactive targets and wraps to a
  second row when it cannot fit one row (width-driven), with safe-area handling
  on all edges (`viewport-fit=cover`; insets bottom/top/left/right).
- **FR1.2** The toybox drawer and train drawer (tab strip + panels) fit without
  clipping on ≥360px widths; panels stay one row.
- **FR1.3** No element causes horizontal scrolling/clipping at any width
  ≥360px (landscape and portrait).

### FR2 — Tap-to-rotate

- **FR2.1** A quick tap on a placed toy (track piece or scenery) rotates it 90°
  (4-fold, unchanged grid model).
- **FR2.2** Press-and-drag on a placed toy relocates it (as today); tap vs drag
  is disambiguated by movement (~12px) — accidental lifts from light taps
  disappear.
- **FR2.3** Each rotation step gives instant feedback: a bounce animation plus
  a soft **click** sound (new `click.ogg`/`click.mp3` asset, added to the audio
  box as `click()`).
- **FR2.4** The floating rotate knob is removed. Desktop rotation during a drag
  keeps the `R` key. A fresh toy dragged from the drawer is placed, then
  tap-rotated in place.
- **FR2.5** Respects `prefers-reduced-motion` (bounce becomes instant, still
  snaps).

### FR3 — Delete on the toy

- **FR3.1** While a placed toy is lifted (press-drag), a chunky red ✕ chip
  appears beside the toy and travels with the drag; tapping it deletes the toy
  (silent, consistent with the trash convention).
- **FR3.2** Drag-to-trash keeps working; the trash bin grows/pulses while a
  lifted toy hovers over the rail, and its invisible drop zone widens for
  forgiving aiming.

### FR4 — Portrait camera framing

- **FR4.1** In tall viewports the overview camera adjusts (FOV/height) so the
  full 16×16 meadow stays in view with the same gentle oblique angle; unchanged
  in landscape. Ride/follow behavior unchanged.

### FR5 — Production hygiene

- **FR5.1** The debug grid toggle (`#`) mounts only in dev builds
  (`import.meta.env.DEV`).
- **FR5.2** The Baloo 2 font is actually delivered via `@fontsource/baloo-2`
  (bundled, offline-safe); `tech-stack.md` documents the dependency (workflow
  rule).
- **FR5.3** iOS PWA meta added (`apple-mobile-web-app-capable`,
  `apple-touch-icon`, status-bar style) for proper Add-to-Home-Screen.

### FR6 — E2E coverage

- **FR6.1** Playwright gains a phone project (iPhone-size, touch-emulated): no
  horizontal overflow at ≥360px.
- **FR6.2** Scripted touch test: place a piece → tap to rotate (rotation
  changes) → lift-drag to ✕ chip/trash deletes it; zero console errors, zero
  external requests.

## Non-Functional Requirements

- **NFR1** No fail states: invalid drags/rotations are silent no-ops with
  gentle feedback (existing patterns).
- **NFR2** No new gestures beyond tap and drag (product guideline).
- **NFR3** 60 FPS unchanged; no per-frame allocations added.
- **NFR4** No data-model or save-format changes; existing autosaved worlds load
  identically.

## Acceptance Criteria

1. At ≥360px width the rail, drawers, and overlays never clip or scroll
   horizontally.
2. A tap rotates a placed toy 90° with bounce + click; a drag still moves it;
   no accidental lift on tap.
3. A lifted toy shows the ✕ chip; tapping it deletes; drag-to-trash still works
   with hover feedback.
4. Portrait viewports frame the whole meadow.
5. Production builds show no debug grid toggle; dev builds still do.
6. Baloo 2 renders (bundled, offline); iOS Add-to-Home-Screen uses a proper
   icon/standalone.
7. Phone viewport + gesture e2e pass; existing suite passes unchanged.

## Out of Scope

- No pinch/multi-touch gestures (explicitly excluded per product guidelines).
- No track/model changes (switches, bridges), no driving mode, no new toys.
- No tablet target-size reductions; the ≥64px bar stays.
- No localization or text in the kid UI.