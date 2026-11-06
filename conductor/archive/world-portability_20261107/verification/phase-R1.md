# Phase R1 — Review fixes

- **Track:** `world-portability_20261107`
- **Phase:** R1 (review fixes)
- **Date:** 2026-11-07
- **Branch:** `feat/world-portability_20261107`
- **Base:** `995259c96073faa5322729e1d4eed183544ed1a9` (`995259c`)
- **Head (verified):** `523f39e` (`fix(ui): label the parent tray for what it holds`)
- **Result:** verified

Closes the five findings from review round 1 without changing behaviour the
spec already promises. `src/core/**` and `src/state/**` are untouched.

## Finding → fix → test

| Finding | Fix | Commit | Test that fails without it |
| --- | --- | --- | --- |
| F1 (Medium) — a 300 MB pick is fully materialised before `readImport` refuses it (`src/ui/parent-gate.ts:240-249`) | Compare `file.size` with `MAX_IMPORT_BYTES` in the `change` handler, before `readWorldFile`; keep `readImport`'s `byteLength` check as defence in depth for callers that bypass the handler | `849c2d4` | `an oversized file is refused and changes nothing` now patches `File.prototype.text` and asserts **0** decodes. Without the pre-read guard the decode count is 1 (the note alone still passed, which is why the existing case could not catch this). |
| F2 (Medium) — the download is never observed; the blob URL is revoked on the next macrotask (`src/ui/portable-file.ts:11-23`, `src/main.ts:270-279`) | Revoke after 5 s with a comment naming the WebKit abort; prove the download in e2e | `fbb3e83` | `saving writes the starter meadow as a dated v3 file` now waits for `download`, asserts `download.suggestedFilename() === exported.name`, and compares the landed bytes with `__tinyTracksExport()` byte for byte, then keeps the `Saved <name>` note assertion. The name/shape assertions were not removed. |
| F3 (Medium) — the mid-ride test passes without the explicit stop because the import empties the pieces (`src/ui/parent-gate.ts:259-261`) | None in `src` (the explicit `isRiding → stopRide` pair was already correct); add a discriminating case | `834401d` | New `importing the very same meadow still stops the ride explicitly`: start the ride, capture `__tinyTracksExport()`, import that identical payload. No piece id changes, so `src/state/ride.ts` keeps riding unless the handler stops it; the test asserts the ride face returns and the meadow is unchanged. |
| F4 (Low) — a refusal can be written into a dismissed tray, and can sit beside a stale recovery note (`src/ui/parent-gate.ts:191-198`, `:271-279`) | `refuseImport()`: if `presetTray.hidden`, `disarmConfirm()` + `showPortableReport()`; otherwise hide `recoveryNote` and `showPortableNote()`. Every refusal routes through it (read failure, `too-large` early return, `status === 'too-large'`, `status === 'unreadable'`) | `d62b715` | New `a refusal after the tray is dismissed stays visible`: arm the gate, dismiss with an outside tap, drive the hidden input with `setInputFiles`, assert the tray reopens in `is-reporting` with the note visible and Save/Load still hidden. Without `refuseImport` the note is written into the hidden tray and the visibility assertion fails. |
| F5 (Low) — `.preset-tray` is still labelled `Starter railways` (`src/ui/app.ts:76`) | `aria-label="Parent controls"`; nothing else in the template touched | `523f39e` | `save and load stay out of reach until the parent gate is held` asserts `toHaveAccessibleName('Parent controls')` after the hold. |

Confirmation that the F3 case is a real discriminator: `src/state/ride.ts`
subscribes to the world and returns early when `editedIds(previousPieces,
pieces)` is empty, so importing an identical payload leaves the ride running
unless the handler calls `deps.stopRide?.()`.

## Verification commands

| # | Command | Exit code | Result |
| --- | --- | --- | --- |
| 1 | `pnpm check` | 0 | Biome: 167 files checked, no fixes applied. `tsc --noEmit`: clean. Vitest: 43 files / 820 tests passed (2.40 s). |
| 2 | `pnpm exec playwright test e2e/world-portability.spec.ts` | 0 | **22 passed** (11 tests × 2 projects: tablet/iPad Mini, phone/iPhone 13), 0 failed, 0 skipped, 0 flaky, no retries, 59.5 s. |

Both commands were run exactly as written against `523f39e` with a clean
working tree. Earlier runs (07:49, 07:51) were executed on the same file
content before the commit split; `git diff 995259c..HEAD` shows the identical
cumulative change (4 files, 115 insertions, 10 deletions), so the verified
bytes and the committed bytes are the same.

## e2e counts per project

| Project | Tests | Passed | Failed | Skipped |
| --- | --- | --- | --- | --- |
| tablet (iPad Mini, WebKit) | 11 | 11 | 0 | 0 |
| phone (iPhone 13, WebKit) | 11 | 11 | 0 | 0 |
| **Total** | **22** | **22** | **0** | **0** |

Test inventory: 9 pre-existing cases (reachability, save, round trip, salvage,
empty, oversized, unreadable, undo, mid-ride) plus 2 new cases (dismissed-tray
refusal, identical-world mid-ride).

## Acceptance criteria touched

| AC | Evidence |
| --- | --- |
| AC-1 (dated download with world-only snapshot) | The save case now proves a real browser download, its suggested name, and bytes equal to the export handle. |
| AC-4 (>1 MB refused, no state change) | Oversized case asserts the refusal note, **zero** `File.text` calls, and a byte-identical export. |
| AC-8 (importing while riding stops the ride first) | Both the existing alternate-world case and the new identical-world case pass. |
| AC-10 (controls unreachable before the 2 s hold) | Reachability case also asserts the tray's accessible name is `Parent controls`. |

FR-5, FR-6, FR-9, FR-10, FR-1 and FR-8 are covered by the same cases; no
`src/core` behaviour changed.

## Deviations and notes

- **F1 test needed an extra witness.** The brief's suggested pre-read check is
  not observable through the note (the old path also shows the too-large note
  after decoding), so the oversized case additionally counts `File.prototype.text`
  calls. This is the only added assertion beyond the brief.
- **F5 needed a test** to satisfy "every fix must land with a test that would
  fail without it". The reachability case now asserts the accessible name; the
  template itself changed only the one attribute.
- **Download proof worked in both WebKit projects.** `page.waitForEvent('download')`
  fired for the blob URL and `download.path()` returned a readable file in this
  Playwright version; no blocker and no weakened assertion.
- **F4's visible-tray recovery-note branch** (hide a stale `.recovery-note`
  before showing the refusal) is implemented but not exercised by a dedicated
  e2e: producing a recovery note deterministically needs a storage-failure
  harness this track does not have. The dismissed-tray branch — the one that
  could write into a hidden div — is covered.
- **Commit split:** F1 lands first with `showPortableNote` (the brief allowed
  this), then F4 immediately routes the guard through `refuseImport`; each
  commit is independently consistent. Partial staging of one file was not
  permitted by the sandbox, so commits were built by restoring each intermediate
  state; the final tree was re-verified after the split.
- No `src/core`, `src/state`, `src/main.ts`, lockfile, or generated file changed.
  No new runtime dependency, network call, or identifier left the device.

## Primary verification

- HEAD at verification: `d3778f1`; working tree clean; range `995259c..HEAD`
  touches only the four Touches files plus this evidence file (+115/−10).
- `pnpm check` re-run by the primary agent: exit 0 — Biome 167 files, `tsc`
  clean, Vitest 43 files / 820 tests.
- `pnpm exec playwright test e2e/world-portability.spec.ts` re-run: exit 0,
  **22 passed** (11 tests × tablet + phone) in 59.2 s, no retries.
- Diff review of each fix:
  - F1: `file.size > MAX_IMPORT_BYTES` sits before `readWorldFile`, and
    `readImport`'s own check is untouched. The e2e counts `File.prototype.text`
    calls and requires zero, so the assertion fails if the guard moves back
    after the read — the note alone would not.
  - F2: blob revoke moved to 5 s; the e2e awaits the real `download` event,
    checks the suggested file name and compares the landed bytes to the dev
    handle payload (so the second field list in `main.ts` cannot drift silently).
  - F3: the new case imports the ridden meadow's own JSON, where no piece
    changes, and the ride still ends — only the explicit stop can do that.
  - F4: `refuseImport` routes a hidden-tray refusal into the report state; the
    new e2e dismisses the tray first, then drives the hidden input and asserts
    the note is visible with both file buttons still hidden. The armed-tray
    branch also hides a visible recovery note; that half is implemented but has
    no dedicated e2e (a deterministic recovery note needs a storage-failure
    harness), recorded as residual test debt.
  - F5: tray accessible name asserted as `Parent controls`.
- Commit split is per finding; the subagent had to rebuild intermediate states
  because `git apply` was denied, and the final tree was diffed against the
  tested tree (identical). No behaviour changed by that rebuild.
