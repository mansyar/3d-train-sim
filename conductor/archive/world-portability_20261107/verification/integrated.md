# Integrated Verification — World Portability

Track: `world-portability_20261107`
Branch: `feat/world-portability_20261107`
Range: `53d9a93..HEAD` (base `main` at `53d9a937ebaca7ca58b3fb48ed6778b4ebb99272`)
Date: 2026-11-07

## Scope

The whole track was re-verified as one unit after every phase had been verified
individually: a pure export/import layer, the parent-gate wiring, and the browser
proof. Phase checkpoints: Phase 1 `9f0df15`, Phase 2 `79f1920`, Phase 3 `c90c6d8`.

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit | `pnpm check` | 0 | Biome clean (167 files), `tsc --noEmit` clean, Vitest 43 files / 820 tests |
| coverage | `pnpm test:coverage` | 0 | statements 97.33%, branches 91.01%, functions 98.07%, lines 99.44% on `src/core` + `src/state` (gate 80%) |
| build | `pnpm build` | 0 | PWA `generateSW`, 174 precache entries, 10,544.41 KiB (chunk-size warning is pre-existing) |
| e2e (track) | `pnpm exec playwright test e2e/world-portability.spec.ts` | 0 | 18 passed (tablet 9, phone 9) |
| e2e (full) | `pnpm exec playwright test` | 0 | **183 passed** (tablet, phone, prod) in 13.2 min after the R2 addition, no retries, no page crashes |

## Acceptance criteria

| ID | Criterion | Evidence |
| --- | --- | --- |
| AC-1 | Export downloads `tiny-tracks-YYYY-MM-DD.json` with a world-only snapshot | e2e `saving writes the starter meadow as a dated v3 file` (name pattern, `version: 3`, no `preferences`, ids match the live store, note names the same file) |
| AC-2 | A 64-item world exports under 100 KB | Phase 1 evidence: measured 4,531 bytes for a 64-item world |
| AC-3 | An empty meadow exports and re-imports empty | e2e `an empty meadow saves and re-imports empty` |
| AC-4 | A file over 1 MB is refused with a note and changes nothing | e2e `an oversized file is refused and changes nothing` (1,048,577 bytes; export string identical after) |
| AC-5 | `"hello"`, `[]`, `{version: 99}` are each refused with a note and change nothing | e2e `unreadable files are refused and change nothing` (syntax error, non-record array, unsupported version; export string identical after each) |
| AC-6 | A valid file replaces the world; ids, rotations, cells and consist survive | e2e `a saved meadow re-imports byte for byte` (id/cell equality plus byte-identical re-export) and the unit cases in `src/state/world.test.ts` |
| AC-7 | Undo after an import restores the pre-import meadow | e2e `undo puts the pre-import meadow back`; unit `is one undoable change` |
| AC-8 | Importing while a train runs stops the ride before the world changes | e2e `importing mid-ride stops the train before the meadow changes` |
| AC-9 | A file that needs salvaging loads its valid toys and states the skip count | e2e `a salvaged file keeps its valid toys and names the broken one` (`Skipped 1 broken toy.`) |
| AC-10 | Neither control is reachable before the 2 s hold | e2e `save and load stay out of reach until the parent gate is held` |

## Residual risk

- The tray buttons and the file picker are proved in WebKit (iPad Mini and iPhone
  13 profiles), not on real hardware. A real iPad/Android pass is still the
  manual-device layer and remains outstanding for this track.
- The file picker itself is browser UI: the spec drives the input directly rather
  than the native sheet, which Playwright cannot click.
- The 1 MB refusal is checked from `File.size` before parsing; a malicious file
  that is small but slow to parse is bounded by `MAX_PIECES`, not by time.
- A parent can still overwrite a good meadow by importing a valid but unwanted
  file; the single undo is the only safety net by design (spec, "one undoable
  change").

## Verdict

Integrated and ready for review. Every phase checkpoint is in the history, the full
suite passed on all three projects in one run (183/183 after the R2 test, no retries — the two phone
`Page crashed` failures seen during the previous track did not recur), and every
acceptance criterion has an automated witness at the unit or browser layer. Nothing
in the track changed `src/core/save.ts`, the snapshot version, or the persistence
slots, so the save-resilience guarantees still hold: the exported file is the same
v3 snapshot the loader already tolerates.
