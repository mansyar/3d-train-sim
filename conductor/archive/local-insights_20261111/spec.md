# Local Insights — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A read-only diagnostics panel inside the existing parent gate that reports, on
this device only: the number of app sessions played, the longest session, how
many times the world was reset, the most recent unclean exit count, and storage
health (quota/usage estimate plus the last autosave outcome). It gives parents
and dogfooders a way to see whether the toy is being played and whether saves
are healthy, without adding any kid-facing control, telemetry, or network
traffic. It is a device diagnostic, not an automated replacement for the human
observation defined by `clarity-audit_20261110`.

## Problem / Motivation

Parents install the PWA, mute it, reset it, and trust it with their child's
world, but today they have no on-device signal that a world was played, that
autosave is healthy, or that a session ended badly. The clarity audit produced
a protocol and empty report templates, and its comparison artifact explicitly
states that the app records no telemetry and that no automated proxy exists or
is invented. Without a strictly local diagnostic, dogfooding relies on memory
and a storage problem can go unnoticed until a save fails. Left unsolved,
parents cannot answer basic questions about their own device and the v1.0
"30 days without manual storage rescue" gate has no evidence source.

## Goals & Success Metrics

- **Goal:** a parent can open the existing hold gate and read five device-local
  diagnostic values without changing the kid UI or the exported world.
- **Metric:** all five values are visible in the gated tray from the first open
  after install; counters survive reload and world reset; zero runtime network
  requests are added; `pnpm check` and a Playwright gate-tray journey pass.
- **Non-metric:** these counters are not time-to-first-ride or unassisted
  session length. Those remain human-observed fields in
  `clarity-audit_20261110` and are not inferred from app clocks.

## Scope

### In Scope

- Count app sessions using a foreground-to-hidden/closed clock.
- Track the longest session duration.
- Count parent-initiated world resets.
- Count unclean exits using a local boot marker, with no stack traces or error
  content.
- Report storage health: `navigator.storage.estimate()` as plain words plus the
  last autosave outcome (`ok`, `failed`, or `restored from backup`).
- Store counters in a separate `insights` object store in the existing
  IndexedDB database, without changing the world snapshot or export format.
- Add a read-only insights section to the existing 2 s-hold parent tray.
- Handle unavailable storage APIs or denied storage gracefully.
- Unit tests for pure logic, a Playwright gate-tray journey, and docs sync.

### Out of Scope

- Any network call, analytics, telemetry, error-reporting service, identifier,
  or cloud sync.
- Any kid-visible badge, label, control, or new gesture.
- Changes to the world export JSON or to the two-slot world save format.
- Inferring or claiming the audit's human-observed measures from app clocks.
- Personal or identifying data of any kind.
- A separate parent panel or a second hold interaction.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A session starts when the app becomes foreground (initial load or `visibilitychange` to visible) and ends on `visibilitychange` to hidden or page unload. Every completed foreground-to-hidden interval increments the session count and updates the longest-session duration; there is no minimum duration. | must |
| FR-2 | Each parent-initiated world reset increments a reset counter. The counter and all other insights survive that reset. | must |
| FR-3 | On boot the app writes a local "running" marker; on a clean hide/unload it clears the marker. If a boot finds a still-running marker from a previous load, the unclean-exit counter increments. No stack traces, error messages, page URLs, or identifiers are stored or transmitted. | must |
| FR-4 | When the parent tray opens, the panel reads `navigator.storage.estimate()` and reports usage/quota in plain words, plus the most recent autosave outcome (`ok`, `failed`, or `restored from backup`). If the estimate or the status is unavailable, it reports that plainly instead of failing. | must |
| FR-5 | Counters live in a separate `insights` object store in the existing `tiny-tracks` IndexedDB database. The world snapshot shape and exported JSON are unchanged; a reset, preset pick, or world import cannot erase the counters. | must |
| FR-6 | The insights section is read-only, lives inside the existing 2 s-hold parent tray, and is refreshed when that tray opens. It is unreachable from the kid UI. | must |
| FR-7 | The feature adds no network requests, no analytics, no identifiers, and no personal data. Insights are never included in the parent's world export file. | must |
| FR-8 | The roadmap row is marked shipped with a short summary and the parent-facing docs (README and CHANGELOG) mention the panel in parent words. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Pure counter and clock logic lives in `src/core/` or `src/state/` and is written test-first (Red then Green). `pnpm check` passes and the 80% coverage gate on `src/core` + `src/state` holds. |
| NFR-2 | No runtime network traffic, no telemetry SDK, and no change to the privacy guidelines. Verified by code inspection plus the existing offline/CSP guarantees. |
| NFR-3 | No per-frame work: writes happen only at session boundaries, reset, save outcome, and tray open. Cold start and the 60 FPS target are unaffected. |
| NFR-4 | The kid-facing UI is byte-for-byte unchanged: no new icon, label, badge, or control outside the gated tray. The hold-to-confirm gate remains the only long-press in the product. |
| NFR-5 | Storage failures are non-fatal and match the existing persistence rule: if IndexedDB or the quota estimate is unavailable, the app still plays and the panel shows an unavailable state. Stable requirement and acceptance IDs are used throughout. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Unit tests prove that a foreground-to-hidden transition increments the session count and updates the longest duration, that repeated visible events without a completed session do not double-count, and that a short session still counts. | FR-1, NFR-1, NFR-5 |
| AC-2 | Unit and integration tests prove that a parent reset increments the reset count and that all counters remain readable after the reset and after a reload. | FR-2, FR-5, NFR-5 |
| AC-3 | Unit tests prove that a dirty boot marker increments the unclean-exit counter once and that a clean hide clears it; no error content is stored. | FR-3, NFR-2, NFR-5 |
| AC-4 | A test proves the panel renders usage/quota and the last save outcome, and that an unavailable estimate renders an unavailable message rather than throwing. | FR-4, NFR-5 |
| AC-5 | A Playwright journey proves the values are hidden until the 2 s hold gate arms, are visible in the tray, and that no kid-facing control exposes them. | FR-6, NFR-4 |
| AC-6 | `pnpm check` exits 0; runtime code contains no fetch/XHR/analytics addition; world export fixture is unchanged. | FR-7, NFR-1, NFR-2 |
| AC-7 | The roadmap row carries a shipped marker and README/CHANGELOG mention the parent panel. | FR-8 |
| AC-8 | Every acceptance criterion traces to at least one FR or NFR ID in the table above. | NFR-5 |

## Edge Cases

- App opened and immediately hidden: counts as one short session.
- Two `visible` events in a row (duplicate focus): only one session can be open.
- Tab hidden while a ride is running: the session ends, the ride continues under the existing pause-hidden rule.
- Clean browser close versus tab kill/crash: the marker distinguishes the two; no attempt is made to capture a crash reason.
- IndexedDB blocked or quota estimate unavailable: panel shows an unavailable state; the app still plays and saves as before.
- Parent reset, preset pick, or world import: counters are untouched except the reset increment.
- Export/import round trip: exported JSON has no insights keys; importing a world cannot overwrite counters.
- Clock skew or device sleep: durations use monotonic `performance.now()`-style timing where available and never report a negative value.
- First ever boot: zero values and "no save yet" are shown rather than blanks.

## Dependencies

- **Tracks:** none. `clarity-audit_20261110` is complete and merged; its comparison artifact is imported as context, not as a gate.
- **External:** none. No service, credential, or API; quota estimate uses the browser's own `navigator.storage` API.

## Open Questions & Assumptions

- **Assumption:** a session is an app foreground interval, not a ride; this matches the audit's first-play-to-disengage framing without claiming to measure it.
- **Assumption:** dogfooders accept that a deliberately killed tab counts once as an unclean exit; no distinction is made between an OS kill and a browser crash.
- **Assumption:** the existing parent tray is the only surface needed; parent-facing text is already used there for Save/Load and recovery notes.
- **Assumption:** storage estimate values are shown as rounded plain words, not raw bytes, to remain readable on a tablet.
- **Assumption:** no new permission or settings screen is needed; the counters are always local and always on, but hidden behind the gate.

## References

- `conductor/product.md` — roadmap Phase 2, `local-insights_20261111` row
- `conductor/product-guidelines.md` — privacy, parent gate, no-reading and performance rules
- `conductor/archive/clarity-audit_20261110/comparison.md` — imported baseline definitions and explicit "no automated proxy" rule
- `conductor/archive/progressive-disclosure_20261110/verification/phase-3.md` — original audit-comparison notes
- `src/ui/parent-gate.ts`, `src/ui/app.ts` — existing 2 s-hold gate and tray markup
- `src/state/persistence.ts`, `src/core/save.ts` — existing IndexedDB two-slot persistence and snapshot shape
