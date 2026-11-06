# Phase 1 — Portable payload (pure core)

- **Track:** `world-portability_20261107`
- **Phase:** 1
- **Date:** 2026-11-07
- **Branch:** `feat/world-portability_20261107`
- **Base commit:** `1d202170d33aba1d1b71111d64fb5dc5ab399e14`
- **Head commit (code):** `3a65e2a7b3a390658e7d816a2f894bfa79f1268f`
- **Earlier code commit:** `bac9967888cc56da721572c81c2b814bb79d68a2`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (red) | `pnpm test src/core/portable.test.ts` | 1 | `Cannot find module './portable'` — expected: the module did not exist yet |
| unit (green) | `pnpm test src/core/portable.test.ts` | 0 | 20 tests passed |
| static + unit (phase gate) | `pnpm check` | 0 | Biome 165 files, `tsc --noEmit` clean, Vitest 43 files / 813 tests passed |
| unit (red, empty salvage follow-up) | `pnpm test src/core/portable.test.ts` | 1 | `refuses a salvage that kept no pieces or scenery` failed: the result was `imported` with two dropped pieces |
| unit (green, empty salvage follow-up) | `pnpm test src/core/portable.test.ts` | 0 | 22 tests passed |
| static + unit (phase gate, re-run) | `pnpm check` | 0 | Biome 165 files, `tsc --noEmit` clean, Vitest 43 files / 815 tests passed |

`pnpm check` is the phase verification command from `plan.md`; it was run
exactly as written.

## Red step

Before any implementation existed, `src/core/portable.test.ts` was written and
run. It failed for the intended reason only:

```text
FAIL  src/core/portable.test.ts
Error: Cannot find module './portable' imported from D:/Projects/3d-train-sim/src/core/portable.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

No assertion was reached; the failure was the missing module, not a wrong
expectation.

### Follow-up red step (empty salvage)

Primary verification found that a snapshot whose every entry was dropped still
returned `imported` with an empty world — importing it would wipe the meadow
while the note claimed only skipped toys. The new test was written first and
failed for that exact reason:

```text
FAIL  src/core/portable.test.ts > readImport salvage > refuses a salvage that kept no pieces or scenery
AssertionError: expected { status: 'imported', …(4) } to deeply equal { status: 'unreadable' }
Received: { status: 'imported', droppedPieces: 2, droppedScenery: 0, droppedDuplicates: 0, world: { pieces: [], scenery: [], … } }
```

Its clean-empty sibling (`still imports a clean empty world`) already passed,
proving the refusal is limited to an empty salvage.

## Acceptance criteria

| AC | Criterion | Proving test | Status |
| --- | --- | --- | --- |
| AC-2 | A 64-item world exports to under 100 KB. | `export size > keeps a full 64-item meadow under 100 KB` | pass |
| AC-3 | An empty meadow exports and re-imports as an empty meadow. | `buildExport > exports an empty meadow that imports back empty` | pass |
| AC-4 | A file over 1 MB is refused and changes no world state. | `readImport size guard > refuses a file one byte over the cap without carrying a world` and `... checks size before parsing` | pass |
| AC-5 | `"hello"`, `[]` and `{version: 99}` are each refused and change no world state. | `readImport refusal > refuses %j without carrying a world` (covers `""`, whitespace, `hello`, `[]`, `[1,2,3]`, `null`, `{"version":99}`), `... refuses a snapshot whose piece and scenery lists are not arrays`, and `readImport salvage > refuses a salvage that kept no pieces or scenery` (with `... still imports a clean empty world`) | pass |
| AC-9 | A file that needs salvaging loads its valid toys and reports how many were skipped. | `readImport salvage > imports the valid toys and counts each kind of skip separately` | pass (counts only; the parent-facing wording is Phase 2) |

Supporting requirements: FR-2/FR-3 (`buildExport` world-only payload, empty and
seeded starter worlds), FR-5/FR-6 (size and readability refusals), NFR-1
(pure module — no DOM, `Blob`, `File`, `window`, or store import), NFR-2
(`export to import round trip > reproduces ids, types, rotations, cells, train,
consist and deliveries`), NFR-5 (`... leaves no world behind on a refusal`).

## Size measurement

The 64-item world (60 pieces + 4 scenery, `MAX_PIECES = 64`) serializes to
**4,531 bytes**, well under the 100 KB budget. The measurement was taken from
`TextEncoder().encode(buildExport(world)).byteLength` inside the size test; the
test asserts `< 100 * 1024`.

## Contract notes

- `MAX_IMPORT_BYTES` is `1024 * 1024`. `readImport` refuses when
  `byteLength > MAX_IMPORT_BYTES`, so exactly 1 MiB is accepted and one byte
  over is refused (covered by two tests).
- `readImport` checks size **before** `JSON.parse`, so an oversized unreadable
  file reports `too-large` rather than `unreadable`.
- `buildExport` delegates to `serializeWorld` from `src/core/save.ts` with
  `muted = false` and no `dayPhase`, so the output never carries a
  `preferences` block. `SNAPSHOT_VERSION` and `save.ts` are untouched.
- Skip counts stay split (`droppedPieces`, `droppedScenery`,
  `droppedDuplicates`); the caller sums them for the notice.
- `PortableWorld` is a structural input, so this module never imports the
  world store or `WorldData` as a required shape (only the parse result type).
- A `salvaged` parse that keeps zero pieces and zero scenery is refused as
  `unreadable`; a `clean` parse with zero entries still imports as an empty
  world. This mirrors `isUsable()` in `src/state/persistence.ts`.

## Deviations

- `src/core/portable.ts`, `src/core/portable.test.ts` — primary verification
  found an empty-salvage import could wipe the meadow; added the refusal guard
  and its tests. No files outside `Touches` changed.

## Evidence

- `src/core/portable.ts`
- `src/core/portable.test.ts`
- Code commits: `bac9967888cc56da721572c81c2b814bb79d68a2`,
  `3a65e2a7b3a390658e7d816a2f894bfa79f1268f`

## Notes

- A salvage that kept zero toys is refused, consistent with the boot loader's
  `isUsable()`; a clean empty world still imports, so an exported empty meadow
  round-trips.
- Coverage (`pnpm test:coverage`) is not part of this phase's verification
  command; `pnpm check` (Biome + tsc + the full Vitest suite) passed.
- Manual-device checks do not apply to this pure phase.

## Primary verification

- HEAD at verification: `7e5b2f9`; working tree clean.
- `pnpm check` re-run by the primary agent: exit 0 — Biome 165 files, no
  findings; `tsc --noEmit` clean; Vitest 43 files / **815 tests** passed.
- `git diff --stat 1d20217..HEAD` touches exactly the two `Touches` files plus
  this evidence file (108 + 231 + 118 lines added). No file outside the phase
  contract changed.
- Code review of `src/core/portable.ts`: the module imports only `./save`,
  `./scenery`, `./track-graph`, `./trains` and `./wagons` — no DOM, no
  `three.js`, no `src/state`. `buildExport` reuses `serializeWorld` with
  `muted: false` and no day phase, so `preferences` is omitted and the payload is
  world-only. `readImport` checks size before `JSON.parse`, refuses unparseable
  input, refuses structurally unreadable snapshots, and refuses a salvage that
  kept zero entries while still importing a clean empty world. Skip counts stay
  split per kind.
- Rework applied during verification: the empty-salvage refusal above was found
  by the primary agent, not the phase subagent, and was fixed with a red test
  first (`3a65e2a`). Recorded as a deviation in the phase report.

