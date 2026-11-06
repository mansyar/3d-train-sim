## Summary

A parent can now take the meadow off the tablet and bring it back.

Behind the two-second hold, the starter tray gains **Save meadow** and **Load
meadow**. Save writes the world to `tiny-tracks-YYYY-MM-DD.json` — the same v3
snapshot the loader already understands, world only, with no device preferences,
so a file cannot carry a mute state or a day phase. Load accepts that file back,
and an accepted file lands as **one undoable change**: the ↩️ chip restores the
previous meadow exactly as a preset does.

Refusals are quiet and total: a file over 1 MB is refused on its own byte count
*before* it is decoded, unreadable JSON is refused after parsing, and a file that
needs salvaging loads its valid toys while the note says how many were skipped. In
every refusal the world stays byte-identical. A file that salvages down to nothing
is refused rather than replacing a live meadow with grass.

The feature exists because IndexedDB can be evicted, a private window can be
closed, or a family member can clear site data — all three of which currently take
the world with them. This is the parent's own copy, and nothing leaves the device:
no network, no identifier, no upload.

## Track

- Spec: [conductor/archive/world-portability_20261107/spec.md](../conductor/archive/world-portability_20261107/spec.md)
- Plan: [conductor/archive/world-portability_20261107/plan.md](../conductor/archive/world-portability_20261107/plan.md)
- Review: [conductor/archive/world-portability_20261107/review.md](../conductor/archive/world-portability_20261107/review.md)

## What happened

| Phase | Checkpoint | What it did |
| --- | --- | --- |
| 1 — Portable payload (pure core) | `9f0df15` | `src/core/portable.ts`: dated file name, world-only payload, size-first import judgement, salvage reporting, refuses an empty salvage |
| 2 — Parent-gate wiring | `79f1920` | `WorldStore.importWorld` (one undo step, replaces train + consist too), DOM file helpers, tray buttons, report-only outcome line, dev export handle |
| 3 — Browser proof | `c90c6d8` | Playwright on tablet + phone: download shape, byte-identical round trip, empty world, 1 MB refusal, three unreadable inputs, salvage note, undo, mid-ride stop, gate reachability |
| R1 — Review fixes | `22041e2` | Size check before the read, real download assertion + 5 s revoke, identical-world mid-ride stop, refusal survives a dismissed tray, tray labelled "Parent controls" |
| R2 — Second review fixes | `093c8d5` | Recovery note replaced by a refusal and restored on re-arm, decode counter covers every read API |

## Requirements

- [x] `tiny-tracks-YYYY-MM-DD.json` uses the local date and holds the
      `SNAPSHOT_VERSION` snapshot with no `preferences` block
- [x] A 64-piece world exports far under 100 KB (measured 4,531 B)
- [x] An empty meadow exports and re-imports empty
- [x] Files over 1 MB are refused from their byte count, never decoded
- [x] `"hello"`, `[]` and `{version: 99}` are each refused with nothing changed
- [x] A valid file replaces the meadow and preserves ids, rotations, cells,
      train and consist
- [x] One ↩️ tap restores the pre-import meadow
- [x] Importing while a train runs stops the ride first, even when the file is
      the ridden meadow unchanged
- [x] A salvaged file keeps its valid toys and the note names the skipped count
- [x] A salvage that kept nothing is refused
- [x] Save and Load are unreachable until the two-second hold
- [x] Nothing leaves the device: no fetch, no identifier, no storage outside the
      meadow's own slot

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` (Biome + `tsc --noEmit` + Vitest) | pass — 167 files, 43 test files / 820 tests |
| `pnpm test:coverage` (`src/core` + `src/state`) | pass — 97.33% stmts / 91.01% branches / 98.07% funcs / 99.44% lines (gate 80%) |
| `pnpm build` | pass — PWA, 174 precache entries |
| `pnpm exec playwright test e2e/world-portability.spec.ts` | pass — 24 (12 tests × tablet + phone) |
| `pnpm exec playwright test` | pass — 183 (tablet, phone, prod), no retries; CI e2e is the release authority |

## Media

No visual change worth a clip: the only pixels added are two buttons and one line
of grown-up text behind a two-second hold. A phone screenshot of the armed tray
would show the buttons but not the file behaviour the track is about.

## Review

Two strict rounds against the same reviewer.

- **Round 1:** 3 Medium + 2 Low. The size cap ran after `file.text()`, the download
  was never observed, the mid-ride test passed without the explicit stop, a refusal
  could be written into a dismissed tray, and the tray was still called "Starter
  railways". All five fixed.
- **Round 2:** 1 Medium + 1 Low. The recovery-note half of the refusal path was
  untested, and the size witness patched only `File.prototype.text`. Both fixed.
- Final verdict: **PASS WITH FINDINGS**, nothing deferred.

## Deviations and risks

- The import note is its own element (`.portable-note`), not the boot recovery
  line: the recovery note is session-dismissible and boot-driven, while an import
  message must repeat on every attempt.
- After a file action the tray stays open in a report-only state so the outcome is
  readable; the CSS hides the presets, both file buttons and the recovery note in
  that state, asserted in e2e.
- The native file picker sheet is not automatable; the spec drives the input
  directly. Real-device testing (iPad Safari / Android Chrome) remains the manual
  layer and is still outstanding for this track.
- One undo is the only safety net by design; importing a valid but unwanted file is
  a deliberate, reversible act by a grown-up.

## Follow-ups

- `runtime-guarantees_20261107` (next Phase 0 item): font precache, offline spec,
  CSP and security headers.
- Manual device pass for the file picker and download on a real iPad and an
  Android tablet.

## Rollback

`git revert` this squash commit. Nothing persists differently: the file format is
the existing v3 snapshot and the loader already tolerates it, so an older build
simply ignores the extra buttons.
