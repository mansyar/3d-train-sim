# Implementation Plan — Crossing Re-Entry Pathing Bug

**Track ID:** `crossing-reentry-path_20260830` · **Branch:** `track/crossing-reentry-path`

Workflow: TDD for logic-bearing code (`src/core`, `src/state`), acceptance
criteria + smoke + manual tablet check for scene wiring
(`conductor/workflow.md`). One task in flight at a time.

## Phase 1: Reproduce, Fix, Verify

- [x] Task: Write failing regression tests for crossing re-entry (logic — TDD)

- **Expected behavior (unit tests first):**
  - Build a fully-closed self-crossing layout (every piece end connected; the
    only junction is one crossing passed twice per lap — e.g., a pretzel
    loop): `solvePath` must return `{ closed: true }` with steps covering the
    whole lap and each crossing pass a separate step with true from/to edges.
  - Guard cases: a figure-8 through one crossing still rides exactly one lobe
    and closes; a simple oval closes; an open line shuttles; empty world
    yields no path.
  - Run the suite: the new self-crossing test FAILS (red); others pass.
- **Commit:** `test(core): Reproduce premature path cut at crossing re-entry`
- **Notes:** Extend `src/core/pathing.test.ts` following its existing
  helper/fixture conventions. Confirm red before any implementation change.

- [x] Task: Fix walk termination in `solvePath` (logic) `119a5c7`

- **Expected behavior:**
  - Closure is detected only when the walk returns to the exact start state
    (`startId` + `entryEdge`); re-entry into a ridden piece through a
    different edge continues the walk.
  - The (piece, entryEdge) step function is deterministic and invertible, so
    the orbit from the start state is a cycle containing the start state (or
    hits an open end) — termination without an explicit step cap.
  - Existing cases unchanged: same steps, same `closed` for simple cycles,
    open shuttles, figure-8.
- **Commit:** `fix(core): Close loops that re-enter a crossing`
- **Notes:** `src/core/pathing.ts` only; crossing straight-through routing
  unchanged. Green after fix.

- [~] Task: Coverage + gates

- Coverage >80% on new logic (existing pathing coverage extended); run
  `pnpm check` (biome + `tsc --noEmit` + vitest) and the Playwright smoke
  suite. Add tests only if coverage or gates require it.
- **Commit:** `chore` only if test additions were needed; otherwise record in
  the phase verification report.
- **Notes:** Full suite green, smoke green, zero console errors.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Acceptance criteria (manual tablet check):**
  - Dev server + touch emulation: build a closed loop that passes the same
    crossing twice per lap, press ▶ — the train loops forever; it never stops
    at the crossing midpoint and never shuttles back.
  - Re-checks: simple oval loops; open line shuttles at dead ends; figure-8
    rides one lobe.
- **Verification Report:** (filled after automated + manual confirmation;
  checkpoint SHA recorded per workflow protocol.)
