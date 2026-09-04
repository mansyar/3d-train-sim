# Plan: Wagon Workshop (skeleton — pending approved spec)

Feature track per `spec.md` (DRAFT). Skeleton only — phases will be
rewritten once the spec is confirmed through interactive questions.

## Phase 1 - Core: Consist Model & Persistence (TDD)

- [ ] Task: Wagon preset type + consist state in pure `src/core/`
  (tests first)
  - [ ] Curated preset list; per-train (or global) consist mapping
  - [ ] Save round-trip: additive field, pre-workshop defaults, no
        version bump
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Scene Riding + Drawer UI

- [ ] Task: Load chosen wagon GLBs (`load-wagons.ts`), follow engine
  through all piece types with today's spacing
- [ ] Task: Train-drawer picker (icon-only, ≥64px, pop+ding, hidden
  mid-ride, reduced-motion safe)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - E2E, Docs & Final Gates

- [ ] Task: Playwright e2e (pick preset, ride loop/shuttle/switch,
  reload restores, clean console, zero external requests)
- [ ] Task: Docs — CHANGELOG (parent-voice), `product.md` roadmap
  strike, `tech-stack.md` asset list if new GLBs wired
- [ ] Task: Final gates — `pnpm check` (biome + tsc + vitest),
  coverage on new core logic, full Playwright run
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
- [ ] Task: Review & archive (`conductor-review`), PR, merge
