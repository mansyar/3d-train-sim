# Implementation Plan — Train Ride (Autonomous Locomotive)

**Track ID:** `train-ride`
**Spec:** `conductor/tracks/train-ride/spec.md`

## Phase 1 — Path Solver (src/core/pathing.ts, TDD) [checkpoint: 5f4557b]

- Verification Report:
  - Confirmed 2026-08-28: `pnpm check` green (Biome 28 files, `tsc --noEmit`, Vitest 44/44); `vitest run --coverage` → pathing.ts 97.4% stmts / 86.4% branch / 100% lines & funcs (>80% bar).

- [x] Task: TDD — Red: failing unit tests for closed-loop traversal (order of pieces, entry/exit edges, deterministic output) — 4849721
  - Notes:
    - `src/core/pathing.test.ts`: 2×2 corner loop (traversal order, per-step endpoint/continuity/wrap checks), 8-piece rectangle, determinism (same input + reversed array order → identical traversal).
    - Red witnessed live: `Cannot find module './pathing'` (existing 35 tests unaffected).
- [x] Task: TDD — Green: implement `solvePath` minimum code; loop closes back on itself — 4849721
  - Notes:
    - `src/core/pathing.ts`: `solvePath(pieces) → { steps: PathStep[], closed }`. Ends grouped by boundary key; partner maps; components are simple paths/cycles (degree ≤ 2). Deterministic component/start rule = smallest `cellKey`, immune to array order. Dead-end entries ride inward from their open end; cycles enter via lower-key end.
    - Exports `neighbourOf`/`boundaryKey` from `track-graph.ts` (was private) instead of duplicating geometry helpers.
    - Biome's `noNonNullAssertion` rule forbids `!` — solver + tests use `if (!x) throw` guards per the project convention from 7793414.
    - Two fixture bugs found during Green: NW corner needs rot 90 (not 180) for an east+south join; east–west straights need rot 90 (base is north+south). Solver logic was correct in both cases.
    - Full gate green: Biome 28 files ✓, tsc ✓, Vitest 38/38.
- [x] Task: TDD — Red→Green: dead-end reversal (pause + reverse), single-piece shuttle, empty/1-piece totals, no-failure guarantee — bb09b70
  - Notes:
    - `pathing.test.ts` open-layout suite: 2-piece line, L-shaped path through a corner, lone-piece shuttle, empty meadow no-op, deterministic component choice with two disjoint tracks, dead-end spur traversal. Red witnessed live before the Green fix.
    - One real solver gap fixed: lone pieces (degree 0) hit the cycle branch and threw — start rules now treat `degreeOf < 2` as an open ride (enter via lower-key end, exit the other).
    - Two fixture geometry bugs corrected along the way (solver was right both times): NW corners need rot 90 for east+south joins; an elbow turning south needs rot 180, since north = −y in this grid.
    - Reversal *motion* (pause, reverse direction) is the ride layer's job in Phase 2 — the solver hands it `steps + closed`, and the ride layer shuttles open paths back and forth.
- [x] Task: Verify coverage >80% on `src/core/pathing.ts` — bb09b70
  - Notes:
    - `vitest run --coverage`: pathing.ts 97.4% stmts / 86.4% branch / 100% lines & funcs. Bar cleared.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Ride State + Train Motion (src/state, src/scene)

- [ ] Task: TDD — Red→Green: ride state machine in `src/state/` (idle ⇄ riding; gentle stop on world mutation during ride)
- [ ] Task: Scene: locomotive follows solved path (position + yaw interpolation, constant gentle speed, no per-frame allocations)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Go/Stop Trigger + Follow Camera (src/ui, src/scene)

- [ ] Task: UI: chunky icon-only ▶/⏹ toggle, dims when meadow is empty, ≥64px touch target
- [ ] Task: Scene: follow-camera trails the locomotive, eases back to overview on stop; honors `prefers-reduced-motion`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — E2E + Full Verification

- [ ] Task: Extend Playwright smoke: place pieces → press ▶ → train moves; console clean, zero external requests
- [ ] Task: Run full local gate suite (`pnpm check` + Playwright); fix failures
- [ ] Task: Manual tablet walkthrough (build loop, press ▶, watch ride, ⏹ camera ease-back)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(appended per task as implementation proceeds)
