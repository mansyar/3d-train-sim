# Review — World Portability

- **Track:** `world-portability_20261107`
- **Branch:** `feat/world-portability_20261107`
- **Range:** `53d9a93..HEAD`
- **Round:** 1
- **Date:** 2026-11-07
- **Verdict:** BLOCK (round 1; 3 Medium + 2 Low, all fixed in Phase R1)

## Summary

The export/import pair is lossless, atomic and one undo step. `buildExport` cannot
emit `preferences`, `readImport` re-validates through `parseWorldSnapshot`, and the
e2e proves a byte-identical re-export. No child-reachable control or recovery note
survives the `is-reporting` state, and nothing leaves the device.

What does not hold up: the 1 MB cap is enforced after the whole file is decoded, so
a mistaken 300 MB pick is fully read before refusal; the download itself is never
observed by a test, so "Saved …" could be shown with no file; and the mid-ride test
passes even if the explicit stop is deleted, because replacing the world already
stops the ride as a side effect.

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Static + unit | `pnpm check` | pass — Biome 167 files, `tsc` clean, Vitest 43 files / 820 tests |
| Coverage | `pnpm test:coverage` | pass — 97.33 / 91.01 / 98.07 / 99.44 (`src/core` + `src/state`) |
| Build | `pnpm build` | pass — 174 precache entries |
| Track e2e | `pnpm exec playwright test e2e/world-portability.spec.ts` | pass — 18 |
| Full e2e | `pnpm exec playwright test` | pass — 177 in 12.7 min |

## Requirements coverage

| ID | Requirement | Status |
| --- | --- | --- |
| FR-1 | Save downloads a dated world file | partial (F2: no download observed) |
| FR-2 | File holds world data only | covered |
| FR-3 | Empty meadow exports and re-imports | covered |
| FR-4 | Load accepts a JSON file | covered (input driven directly; native picker not automatable) |
| FR-5 | Files over 1 MB refused | covered (hardening gap F1) |
| FR-6 | Unreadable files refused, world untouched | covered |
| FR-7 | Import replaces the world as one undoable change | covered |
| FR-8 | Import while riding stops the ride first | partial (F3: mechanism unproven) |
| FR-9 | A note states what happened | covered (edge case F4) |
| FR-10 | Controls unreachable before the hold | covered |
| NFR-1 | Nothing leaves the device | covered |
| NFR-2 | Round trip is lossless | covered |
| NFR-3 | A full world stays under 100 KB | covered (4,531 B) |
| NFR-4 | No per-frame cost | covered |
| NFR-5 | Refusals mutate nothing | covered |
| NFR-6 | Logic covered by unit tests | covered |
| AC-1 | Dated file with the world | partial (F2) |
| AC-2 | Under 100 KB | covered |
| AC-3 | Empty round trip | covered |
| AC-4 | >1 MB refused | covered |
| AC-5 | Three unreadable inputs refused | covered |
| AC-6 | Valid file replaces; ids/rotations/cells/consist survive | covered |
| AC-7 | Undo restores the previous meadow | covered |
| AC-8 | Mid-ride import stops the ride | covered (F3) |
| AC-9 | Salvage loads valid toys and names the count | covered |
| AC-10 | Hidden until the hold | covered |

## Findings

### F1 — Medium — oversized files are read before they are refused

- **File:** `src/ui/parent-gate.ts:240-249`, `src/ui/portable-file.ts:29-30`, `src/core/portable.ts:80`
- **What:** `readWorldFile(file)` calls `file.text()` and only then does `readImport`
  compare `byteLength`. The cap bounds parsing, not reading.
- **Why:** This feature exists because storage can vanish. A refusal path that can
  freeze or crash the tab on a mistaken 300 MB pick makes the safety net the
  incident, and on iOS a tab crash reads to a parent as a lost world.
- **Fix:** Refuse on `file.size` before reading, keeping the pure check as defence
  in depth.
- **Test gap:** The e2e oversized payload fits in memory, so it cannot fail if the
  guard moves back after the read.

### F2 — Medium — the export download is never observed

- **File:** `src/ui/portable-file.ts:11-23`, `src/main.ts:270-279`
- **What:** Tests assert the dev handle's string and the note text, which is written
  after a fire-and-forget `anchor.click()`. `URL.revokeObjectURL` runs on the next
  macrotask, the timing WebKit has historically aborted downloads on.
- **Why:** AC-1 says the export *downloads* a file. An export that does not land is
  the worst failure for a feature whose entire purpose is an off-device copy, and it
  would be invisible to both the parent and CI.
- **Fix:** Revoke later (5 s), and assert the `download` event plus its bytes.
- **Test gap:** No `page.waitForEvent('download')` anywhere.

### F3 — Medium — the explicit mid-ride stop is not what the test proves

- **File:** `src/ui/parent-gate.ts:259-261`, `src/state/ride.ts:124-145`
- **What:** `importWorld` empties the piece set, so the ride controller's own
  subscription stops the ride anyway. The test asserts only the end state, so
  deleting `if (deps.isRiding?.()) deps.stopRide?.()` keeps it green.
- **Why:** FR-8 promises the ride stops *before* the world is replaced. The only case
  that needs the explicit stop is importing the same world — exactly the case that
  is untested.
- **Fix:** Import a file identical to the ridden world and assert the ride ends.
- **Test gap:** `e2e/world-portability.spec.ts:345`.

### F4 — Low — a refusal can be written into a hidden tray

- **File:** `src/ui/parent-gate.ts:191-198`, `:271-279`
- **What:** `showPortableNote` assumes the tray is on screen. If the tray is
  dismissed while the read resolves, the refusal is written into a hidden div. Also,
  a refusal leaves an existing recovery note visible beside it.
- **Why:** Refusals are when a parent most needs the message.
- **Fix:** Route refusals through the report state when the tray is closed; hide the
  recovery note when a refusal is shown inside the tray.

### F5 — Low — the tray is still labelled "Starter railways"

- **File:** `src/ui/app.ts:76`
- **What:** `role="group"` + `aria-label="Starter railways"` now wraps presets, Save,
  Load, the file input, both notes and the version line.
- **Why:** A screen-reader parent gets a misleading group name for the only
  orientation available inside the gate.
- **Fix:** `aria-label="Parent controls"`.

## Overrides

None. Strict mode — no finding deferred.

## Plan compliance

All three phases verified with evidence; the phase checkpoints match the plan
(`9f0df15`, `79f1920`, `c90c6d8`). Two deviations were recorded honestly and one
gap was found by primary verification and closed before review:

- `.portable-note` instead of `.recovery-note` (different lifetime).
- `is-reporting` tray state, so the outcome line is visible after the tray would
  otherwise close — correct, because FR-9 requires it.
- The `[]` refusal branch was missing from the AC-5 e2e and was added during Phase 3
  verification.

## Out of scope

- Real iPad/Android hardware (manual-device layer, still outstanding for this track).
- The native file picker sheet (the spec drives the input directly).
- A parent importing a valid but unwanted file — one undo is the designed net.

## Debt

None. All findings fixed in Phase R1.

## Doc sync

Pending — tech-stack was synced before review (`portable.ts`, `portable-file.ts`,
world-only file format); the post-review sync records the pre-read size refusal and
the download test.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 0 | 3 | 2 | 0 |
