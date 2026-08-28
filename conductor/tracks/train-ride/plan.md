# Implementation Plan — Train Ride (Autonomous Locomotive)

**Track ID:** `train-ride`
**Spec:** `conductor/tracks/train-ride/spec.md`

## Phase 1 — Path Solver (src/core/pathing.ts, TDD)

- [ ] Task: TDD — Red: failing unit tests for closed-loop traversal (order of pieces, entry/exit edges, deterministic output)
- [ ] Task: TDD — Green: implement `solvePath` minimum code; loop closes back on itself
- [ ] Task: TDD — Red→Green: dead-end reversal (pause + reverse), single-piece shuttle, empty/1-piece totals, no-failure guarantee
- [ ] Task: Verify coverage >80% on `src/core/pathing.ts`
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
