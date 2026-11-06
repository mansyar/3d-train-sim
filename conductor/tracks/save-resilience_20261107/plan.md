# Save Resilience — Implementation Plan

> **Branch:** `fix/save-resilience_20261107`
> **Base:** `main` @ `0ea627aacbb1d622c82dcd07e640f3593c8af5cb`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Forgiving snapshot parsing

- **Goal:** `src/core/save.ts` validates each piece independently, applies the
  keep-first duplicate policy, and returns a status plus dropped counts — never
  throwing and never discarding valid data.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-6, FR-8, FR-9, NFR-1, AC-1, AC-2, AC-6, AC-8, AC-9
- **Touches:** `src/core/save.ts`, `src/core/save.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P1.T1: Add the parse-result contract** — covers: FR-6
  - [x] **P1.T1.1:** Export `parseWorldSnapshot(value)` returning
        `{ world, status: 'clean' | 'salvaged' | 'unreadable', droppedPieces,
        droppedScenery, droppedDuplicates }`
  - [x] **P1.T1.2:** Keep `deserializeWorld(value)` as a thin wrapper returning
        `.world`, so existing call sites and tests keep working
- [x] **P1.T2: Salvage pieces per entry** — covers: FR-1
  - [x] **P1.T2.1:** Replace the `some(piece === null) → emptyWorld()` branch
        with a filter that keeps valid pieces
  - [x] **P1.T2.2:** Count every dropped piece and report `salvaged`
- [x] **P1.T3: Enforce keep-first duplicates** — covers: FR-2
  - [x] **P1.T3.1:** Keep the first claimant of a cell (pieces before scenery)
        and count later duplicates
  - [x] **P1.T3.2:** Keep the first piece per `id` and count duplicate ids
- [x] **P1.T4: Salvage capacity overflow** — covers: FR-1
  - [x] **P1.T4.1:** Keep the first `MAX_PIECES` entries instead of returning
        `emptyWorld()`, counting the overflow
- [x] **P1.T5: Lock compatibility and totality** — covers: FR-9, NFR-1
  - [x] **P1.T5.1:** Fixtures for v1, v2, and v3 load to their expected worlds
        with status `clean`
  - [x] **P1.T5.2:** Property/fuzz test over hostile inputs asserts no throw and
        a defined status

**Result:** verified
**Checkpoint:** 4c5540f
**Evidence:** conductor/tracks/save-resilience_20261107/verification/phase-1.md

## Phase 2: Two-slot atomic persistence

- **Goal:** `src/state/persistence.ts` keeps a `previous` snapshot, promotes it
  atomically on every save, and restores it when `current` is unreadable —
  without ever promoting a corrupt payload.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, NFR-2, NFR-3, NFR-4, NFR-5, AC-3, AC-4, AC-5
- **Touches:** `src/state/persistence.ts`, `src/state/persistence.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P2.T1: Write both slots in one transaction** — covers: FR-4
  - [x] **P2.T1.1:** Read `current` inside a `readwrite` transaction, put it
        into `previous`, put the new snapshot into `current`, await `tx.done`
  - [x] **P2.T1.2:** Skip promotion when the prior payload is unreadable
- [x] **P2.T2: Load with fallback** — covers: FR-3
  - [x] **P2.T2.1:** Export `loadWorldRecovery()` returning
        `{ snapshot, status, droppedPieces, droppedScenery }`
  - [x] **P2.T2.2:** Try `current`, then `previous`; map outcomes to `clean` /
        `salvaged` / `restored` / `fresh`
  - [x] **P2.T2.3:** Record the added boot read cost in the phase evidence;
        assert the loader performs at most two reads per boot
- [x] **P2.T3: Keep the baseline clean after recovery** — covers: FR-5, AC-5
  - [x] **P2.T3.1:** Ensure the next save after a restore promotes the
        recovered world, not the corrupt bytes
- [x] **P2.T4: Extend the storage test harness** — covers: NFR-2, NFR-3, NFR-4
  - [x] **P2.T4.1:** Replace the `get`/`put` mock with a transaction mock
        exposing `store.get`, `store.put`, and `done`
  - [x] **P2.T4.2:** Assert at most two puts per save and that storage failures
        stay non-fatal

**Result:** verified
**Checkpoint:** 6ae456d
**Evidence:** conductor/tracks/save-resilience_20261107/verification/phase-2.md

## Phase 3: Parent-gate recovery notice

- **Goal:** A recovery is visible to a grown-up behind the parent gate,
  dismissible for the session, and invisible to the child.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-7, AC-7
- **Touches:** `src/core/recovery.ts`, `src/core/recovery.test.ts`,
  `src/main.ts`, `src/ui/app.ts`, `src/ui/parent-gate.ts`, `src/style.css`
- **Verification:** `pnpm check`
- **Status:** verified

- [x] **P3.T1: Pure notice formatter** — covers: FR-7
  - [x] **P3.T1.1:** `recoveryNotice(status, counts)` returns `null` for
        `clean`/`fresh`, and a short parent-facing line for `salvaged`/`restored`
  - [x] **P3.T1.2:** Unit-test every status and the singular/plural counts
- [x] **P3.T2: Thread the recovery result to the UI** — covers: FR-7
  - [x] **P3.T2.1:** `main.ts` uses `loadWorldRecovery()` and passes the result
        through `AppOptions`
  - [x] **P3.T2.2:** `app.ts` forwards it to `createParentGate`
- [x] **P3.T3: Render and dismiss the note** — covers: FR-7, AC-7
  - [x] **P3.T3.1:** Create the note element inside the gate's preset tray, with
        a dismiss control
  - [x] **P3.T3.2:** Dismissal is session-scoped; no persistence, no save-format
        change

**Result:** verified
**Checkpoint:** 64dcac6
**Evidence:** conductor/tracks/save-resilience_20261107/verification/phase-3.md

## Phase 4: End-to-end recovery proof

- **Goal:** A browser-level test seeds a corrupt snapshot, boots the real app,
  and proves valid work survives and the parent note appears.
- **Depends on:** Phase 3
- **Covers:** AC-1, AC-3, AC-7, AC-8
- **Touches:** `e2e/save-recovery.spec.ts`, `e2e/helpers.ts`
- **Verification:** `pnpm exec playwright test e2e/save-recovery.spec.ts`
- **Status:** verified

- [x] **P4.T1: Salvage path e2e** — covers: AC-1, AC-3, AC-7
  - [x] **P4.T1.1:** Seed `worlds/current` with valid pieces plus one corrupt
        entry, reload, assert the valid pieces are on the meadow
  - [x] **P4.T1.2:** Hold the parent gate, assert the recovery note, dismiss it,
        and confirm it stays dismissed
- [x] **P4.T2: Disaster path e2e** — covers: AC-8
  - [x] **P4.T2.1:** Corrupt both slots, reload, assert the starter railway and
        no console error

**Result:** verified
**Checkpoint:** ba86433
**Evidence:** conductor/tracks/save-resilience_20261107/verification/phase-4.md
