# Phase 1 Verification — Single-train selection (logic)

- Track: single-train-driver-camera_20261110
- Phase: 1
- Date: 2026-11-10
- Branch: feat/single-train-driver-camera_20261110
- Base: e4022019d3519bb438891fdbedc7eb0a6b9f9d2b
- Head: 5b8d3a3
- Result: verified

## Summary

Exactly one ride is now selected by the loop-then-longest rule:
`selectRideComponents` filters to `path.closed` components when any exist,
otherwise to all components, ranks by most pieces then cell-key anchor, and
the ride layer caps to 1. `startAll()` never swaps a running ride; the
parked opener and scoped mid-ride edits are unchanged. New TDD tests cover
AC-1, AC-2 and AC-3; the full `pnpm check` suite is green.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static+unit | `pnpm check` | 0 | Biome clean, `tsc --noEmit` clean, Vitest 52 files / 904 tests passed |
| Red snapshot | `pnpm check` (before Green) | 1 | 3 new tests failed for the expected reasons (open-long beat closed-short; open-biggest beat closed-big; 3 rides vs 1) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | Closed-short beats open-long | `pathing.test.ts` — "prefers a short closed loop over a long open line" (incl. reverse order, and pool filter with cap 4) | pass |
| AC-2 | No closed → longest open; tie → smaller anchor regardless of order | `pathing.test.ts` — "falls back to the longest open component", "breaks piece-count ties by smaller anchor regardless of input order", "ranks closed components by most pieces, then anchor" | pass |
| AC-3 | `startAll()` over 3 components yields exactly 1 ride | `ride.test.ts` — "startAll() over three components yields exactly one ride" (loop 4 closed + open line + lone piece → 1 ride, anchor `0,0`) | pass |
| FR-1 | Exactly one `RideState` while riding | `ride.ts` caps selection to 1; single-train suite asserts `rides().length === 1` and `mode === 'riding'` | pass |
| FR-2 | Longest closed wins, else longest overall, anchor tie-break | `pathing.ts` closed-first filter + existing deterministic sort, covered above | pass |
| FR-3 | Re-pick on ▶ / world change, never swap mid-ride | `ride.ts` early-return while riding; new "a second ▶ press never swaps the running ride" (longer loop ignored mid-ride, adopted after stop); scoped-edit logic untouched, covered by the untouched-component test | pass |
| FR-7 | Parked opener unaffected | `park-spot.ts` still calls `selectRideComponents(..., 1)` (now loop-then-longest); `park-spot.test.ts` green (cozy oval, river crossing, largest-among-closed, land fallback) | pass |

## Audits

- P1.T2.2 (park-spot): `findParkSpot` already passes cap 1, so it returns
  the same loop-then-longest component that `▶` adopts — the opener now
  parks on the track that will actually ride. Only the doc wording and
  the local name (`largest` → `selected`) changed; no logic change.
  `park-pose.ts` (outside Touches) calls `findParkSpot` +
  `selectRideComponents(..., 1)`, so it follows the new rule with no edit;
  `tsc` passes with no signature change.
- P1.T2.3 (parked opener / scoped edits): the `world.subscribe` soft-stop
  block in `ride.ts` is untouched. Single-train edits of the old
  multi-ride tests preserve each invariant: touching a non-ridden
  component keeps the ride; breaking the ridden component soft-stops to
  idle; locomotive/scenery edits never stop the ride.
- Cap placement: the cap-1 slice lives in the ride layer
  (`selectRideComponents(..., 1)` in `startAll`), keeping
  `selectRideComponents`' default cap (`4`) for the unit-level helper;
  `park-spot.ts` / `park-pose.ts` already passed 1 explicitly. The
  closed-first filter lives in `selectRideComponents` itself, so every
  caller gets loop-then-longest.

## Evidence paths

- `src/core/pathing.ts` (`selectRideComponents`)
- `src/state/ride.ts` (`startAll` cap 1 + no-swap guard)
- `src/core/park-spot.ts` (doc rename; call site audited)
- `src/core/pathing.test.ts`, `src/state/ride.test.ts` (TDD coverage)

## Deviations

- `src/state/ride.test.ts`: rewrote the seven multi-ride expectations to
  single-ride (one ride, smallest-anchor tie-break, no-swap second press,
  stop-to-idle on broken component, single-ride locomotive/scenery
  stability). Required by the FR-1 behavior change; each rewrite keeps the
  original invariant's coverage.

## Primary verification (4.7)

- Agent's reported command results read: evidence phase-1.md lists `pnpm check` exit 0 and AC table stated pass — required JSON/evidence present.
- Porcelain clean; diff in Touches only (pathing, ride, park-spot + tests + phase-1.md evidence).
- Guards: `git log --oneline e402201..HEAD` = task commits `3e2c712`, `5b8d3a3`, `d485a28`, all in report, no extra commits; tree clean at acceptance → keep task commits, no squash.

Date: 2026-11-10; Checkpoint: `5b8d3a3`
Command: `pnpm check` — exit 0 (biome 182, `tsc`, vitest 52 files / 904 passed).
Compared AC-1/AC-2/AC-3 against evidence table; verified on own run.

## Notes

- Task commits: `3e2c712` (Red tests), `5b8d3a3` (Green selection +
  single-ride updates). Evidence at
  `conductor/tracks/single-train-driver-camera_20261110/verification/phase-1.md`.
- `fleet.ridingCount()` (AC-3's second half) needs no edit: the fleet
  mirrors `rides()`, so with one ride it reports 1; `train-fleet.ts` is
  outside this phase's Touches and unchanged.
- Coverage: `pnpm check` includes the full unit suite (904 tests). The
  80% gate on `src/core` + `src/state` is Phase 3's explicit step; all
  existing logic-bearing tests pass here with new selection branches
  covered (`closed`/`!closed` pools, tie-breaks, capped single).
