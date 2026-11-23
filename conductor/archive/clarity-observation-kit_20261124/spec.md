# Specification: Clarity Observation Kit

- **Track ID:** `clarity-observation-kit_20261124`
- **Type:** Chore
- **Priority:** High
- **Branch:** `chore/clarity-observation-kit_20261124`
- **Base:** `main` @ `3fcc79716c9a7cfed291a18ee738ad5e1cf29f8e`

## Overview

Create an artifact-only observation kit that turns the existing, detailed clarity protocol into a one-page quick card and a companion session log sheet. The kit lives inside this track and will move with the track archive. It condenses existing definitions for live human use; it does not change the app, the archived clarity artifacts, or any measured value.

## Problem / Motivation

`conductor/archive/clarity-audit_20261110/protocol.md` and `report.md` define a sound observation protocol, but they are too long to consult during a live session with a toddler. Without a compact card and a simple log, observations risk being inconsistent and the v1.0 evidence path stays unmeasured. The kit must make the next human observation repeatable while keeping all result cells honest until a real observation occurs.

## Goals & Success Metrics

- **Goal:** A parent or caregiver can run and time a session using only the quick card.
- **Goal:** A session log captures setup context, both clock measures, and friction observations without identifying the child.
- **Metric:** Both written artifacts exist and the static validator exits 0.
- **Metric:** Every result cell remains `not measured` (or `awaiting observation` for the baseline instrument) until an actual observation is entered by a human.

## Scope In

- `quick-card.md`: one-page session card with setup, consent, both clock definitions, the 20:00 cap, interruption/disengagement rules, disagreement handling, and human-only device-feel prompts.
- `session-log.md`: anonymous child 1 / 2 / 3 rows, setup fields, two measured-value fields with `not measured` defaults, observer notes, withdrawal rule, traceability links, and a top-five friction table ranked by affected-child count then severity.
- `validate.mjs`: static validator using only Node built-ins.
- Evidence: `verification/phase-1.md` and `verification/integrated.md`.

## Scope Out

- Runtime changes to `src/`, `e2e/`, `playwright.config.ts`, dependencies, lockfiles, save data, storage keys, telemetry, network, UI, audio, or release workflows.
- Changes to `CHANGELOG.md`, `conductor/product.md`, `conductor/tech-stack.md`, `conductor/product-guidelines.md`, the archived clarity protocol/report, or the comparison artifact values.
- Actually observing children, recruiting children, timing sessions, filling measured cells, or claiming the 3/3-child v1.0 ship gate.
- Agent-performed device checks; iPad Safari and Android Chrome touch, audio and frame feel remain human-only observations.
- New clarity numbers, new definitions, or child identities.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The quick card restates the session flow and both clock definitions exactly in substance: open/wake → first self-directed ride starts the first clock; first self-directed placement → disengagement or adult help starts the unassisted-session clock; each stops at 20:00. | High |
| FR-2 | The quick card includes interruption, disengagement, sibling/device failure, no-ride-within-cap and observer-disagreement rules from the imported protocol. | High |
| FR-3 | The session log has anonymous child 1 / 2 / 3 rows, setup context, both measures with `not measured` defaults, observer notes, and a top-five friction table ranked by affected-child count then severity. | High |
| FR-4 | Consent and privacy rules are embedded: consent before the session, no names/photos/video/audio, and withdrawal deletes notes and marks the row `not measured`. | High |
| FR-5 | Human-only device-feel prompts for iPad Safari and Android Chrome touch, audio unlock and frame feel appear visibly separate from the two measured clarity values, with no pass/fail numbers or agent claim. | Medium |
| FR-6 | The kit references the protocol, report, comparison artifact and product v1.0 gate without claiming the gate or changing any baseline value. | Medium |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No runtime, test, dependency, lockfile, storage, telemetry, network, UI or audio changes. |
| NFR-2 | No identifying details, recordings or transmitted data; notes stay anonymous and local to the document. |
| NFR-3 | Imported clock/cap wording is preserved; all result cells remain `not measured` and the comparison artifact stays `awaiting observation`. |
| NFR-4 | No clarity numbers, no v1.0 child-gate claim, no GHCR/deploy claim and no manual-device claim by an agent. |
| NFR-5 | Verification is `pnpm check` plus `node conductor/tracks/clarity-observation-kit_20261124/validate.mjs`, both exit 0. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Quick card contains the exact session steps, both clock definitions and the 20:00 cap. | FR-1 |
| AC-2 | Quick card contains interruption, failure, disengagement and disagreement rules. | FR-2 |
| AC-3 | Session log has three anonymous rows, setup fields, both measures, `not measured` defaults and observer notes. | FR-3 |
| AC-4 | Session log has a top-five friction table with count-then-severity ordering and `not measured` defaults. | FR-3 |
| AC-5 | Consent, withdrawal, no-identifiers and no-recording rules are present. | FR-4 |
| AC-6 | Device prompts are present, visibly separate, human-only, and free of claimed numbers. | FR-5 |
| AC-7 | Validator passes, forbidden patterns are absent, and the scope guard shows only this track's artifacts changed. | FR-6, NFR-1..NFR-5 |

## Edge Cases

- Consent is withdrawn mid-session: stop, delete the notes, mark the row `not measured`.
- Sibling takes over, device fails, or the app closes: record interruption; do not treat it as a clean disengagement.
- No ride occurs within 20:00: stop the clock at the cap, mark the first measure as cap/unmeasured, and do not infer success.
- Cap reached during an unassisted session: stop at 20:00 and note that the observation was capped.
- Observers disagree about self-direction: both record `not measured` for that measure and note the disagreement; do not average.
- Only one child is available: complete child 1; children 2 and 3 stay `not measured`.
- A measure cannot be read: leave it `not measured`, keep setup/notes, and never fill an estimate.

## Dependencies

None.

## Open Questions & Assumptions

- No open questions remain; all decisions were approved during planning.
- Assumption: only one child is currently available; the other two rows remain `not measured`.
- Assumption: the v1.0 ship gate is unmet and must not be claimed from a single-child observation.
- Assumption: device-feel checks are human-only; the kit only prompts the observer.
- Assumption: this track's artifacts move into `conductor/archive/clarity-observation-kit_20261124/` on completion.

## References

- `conductor/archive/clarity-audit_20261110/protocol.md`
- `conductor/archive/clarity-audit_20261110/report.md`
- `conductor/archive/clarity-audit_20261110/comparison.md`
- `conductor/product.md` v1.0 ship gate and Phase 3 decision section
- `conductor/tech-stack.md` manual-device exception
