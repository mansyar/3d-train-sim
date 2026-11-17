# Install Onboarding — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track gives families an iOS "Add to Home Screen" hint without adding a
single word, control, or gesture to the toddler experience. A pure classifier
determines whether the app is running as an installed PWA from the standards
display-mode signal plus the legacy iOS standalone signal; when the app is in a
browser and the hint has not been dismissed, the existing 2-second parent hold
reveals an icon-led line inside the parent tray with a short parent-facing
instruction and a dismiss control. Dismissal is saved in the existing world
snapshot preferences and clears on world reset like every other preference.

## Problem / Motivation

Children open Tiny Tracks in a Safari tab, lose it among other tabs, and get a
worse experience than the intended zoom-free fullscreen PWA. iOS Safari never
fires `beforeinstallprompt`, so there is no install affordance at all today.
Putting an install tip in the kid UI would break the product's no-reading,
tap-and-drag-only rules, so the hint must live behind the parent gate. Without
it, families never discover that the toy can live on the home screen.

## Goals & Success Metrics

- **Goal:** A parent on an iPad or iPhone can install Tiny Tracks, and the hint
  never reappears once dismissed or once the app is running standalone.
- **Metric:** Unit tests prove the classifier handles every signal combination
  and the dismissal preference round-trips; e2e proves the hint is unreachable
  without the parent hold, absent in standalone mode, and still hidden after a
  reload; and a DOM assertion proves the kid-facing shell gains no text or
  controls.

## Scope

### In Scope

- A pure, injectable install-mode classifier in `src/core/` built on
  `matchMedia('(display-mode: standalone)')` and `navigator.standalone`.
- An optional `installHintDismissed` field on `DevicePreferences`, defaulting
  to false and backward compatible with existing snapshots.
- A gated hint line in the parent tray beside the recovery note and insights
  panel: icon, short parent instruction for the iOS Share → Add to Home Screen
  sequence, and a labelled dismiss control.
- Boot and runtime gating: hide the hint when standalone, show it only when
  browsing and not dismissed; react to a media-query change without reload.
- Unit and e2e coverage for all of the above.

### Out of Scope

- `beforeinstallprompt` handling, Android/Chrome install buttons, or any other
  install automation.
- User-agent sniffing or platform gating by device type.
- Any kid-facing hint, tutorial, modal, text, control, or new gesture.
- Changes to the viewport / `user-scalable=no` policy, service worker, manifest,
  or PWA installability.
- Install-rate measurement, telemetry, or new storage keys.
- A real-device iPad Safari check (explicitly excluded at spec interview).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Classify installed vs browser from injectable standalone signals; tolerate missing browser APIs and non-browser test environments; expose runtime media-query change handling | must |
| FR-2 | Render no hint at all when the classifier reports installed/standalone | must |
| FR-3 | When browsing and not dismissed, the 2s-hold parent tray shows an icon-led install hint with a short parent-facing instruction for the iOS Share → Add to Home Screen sequence | must |
| FR-4 | The hint lives only inside the existing parent tray; the kid-facing shell gains no text, controls, or gestures | must |
| FR-5 | A parent can dismiss the hint; dismissal persists in the world snapshot preferences across reload and clears on world reset like other preferences | must |
| FR-6 | A storage failure on dismissal is non-fatal: the toy keeps working and the hint simply does not persist | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Classifier and preference logic live in `src/core`/`src/state` and stay inside the 80% coverage gate |
| NFR-2 | No new permissions, telemetry, network calls, storage keys, or user-agent sniffing |
| NFR-3 | Hint markup inherits parent-tray styling; labelled controls, `:focus-visible`, and a11y-pass contrast; no new axe violations |
| NFR-4 | No change to the `user-scalable=no` / parent-only zoom policy |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Unit cases cover standalone media true, `navigator.standalone` true, both false, missing APIs, and a runtime media-query change | FR-1 |
| AC-2 | E2E with standalone emulation renders no hint element | FR-2 |
| AC-3 | E2E: no hint before the parent hold; after the hold the tray shows the hint with its icon and iOS instruction | FR-3 |
| AC-4 | E2E: hint container is nested in `.preset-tray` and the kid-facing shell DOM is unchanged | FR-4 |
| AC-5 | E2E: dismiss → reload → hint stays hidden; world reset → hint returns | FR-5 |
| AC-6 | Unit: a rejected snapshot save leaves dismissal resolved, throws nothing, and leaves the toy interactive | FR-6 |

## Edge Cases

- `matchMedia` missing (unit environment or older browser) → classify as
  browser, never as installed.
- `navigator.standalone` undefined (desktop Chrome, Android) → fall back to
  display-mode alone.
- The app is installed while the page is open → the media-query change hides
  the hint without a reload.
- A snapshot has a malformed or unknown preference value → ignore it and default
  to not-dismissed.
- Dismissal races an in-flight world save → use the existing full-snapshot save
  pattern so no partial state is written.
- Storage is disabled or quota is exhausted → dismissal is in-memory only for
  that session; the toy remains fully usable.

## Dependencies

- **Tracks:** none. All prior Phase 2 tracks are merged; this track reuses the
  parent-tray pattern (`a11y-pass_20261111`, `local-insights_20261111`), the
  snapshot preference pattern (`progressive-disclosure_20261110`), and the
  parent-hold gesture (`process-hygiene_20261109`).
- **External:** none. iOS has no install API, which is why the hint is
  instructional rather than programmatic.

## Open Questions & Assumptions

- **Decision:** "No reading" is a kid-facing rule (`product-guidelines.md`
  interaction principle 2). The gated tray may use plain parent text; the kid UI
  is unchanged.
- **Decision:** Standalone checks only — no `beforeinstallprompt`, no UA
  sniffing. Consequently desktop browser users may also see the parent hint,
  which is acceptable because the advice is still valid there.
- **Decision:** Dismissal lives in `DevicePreferences` on the world snapshot, so
  a world reset restores the hint like other preferences.
- **Decision:** No real-device iPad Safari check is part of this track's done
  bar; automated checks only.
- **Question:** none blocking. All spec-interview decisions are settled.

## References

- `conductor/product.md` — Phase 2 roadmap row for `install-onboarding_20261111`
- `conductor/product-guidelines.md` — no-reading, toddler gestures, viewport and
  parent-gate rules
- `conductor/workflow.md` — Verification Strategy and command table
- `src/ui/app.ts` — parent tray markup (`mountShell`)
- `src/ui/parent-gate.ts` — recovery-note and insights gating patterns
- `src/core/save.ts` — `DevicePreferences`, `serializeWorld`,
  `deserializePreferences`
- `src/state/persistence.ts` — snapshot watchers and non-fatal save conventions
- `index.html` — PWA meta (`apple-mobile-web-app-capable`, `apple-touch-icon`)
- `conductor/archive/a11y-pass_20261111/` — focus, axe, and zoom conventions
