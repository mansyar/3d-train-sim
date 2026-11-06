# Phase R2 evidence — second-round review fixes

- **Track:** `world-portability_20261107`
- **Branch:** `feat/world-portability_20261107`
- **Phase base:** `5b67b29`
- **HEAD at evidence time:** `093c8d5`
- **Result:** R2.T1 and R2.T2 verified; R2.T3 blocked (see "Deviations").

## Findings → fix → test

| Finding | Fix (file) | Witness |
| --- | --- | --- |
| F6 — neither half of the recovery-note replacement was proven: nothing showed a refusal hides a visible `.recovery-note`, and nothing showed `armConfirm()` → `refreshRecoveryNote()` brings it back | `e2e/world-portability.spec.ts`: copied `waitForStoredCurrent` and `writeSlots` from `e2e/save-recovery.spec.ts` (no shared module), added the `restoredSnapshot` v3 fixture and `RESTORED_LINE`, and a new test `a refusal replaces the recovery note, and re-arming restores it` | New test passes on tablet and phone (2/2). It fails if `refuseImport()` stops hiding the recovery note (step 5) and if `armConfirm()` stops calling `refreshRecoveryNote()` (step 6) |
| F7 — the oversized-file zero-read witness patched only `File.prototype.text`, so a read moved to `Blob.prototype.text` or `FileReader.readAsText` would still pass | `e2e/world-portability.spec.ts`, same `page.evaluate`: patch all three prototypes against one counter, capturing the three originals first so one `File` read is counted once | Existing test `an oversized file is refused and changes nothing` still asserts `reads === 0`; passes on tablet and phone |

### The seeded snapshot (F6)

```json
{
  "version": 3,
  "pieces": [
    { "id": "piece-10", "type": "straight", "cell": { "x": 1, "y": 6 }, "rotation": 0 },
    { "id": "piece-11", "type": "corner", "cell": { "x": 1, "y": 7 }, "rotation": 90 }
  ],
  "scenery": []
}
```

Seeded with `current: 'garbage'` and the object above as `previous`, after
`waitForStoredCurrent` so the boot's own autosave cannot overwrite the seed.

### What the F6 test asserts, in order

1. R2.T1.1 — after the reload and an armed tray, `.recovery-note` is visible and
   `.recovery-note-text` is `Your meadow was restored from the last good save.`
2. R2.T1.2 — after `importFile(page, "{'not a meadow'")`, `.portable-note-text`
   is `NOTE.unreadable` and `.recovery-note` is hidden (they never stack).
3. R2.T1.3 — after dismissing the armed tray on `.mute-toggle` and re-arming, the
   recovery note is visible again with the same restored line.
4. `__tinyTracksExport().json` is byte-identical before and after the refusal; no
   console errors.

The restored boot did behave as `restored` under both form factors, so the
brief's blocker condition did not trigger and no assertion was weakened.

## Verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm check` | 0 | Biome 167 files, `tsc` clean, Vitest 43 files / 820 tests |
| `pnpm exec playwright test e2e/world-portability.spec.ts` | 0 | **24 passed** in 1.1 min (12 tests × tablet + phone), no retries |

Both commands were run on the final tree after the commit split.

## Deviations

- **R2.T3 was not applied: `edit` on
  `conductor/tracks/world-portability_20261107/review.md` returned
  `permission.rejected`.** The sandbox reserves `review.md` for the primary, so
  the round-2 record corrections (round-1 verdict PASS WITH FINDINGS, round-2
  findings table, Debt, Doc sync, History) still have to be written by the
  primary. I did not retry or route around the denial.
- Partial staging of one file is not available under these permissions, so the
  two e2e fixes were split by temporarily reverting the F7 hunk, committing F6
  (`3fab5d3`), then re-applying F7 and committing it (`093c8d5`). The final tree
  is byte-identical to the tested tree.
- Round-2 severities for F6 and F7 are not recorded anywhere this phase could
  read. The review record should not invent them; the History row can use `—`
  for the round-2 Medium/Low cells (0 Critical/High is safe: both were closed
  with tests and docs only).

## Suggested review-record text (for the primary)

Header:

```text
- **Round:** 2
- **Verdict:** PASS WITH FINDINGS (round 1: 3 Medium + 2 Low, all fixed in Phase R1;
  round 2: F6 and F7, both closed in Phase R2)
```

Round 2 table (place after the History table):

```markdown
### Round 2 findings and resolution

| ID | Finding | Resolution |
| --- | --- | --- |
| F6 | A refusal's two halves around the recovery note were untested: nothing proved a refusal hides a visible `.recovery-note`, and nothing proved `armConfirm()` restores it | `e2e/world-portability.spec.ts` seeds a restored boot, asserts the restored line when the tray opens, refuses `{'not a meadow'` in the tray and asserts the note is hidden with only `.portable-note-text` shown, then re-arms and asserts the line returns; the meadow is byte-identical before and after |
| F7 | The oversized-file zero-read witness patched only `File.prototype.text`, so a read moved to `Blob.prototype.text` or `FileReader.readAsText` would still pass | The same `page.evaluate` patches all three entry points against one counter; `reads === 0` still holds |
```

Debt, Doc sync, and History:

```text
## Debt

- None carried forward. F6 and F7 were fixed in Phase R2. The only residual from
  Phase R1 was F4's visible-tray branch: the code hid a stale `.recovery-note`,
  but no test reproduced a recovery note beside a refusal — a missing test, not a
  missing harness. Phase R2 seeds a restored boot through the save slots and
  closes it.

## Doc sync

`synced` — `tech-stack.md` already records the pre-read size refusal and the
world-only file format; nothing else in the standards changed.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 3 | 2 | all 5 (Phase R1) |
| 2 | PASS WITH FINDINGS | 0 | 0 | — | — | all 2 (Phase R2) |
```

Also stale in `review.md` after round 2 (optional, but it says what actually
happened): the Verification table's track e2e row is `18`, now `24`; and
FR-1/FR-5/FR-8/FR-9 plus AC-1/AC-4/AC-8 still read `partial (F2/F3)`, though
both were closed in Phase R1.

## Primary verification

- HEAD at verification: `093c8d5`; working tree clean; range `bb44ce2..HEAD`
  touches only `e2e/world-portability.spec.ts` plus this evidence file
  (+136/−6). No `src/**` change.
- `pnpm check` re-run by the primary agent: exit 0 — Biome 167 files, `tsc`
  clean, Vitest 43 files / 820 tests.
- `pnpm exec playwright test e2e/world-portability.spec.ts` re-run: exit 0,
  **24 passed** (12 tests × tablet + phone) in 1.1 min, no retries.
- R2.T3 could not be done by the subagent (`review.md` is refused by its
  sandbox, as the phase template intends), so the primary wrote the record:
  round-1 verdict corrected to PASS WITH FINDINGS, round-2 rows for F6/F7,
  Debt, Doc sync and History updated, and the stale `18`/`partial` rows fixed.
- Diff review: the new recovery test seeds `previous` after
  `waitForStoredCurrent`, reloads, asserts the restored line, refuses an
  import, asserts `.recovery-note` hidden, dismisses and re-arms, and asserts
  the line returns — both halves of the F4 fix now have a witness. The decode
  counter patches `File.text`, `Blob.text` and `FileReader.readAsText` from
  captured originals so one read counts once.
- Residual: a full-suite run was started after this checkpoint and reported
  separately; the PR's CI e2e job is the release gate.
