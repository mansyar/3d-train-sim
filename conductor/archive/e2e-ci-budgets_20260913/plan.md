# Plan — E2E CI Time Budgets: Crossing Gate & Wagon Workshop

> Methodology per `conductor/workflow.md`. This is a test-infrastructure bugfix
> (non-logic): no unit tests apply; verification is local spec runs plus CI —
> the PR e2e gate and the post-merge `main` run.

## Phase 1 — Budget hardening (non-logic; CI-verified)

- [x] **Task: Give the crossing gate spec an explicit budget (b2d235f)**
  - Expected behavior: the approach/bell/pass/reload test in
    `e2e/crossing-gate.spec.ts` sets `test.setTimeout(120_000)` with a comment
    explaining that it must outlive the ~80 s of witnessed waits plus the
    post-pass reload boot. Waits and assertions unchanged.
  - Notes: added `test.setTimeout(120_000)` + rationale comment at the top of
    the test; the budget covers the worst-case ~80 s of witnessed waits, the
    pass settle, and the post-pass reload boot. No waits or assertions
    touched.
- [x] **Task: Harden the wagon workshop delivery poll (b2d235f)**
  - Expected behavior: `e2e/wagon-workshop.spec.ts` delivery poll allows 90 s
    and the test budget grows to 180 s; the comment updated to match. Logic
    and assertions unchanged.
  - Notes: poll now `{ timeout: 90_000, intervals: [2000] }` and the test
    budget `180_000` (comment updated to match) — roughly two laps of margin
    for the first station delivery on slow runners. No assertions touched.
- [x] **Task: Local verification (b2d235f)**
  - Expected behavior: both specs pass on the tablet + phone profiles;
    `biome check` clean on the changed files.
  - Notes: `pnpm exec playwright test e2e/crossing-gate.spec.ts
    e2e/wagon-workshop.spec.ts` → 8 passed (1.2 m; tablet 8.9 s / 22.4 s,
    phone 9.1 s / 22.2 s); `biome check` on both files clean. CI acceptance
    (PR e2e gate + post-merge `main` run) is this track's final verification.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (b2d235f)**
  - Notes: budgets applied to the two flaking specs only; no source or config
    touched.
  - Verification Report:
    - Automated: local e2e 8/8 (both specs, tablet + phone); biome clean;
      unit suite unaffected (no `src/` change).
    - CI (this track's acceptance gate): the branch's PR e2e run and the
      post-merge `main` run — the shared runner is the environment that
      flaked, so the runner is the judge; results recorded in the completion
      report.
    - Result: phase passed, pending CI green.
  - [checkpoint: b2d235f]

## Notes
