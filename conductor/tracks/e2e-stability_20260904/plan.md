# Plan: E2E Stability & CI Efficiency

Chore track — no logic-bearing code, so no TDD tasks; verification is repeated
e2e runs, gates, and checkpoints per `workflow.md`.

## Phase 1 - Flake Fix: Targeted Allowlist

- [ ] Task: Reproduce the flake and capture the exact console-error fingerprint
  - Run the wagon-workshop tablet/phone spec repeatedly on Windows headless
    (suite + single-spec reruns) until the failure reproduces; record the exact
    error message text and URL signature in `plan.md`
  - Acceptance: fingerprint captured; confirmed all functional assertions pass
    when it trips
- [ ] Task: Implement the targeted allowlist in the e2e harness
  - Shared helper in `e2e/` (single place); exact-message fingerprint match;
    comment cites this track + the `blob:`/access-control mechanism; all other
    console errors still fail the suite (spec A4)
  - Acceptance: allowlist active; suite green on Windows headless at default
    workers
- [ ] Task: Prove the guardrail stays armed
  - Temporary test: inject a real console error, confirm the suite fails;
    remove the injection after the proof
  - Acceptance: injected error fails the suite; allowlist only silences the
    known signature
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Stability Documentation

- [ ] Task: Write `e2e/README.md` — the stability runbook
  - The `blob:`/headless-GPU mechanism, the allowlist (what it covers, how to
    extend it), the `--workers=2` rerun convention (v0.5.0/v0.6.0/v0.7.0
    lessons), and "ubuntu e2e is the release authority"
  - Acceptance: doc covers mechanism, convention, and authority rule
- [ ] Task: Cross-link from `tech-stack.md` Testing section
  - Point the Testing section's e2e row at the runbook so the convention is
    discoverable from the source of truth
  - Acceptance: link in place; no other tech-stack wording changed yet
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - CI: E2E on PRs + Parallel Gates + Caching + Path Filters

- [ ] Task: Update `tech-stack.md` CI description first
  - Per workflow principle #2: document the new pipeline shape before
    implementation — parallel jobs (biome+typecheck / vitest / e2e), e2e on
    PRs, cached Playwright browsers, docs-only path filtering
  - Acceptance: tech-stack.md reflects the target pipeline
- [ ] Task: Rework `.github/workflows/ci.yml`
  - Parallel `check` (biome+tsc), `vitest`, and `e2e` jobs on PRs + main
    pushes; e2e = Playwright install (cached, keyed on locked version) +
    `pnpm build` + full suite; docs-only paths skip heavy jobs
  - Acceptance: ci.yml matches the documented shape
- [ ] Task: Mirror the structure in `release.yml` gates
  - Parallel gate jobs + the same browser cache; ubuntu e2e stays the release
    authority
  - Acceptance: release.yml mirrors ci.yml job structure + cache
- [ ] Task: Validate with a release dry run
  - `workflow_dispatch` with `dry_run: true`: gates green, image builds,
    nothing published/deployed
  - Acceptance: dry run green end-to-end
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Acceptance Runs & Wrap-Up

- [ ] Task: Three consecutive clean suite runs on Windows headless
  - Full Playwright suite at `--workers=2`, three back-to-back runs, zero
    failures — the spec's statistical bar (acceptance #1)
  - Acceptance: 3/3 clean runs recorded in plan.md
- [ ] Task: Local gates + wrap-up
  - `pnpm check` green; confirm docs-only commit skips heavy jobs (acceptance
    #4); verify no `src/**` changes exist on the branch (N1)
  - Acceptance: all acceptance criteria checked off against spec.md
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
