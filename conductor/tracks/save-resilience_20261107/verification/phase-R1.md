# Phase R1 — Review Fixes — Verification

- **Track:** save-resilience_20261107
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-07
- **Branch:** `fix/save-resilience_20261107`
- **Base commit:** `f32a3e1` (phase base per brief)
- **Head commit (verified):** `f7a9084`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome 163 files clean; `tsc --noEmit` clean; Vitest 42 files / 791 tests passed |
| e2e | `pnpm exec playwright test e2e/save-recovery.spec.ts` | 0 | 12 passed (6 specs × `tablet` + `phone`), 1.3 min |

Both commands were run exactly as written in the brief after the last edit.
`pnpm check` ran twice during the phase (before and after the e2e edits); the
second run above is the final recorded one. The recorded e2e run followed the
final spec edit and passed on the first attempt.

### Project results (final e2e run)

| Project | Device profile | Tests | Result |
| --- | --- | --- | --- |
| `tablet` | iPad Mini, 768 × 1024 | 6 | 6 passed |
| `phone` | iPhone 13, 390 × 844 | 6 | 6 passed |

**Browser:** WebKit — Playwright `1.62.1` bundled build, headless, driven through
the device profiles above. These are browser emulation profiles, not physical
devices.

## Review findings

| ID | Finding | Fix | Evidence | Status |
| --- | --- | --- | --- | --- |
| F1 | An empty salvage was accepted as `current` and then promoted over a good `previous`. | One shared `isUsable()` predicate: clean is always usable (even empty), salvaged only when it kept at least one piece or scenery item. Used by `loadWorldRecovery()` for both slots and by `saveWorldSnapshot()` before promoting the prior payload. Two reads per boot, one transaction per save, unchanged. | `src/state/persistence.ts`; unit tests `restores the previous world when current is only an empty salvage`, `never promotes an empty salvage over a good previous`, `still loads a clean empty current as clean`; e2e `a boot ignores an empty salvage and restores the previous save`. | fixed |
| F2 | Duplicate-only drops never reached the parent notice. | `WorldRecovery.droppedDuplicates` is populated from whichever slot was used (0 for fresh), `recoveryNotice()` accepts it as an optional fourth argument and counts it, and `main.ts` passes it. Wording and singular/plural behaviour are unchanged. | `src/core/recovery.ts`, `src/main.ts`, `src/state/persistence.ts`; formatter tests `reports a duplicate-only salvage in the singular` (`0, 0, 1`) and `counts duplicates alongside pieces and scenery`; persistence test `surfaces duplicate-only drops`; e2e `a duplicate-only salvage still tells a grown-up`. | fixed |
| F3 | The gate helper slept a fixed 2100 ms instead of waiting for the armed state. | `HOLD_MS` deleted; the helper presses, waits for `.parent-gate.is-confirm`, then releases. | `e2e/save-recovery.spec.ts`; every gate test in the run exercises the helper. | fixed |
| F4 | The IndexedDB stand-in committed `put`s immediately, so an aborted transaction could not be observed. | `makeDb` stages writes in a pending map and flushes them only when `done` resolves; a rejecting `done` clears the staging. New test `leaves the committed slots untouched when the write is interrupted` asserts both writes were staged, the save still resolves, the database closes, and committed entries are unchanged. Existing tests were not weakened. | `src/state/persistence.test.ts` | fixed |
| F5 | Already fixed by the primary. | Not touched. | — | untouched |
| F6 | Capacity was checked before duplication, so overflow duplicates counted as dropped pieces/scenery. | Duplicate id/cell detection now runs first for both pieces and scenery, then the shared `MAX_PIECES` check. New test `counts an overflow entry that duplicates an accepted cell as a duplicate` (`MAX_PIECES + 1`, overflow duplicates `{ x: 0, y: 0 }`) asserts `droppedPieces === 0`, `droppedDuplicates === 1`. | `src/core/save.ts`, `src/core/save.test.ts` | fixed |
| F7 | The same `MAX_PIECES` overflow fixture appeared twice in `save.test.ts`. | Removed the copy in the `world snapshots` block; the recovery-block copy remains. The now-unused `WorldSnapshot` import was dropped. | `src/core/save.test.ts` | fixed |

## Acceptance criteria touched

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | Two saves keep the prior state in `previous`; an interrupted write leaves a consistent pair. | Existing two-save test still passes on the staging stand-in, and the new aborted-write test proves neither slot is committed when `done` rejects. | pass |
| AC-5 | The save after a recovery promotes the recovered world instead of the failed payload. | `never promotes an empty salvage over a good previous`: after a restored boot with an empty salvage still in `current`, the next save leaves `previous` holding the good world. | pass |
| AC-2 | A duplicate cell is counted as a duplicate. | Existing duplicate tests plus the new persistence and e2e duplicate-only cases; the parent sees a note for a duplicate-only salvage. | pass |
| AC-7 | The gate note is visible and dismissible. | Existing dismissal test still passes with the event-driven gate hold. | pass |

## Behaviour as implemented

- `isUsable()` lives next to `WorldRecovery` in `src/state/persistence.ts` and is
  the single gate for both "may this slot be loaded?" and "may this payload be
  promoted?". A clean but empty world is deliberately still usable: the child
  deleting every toy must not resurrect the backup.
- `loadWorldRecovery()` keeps its contract: `snapshot` is the raw payload and a
  fallback to `previous` reports `restored`. The dropped counts now describe the
  slot that was actually used.
- `saveWorldSnapshot()` still performs at most one transaction with two writes;
  only the predicate that decides whether to promote changed.
- `recoveryNotice()`'s fourth parameter defaults to `0`, so any existing caller
  keeps its behaviour; the total is pieces + scenery + duplicates.
- F6 reorders checks only — a duplicate is dropped as a duplicate whether or not
  the meadow is full; capacity still counts the overflow as dropped pieces or
  scenery.
- The duplicate-only e2e case seeds two pieces on one cell plus a third on its
  own cell, proving the surviving world and the singular note line at the same
  time.

## Deviations

- `e2e/save-recovery.spec.ts` harness margins. The brief allows a timeout
  fallback for the armed-state wait. Under load, this machine measured the first
  test of each project taking ~58–60 s (two cold app boots plus the shared dev
  server), and the default 5 s locator-assertion timeout was not enough for the
  2 s gate timer. The armed wait therefore uses an explicit 20 s ceiling, and
  the first test (the only one paying the cold-start cost for its worker) keeps
  a 120 s ceiling instead of 60 s. Neither changes what is asserted; both stay
  event-driven. The other tests keep their 60 s budgets.
- One formatter test beyond the brief (`counts duplicates alongside pieces and
  scenery`) guards the combined total; no production code changed for it.

## Evidence paths

- `src/state/persistence.ts`, `src/state/persistence.test.ts` — F1, F2 plumbing, F4
- `src/core/recovery.ts`, `src/core/recovery.test.ts`, `src/main.ts` — F2
- `src/core/save.ts`, `src/core/save.test.ts` — F6, F7
- `e2e/save-recovery.spec.ts` — F1, F2, F3
- `conductor/tracks/save-resilience_20261107/verification/phase-R1.md` — this report

No large artifacts were needed; every assertion is made through the unit
harness, the live world handle, the gate DOM, or the console collectors.

## Notes

- Task commits: `840574b` (R1.T1/R1.T2 plumbing + R1.T4), `dceeaab` (R1.T2
  notice), `7ffa83b` (R1.T5/R1.T6), `f7a9084` (R1.T1–R1.T3 e2e). This evidence
  file is committed after the verified head.
- `pnpm check` went from 784 to 791 tests: eight new tests, one duplicate
  fixture removed.
- The dev-server log shows only the pre-existing Three.js
  `PCFSoftShadowMap has been deprecated` warning at boot; no console errors were
  collected by the spec.

## Primary verification

Independent run by the primary on HEAD `0b18dcf` (working tree clean):

| Command | Result |
| --- | --- |
| `pnpm check` | Exit 0 — Biome 163 files no findings, `tsc --noEmit` clean, Vitest 42 files / 791 tests |
| `pnpm exec playwright test e2e/save-recovery.spec.ts` | Exit 0 — 12 passed (6 specs x tablet + phone), 1.5 min |

Diff `fd9f9f6..HEAD` contains only the eight Touches files plus this evidence
file (+285/−49 excluding `conductor/`). Reviewed:

- `isUsable()` treats a `salvaged` snapshot as usable only when it kept at least
  one entry, and is applied to `current`, to `previous`, and to promotion. A
  `clean` empty world still loads, so deleting everything is not mistaken for
  corruption.
- `droppedDuplicates` reaches `WorldRecovery` from the slot actually used and is
  added to the notice total; the fourth parameter is defaulted so other callers
  stay valid.
- Duplicate detection now runs before the capacity check in both the piece and
  scenery loops, so an overflow entry that repeats an accepted cell is reported
  as a duplicate.
- The e2e gate helper now waits for `.is-confirm` instead of sleeping; the
  aborted-transaction test proves neither write commits when `done` rejects.

No deviation beyond the recorded test-timeout change, which does not alter any
assertion.
