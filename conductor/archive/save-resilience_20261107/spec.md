# Save Resilience — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Make the persistence layer incapable of silently destroying a child's world.
Today a single malformed track piece, or two pieces claiming the same meadow
cell, causes the entire snapshot to be rejected and replaced by an empty world.
This track salvages every valid entry, keeps a previous snapshot as a safety
net, writes both atomically, and tells a grown-up (quietly, behind the parent
gate) when a recovery happened.

## Problem / Motivation

`deserializeWorld` is forgiving for scenery, deliveries, and preferences but
**all-or-nothing for pieces**: `parsedPieces.some((piece) => piece === null)`
returns `emptyWorld()`, and duplicate cells do the same. The snapshot is then
never rewritten until the child next touches the meadow — at which point the
good copy is gone forever. For a product whose success criteria include
"autosave never loses a built world", this is the only failure a child
experiences as permanent. Parents cannot recover it, because there is no backup
and no export.

## Goals & Success Metrics

- **Goal:** a corrupt, partial, or duplicated snapshot never destroys valid
  work.
- **Metric:** every case in the corruption matrix preserves all valid entries
  and reports what was dropped; zero reproduction paths yield an empty world
  when valid data exists; logic coverage stays at or above the 80% gate
  (currently 97% statements on `src/core` + `src/state`).

## Scope

### In Scope

- Per-entry validation for pieces (scenery already behaves this way).
- Deterministic duplicate-cell policy (keep first, drop and count the rest).
- A single previous-snapshot slot with atomic promotion on every save.
- A recovery status (clean / salvaged / restored / fresh) and dropped-entry
  counts.
- A quiet, dismissible note in the parent gate when anything was salvaged or
  restored.
- Unit tests for the corruption matrix and an e2e test that seeds a corrupt
  snapshot.

### Out of Scope

- JSON export/import (separate track: `world-portability_20261107`).
- Cloud sync, accounts, or any network path.
- Multi-generation history, timestamped snapshots, or a backup browser UI.
- Changing starter-railway seeding when no snapshot exists.
- Bumping the snapshot version or rewriting the v1→v2→v3 migration.
- Repairing or quarantining the corrupt bytes themselves.

## Bug Details

- **Reproduction steps:**
  1. Build a world with several pieces and one station.
  2. Open DevTools → Application → IndexedDB → `tiny-tracks` → `worlds` →
     key `current`.
  3. Change one piece's `type` to an unknown value (or duplicate two entries'
     `cell`).
  4. Reload the app.
- **Expected behavior:** the world still contains every unaffected piece; the
  app reports the dropped entry.
- **Actual behavior:** `deserializeWorld` returns an empty world; the
  starter/empty meadow appears and the next placement overwrites the snapshot.
- **Root-cause hypothesis:** `src/core/save.ts` — the all-or-nothing branch for
  `pieces` and the duplicate-cell rejection, plus `src/state/persistence.ts`
  holding a single `current` key with no fallback.
- **Regression test:** in `src/core/save.test.ts`, a v3 payload with 10 valid
  pieces and 1 invalid piece must return 10 pieces and one dropped entry. This
  fails today.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The loader validates each piece independently, keeping every valid entry and dropping only invalid ones. | must |
| FR-2 | When two entries claim the same meadow cell, the first entry is kept and later duplicates are dropped and counted. | must |
| FR-3 | If the current snapshot is structurally unreadable (not a record, unsupported version, or `pieces`/`scenery` not arrays), the loader loads the previous snapshot instead. | must |
| FR-4 | Every save writes the prior current snapshot into the previous slot and the new snapshot into current, in one IndexedDB transaction. | must |
| FR-5 | A snapshot that failed to parse is never promoted into the previous slot; the recovered world becomes the new baseline. | must |
| FR-6 | The loader reports a recovery status (`clean`, `salvaged`, `restored`, `fresh`) plus dropped-piece and dropped-scenery counts. | must |
| FR-7 | When the status is `salvaged` or `restored`, the parent gate shows a dismissible note; dismissal lasts for the session. | should |
| FR-8 | When both slots are absent or unreadable, behavior is unchanged: the starter railway seeds the meadow. | must |
| FR-9 | Existing v1/v2/v3 snapshots load without migration and with no version bump. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | The loader stays total: no input can make it throw (property/fuzz coverage included). |
| NFR-2 | A save costs at most one additional IndexedDB write and no extra per-frame work. |
| NFR-3 | Storage stays bounded at two snapshots; nothing leaves the device. |
| NFR-4 | Existing snapshots and all 757 tests continue to pass; logic coverage stays at or above the 80% gate. |
| NFR-5 | Boot impact is under 10 ms on the tablet profile. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A v3 snapshot with 10 valid pieces and 1 malformed piece loads 10 pieces with 1 dropped and status `salvaged`. | FR-1 |
| AC-2 | Two pieces on the same cell keep the first, drop the second, and count one duplicate. | FR-2 |
| AC-3 | With an unreadable current and a valid previous, the previous world loads with status `restored`. | FR-3 |
| AC-4 | After two consecutive saves, the previous slot holds the state before the last change; an interrupted write leaves a consistent pair. | FR-4 |
| AC-5 | After a recovery, the next save promotes the recovered world into previous — never the corrupt payload. | FR-5 |
| AC-6 | Status and counts are observable in tests for all four statuses. | FR-6 |
| AC-7 | E2E: seed a corrupt `current`, boot, open the parent gate, see the note, dismiss it, and confirm it stays dismissed for the session. | FR-7 |
| AC-8 | Both slots corrupt or absent → starter meadow, no thrown error, status `fresh`. | FR-8 |
| AC-9 | v1, v2, and v3 fixtures each load to their expected world with status `clean`. | FR-9 |

## Edge Cases

- An empty `pieces` array is a **valid** world (the child removed everything)
  and must never be treated as corrupt.
- More than `MAX_PIECES` (64) entries: keep the first 64 and count the overflow
  as dropped.
- A future/unknown version number: treat as unreadable, fall back, and never
  write the newer payload back as a downgrade.
- IndexedDB unavailable, blocked, or quota-exceeded: keep the in-memory world
  playable and let the save fail silently, as today.
- Two tabs open on the same device: last write wins; no locking. Documented
  limitation.
- A world with only scenery or only preferences is valid.
- Duplicate piece IDs (not just cells) keep the first and count the rest.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** "structurally unreadable" means not a record, an unsupported
  version, or `pieces`/`scenery` not being arrays. Anything narrower is
  salvageable.
- **Assumption:** the corrupt payload is not quarantined; recovery restores the
  previous world and the next save replaces the bad copy.
- **Assumption:** the parent-gate note is session-scoped and not persisted, to
  avoid touching the save format.
- **Assumption:** multi-tab writes are last-write-wins; coordination is out of
  scope.
- **Question:** none remaining.

## References

- `conductor/product.md` — Roadmap Phase 0, `save-resilience_20261107`
- `conductor/tech-stack.md` — "Pure logic modules" boundary and persistence
  notes
- `src/core/save.ts`, `src/state/persistence.ts`, `src/main.ts`
- Setup analysis findings #1 (all-or-nothing piece parsing) and #2 (no backup
  generation)
