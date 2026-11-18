# Comparison Artifact — v0.13.0 Current-State Baseline

> This artifact defines the current-state baseline for the clarity audit and
> the format for later comparisons. It is an empty instrument: every measured
> value stays **awaiting observation** until real sessions are observed. No
> baseline is claimed as measured and no numbers are invented.

## Current-state baseline: v0.13.0 (FR-5, AC-4)

The baseline is **Tiny Tracks v0.13.0** — the version current when this audit
prepares its instrument. All measured values below are **awaiting observation**.

| Measure (definition imported from `progressive-disclosure_20261110`) | v0.13.0 current-state baseline | v1.0 gate reference (from `conductor/product.md`) |
| --- | --- | --- |
| time-to-first-ride | awaiting observation | three of three children unassisted within 60 seconds |
| unassisted session length | awaiting observation | one 10+ minute unassisted session |

Every cell in the current-state column is **awaiting observation**; there are
no recorded timings or counts to fill it yet.

## Why no numbers exist (FR-5, AC-4)

`progressive-disclosure_20261110` shipped before this audit, so no pre-feature
baseline was captured. Its audit-comparison notes deliberately recorded the
field definitions and cohort instead of inventing numbers, stating that "no
baseline numbers are recorded here because there is nothing to compare against
yet" and that the app records no telemetry by design, so no automated proxy
exists or is invented. This artifact inherits that contract: **no pre-feature
numbers exist, and none are invented here.** The v0.13.0 column stays
**awaiting observation** until a parent runs the sessions described in
`protocol.md` and records them in `report.md`.

## Imported field definitions (FR-5)

The measures and cohort below are imported unchanged from the
`progressive-disclosure_20261110` audit-comparison notes
(`conductor/archive/progressive-disclosure_20261110/verification/phase-3.md`,
section "Audit-comparison notes (AC-6 / P3.T2.2)"). They are re-stated here, not
redefined; a later track comparing against this baseline must reuse them as-is.

- **time-to-first-ride** — app open/wake → first successful ride. Clock rules
  in `protocol.md` §4.1 (start at open/wake, stop at first visible ride).
- **unassisted session length** — first self-directed placement → disengage or
  adult help, capped at 20 minutes. Clock rules in `protocol.md` §4.2.
- **Cohort** — three children aged 2–4, same cohort / same protocol on both
  sides of a comparison.
- **Recordability** — the app records no telemetry by design (nothing leaves
  the device); both fields require human observation during the toddler test.
  No automated proxy exists or is invented.

## Privacy (FR-6)

No recordings and no identifying child details are kept. Notes remain
anonymous (child 1 / 2 / 3 only) on the device / in this track; nothing is
transmitted. Comparing against this baseline requires no app changes, no
telemetry, and no privacy-guideline changes.

## Traceability (NFR-3)

| Criterion | Requirement | Satisfied by |
| --- | --- | --- |
| AC-4 | Cites Progressive Disclosure's audit-comparison notes as the source, states v0.13.0 as the current-state baseline, marks every value "awaiting observation" | Imported field definitions and baseline table above |
| FR-5 | v0.13.0 baseline defined, imported definitions cited, all measured values left empty and labelled "awaiting observation" | Baseline table and "Why no numbers exist" above |
| FR-6 | No recordings or identifying details; anonymous notes stay on device / in track | Privacy above |
