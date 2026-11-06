# World Portability — Implementation Plan

> **Branch:** `feat/world-portability_20261107`
> **Base:** `main` @ `53d9a937ebaca7ca58b3fb48ed6778b4ebb99272`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Portable payload (pure core)

- **Goal:** `src/core/portable.ts` turns world data into an export file, names
  it from a date, and judges an incoming file — size, readability, salvage count
  — without touching the DOM, `three.js`, or the world store.
- **Depends on:** none
- **Covers:** FR-2, FR-3, FR-5, FR-6, NFR-1, NFR-2, NFR-3, NFR-5, AC-2, AC-3,
  AC-4, AC-5, AC-9
- **Touches:** `src/core/portable.ts`, `src/core/portable.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Build the export payload and file name** — covers: FR-2, FR-3
  - [x] **P1.T1.1:** Export `MAX_IMPORT_BYTES` (1 MB) and
    `exportFileName(date)` returning `tiny-tracks-YYYY-MM-DD.json` with zero
    padding and no time component.
  - [x] **P1.T1.2:** Export `buildExport(world)` returning the serialized
    snapshot string for pieces, scenery, train, consist and deliveries, with no
    `preferences` block, reusing `serializeWorld` from `src/core/save.ts`.
  - [x] **P1.T1.3:** Cover an empty world and a seeded starter world so export
    never depends on there being content.

- [x] **P1.T2: Judge an incoming file** — covers: FR-5, FR-6, NFR-5
  - [x] **P1.T2.1:** Export `readImport(text, byteLength)` returning a
    discriminated result: `too-large`, `unreadable`, `imported` with
    `droppedPieces`/`droppedScenery`/`droppedDuplicates`.
  - [x] **P1.T2.2:** Delegate validation to `parseWorldSnapshot`; treat
    `unreadable` as a refusal and `salvaged` as an import with a skip count.
  - [x] **P1.T2.3:** Prove atomicity — a refusal result carries no world and the
    function mutates nothing.

- [x] **P1.T3: Prove round-trip identity and size** — covers: NFR-2, NFR-3
  - [x] **P1.T3.1:** A world with mixed pieces, scenery, non-default train,
    consist and deliveries survives export → readImport with identical ids,
    types, rotations, cells, train, consist and delivery counts.
  - [x] **P1.T3.2:** A maximum-size world (64 meadow items) exports under
    100 KB.

**Result:** verified
**Checkpoint:** 9f0df15
**Evidence:** conductor/tracks/world-portability_20261107/verification/phase-1.md

## Phase 2: Parent-gate wiring

- **Goal:** A parent can export and import from the armed tray, with inline
  feedback, one undoable replacement, and an active ride stopped first.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-4, FR-7, FR-8, FR-9, FR-10, NFR-4, NFR-6, AC-1, AC-6,
  AC-7, AC-8, AC-10
- **Touches:** `src/ui/portable-file.ts`, `src/ui/parent-gate.ts`,
  `src/ui/app.ts`, `src/state/world.ts`, `src/state/world.test.ts`,
  `src/main.ts`, `src/style.css`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P2.T1: Make replacement one undoable change** — covers: FR-7
  - [x] **P2.T1.1:** Add a store method that replaces pieces, scenery, train,
    consist and deliveries and records the previous state as the single pending
    undo, mirroring `applyPreset`.
  - [x] **P2.T1.2:** Unit-test that one undo after a replacement restores the
    prior world, and that a second undo does nothing.

- [x] **P2.T2: Add the download and file-read helpers** — covers: FR-1, FR-4,
  NFR-1
  - [x] **P2.T2.1:** `src/ui/portable-file.ts` exports a save helper that
    creates a Blob, an object URL and a temporary anchor, clicks it, then
    revokes the URL.
  - [x] **P2.T2.2:** The same module reads a `File` as text and reports its size
    so the caller can refuse oversized files before parsing.

- [x] **P2.T3: Wire the tray controls** — covers: FR-8, FR-9, FR-10, NFR-4
  - [x] **P2.T3.1:** `app.ts` renders export and import controls inside the
    preset tray, with a hidden `<input type="file" accept=".json,application/json">`
    and a status line reusing the recovery-note element.
  - [x] **P2.T3.2:** `parent-gate.ts` fills the status line with `textContent`
    for imported / imported-with-skips / unreadable / too-large, and clears it
    on disarm.
  - [x] **P2.T3.3:** Import stops an active ride before the world is replaced.
  - [x] **P2.T3.4:** Style the controls and status line for the parent tray,
    respecting `prefers-reduced-motion`, without changing the child rail.
  - [x] **P2.T3.5:** Expose a dev-only `window.__tinyTracksExport()` returning
    `{ name, json }` from the same `buildExport` + `exportFileName` path so the
    Phase 3 spec can assert the payload without a WebKit download event.

**Result:** verified
**Checkpoint:** 79f1920
**Evidence:** conductor/tracks/world-portability_20261107/verification/phase-2.md

## Phase 3: Browser proof

- **Goal:** Playwright proves the round trip, the three refusal paths, undo,
  ride-stop and gate reachability on tablet and phone.
- **Depends on:** Phase 2
- **Covers:** AC-1, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
- **Touches:** `e2e/world-portability.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/world-portability.spec.ts`
  and `pnpm check`
- **Status:** verified

- [x] **P3.T1: Prove export content and import round trip** — covers: AC-1,
  AC-3, AC-6, AC-9
  - [x] **P3.T1.1:** Read the export payload through a dev-only handle (both
    Playwright projects are WebKit, where a Blob download event is the least
    reliable assertion) and assert the file name and shape.
  - [x] **P3.T1.2:** Import a seeded file with `setInputFiles` and assert the
    meadow matches the file's pieces, including a salvaged file that reports its
    skip count.
  - [x] **P3.T1.3:** Import an empty world and assert the meadow is empty with
    no console error.

- [x] **P3.T2: Prove refusals, undo, ride-stop and reachability** — covers:
  AC-4, AC-5, AC-7, AC-8, AC-10
  - [x] **P3.T2.1:** Oversized and unreadable inputs each leave the world
    unchanged and show the refusal note.
  - [x] **P3.T2.2:** Undo after an import restores the pre-import meadow.
  - [x] **P3.T2.3:** Importing while a train runs stops the ride.
  - [x] **P3.T2.4:** Before the 2 s hold, the controls are not actionable.

**Result:** verified
**Checkpoint:** c90c6d8
**Evidence:** conductor/tracks/world-portability_20261107/verification/phase-3.md

## Phase R1: Review fixes

- **Goal:** Close the five review findings: refuse an oversized file before it is
  read, prove the download actually lands, prove the explicit mid-ride stop (not
  the incidental world edit) is what halts the train, keep a refusal visible if
  the tray was dismissed, and label the tray for what it now holds.
- **Depends on:** Phase 3
- **Covers:** F1, F2, F3, F4, F5 (review round 1)
- **Touches:** `src/ui/parent-gate.ts`, `src/ui/portable-file.ts`,
  `src/ui/app.ts`, `src/main.ts`, `e2e/world-portability.spec.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/world-portability.spec.ts`
- **Status:** verified

- [x] **R1.T1: Refuse by size before reading the file** - covers: F1
  - [x] **R1.T1.1:** Check `file.size > MAX_IMPORT_BYTES` before `readWorldFile`.
  - [x] **R1.T1.2:** Keep `readImport`'s own size check as defence in depth.
- [x] **R1.T2: Prove the export download and give revoke headroom** - covers: F2
  - [x] **R1.T2.1:** Revoke the object URL after a delay the download can survive.
  - [x] **R1.T2.2:** Await the browser `download` event and compare its bytes to
    the dev-handle payload.
- [x] **R1.T3: Prove the explicit mid-ride stop** - covers: F3
  - [x] **R1.T3.1:** Import a file identical to the ridden world and assert the
    ride ends.
- [x] **R1.T4: Keep refusals visible after a dismissal** - covers: F4
  - [x] **R1.T4.1:** Route refusals through the report state when the tray is
    closed.
  - [x] **R1.T4.2:** Hide a visible recovery note when a refusal is shown in the
    tray.
- [x] **R1.T5: Label the tray for what it holds** - covers: F5
  - [x] **R1.T5.1:** Rename the tray's aria-label to parent controls.

**Result:** verified
**Checkpoint:** 22041e2
**Evidence:** conductor/tracks/world-portability_20261107/review.md

## Phase R2: Second-round review fixes

- **Goal:** Prove the recovery-note half of the refusal path, make the size
  witness independent of one decode API, and correct the review record.
- **Depends on:** Phase R1
- **Covers:** F6, F7 (review round 2)
- **Touches:** `e2e/world-portability.spec.ts`,
  `conductor/tracks/world-portability_20261107/review.md`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/world-portability.spec.ts`
- **Status:** verified

- [x] **R2.T1: Prove a refusal replaces and then restores the recovery note** - covers: F6
  - [x] R2.T1.1 Seed a restored boot from the save slots and confirm the recovery line.
  - [x] R2.T1.2 Refuse an import and assert only the portable note remains visible.
  - [x] R2.T1.3 Re-arm and assert the recovery line is back.
- [x] **R2.T2: Count every decode entry point** - covers: F7
  - [x] R2.T2.1 Also count `FileReader.readAsText` and `Blob.text`.
- [x] **R2.T3: Correct the review record** - covers: F6
  - [x] R2.T3.1 Record round 1 as the reviewer returned it and state the real debt.

**Result:** verified
**Checkpoint:** 093c8d5
**Evidence:** conductor/tracks/world-portability_20261107/review.md
