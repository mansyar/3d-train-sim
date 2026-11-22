# Review: Release v0.15.1

- **Track:** `release-v0.15.1_20261123`
- **Type:** `chore`
- **Branch:** `chore/release-v0.15.1_20261123`
- **Range:** `85d019354eb7e7479ab17dd6b2df0bf72ef1dd20..7087c6359841e3c681c28127f79a46973ac3475f`
- **Date:** `2026-11-22T21:21:54Z`
- **Verdict:** `PASS WITH FINDINGS` — one Low, in-scope documentation-consistency finding; no Critical or High.

## Summary

Release content, scope guard, checks evidence and consecutive dry-run proof satisfy the frozen spec. Version, CHANGELOG, product drift, clarity relabel, full local matrix and two green `workflow_dispatch` runs are all verified. FR-7/AC-7/AC-8 are honestly partial at review time because tag creation, tag-workflow watch, PR and archive are post-merge runbook/Conductor completion steps. Strict mode requires fixing the one Low finding in a review-fix phase rather than deferring it.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Full local matrix | `pnpm check && pnpm test:coverage && pnpm build && pnpm exec playwright test --shard=1/2 && pnpm exec playwright test --shard=2/2 && pnpm audit --audit-level=high` | pass — `FULL_MATRIX_EXIT=0` | `verification/phase-1.md`, `verification/integrated.md` |
| Static | `pnpm exec biome check .`, `pnpm exec tsc --noEmit` | pass — 204 files clean, tsc clean | `verification/integrated.md` |
| Unit | `pnpm test` | pass — 60 files / 1051 tests | `verification/integrated.md` |
| Coverage | `pnpm test:coverage` | pass — 97.18% / 91.48% / 97.45% / 98.95% | `verification/integrated.md` |
| Build | `pnpm build` | pass — 117 modules, 819.02 kB, PWA 178 precache | `verification/integrated.md` |
| E2E shards | `pnpm exec playwright test --shard=1/2` / `--shard=2/2` | pass — 50 + 1 pre-existing `@ci` skip / 41 | `verification/integrated.md` |
| Audit | `pnpm audit --audit-level=high` | pass — 1 low / 4 moderate, no high/critical | `verification/integrated.md` |
| Dry run 1 | `gh workflow run release.yml --ref chore/release-v0.15.1_20261123 --field dry_run=true` | pass — run `45068023992`, all gates green, deploy skipped | `verification/phase-2.md` |
| Dry run 2 | same command | pass — run `45069711685`, all gates green, deploy skipped | `verification/phase-3.md` |
| No early tag | `git tag --list v0.15.1` | pass — no output | primary-run reviewer need |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `package.json` diff; `phase-1.md` | covered |
| FR-2 | P1.T2 | `CHANGELOG.md` diff; `phase-1.md` | covered |
| FR-3 | P1.T3 | `conductor/product.md` diff; `phase-1.md` | covered with F1 |
| FR-4 | P1.T4 | `comparison.md` counts: 7 `v0.15.1`, 0 `v0.15.0`, 8 `awaiting observation` occurrences | covered |
| FR-5 | P1.T5 | `integrated.md`; `FULL_MATRIX_EXIT=0` | covered |
| FR-6 | P2.T1, P3.T1 | `phase-2.md`, `phase-3.md` | covered |
| FR-7 | P3.T2, post-merge runbook | `phase-3.md` release gate table | partial by design |
| NFR-1 | P1.T5 | scope guard; no src/test/workflow/deps/lockfile diff | covered |
| NFR-2 | P1 scope | no clarity numbers; no v1.0 claim | covered |
| NFR-3 | P1.T4 | honest evidence; all comparison cells unchanged | covered |
| NFR-4 | P2.T1, P3.T2 | no early tag; deploy skipped; GHCR non-claim | covered |
| NFR-5 | P1.T5 | full chain green | covered |
| NFR-6 | P3.T2 | manual-device human-only exception | covered |
| AC-1 | P1.T1 | `package.json` | covered |
| AC-2 | P1.T2 | `CHANGELOG.md` | covered |
| AC-3 | P1.T3 | `product.md` | covered with F1 |
| AC-4 | P1.T4 | `comparison.md` | covered |
| AC-5 | P1.T5 | `integrated.md` | covered |
| AC-6 | P2.T1, P3.T1 | dry runs `45068023992`, `45069711685` | covered |
| AC-7 | P3.T2, post-merge | `phase-3.md` | partial by design |
| AC-8 | P3.T2, post-merge | `phase-3.md`, `integrated.md` non-claims | partial by design |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — Perf row Effort cell changed outside scoped wording**
  - **File:** `conductor/product.md:113`
  - **What:** The `perf-budget_20261111` row's Effort cell was changed from `2.5d` to `—`; FR-3 scoped only the shipped wording, and the brief required all other cells to remain untouched.
  - **Why:** Minor unrequested roadmap-semantics drift and inconsistency with other shipped rows; no correctness or gate impact.
  - **Fix:** Restore that Effort cell to `2.5d` so only scoped wording changes remain.
  - **Requirement:** FR-3
  - **Test gap:** none

## Overrides

- <none — strict mode; F1 is scheduled for R1 rather than deferred.>

## Plan compliance

All three planned phases are verified with real Result/Checkpoint/Evidence blocks: Phase 1 `46e1bd3`, Phase 2 `0a6e0c7`, Phase 3 `61323cc`. Metadata records 3/3 phases and 30/30 tasks. No task is marked complete without evidence. Final diff stays within the union of the phases' Touches plus Conductor state and the one scoped product-doc correction recorded as F1.

## Out of scope

Pre-existing Vite `configLoader: 'native'`, WebGLShadowMap deprecation, and >500 kB chunk warnings were left untouched. The old `v0.15.0` tag workflow failure `44730179589` and prior dry-run failure `44712469297` are unchanged. GHCR 403 remains unknown; no GHCR, deploy, manual-device, clarity-measurement or v1.0-child-gate claim is made.

## Debt

- <none>

## Doc sync

`pending` — F1 is scheduled for review phase R1; post-review sync will record the final state.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 (R1 scheduled) |
