# Phase 1 Evidence — Tier Model (Logic)

- Track: progressive-disclosure_20261110 — Progressive Disclosure
- Phase: 1 — Tier model (logic)
- Date: 2026-11-10
- Branch: feat/progressive-disclosure_20261110
- Base: 04d842d
- Head: 2626753
- Result: verified

## Summary

Pure disclosure model in `src/core/disclosure.ts` with 21 unit tests in
`src/core/disclosure.test.ts`. TDD Red→Green: the test file was written first
(Red confirmed — suite failed on the missing module), then the implementation
(plus one lint fix on boolean assignment and one import-order fix in the test).
No three.js coupling; only imports are the pure `./pieces` and `./scenery`
catalogs, so the core import-graph guard holds.

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| lint+types+tests | `pnpm check` | 0 | Biome clean on 184 files, `tsc --noEmit` clean, 53 test files / 928 tests pass |
| coverage | `pnpm test:coverage` | 0 | Statements 97.28%, branches 90.59%, functions 97.9% — above the 80% gate; `disclosure.ts` has no uncovered lines |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| -- | --------- | -------- | ------ |
| FR-1 | Fresh install (no save, no flag) shows basics only | `createDisclosureState()` → `{completedRides: 0, unlocked: false}`; locked visibility excludes the 3 advanced kinds | pass |
| FR-2 | Advanced kinds hidden while locked | `isKindVisible` false for `switch-3way`/`switch-slip`/`station` while locked, true for all basics | pass |
| FR-3 | 3rd completed ride triggers unlock | `UNLOCK_RIDE_COUNT = 3`; locked after rides 1–2, `{completedRides: 3, unlocked: true}` after ride 3; counting continues without relocking | pass |
| FR-4 | Shape serializable/persistable (plain data, no class instances) | `DisclosureState` is a plain `{completedRides, unlocked}` interface; `parseDisclosureState` forgivingly revives it for save/load | pass |
| FR-5 | Grandfather: world already containing an advanced piece counts as unlocked, all pieces kept | `applyGrandfather` flips only the flag when any kind is advanced; basics-only and empty worlds stay locked | pass |
| NFR-1 | `src/core` coverage ≥80%; no per-frame allocations in the model (pure functions only) | Coverage gate output above; module exposes only pure functions, documented as call-on-drawer-open/ride-end, never per frame | pass |
| NFR-4 | Model never deletes pieces; unknown/future kinds default to visible | `applyGrandfather` only sets `unlocked`; `isAdvancedKind('hyperloop')` false, unknown kinds visible while locked | pass |
| AC-1 | Fresh state → visibility selector returns zero advanced kinds | `visibleKinds(createDisclosureState())` filters to `[]` | pass |
| AC-2 | After 3 completed rides → selector returns advanced kinds | `visibleKinds` after 3 `recordCompletedRide` calls contains all 33 catalog kinds incl. the 3 advanced | pass |
| AC-3 | Unlocked flag round-trips through JSON (simulating save/load) | `parseDisclosureState(JSON.parse(JSON.stringify(unlocked)))` equals the unlocked state and shows all advanced kinds | pass |

## Evidence paths

- `src/core/disclosure.ts` — tier table, visibility selectors, ride counter, grandfather, tolerant parser
- `src/core/disclosure.test.ts` — 21 tests across tiers, visibility, unlock, grandfather, persistence
- Commits: `2626753` (this phase; import-order/test fixes folded in before commit)

## Deviations

None. All changes are within the phase `Touches` (`src/core/disclosure.ts`,
`src/core/disclosure.test.ts`) plus this evidence file. No product or design
decisions were needed — the advanced tier, threshold (3), and persistence shape
were all fixed by the brief.

## Notes

- `recordCompletedRide` counts every call as one completed ride and never
  mutates its input; pause/resume double-count prevention belongs to the ride
  controller (Phase 2), which decides when to call it.
- `parseDisclosureState` derives `unlocked: true` from a salvaged count ≥ 3 so a
  pre-existing count that met the threshold keeps its unlock through save
  salvage rules.
- Phase 3 wiring point: store `DisclosureState` in the world save/autosave and
  feed piece types + scenery kinds into `applyGrandfather` on load.
