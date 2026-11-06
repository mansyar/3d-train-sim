# Review: Save Resilience

- **Track:** `save-resilience_20261107`
- **Type:** bug
- **Branch:** `fix/save-resilience_20261107`
- **Range:** `0ea627a..fa690ab`
- **Date:** 2026-11-07T01:05:00+11:00
- **Verdict:** `BLOCK`

## Summary

The core of the track is sound: per-entry salvage is total, duplicate handling is
keep-first with pieces-before-scenery precedence, the loader never leaks
`unreadable`, the two-slot save is one `readwrite` transaction with at most two
reads, and the parent note is correctly hidden behind the 2 s hold with
session-scoped dismissal. The review blocks on one High finding: a salvage that
keeps **zero** entries is accepted as usable, `previous` is never consulted, and
the next autosave then promotes that empty payload over the last good backup —
the exact permanent-loss path the track exists to remove. Two Medium findings
follow from it: duplicate-only salvage produces no parent note, and the
transaction test harness cannot observe an aborted write. Three Low findings are
mechanical (timing headroom in the new spec, a mis-ordered capacity/duplicate
check, and one duplicated test block).

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass (784) | `pnpm check` on `fa690ab` |
| coverage | `pnpm test:coverage` | pass (97.26% / 90.94% / 98.03% / 99.42%) | 80% gate on `src/core` + `src/state` |
| lint | `pnpm exec biome check .` | pass (163 files) | `pnpm check` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `pnpm check` |
| build | `pnpm build` | pass (174 precache entries) | integrated run |
| e2e (track) | `pnpm exec playwright test e2e/save-recovery.spec.ts` | pass (8/8) | tablet + phone |
| e2e (full) | `pnpm exec playwright test` | 153 pass, 2 phone `Page crashed` | matches `e2e/README.md` soak fingerprint; both pass 8/8 in isolation |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2, P1.T4 | `save.test.ts` salvage/capacity/fuzz, e2e salvage | covered |
| FR-2 | P1.T3 | `save.test.ts` duplicate cells + ids | covered |
| FR-3 | P2.T2 | `persistence.test.ts`, e2e restore | covered |
| FR-4 | P2.T1 | `persistence.test.ts` two-save + no-corrupt-promotion | covered |
| FR-5 | P2.T1.2, P2.T3 | `persistence.test.ts` restore-then-save | partial (F1) |
| FR-6 | P1.T1 | `save.test.ts`, `persistence.test.ts` | covered |
| FR-7 | P3.T1, P3.T3, P4.T1.2 | `recovery.test.ts`, e2e note/dismiss | partial (F2) |
| FR-8 | P1.T1, P2.T2.2 | fuzz test, e2e both-slots-corrupt | covered |
| FR-9 | P1.T5.1 | v1/v2/v3 fixtures | covered |
| NFR-1 | P1.T5.2 | no new imports; diff review | covered |
| NFR-2 | P2.T1, P2.T4.2 | `SNAPSHOT_VERSION` unchanged | covered |
| NFR-3 | P2.T1, P2.T4 | storage-failure tests | covered |
| NFR-4 | P3 | note inside the 2 s-hold tray, e2e | covered |
| NFR-5 | P2.T2.3 | at most two `get`s; no timing claim | partial |
| AC-1 | P1.T2, P4.T1.1 | unit + e2e salvage | covered |
| AC-2 | P1.T3 | duplicate unit tests | covered |
| AC-3 | P2.T2, P4.T1.1 | unit + e2e restore | covered |
| AC-4 | P2.T1, P2.T4 | two saves covered; interrupted write **unverified** | partial (F4) |
| AC-5 | P2.T3 | restore-then-save | partial (F1) |
| AC-6 | P1.T1, P2.T2.2 | status/count tests | covered |
| AC-7 | P3.T3, P4.T1.2 | unit formatter + e2e note | covered |
| AC-8 | P2.T2.2, P4.T2 | unit + e2e fresh | covered |
| AC-9 | P1.T5.1 | version fixtures | covered |

## Findings

### Critical

- None.

### High

- **F1 — An empty salvage is accepted and then promoted over a good backup**
  - **File:** `src/state/persistence.ts:61-69` (acceptance) and `:214` (promotion)
  - **What:** A `current` payload that parses as `salvaged` with zero kept
    entries is used as the boot world without reading `previous`, and the same
    payload is treated as promotable, so the next save copies it over the good
    `previous`.
  - **Why:** The meadow comes up empty while a complete world sits in
    `previous`, and the backup is then destroyed. Reachable through the
    project's own additive-piece-type practice (an older/cached build drops
    every unknown piece) or a uniformly out-of-range snapshot. Violates FR-5 /
    AC-5 and the product promise that loading restores the last world.
  - **Fix:** Treat a salvage with no content as unusable in `loadWorldRecovery`
    (fall through to `previous`; keep clean empty worlds loadable). In
    `saveWorldSnapshot`, promote only a prior that is `clean`, or `salvaged`
    with at least one kept entry.
  - **Requirement:** FR-5, AC-5
  - **Test gap:** Unit: `current` = v3 with only unknown types, `previous` =
    good world → expect `restored` and the previous pieces; then save and assert
    `previous` still holds the good world. Mirrored e2e seed.

### Medium

- **F2 — A duplicate-only salvage shows no parent note**
  - **File:** `src/core/recovery.ts:25-26`, `src/state/persistence.ts:38-43`
  - **What:** `droppedDuplicates` never reaches `WorldRecovery`, so a snapshot
    salvaged only by dropping duplicate cells/ids reports `salvaged` with counts
    of 0 and the gate shows nothing.
  - **Why:** Duplicate cells are one of the two reproductions named in the spec,
    and the toy is genuinely lost; FR-7 requires a note for every `salvaged`
    boot.
  - **Fix:** Add `droppedDuplicates` to `WorldRecovery`, pass it to
    `recoveryNotice`, and include it in the total.
  - **Requirement:** FR-7, AC-2
  - **Test gap:** Formatter unit for `(salvaged, 0, 0, 1)`; persistence assertion
    that the count surfaces; one duplicate-cell e2e seed expecting a note.

- **F3 — The new gate helper has 100 ms of timing headroom**
  - **File:** `e2e/save-recovery.spec.ts:22, 156`
  - **What:** `waitForTimeout(2100)` against a 2000 ms timer, with no assertion
    that the gate actually armed.
  - **Why:** A late timer under CI/soak load disarms on pointer-up and fails as a
    flake. Every other gate spec uses 2400–2500 ms.
  - **Fix:** After `mouse.down()`, wait for `.parent-gate.is-confirm` (or the
    tray) before `mouse.up()`; or use 2400 ms.
  - **Requirement:** AC-7
  - **Test gap:** none.

- **F4 — The transaction harness cannot observe an aborted write**
  - **File:** `src/state/persistence.test.ts:357-374`
  - **What:** The stand-in applies `put` to the shared map immediately and
    resolves `done`, and the failure tests only cover `openDB` rejection and
    `transaction()` throwing.
  - **Why:** AC-4's "interrupted write leaves a consistent pair" clause is
    claimed but has no behavioral proof; an eager-write mock would make a naive
    assertion tautological.
  - **Fix:** Stage writes in a pending map and flush on `done`; add a test where
    `done` (or `put`) rejects and assert the save still resolves, the DB closes,
    and the committed entries are unchanged.
  - **Requirement:** AC-4
  - **Test gap:** the aborted-transaction test.

### Low

- **F5 — Integrated evidence re-labels three acceptance criteria**
  - **File:** `conductor/tracks/save-resilience_20261107/verification/integrated.md:45-49`
  - **What:** AC-2, AC-4, and AC-6 were paraphrased into different criteria,
    silently dropping AC-4's interrupted-write half.
  - **Fix:** Restore the spec wording and mark the interrupted-write half
    explicitly unverified until F4 lands. **Fixed by the primary during review
    recording.**
  - **Requirement:** AC-4
  - **Test gap:** none.

- **F6 — Capacity is checked before duplication, so overflow duplicates are
  mis-counted**
  - **File:** `src/core/save.ts:140-149, 163-170`
  - **What:** An overflow entry that also duplicates an accepted cell counts as
    `droppedPieces` rather than `droppedDuplicates`.
  - **Why:** The counts are parent-visible through the note and asserted in
    tests.
  - **Fix:** Check id/cell duplication first, then capacity.
  - **Requirement:** FR-6
  - **Test gap:** `MAX_PIECES+1` case whose overflow entry duplicates an
    accepted cell.

- **F7 — The capacity-overflow test is duplicated**
  - **File:** `src/core/save.test.ts:235-249` and `:368-381`
  - **What:** Two copies of the same fixture and assertions.
  - **Fix:** Keep one.
  - **Requirement:** none
  - **Test gap:** none.

## Overrides

- None.

## Plan compliance

All four phases carry `Result: verified`, a checkpoint, and an evidence file.
Every task is ticked and was implemented. The final diff stays inside the union
of the phases' `Touches`; Phase 3 added `src/style.css` to its `Touches` before
execution and recorded no other deviation. One process note: the Phase 4
subagent reported a pass while `pnpm check` failed on Biome formatting; the
primary caught it, formatted the one chained call, and re-ran the full check
before accepting the phase. Phase 4's evidence records that correction.

## Out of scope

- Two `phone` `Page crashed` failures in the full suite (`tunnel.spec.ts:30`,
  `wagon-workshop.spec.ts:149`). Both pass 8/8 in isolation and match the
  documented dev-server soak fingerprint; not caused by this diff.
- Real-device verification (iPad Safari / Android Chrome) remains human-only.
- IndexedDB eviction is the next track (`world-portability_20261107`).

## Debt

- None deferred. `review.strict` is on, so F1–F7 are fixed in Phase R1.

## Doc sync

`pending` — tech-stack already notes the two-slot store; re-check after R1.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 3 | 3 | 1 (F5, by primary) |
