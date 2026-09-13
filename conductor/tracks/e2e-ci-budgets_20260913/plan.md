# Plan — E2E CI Time Budgets: Crossing Gate & Wagon Workshop

> Methodology per `conductor/workflow.md`. This is a test-infrastructure bugfix
> (non-logic): no unit tests apply; verification is local spec runs plus CI —
> the PR e2e gate and the post-merge `main` run.

## Phase 1 — Budget hardening (non-logic; CI-verified)

- [ ] **Task: Give the crossing gate spec an explicit budget**
  - Expected behavior: the approach/bell/pass/reload test in
    `e2e/crossing-gate.spec.ts` sets `test.setTimeout(120_000)` with a comment
    explaining that it must outlive the ~80 s of witnessed waits plus the
    post-pass reload boot. Waits and assertions unchanged.
- [ ] **Task: Harden the wagon workshop delivery poll**
  - Expected behavior: `e2e/wagon-workshop.spec.ts` delivery poll allows 90 s
    and the test budget grows to 180 s; the comment updated to match. Logic
    and assertions unchanged.
- [ ] **Task: Local verification**
  - Expected behavior: both specs pass on the tablet + phone profiles;
    `biome check` clean on the changed files.
- [ ] **Task: Phase Verification & Checkpoint (refer to workflow.md)**

## Notes
