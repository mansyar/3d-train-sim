# Spec — Crossing Re-Entry Pathing Bug

**Track ID:** `crossing-reentry-path_20260830` · **Type:** Bug (core pathing) · **Branch:** `track/crossing-reentry-path`

## Overview

`solvePath` (`src/core/pathing.ts`) terminates a closed layout prematurely when
the train must pass the **same crossing more than once per lap** (a
self-crossing / pretzel loop). Observed app behavior: the train rides into the
crossing, reaches its midpoint, then pauses and shuttles back out the way it
came — instead of continuing through and looping forever.

**Root cause:** the walk's termination check treats *any* re-entry into an
already-visited piece as "loop complete":

```ts
if (ridden.has(partner.pieceId)) {
  closed = partner.pieceId === startId && partner.edge === entryEdge;
  break;
}
```

That rule is only correct for simple cycles (each piece visited once). A
crossing traversed twice per lap legitimately re-enters ridden pieces before
returning to the true start state → `closed` comes back `false`, and the path
is cut at the crossing. This violates product rule #1 ("no dead ends") and the
V1 promise that closed loops loop forever.

## Functional Requirements

1. **FR1 — Correct closure detection.** `solvePath` returns
   `{ closed: true }` for any fully-closed layout (every piece end connected),
   including loops that pass a crossing multiple times per lap.
2. **FR2 — No premature cut.** The emitted path covers the full lap; each
   crossing pass is its own `PathStep` with the true entry/exit edges. Steps
   stay deterministic (existing cell-key ordering unchanged).
3. **FR3 — Termination rule.** The walk closes **only** when it returns to the
   exact start state (`startId` + `entryEdge`). Re-entry into an already-ridden
   piece through a *different* edge is a legal crossing pass and continues the
   walk. Termination remains guaranteed: the routing step function over
   `(piece, entryEdge)` states is deterministic and invertible, so the orbit
   from the start state is a cycle containing the start state (or hits an open
   end) — no infinite loops, no explicit step cap needed.
4. **FR4 — No behavior change elsewhere.** Simple cycles still loop, open
   paths still ride-and-shuttle, figure-8 through one crossing still rides one
   lobe and closes, empty world still yields no path (`start()` refuses).
   Crossings keep routing straight-through (no branch semantics introduced).
5. **FR5 — Fix scope.** Confined to `src/core/pathing.ts` + its tests. No
   scene/UI/state/save changes; `ride-motion` consumes the corrected path
   unmodified.

## Non-Functional Requirements

- All gates green: `pnpm check` (biome + `tsc --noEmit` + full unit suite),
  Playwright smoke with zero console errors / zero external requests.
- Coverage >80% on new logic in `src/core/pathing.ts` (existing pathing
  coverage extended by the new cases).
- No performance or determinism regression: `solvePath` runs once per ride
  start, O(pieces); no per-frame change.
- Privacy/offline untouched.

## Acceptance Criteria

- New regression tests: (a) a fully-closed self-crossing loop (crossing passed
  twice per lap, every end connected) → `path.closed === true` and steps cover
  the whole lap; (b) each crossing pass appears with correct from/to edges;
  (c) figure-8 case still closes on one lobe; (d) all existing pathing /
  track-graph tests stay green.
- The new self-crossing test is written first and fails (red) before the fix.
- Manual tablet check recorded in `plan.md`: build a loop that passes the same
  crossing twice per lap, press ▶ — the train loops forever, never stopping at
  the crossing midpoint and never reversing.

## Out of Scope

- Track switches / branches (future roadmap) — crossings stay straight-through.
- Any change to crossing routing semantics, open-path shuttle timing, or
  scene/UI behavior.
- Save-format changes, perf refactors of `solvePath`, dead-code cleanup.
