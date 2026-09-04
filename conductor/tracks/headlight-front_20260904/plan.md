# Plan — Headlight Front

Source of truth: `spec.md` (flip headlight from local `-Z` to `+Z` to match authored `+Z` front + `MODEL_YAW_OFFSET`). Non-logic scene wiring per `workflow.md` — acceptance-criteria + smoke/manual verification, no unit tests, no coverage gate.

## Phase 1: Headlight orientation fix

- [x] Task: Flip headlight to the nose in `src/scene/headlight.ts` (ac47861)
  - [x] Move `lamp.position` to `(0, 1.0, +1.55)`, `spot.position` to `(0, 1.1, +1.5)`, `aim` to `(0, 0.2, +9)`
  - [x] Fix the stale `-Z front` comment to cite `+Z` front + `MODEL_YAW_OFFSET` in `ride-motion.ts`
  - [x] Acceptance: code shows `+1.55` / `+1.5` / `+9`; comment references `+Z`; no other constants touched
  - Notes: Flipped lamp/spot/aim Z signs in `attachHeadlight` so the shared headlight rides the authored nose (+Z, chimney end per GLB vertex analysis) instead of the cab. Files: modified `src/scene/headlight.ts` (4 lines). Why: `ride-motion.ts MODEL_YAW_OFFSET=PI` aligns local +Z down-track; local -Z pointed the beam backwards.
- [ ] Task: Smoke + manual night verification
  - [ ] `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean
  - [ ] `pnpm dev` night ride: lens on nose, warm cone forward, wagons/travel unchanged, clean console
  - [ ] Acceptance: AC1–AC3 in `spec.md` observed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
