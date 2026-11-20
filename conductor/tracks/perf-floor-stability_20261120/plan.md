# Perf Floor Stability — Implementation Plan

> **Branch:** `fix/perf-floor-stability_20261120`
> **Base:** `main` @ `15dbc05220a29a31a32480ccaa1f6a2805865a1d`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Deterministic perf hard gate

- **Goal:** Replace the wall-clock ticks/second hard gate with an interactive-mark plus deterministic frame-count/order hard gate, keeping throughput observation non-blocking.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1, NFR-2, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-8
- **Touches:** `e2e/perf-budget.spec.ts`, `e2e/perf-budget-observe.spec.ts`, `conductor/tracks/perf-floor-stability_20261120/verification/phase-1.md`
- **Verification:** `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high && pnpm exec playwright test e2e/perf-budget.spec.ts e2e/perf-budget-observe.spec.ts e2e/frame-contract.spec.ts --repeat-each=3`
- **Status:** in_progress

- [ ] **P1.T1: Remove the wall-clock throughput hard gate** — covers: FR-1, AC-1
  - [ ] **P1.T1.1:** Delete `FPS_FLOOR_TICKS_PER_SECOND` and its calibration comment from `e2e/perf-budget.spec.ts`
  - [ ] **P1.T1.2:** Remove `ticksPerSecond` from `BudgetInput`/`assertBudget` and the per-sample hard assertion loop
  - [ ] **P1.T1.3:** Keep exactly one interactive mark ≤5000 ms as a hard assertion
- [ ] **P1.T2: Add a deterministic frame-count/order hard gate** — covers: FR-2, AC-2
  - [ ] **P1.T2.1:** Sample at least 10 animation frames with both tick reads in the same RAF callback
  - [ ] **P1.T2.2:** Assert the system names equal the documented 12-system order before and after sampling
  - [ ] **P1.T2.3:** Assert every system's tick delta equals the observed frame count
- [ ] **P1.T3: Add deterministic negative proofs** — covers: FR-3, AC-3
  - [ ] **P1.T3.1:** Prove a late interactive mark still throws the expected message
  - [ ] **P1.T3.2:** Prove an over-tick or wrong-order frame sample throws the expected message
- [ ] **P1.T4: Keep throughput observation non-blocking** — covers: FR-4, AC-4
  - [ ] **P1.T4.1:** Update the `e2e/perf-budget-observe.spec.ts` comment to state that the hard gate is mark plus frame contract and that no floor exists
  - [ ] **P1.T4.2:** Keep the three ticks/second samples, console log and JSON attachment unchanged
- [ ] **P1.T5: Run full matrix and repeated perf specs** — covers: FR-5, NFR-4, AC-6
  - [ ] **P1.T5.1:** Run the exact chained verification command to completion
  - [ ] **P1.T5.2:** Record that no test was skipped, weakened or deleted
- [ ] **P1.T6: Write phase evidence and scope guard** — covers: FR-6, AC-5, AC-8
  - [ ] **P1.T6.1:** Record commands, results, the imported failed samples and the negative-proof messages
  - [ ] **P1.T6.2:** Assert the diff is confined to the two perf e2e specs plus the evidence file

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/perf-floor-stability_20261120/verification/phase-1.md
-->

## Phase 2: First post-fix release dry run

- **Goal:** Prove that a `workflow_dispatch` dry run from the fix branch has every gate green and deploy skipped.
- **Depends on:** Phase 1
- **Covers:** FR-5, NFR-4, NFR-5, AC-7
- **Touches:** `conductor/tracks/perf-floor-stability_20261120/verification/phase-2.md`
- **Verification:** `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true`, then watch the dispatched run to completion
- **Status:** pending

- [ ] **P2.T1: Dispatch the first dry run** — covers: FR-5, AC-7
  - [ ] **P2.T1.1:** Push `fix/perf-floor-stability_20261120` so the workflow can resolve `--ref`
  - [ ] **P2.T1.2:** Dispatch `release.yml` with `dry_run=true` and record the run URL/ID
- [ ] **P2.T2: Watch and verify the first dry run** — covers: NFR-4, AC-7
  - [ ] **P2.T2.1:** Require `Gate · biome + typecheck`, `Gate · vitest`, `Gate · e2e` and `publish` to succeed
  - [ ] **P2.T2.2:** Require `Deploy via Coolify webhook` to be skipped and no GHCR push to occur
- [ ] **P2.T3: Record first-run evidence** — covers: AC-7, AC-8
  - [ ] **P2.T3.1:** Save run ID, URL, job conclusions and timestamps in `verification/phase-2.md`

## Phase 3: Second consecutive dry run and integrated evidence

- **Goal:** Prove a second consecutive green dry run and write the integrated verification record with explicit non-claims.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, NFR-3, NFR-5, AC-7, AC-8
- **Touches:** `conductor/tracks/perf-floor-stability_20261120/verification/phase-3.md`, `conductor/tracks/perf-floor-stability_20261120/verification/integrated.md`
- **Verification:** `gh workflow run release.yml --ref fix/perf-floor-stability_20261120 --field dry_run=true`, then watch the dispatched run to completion and assert both runs are green
- **Status:** pending

- [ ] **P3.T1: Dispatch and watch the second dry run** — covers: FR-5, AC-7
  - [ ] **P3.T1.1:** Dispatch the same `release.yml` dry-run command
  - [ ] **P3.T1.2:** Watch to completion and require all four gates green with deploy skipped
- [ ] **P3.T2: Prove a consecutive green pair** — covers: AC-7
  - [ ] **P3.T2.1:** Assert both post-fix run IDs succeeded consecutively
  - [ ] **P3.T2.2:** Record intervening run history honestly; restart the pair if any run intervenes and fails
- [ ] **P3.T3: Write integrated evidence and non-claims** — covers: FR-6, NFR-3, AC-8
  - [ ] **P3.T3.1:** Assemble the full required-command table and requirements coverage in `verification/integrated.md`
  - [ ] **P3.T3.2:** Record scope guard, `v0.15.0` tag immutability, human-only manual-device status, no clarity numbers and no v1.0 claim

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
