# Track: Crossing Re-Entry Pathing Bug

- **Spec:** [spec.md](spec.md) — what & why
- **Plan:** [plan.md](plan.md) — phased execution
- **Metadata:** [metadata.json](metadata.json) — id, status, branch

## Summary

`solvePath` (`src/core/pathing.ts`) terminates a closed layout prematurely when
the train must pass the **same crossing more than once per lap** (a
self-crossing / pretzel loop). Observed app behavior: the train rides into the
crossing, reaches its midpoint, pauses, and shuttles back out the way it came —
instead of continuing through and looping forever. Fix: close the walk only
when it returns to the exact start state (`startId` + `entryEdge`), never on
mere re-entry into an already-ridden piece. Confined to `src/core/pathing.ts`
+ tests (TDD); no scene/UI/save changes.