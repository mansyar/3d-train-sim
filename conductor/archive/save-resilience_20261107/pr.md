## Summary

The meadow can no longer lose a child's world to one bad byte. Snapshot parsing
now salvages every valid toy instead of discarding the whole world, saves keep
the previous payload in a second slot inside one atomic transaction, and a boot
that salvaged or restored anything tells a grown-up behind the parent gate. The
fix closes both permanent-loss paths: a partial corruption, and an unreadable
payload promoted over a good backup.

## Track

- **ID:** `save-resilience_20261107`
- **Type:** bug
- **Spec:** [`conductor/archive/save-resilience_20261107/spec.md`](conductor/archive/save-resilience_20261107/spec.md)
- **Plan:** [`conductor/archive/save-resilience_20261107/plan.md`](conductor/archive/save-resilience_20261107/plan.md)
- **Review:** [`conductor/archive/save-resilience_20261107/review.md`](conductor/archive/save-resilience_20261107/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Forgiving snapshot parsing | Salvage valid entries, count drops, keep v1/v2/v3 readable | verified | `4c5540f` | Capacity applies to accepted entries; pieces win shared capacity over scenery |
| 2: Two-slot atomic persistence | `current` + `previous` written in one transaction, restore on unreadable | verified | `6ae456d` | One `db.get` on a clean boot, two on a fallback; `DATABASE_VERSION` stays 1 |
| 3: Parent-gate recovery notice | Parent-facing line, dismissible for the session | verified | `64dcac6` | Option carries a thunk because `mountApp` runs before the boot read settles |
| 4: End-to-end recovery proof | Browser proof for salvage, restore, fresh | verified | `ba86433` | Seeds raw IndexedDB after the boot autosave so the test cannot be overwritten |
| R1: Review fixes | Empty salvage no longer accepted or promoted; duplicates counted; abortable harness | verified | `410db42` | The High finding from round 1 |
| R2: Second-round fixes | Restored backups report their own drops; narrower status type | verified | `44712d7` | Round 2 found only Low items |

## Requirements

- [x] `FR-1` — per-entry validation keeps every valid piece (test: `src/core/save.test.ts`)
- [x] `FR-2` — duplicate cells keep the first entry and count one duplicate
- [x] `FR-3` — unreadable `current` falls back to `previous` (also when a salvage kept nothing)
- [x] `FR-4` — prior payload and new payload written in one `readwrite` transaction
- [x] `FR-5` — unreadable or empty salvage is never promoted into `previous`
- [x] `FR-6` — status plus dropped piece/scenery/duplicate counts are observable
- [x] `FR-7` — parent gate shows a dismissible note for `salvaged` and `restored`
- [x] `FR-8` — both slots absent or unreadable seeds the starter railway
- [x] `FR-9` — v1/v2/v3 snapshots load unchanged, no version bump
- [x] `NFR-1` — loader stays total (fuzz coverage)
- [x] `NFR-2` — at most one extra IndexedDB write per save, no per-frame work
- [x] `NFR-3` — bounded at two snapshots, nothing leaves the device
- [x] `NFR-4` — 793 tests pass, coverage above the 80% gate
- [x] `NFR-5` — boot reads bounded at two
- [x] `AC-1` … `AC-9` — see `verification/integrated.md` and `verification/phase-*.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| lint + types | `pnpm check` | pass — Biome 163 files, `tsc --noEmit` clean | `verification/phase-R1.md` |
| unit | `pnpm test` (inside `pnpm check`) | pass — 42 files / 793 tests | `verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — 97.26% stmts / 90.94% branches / 98.03% funcs / 99.42% lines | `verification/integrated.md` |
| build | `pnpm build` | pass | `verification/integrated.md` |
| e2e | `pnpm exec playwright test e2e/save-recovery.spec.ts` | pass — 12/12 across tablet + phone | `verification/phase-4.md`, `verification/phase-R1.md` |
| e2e (full) | `pnpm exec playwright test` | 153 passed, 2 `phone` page crashes on unrelated specs that pass in isolation | `verification/integrated.md` |

## Review

- **Verdict:** `PASS WITH FINDINGS` (round 2; every finding fixed)
- **Rounds:** 2
- **Fixed:** 10 findings (1 High, 3 Medium, 3 Low in round 1; 3 Low in round 2)
- **Accepted/deferred:** 0 — `review.strict` is on

## Deviations and risks

- The new e2e spec waits for `.parent-gate.is-confirm` instead of sleeping, and
  the first test allows 120 s because a cold dev-server boot under two
  concurrent projects measured ~58–60 s on this machine. No assertion changed.
- No media was captured: the only visual change is a parent-facing text line
  behind the 2 s hold, which a still image does not demonstrate meaningfully.
- Real-device testing on iPad Safari / Android Chrome remains manual and was not
  performed for this branch.
- IndexedDB eviction by the OS is out of scope; it is the next track
  (`world-portability_20261107`).

## Follow-ups

- `world-portability_20261107` — export/import so a world survives eviction.

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

The change is backward compatible: snapshots stay v3 and an extra
`worlds/previous` key is ignored by older builds, so a rollback leaves every
existing world readable.
