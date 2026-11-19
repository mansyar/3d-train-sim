# Review: Switch E2E Stability and Release v0.14.1

- **Track:** switch-e2e-stability_20261119
- **Type:** Bug
- **Branch:** fix/switch-e2e-stability_20261119
- **Range:** `1ad84b2e996934532f54c6ddb1804366ca5fc2c9..1f891283a59d424541f253890918178d7e89da59`
- **Date:** 2026-11-19T12:30:00Z
- **Verdict:** PASS WITH FINDINGS

## Summary

The frame-aware slip-road sampler is correct and non-weakening, the active regression is deterministic and non-tautological, the v0.14.1 documentation is internally consistent, and the two dry-run successes satisfy the release gate. One Low documentation-timing finding remains: the product roadmap claimed the track was shipped before the post-merge/post-tag gates had completed. Strict review mode requires that finding to be fixed before PR.

## Verification

| Layer | Command | Result | Evidence |
|---|---|---|---|
| Unit | `pnpm test` | pass — 57 files / 1016 tests | verification/integrated.md |
| Coverage | `pnpm test:coverage` | pass — 97.07/91.21/97.41/98.87 | verification/integrated.md |
| Lint | `pnpm exec biome check .` | pass — 198 files, no fixes | verification/integrated.md; reviewer re-run |
| Typecheck | `pnpm exec tsc --noEmit` | pass | verification/integrated.md; reviewer re-run |
| Build | `pnpm build` | pass — Vite 115 modules, PWA 178 precache | verification/integrated.md |
| E2E | `pnpm exec playwright test --workers=1` | pass — 85 passed / 1 pre-existing skip / 0 failed | verification/integrated.md |
| Audit | `pnpm audit --audit-level=high` | pass — no high/critical | verification/integrated.md |
| Dry runs | two `workflow_dispatch` runs | pass — 44493402673, 44514200919 | verification/integrated.md |

## Requirements

| ID | Implemented by | Verified by | Status |
|---|---|---|---|
| FR-1 | P1.T1 | e2e/helpers.ts, e2e/switches.spec.ts, phase-1.md | covered |
| FR-2 | P1.T2 | active regression, phase-1.md | covered |
| FR-3 | P2.T2/P2.T3 | verification/integrated.md | covered |
| FR-4 | P3.T1 | 44493402673, 44514200919 | covered |
| FR-5 | P2.T1 | package.json, CHANGELOG.md, comparison.md | covered |
| FR-6 | P3.T2 | PR/review gate documented | partial — F1 |
| FR-7 | P3.T2 | automatic tag gate documented | partial — post-merge gate |
| FR-8 | P3.T2 | workflow watch + GHCR-403 policy | partial — post-merge gate |
| NFR-1..NFR-6 | P1/P2/P3 | diff scope, evidence | covered/partial as above |
| AC-1..AC-5 | P1/P2 | evidence and docs | covered |
| AC-6 | P3.T2 | review/PR gate | partial — F1 |
| AC-7 | P3.T2 | automatic tag gate | partial — post-merge gate |
| AC-8 | P3.T2 | workflow watch | partial — post-merge gate |

## Findings

### Critical

<none>

### High

<none>

### Medium

<none>

### Low

**F1 — premature roadmap status**
- **File:** `conductor/product.md:115`
- **What:** The roadmap row said `Shipped 2026-11-19` while metadata still showed `in_progress`, `review_verdict: null`, `pr_url: null`, and `archived_at: null`; the PR, merge, tag, and tag-triggered workflow had not happened.
- **Why:** The definition of done includes the release PR/review, annotated tag push, and a successful tag-triggered workflow with publish not skipped.
- **Fix:** Qualify the status as fix-complete with v0.14.1 release gates pending until post-merge/post-tag sync; restore the shipped wording only after those gates complete.
- **Requirement:** FR-6/AC-6
- **Test gap:** none

## Overrides

<none>

## Plan compliance

Phase 1, Phase 2, and Phase 3 are verified with checkpoints `580cc1c`, `f15c9a2`, and `2c57c2b`. Phase R1 was added for finding F1. No code or release behavior is changed by the fix phase.

## Out of scope

Post-merge gates (PR, merge, automatic tag push, tag workflow watch), manual tablet check, v1.0 claims, invented audit values, tag overwrite/force-push, and GHCR verification beyond the documented 403-unknown policy.

## Debt

None introduced. The historical cancelled dry run `44488925935` is retained as infrastructure history only.

## Doc sync

updated — pre-review sync aligned product and clarity docs to v0.14.1; F1 requires a post-review wording qualification before PR.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
