# Performance Budget — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add two hard, tablet-profile CI assertions: the app reaches a dev-visible
interactive mark within 5 s of navigation start, and the live frame loop
sustains a documented FPS floor calibrated from observed samples. No production
telemetry, quality-threshold change, or player-facing behavior change.

## Problem / Motivation

`conductor/product.md` defines the last Phase 2 engineering exit as "CI asserts
interactive start under 5 s and an FPS floor on the tablet profile; failure
blocks merge." Today `pnpm exec playwright test` proves correctness but not
these budgets. The runtime already has `src/core/perf-monitor.ts` (55/30 fps
quality tiers) and `scene.frameSystems()` tick witnesses, but CI never asserts
a budget. Without this, the v1.0 gate "all six CI gates green" is only
partially evidenced and regressions would be found by parents on real devices.

## Goals & Success Metrics

- **Goal:** interactive start is bounded and frame cadence is guarded on the tablet CI profile.
- **Metric:** interactive mark `startTime ≤ 5000 ms`; frame ticks/second ≥ a floor derived from observed samples with recorded headroom.
- **Metric:** both assertions fail the Playwright job on breach; full verification matrix stays green.

## Scope

### In Scope

- Dev-only `performance.mark` on the existing boot-ready path.
- A new tablet-only `@ci` observation spec and a new hard-gate `@ci` spec.
- Reuse of the existing `scene.frameSystems()` tick counters.
- Calibration evidence from three observed samples, with raw values and floor derivation.
- Negative-run proof that both assertions fail.

### Out of Scope

- Production marks, telemetry, network calls, new storage keys or dependencies.
- Changes to `PERF_HEALTHY_FPS`, `PERF_STRAINED_FPS`, or the quality controller.
- Phone and prod Playwright projects; a11y, parent-gate and viewport behavior.
- Human-only manual-device signoff and clarity-audit child measurements.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Emit dev-only `performance.mark('tiny-tracks-interactive')` at the same boot-ready path that sets `__tinyTracksReady`; absent in production. | must |
| FR-2 | A tablet-only `@ci` e2e test asserts the mark exists and its `startTime` is ≤ 5000 ms from navigation start. | must |
| FR-3 | The observation test samples existing `scene.frameSystems()` tick counters over a fixed wall-clock window and records ticks/second. | must |
| FR-4 | The FPS floor is derived from at least three observed samples with the minimum and headroom recorded in evidence; no value is invented. | must |
| FR-5 | Both assertions hard-fail the Playwright job; negative runs prove the failure path. | must |
| FR-6 | Diff stays production-safe: dev-only source additions, new e2e files, Conductor docs; no runtime behavior or quality-threshold change. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | `pnpm check`, 80% coverage gate, build and full Playwright suite stay green. |
| NFR-2 | No telemetry, network call, storage key, UA sniff, or production bundle cost. |
| NFR-3 | No kid-UI, parent-gate, viewport, zoom, or a11y behavior change. |
| NFR-4 | Manual-device frame-rate feel remains human-only; CI floor is never claimed as device proof. |
| NFR-5 | Verification records raw samples and the floor derivation, so a reviewer can reproduce it. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Dev tablet boot exposes exactly one `tiny-tracks-interactive` mark with `startTime ≤ 5000`. | FR-1, FR-2 |
| AC-2 | Production build exposes no such mark. | FR-1, FR-6 |
| AC-3 | New specs are tagged `@ci`, run on `tablet` only, and are included in the full matrix. | FR-2, FR-3 |
| AC-4 | At least three raw tick/second samples and the derived floor with headroom are recorded in evidence. | FR-4, NFR-5 |
| AC-5 | A deliberately low tick count makes the FPS assertion fail; negative run recorded. | FR-5 |
| AC-6 | A deliberately late mark makes the interactive assertion fail; negative run recorded. | FR-5 |
| AC-7 | Full verification matrix is green on the final branch. | FR-6, NFR-1 |
| AC-8 | Diff contains no production/player-facing change, telemetry, new key, or dependency change. | FR-6, NFR-2, NFR-3 |
| AC-9 | Spec and evidence explicitly leave manual-device frame-rate feel to the human check. | NFR-4 |

## Edge Cases

- Software-renderer jitter in CI: floor is calibrated from observed samples, not from real-device 55/30 fps tiers.
- Hidden-tab throttling: sample only while visible; fail closed if no valid sample exists.
- Mark fired before e2e subscribes: read the `performance` entry, not an event.
- Offline/service-worker boot: the mark still belongs to the same boot-ready path; no new network dependency.
- GitHub CI slower than local `CI=1` observations: any lower sample triggers a fix round rather than a waived gate.
- Missing mark or tick counters: assertions fail rather than passing vacuously.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** "calibrate from CI" means three observations under `CI=1` with the project Playwright command; the GitHub run is the authority and any lower sample triggers a fix round.
- **Assumption:** `scene.frameSystems()` remains dev-only and available on the tablet project; no new e2e-visible production API is needed.
- **Open questions:** none.

## References

- `conductor/product.md` — Phase 2 roadmap row and v1.0 ship gate.
- `conductor/workflow.md` — Verification Strategy layers/commands and the manual-device exception.
- `conductor/tech-stack.md` — perf-monitor, frame-contract witness and e2e lane conventions.
- `src/core/perf-monitor.ts` — FPS probe ring buffer and quality-tier thresholds.
- `src/scene/init-scene.ts` — `frameSystems()` dev/e2e witness.
- `e2e/frame-contract.spec.ts` — existing frame-order/tick witness.
- `e2e/runtime-guarantees.spec.ts` — existing `framesDuring` helper and software-renderer caveat.
- `playwright.config.ts` — tablet, phone allowlist and prod projects.
