# Specification — Oops-Proof Building

Track: `oops-proof-building_20260903` · Type: Feature · Status: new

## Overview

Toddler deletes and mis-drops are permanent today: `WorldStore.remove()` /
`removeScenery()` take effect immediately and the silent IndexedDB autosave
persists the loss. A 2–4 year-old who fumbles a chunky toy onto the trash bin
or the ✕-chip loses their work with no recovery path — against the product
promise that nothing can ever be broken or lost.

This track adds a single-step, session-only ↩️ undo for the last
Build/Decorate mutation, keeps the trash instant (no new gestures to learn),
and tunes invalid-drop feedback so a miss reads as a gentle "try again".
Icon-only, tap/drag-only throughout.

## Functional Requirements

- **FR1 — Undo affordance:** One ↩️ button in the rail appears only after a
  world mutation (piece place/move/delete/rotate, scenery place/move/delete).
  ≥64px, icon-only (SVG arrow, no text). Hidden when there is nothing to undo,
  after undo is consumed, after parent-gate reset, and after reload.
- **FR2 — Undo behavior:** Tapping ↩️ restores the exact prior toy
  (same id, kind/type, cell, rotation, and list position) with a pop-bounce
  and happy ding in <100ms. Consumes the pending undo, re-autosaves, and
  counts as an ordinary world edit (existing soft-stop rule for touched rides
  applies — no special ride logic).
- **FR3 — Trash stays instant:** Bin drops and ✕-chip deletes remain immediate
  with no confirm gates, no long-press, no double-tap. Undo is the recovery
  path.
- **FR4 — Invalid-drop clarity:** Keep ghost tint + trash pulse. Exaggerate the
  wobble-home slightly and play a distinct soft thunk (vs. the success ding).
  Failed placements (occupied / water / out-of-bounds / capacity) never arm undo.
- **FR5 — Lifetime:** Undo state is in-memory only. Reload hydrates the exact
  saved world with no ↩️. Ride/mute/parent-gate/train-select/crate-delivery
  actions never arm undo and (except reset, which clears) never clear it.

## Non-Functional Requirements

- Icon-only, ≥64px targets, ~48px drag tolerance, gentle easing (no shake,
  flash, or rapid cuts), capped cozy volume, mute-respecting, 60 FPS,
  <100ms response, airplane-mode safe, zero runtime network calls.
- Undo core lives in `src/state/` (logic-bearing): TDD, >80% coverage.
- Rail button, wobble/thunk tuning are UI glue: Playwright smoke +
  explicit tablet manual verification, no unit tests.

## Acceptance Criteria

- **AC1:** Place a piece → ↩️ appears → tap ↩️ → piece is gone, ding + pop
  play, ↩️ hides.
- **AC2:** Trash a piece → tap ↩️ → piece returns to the same cell with the
  same rotation; world re-saved (reload shows it back).
- **AC3:** Drag a piece to a new cell → tap ↩️ → piece returns home.
- **AC4:** Drop on water / occupied cell → wobble + thunk, world unchanged,
  no ↩️ appears.
- **AC5:** Place a piece, reload → world exact, no ↩️ on boot.
- **AC6:** Undo while riding → touched trains soft-stop per the existing
  world-edit rule.

## Out of Scope

- Multi-step history, redo, persisted (IndexedDB) undo.
- Trash confirm gates, hold-to-delete, or any new kid-facing gesture.
- Undo for ride controls, mute, train selection, deliveries, or parent-gate reset.
- Split rules for scenery vs. pieces (one rule covers both).
