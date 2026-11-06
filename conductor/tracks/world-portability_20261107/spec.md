# World Portability - Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A parent can carry a meadow off the device and back. Export writes the current
world to a plain JSON file; import replaces the meadow with a chosen file,
behind the existing parent gate, as one undoable change. The file is the
`WorldSnapshot` shape the app already parses, so a world can survive the one
failure a child experiences as permanent: the browser or the OS reclaiming
IndexedDB storage.

## Problem / Motivation

The world lives in a single IndexedDB database on one device. `save-resilience`
made a corrupt or interrupted write recoverable, but it cannot help when the
storage itself disappears: iOS evicts IndexedDB for sites that go unused,
private windows discard it on close, clearing site data removes it, and a
replaced tablet takes it away. Today a parent has no way to keep a copy, and a
child's months of building can vanish with no recovery path. The product claims
"autosave never loses a world"; without portability that claim is only true
until the OS disagrees.

## Goals & Success Metrics

- **Goal:** a parent can preserve and restore a world without a network, an
  account, a cable, or a second app.
- **Metric:** export → import reproduces an identical world (piece ids, types,
  rotations, cells, scenery, train, consist, deliveries); a 64-item world
  exports under 100 KB; no new control is reachable by a toddler.

## Scope

### In Scope

- Two controls in the parent-gate tray: export and import.
- Export: serialize the current world and download it as
  `tiny-tracks-<YYYY-MM-DD>.json`.
- Import: pick a JSON file, validate it, and replace the meadow with it as one
  undoable change.
- Inline parent-facing feedback in the tray (imported / imported with skips /
  unreadable).
- Guards: 1 MB size cap, whole-file readability check, atomic apply.

### Out of Scope

- Automatic or scheduled backups, and any background download.
- The Web Share API and OS-level file handoff.
- Cloud sync, accounts, or any network transport.
- Bundles or archives (`.zip`), multiple worlds per file, or a world library.
- Schema changes: the exported file is the existing v3 snapshot shape and the
  existing loader/migrations apply unchanged.
- Drag-and-drop file import.
- Child-visible controls of any kind.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The parent tray offers an export control that downloads the current world as `tiny-tracks-<YYYY-MM-DD>.json`. | must |
| FR-2 | The exported file contains world data only: pieces, scenery, train, consist and deliveries. It carries no `preferences` block and no device identifiers. | must |
| FR-3 | Export works for an empty meadow and for the seeded starter railway. | must |
| FR-4 | The parent tray offers an import control that opens a file picker accepting JSON. | must |
| FR-5 | A file larger than 1 MB is refused with an inline note and the world is untouched. | must |
| FR-6 | Import validates through `parseWorldSnapshot`; a wholly unreadable file is refused with an inline note and the world is untouched. | must |
| FR-7 | A valid import replaces pieces, scenery, train, consist and deliveries as one undoable change, through the world store rather than by direct mutation. | must |
| FR-8 | If a ride is active, import stops it before the world is replaced. | must |
| FR-9 | The tray reports the outcome inline: imported, imported with N skipped, or unreadable. | must |
| FR-10 | Both controls live inside the hold-to-arm tray and are unreachable until the gate is armed. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No network. Export uses a Blob and an object URL; import reads the chosen file with `FileReader`/`Blob.text()`. Nothing leaves the device. |
| NFR-2 | Round-trip identity: export → import reproduces identical piece ids, types, rotations and cells, plus scenery, train, consist and deliveries. |
| NFR-3 | A maximum-size world (64 meadow items plus scenery within that cap) exports under 100 KB. |
| NFR-4 | Parsing runs once per file selection; the feature adds no per-frame work. |
| NFR-5 | A refused import is atomic: nothing is mutated before the parse succeeds. |
| NFR-6 | New pure logic lives in `src/core/` with colocated unit tests; the existing suite and the 80% coverage gate stay green. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Exporting downloads a file named `tiny-tracks-YYYY-MM-DD.json` whose content is the documented world-only snapshot. | FR-1, FR-2 |
| AC-2 | A 64-item world exports to under 100 KB. | NFR-3 |
| AC-3 | An empty meadow exports and re-imports as an empty meadow. | FR-3 |
| AC-4 | A file over 1 MB is refused with a note and changes no world state. | FR-5, NFR-5 |
| AC-5 | `"hello"`, `[]` and `{version: 99}` are each refused with a note and change no world state. | FR-6, NFR-5 |
| AC-6 | A valid file replaces the world, and ids, rotations, cells and consist survive the round trip. | FR-7, NFR-2 |
| AC-7 | Undo after an import restores the pre-import meadow. | FR-7 |
| AC-8 | Importing while a train runs stops the ride before the world changes. | FR-8 |
| AC-9 | A file that needs salvaging loads its valid toys and the note states how many were skipped. | FR-9 |
| AC-10 | Neither control is reachable or activatable before the 2 s hold arms the tray. | FR-10 |

## Edge Cases

- Empty file, whitespace-only file, JSON array, JSON scalar.
- A v1 or v2 legacy snapshot loads through the existing migrations.
- Duplicate cells keep the first entry and are counted as skips.
- The picker is dismissed with no file chosen: no note, no state change.
- Import while the tray already shows a recovery note: the import message
  replaces it for this arming.
- `dayPhase` and mute are unchanged by an import; they are device settings, not
  world state.
- A valid parse followed by a failed storage write: the world loads in memory
  and the next mutation autosaves, consistent with existing persistence
  behaviour.
- Import on a device whose meadow is already the imported world: allowed, and
  still one undoable change.

## Dependencies

- **Tracks:** `save-resilience_20261107` (merged 2026-11-07, squash `53d9a93`)
  supplies `parseWorldSnapshot` and the two-slot loader this track reuses.
- **External:** none. No service, credential, API or network access.

## Open Questions & Assumptions

- **Assumption:** `<input type="file">` is available and usable on the target
  platforms (iPadOS Safari 16+, Android Chrome) while offline; a hidden input
  driven by a visible tray button is the mechanism.
- **Assumption:** the `download` attribute on an anchor with a Blob URL is
  honoured as a normal file save on both platforms, so no `msSaveBlob` or
  platform branch is needed.
- **Assumption:** a parent tolerates a file appearing in the browser's download
  folder; no attempt is made to pick a location.

## References

- `conductor/product.md` — "Roadmap (Next)", Phase 0 Bedrock row
  `world-portability_20261107`.
- `conductor/product-guidelines.md` — destruction is parent-gated; nothing
  leaves the device; no reading required for the child.
- `conductor/archive/save-resilience_20261107/spec.md` — the loader contract
  this track depends on.
