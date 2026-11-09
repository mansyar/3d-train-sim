# Process Hygiene

## Summary

The registry had drifted: `conductor/tracks.md` mixed `done` and `archived` statuses for the same archived tracks, carried a duplicate plain-text list of 24+ names at the bottom, and was missing 24 archived directories entirely. Two intentional decisions were undocumented: the parent-only long-press exception to the toddler-proof gestures rule, and `user-scalable=no` in `index.html`.

This track rebuilds the registry as one table (67 archived rows matching 67 archive dirs exactly + 1 active row), normalizes every archived row to `archived`, removes the duplicate list, and records both decisions in `conductor/product-guidelines.md`. The roadmap row is marked **Shipped 2026-11-09**.

No product code changed. Docs-only track.

## Track

- Spec: [`./spec.md`](./spec.md)
- Plan: [`./plan.md`](./plan.md)
- Review: [`./review.md`](./review.md)

### What happened

| Phase | Checkpoint | Result |
|---|---|---|
| 1. Registry and Decisions Cleanup | `28f0dc6` | 67 archived rows == 67 archive dirs, 0 `done`, single table; both decisions recorded |
| R1. Review fixes | `046b706` | spec References `src/input/parent-gate.ts` → `src/ui/parent-gate.ts` |

## Requirements

- [x] FR-1 one row per archived directory (67 == 67)
- [x] FR-2 all archived rows `archived`, duplicate plain-text list removed
- [x] FR-3 parent-only long-press exception recorded in product-guidelines.md
- [x] FR-4 `user-scalable=no` intentional decision recorded
- [x] NFR-1 no product code, no dependencies

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` | pass — 182 files |
| Full check | `pnpm check` | pass — biome + tsc + 899 tests |
| Row-count | row-count check | pass — 67 archived + 1 in_progress, 67 archive dirs, 0 done |
| Review | conductor-reviewer | PASS WITH FINDINGS — 3 Low, all accepted/fixed |

## Media

None — docs-only, no visual change.

## Review

One round, **PASS WITH FINDINGS**: 3 Low findings (AC traceability wording, stale parent-gate path in spec, FR-2 phrasing). F3 fixed in R1; F1/F2 accepted as traceability wording debt.

## Deviations and risks

- The conductor-phase subagent verified file content but could not run shell (permission gate); verification and commits were run by the primary, which holds the permissions. Documented in phase evidence.
- Roadmap `product.md` marked shipped as part of the track (doc sync step).

## Follow-ups

None.

## Rollback

`git revert` the squash commit. Docs-only; no data migration.
