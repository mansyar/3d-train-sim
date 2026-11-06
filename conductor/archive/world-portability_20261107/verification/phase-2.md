# Phase 2 — Parent-gate wiring

- **Track:** `world-portability_20261107`
- **Phase:** 2
- **Date:** 2026-11-07
- **Branch:** `feat/world-portability_20261107`
- **Base commit:** `278f92d6aeb1943414cfecc1ba4ec4d7c128fada`
- **Head commit (code):** `b08d563ff083f47cf21798fbf2df25b2cc51c5a8`
- **Earlier code commits:** `cd1e7b1` (store import), `d17aa8e` (file helpers)
- **Result:** verified

No visual claim is made here. DOM/file behaviour is not unit-tested in this
project (`conductor/workflow.md`: only `src/core` and `src/state` are
logic-bearing); the browser proof for export, import, ride stopping and the note
is Phase 3.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (red) | `pnpm test src/state/world.test.ts` | 1 | 5 new cases failed: `TypeError: store.importWorld is not a function` (77 existing passed) |
| unit (green) | `pnpm test src/state/world.test.ts` | 0 | 82 tests passed (5 new import cases) |
| static + unit (phase gate) | `pnpm check` | 0 | Biome 166 files, `tsc --noEmit` clean, Vitest 43 files / 820 tests passed |

`pnpm check` is the phase verification command from `plan.md`; it was run
exactly as written. The first run failed on one Biome formatting finding in
`src/ui/parent-gate.ts` (a wrapped constant that fits on one line); the fix was
formatting only and the re-run is the exit 0 above.

## Red step

`src/state/world.test.ts` gained its import cases before the store method
existed. All five failed for the missing method and nothing else:

```text
FAIL  src/state/world.test.ts > world store import > replaces pieces, scenery, train, and consist from the file
TypeError: store.importWorld is not a function
 Test Files  1 failed (1)
      Tests  5 failed | 77 passed (82)
```

## Acceptance criteria

| ID | Criterion (short) | Where satisfied | Status |
| --- | --- | --- | --- |
| FR-1 | Export control downloads `tiny-tracks-YYYY-MM-DD.json` | `parent-gate.ts` builds the name with `exportFileName(new Date())` and hands it to `saveWorldFile`; `exportFileName` is already unit-covered (Phase 1). The download itself is click-and-blob work. | wiring done; Phase 3 proves the download |
| FR-4 | Import control opens a JSON file picker | `.portable-import` clicks the hidden `<input type="file" accept="application/json,.json">`; the picker is browser UI. | wiring done; Phase 3 proves the picker |
| FR-7 | A valid import replaces the world via the store as ONE undoable change | `world.test.ts > world store import` (replacement, ledger, single undo, id counter). | pass (unit) |
| FR-8 | Any active ride is stopped before the replace | `parent-gate.ts` calls `deps.stopRide?.()` when `deps.isRiding?.()` before `world.importWorld`; `app.ts` passes `options.stopRide` and `() => riding`. | wiring done; Phase 3 proves the ride stops |
| FR-9 | Inline outcome note for saved / loaded / skipped / unreadable | `showPortableNote` / `showPortableReport` in `parent-gate.ts`, text via `textContent` only. | wiring done; Phase 3 proves visibility and wording |
| FR-10 | Both controls only reachable from the hold-to-arm tray | Buttons and input are children of `.preset-tray`, which stays `hidden` until the 2 s hold arms it. | wiring done; AC-10 is Phase 3 |
| NFR-4 | Parse once per selection, no per-frame work | The `change` handler reads the file once and calls `readImport` once; nothing runs on frames or on tray refresh. | pass (inspection) |
| NFR-6 | New pure logic in `src/core` with colocated tests | The judgement stayed in Phase 1's `src/core/portable.ts`; this phase adds only DOM glue and store wiring, and the store logic has tests. | pass (Phase 1 + this phase's tests) |
| AC-1 | Export name and content | `__tinyTracksExport()` (DEV) returns the same `{ name, json }` the Save button builds. | Phase 3 |
| AC-6 | A valid file replaces the meadow, ids/rotations/cells/consist survive | `world.test.ts > world store import > replaces pieces, scenery, train, and consist from the file`; the file bytes themselves are Phase 1's round-trip test. | pass (unit) + Phase 3 |
| AC-7 | One undo restores the pre-import meadow | `world.test.ts > world store import > is one undoable change: undo restores the whole prior meadow`. | pass (unit) |
| AC-8 | Import while running stops the ride first | The guard runs before `importWorld`; the ride state is pushed by the scene. | Phase 3 |
| AC-10 | Neither control reachable before the hold arms the tray | Template placement inside the hidden tray; no new kid-visible control. | Phase 3 |

Also relevant, pre-existing coverage still green: FR-2/FR-3 and NFR-1 in
`src/core/portable.ts` (Phase 1).

## Files changed

| File | Change |
| --- | --- |
| `src/state/world.ts` | `WorldStore.importWorld(data)` on the interface and the store. It replaces pieces, scenery, deliveries, train and consist (documented as the deliberate difference from `applyPreset`, which keeps the kid's train), recomputes the id counter past the imported ids, installs the prior meadow as the single `pendingUndo`, and notifies once. The two copy helpers were hoisted to module scope and a `replaceMeadow` helper now serves both entry points; `applyPreset` behaviour is unchanged. |
| `src/state/world.test.ts` | Five new cases in `world store import` (replacement, delivery ledger, single undo, id counter, one notify for a default world). Written first and seen red. |
| `src/ui/portable-file.ts` | New. `saveWorldFile(fileName, json)` (JSON `Blob`, object URL, temporary `<a download>`, click, remove, deferred `revokeObjectURL`) and `readWorldFile(file)` (`file.text()` + `file.size`); read rejections propagate. No `src/core` import. |
| `src/ui/app.ts` | Tray template gains `.portable-export`, `.portable-import`, the hidden `.portable-import-input` and `.portable-note`; `createParentGate` now receives `stopRide` and `isRiding`. The child rail is untouched. |
| `src/ui/parent-gate.ts` | `ParentGateDeps` gains `stopRide?` / `isRiding?`. Export flow (disarm, build, save, ding, note), import flow (picker → read → judge → stop ride → `world.importWorld` → ding → note, with the per-status wording and `input.value = ''` after each attempt), and the report-only note state. |
| `src/main.ts` | DEV-only `__tinyTracksExport()` returning `{ name, json }` from the same `exportFileName`/`buildExport` path as the Save button, declared on the `devWindow` type. Production bundles gain no handle (inside `import.meta.env.DEV`). |
| `src/style.css` | `.portable-export` / `.portable-import` quiet 44 px grown-up buttons and `.portable-note` styled after `.recovery-note` (reusing its colours), `[hidden]` rule, and the report-only rule that hides the tray's controls. Existing child-rail rules untouched; no transitions added, so `prefers-reduced-motion` has nothing to disable. |

## Deviations

- `src/ui/app.ts`, `src/ui/parent-gate.ts`, `src/style.css` — the outcome line
  uses the new `.portable-note` element instead of `.recovery-note`, as the
  brief prescribes. Reason: the recovery note is session-dismissible and driven
  by a boot-time thunk, while import/export messages are transient and repeat on
  every attempt.
- `src/ui/parent-gate.ts`, `src/style.css` — **note visibility after the tray
  closes.** The note lives inside `.preset-tray` (as briefed), but disarming
  hides the tray, which would have hidden the very line the parent needs.
  Resolved without moving the element or adding a control: after a file action
  the tray re-opens in a report-only state (`is-reporting`) that hides the preset
  picks, both portable buttons and the recovery note, so only the outcome text
  (and the version line) is visible and nothing interactive is in reach. The
  next tap elsewhere dismisses it, and arming the tray clears it. This keeps
  FR-9 (an inline, readable outcome) and FR-10 (no control reachable without a
  fresh hold) true at the same time. No file outside `Touches` changed.
- `src/ui/parent-gate.ts` — the too-large wording reads
  `That file is too big to be a meadow. Tiny Tracks saves stay under 1 MB.`
  rather than the brief's quoted sentence, because the brief also asked for the
  1 MB limit stated in words a parent understands. It still names the problem,
  the limit, and the cure (pick a Tiny Tracks save).
- No product or schema changes; `src/core/**` and `src/state/persistence.ts` are
  untouched, as required.

## Evidence

- `src/ui/portable-file.ts`
- `src/ui/parent-gate.ts`
- `src/ui/app.ts`
- `src/state/world.ts`
- `src/state/world.test.ts`
- `src/main.ts`
- `src/style.css`
- Code commits: `cd1e7b1`, `d17aa8e`, `b08d563`

## Primary verification

- HEAD at verification: `0b5b82e`; working tree clean.
- `pnpm check` re-run by the primary agent: exit 0 — Vitest 43 files /
  **820 tests** passed (Biome and `tsc` clean, since the suite only runs after
  both).
- `git diff --stat 278f92d..HEAD -- . ':!conductor'` = 7 files, +356/-10, exactly
  the `Touches` list. `src/core/**` and `src/state/persistence.ts` untouched.
- Code review:
  - `world.importWorld` snapshots pieces, scenery, deliveries, train, consist and
    the id counter before replacing, installs one `pendingUndo`, and notifies
    once; `applyPreset` still carries the kid's train, and that contrast is
    documented in the source.
  - Export and the DEV handle take the same `exportFileName`/`buildExport` path,
    so Phase 3 asserts the identical payload the button produces.
  - Import reads the file once, clears `input.value` before awaiting so
    re-picking the same file re-fires, judges with `readImport`, stops the ride
    before `world.importWorld`, and writes every note through `textContent`.
  - The report-only tray state hides the preset picks, both portable buttons and
    the recovery note with `display: none` (so they leave the tab order), leaves
    only the outcome line, and is dismissed by the next pointerdown anywhere.
    Nothing destructive stays armed after an import: `disarmConfirm()` runs
    first.


## Notes

- `pnpm check` is Biome + `tsc --noEmit` + the full Vitest suite. The coverage
  gate (`pnpm test:coverage`) is not part of this phase's verification command
  and was not run.
- The Save/Load buttons use words, not icons only, because they sit behind the
  2 s hold; the child rail gained nothing.
- Import notes never use `innerHTML`, file data is written with `textContent`,
  and no `alert()` is used.
