# Review — World Portability

- **Track:** `world-portability_20261107`
- **Branch:** `feat/world-portability_20261107`
- **Range:** `53d9a93..HEAD`
- **Rounds:** 2
- **Date:** 2026-11-07
- **Verdict:** PASS WITH FINDINGS (round 2; every finding fixed in Phases R1 and R2)

## Summary

The export/import pair is lossless, atomic and one undo step. `buildExport` cannot
emit `preferences`, `readImport` re-validates through `parseWorldSnapshot`, and the
e2e proves a byte-identical re-export. No child-reachable control or recovery note
survives the `is-reporting` state, and nothing leaves the device.

Round 1 found three Medium and two Low problems: the 1 MB cap was enforced after
the whole file had been decoded, the download itself was never observed, the
mid-ride test could pass without the explicit stop, a refusal could be written into
a dismissed tray, and the tray was still labelled "Starter railways". All five were
fixed in Phase R1 (`22041e2`) with tests that fail without the fix: a decode counter
that must stay at zero, a real `download` event compared byte for byte, an
identical-world mid-ride import, a refusal recorded after the tray was dismissed,
and an accessible-name assertion.

Round 2 confirmed every closure and found two more small gaps: the recovery-note
half of the refusal path had no test, and the size witness patched only
`File.prototype.text`. Both were closed in Phase R2 (`093c8d5`): a restored boot is
seeded from the save slots, a refusal is shown to replace the recovery line, and
re-arming brings it back; the counter now patches `File.text`, `Blob.text` and
`FileReader.readAsText`.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Static + unit | `pnpm check` | pass — Biome 167 files, `tsc` clean, Vitest 43 files / 820 tests |
| Coverage | `pnpm test:coverage` | pass — 97.33 / 91.01 / 98.07 / 99.44 (`src/core` + `src/state`, gate 80%) |
| Build | `pnpm build` | pass — 174 precache entries |
| Track e2e | `pnpm exec playwright test e2e/world-portability.spec.ts` | pass — 24 (12 tests × tablet + phone) |
| Full e2e | `pnpm exec playwright test` | pass — 177 before the R2 test addition; re-run at completion, and CI e2e is the release gate |

## Requirements coverage

| ID | Requirement | Status |
| --- | --- | --- |
| FR-1 | Save downloads a dated world file | covered |
| FR-2 | File holds world data only | covered |
| FR-3 | Empty meadow exports and re-imports | covered |
| FR-4 | Load accepts a JSON file | covered (input driven directly; the native sheet is not automatable) |
| FR-5 | Files over 1 MB refused before being read | covered |
| FR-6 | Unreadable files refused, world untouched | covered |
| FR-7 | Import replaces the world as one undoable change | covered |
| FR-8 | Import while riding stops the ride first | covered (identical-world case proves the explicit stop) |
| FR-9 | A note states what happened | covered (including the recovery-note replacement) |
| FR-10 | Controls unreachable before the hold | covered |
| NFR-1 | Nothing leaves the device | covered |
| NFR-2 | Round trip is lossless | covered |
| NFR-3 | A full world stays under 100 KB | covered (4,531 B) |
| NFR-4 | No per-frame cost | covered |
| NFR-5 | Refusals mutate nothing | covered |
| NFR-6 | Logic covered by unit tests | covered |
| AC-1 | Dated file with the world, actually downloaded | covered |
| AC-2 | Under 100 KB | covered |
| AC-3 | Empty round trip | covered |
| AC-4 | >1 MB refused | covered |
| AC-5 | Three unreadable inputs refused | covered |
| AC-6 | Valid file replaces; ids/rotations/cells/consist survive | covered |
| AC-7 | Undo restores the previous meadow | covered |
| AC-8 | Mid-ride import stops the ride | covered |
| AC-9 | Salvage loads valid toys and names the count | covered |
| AC-10 | Hidden until the hold | covered |

## Findings

### Round 1 — fixed in Phase R1 (`22041e2`)

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| F1 | Medium | The 1 MB guard ran after `file.text()`, so a mistaken huge pick was fully decoded before refusal | `file.size` check before the read; e2e requires zero decode calls |
| F2 | Medium | The download was never observed; the blob URL was revoked on the next macrotask | Revoke after 5 s; e2e awaits the `download` event and compares its bytes to the dev-handle payload |
| F3 | Medium | The mid-ride test also passed without the explicit stop, because replacing the world stops the ride as a side effect | New case imports the ridden meadow's own JSON, where no piece changes |
| F4 | Low | A refusal could be written into a dismissed tray, and did not replace a visible recovery note | `refuseImport()`; hidden tray routes to the report state, armed tray hides the recovery line |
| F5 | Low | The tray was announced as "Starter railways" while holding file actions | `aria-label="Parent controls"`, asserted |

### Round 2 — fixed in Phase R2 (`093c8d5`)

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| F6 | Medium | The recovery-note half of F4 was untested while the record claimed no debt | Seeded restored boot: refusal hides the recovery line, re-arming brings it back |
| F7 | Low | The size witness patched only `File.prototype.text`, so a different decode API could regress it silently | One counter patches `File.text`, `Blob.text` and `FileReader.readAsText` |

## Overrides

None. Strict mode — every finding was fixed; nothing deferred.

## Plan compliance

Four phases, all verified with evidence: Phase 1 `9f0df15`, Phase 2 `79f1920`,
Phase 3 `c90c6d8`, R1 `22041e2`, R2 `093c8d5`. Recorded deviations, all honest and
reviewed:

- `.portable-note` rather than `.recovery-note` (different lifetime and dismissal).
- An `is-reporting` tray state so the outcome line survives the tray closing; its
  controls are hidden by CSS, verified by `toBeHidden()` assertions.
- The `[]` refusal branch was missing from the AC-5 e2e and was added during
  Phase 3 verification.
- The R1 subagent rebuilt intermediate commits because `git apply` was denied; the
  final tree was diffed against the tested tree and is identical.

## Out of scope

- Real iPad/Android hardware (manual-device layer, still outstanding for this track).
- The native file picker sheet.
- A parent importing a valid but unwanted file — one undo is the designed net.

## Debt

None carried forward. The F4 residual was a missing test, not a missing harness; it
was closed in Phase R2 rather than recorded as debt.

## Doc sync

Synced. `conductor/tech-stack.md` records the world-only file format, the pre-read
size refusal and the two new UI/core modules (`portable.ts`, `portable-file.ts`).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 3 | 2 | 5 (Phase R1) |
| 2 | PASS WITH FINDINGS | 0 | 0 | 1 | 1 | 2 (Phase R2) |
