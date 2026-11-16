# Clarity Audit — Implementation Plan

> **Branch:** `chore/clarity-audit_20261110`
> **Base:** `main` @ `f7156c0760fb792e1d9e977d59ece1682e98f5ae`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Observation protocol and clock rules

- **Goal:** A parent can reproduce a session and clock both measures from a
  single document.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, NFR-3
- **Touches:** `conductor/tracks/clarity-audit_20261110/protocol.md`
- **Verification:** `python -c "from pathlib import Path; t = Path('conductor/tracks/clarity-audit_20261110/protocol.md').read_text(encoding='utf-8'); assert all(s in t for s in ('2\u20134', 'consent', 'time-to-first-ride', 'unassisted session length', '20', 'not measured'))"`
- **Status:** verified

- [x] **P1.T1: Write the observation protocol** — covers: FR-1, FR-2
  - [x] **P1.T1.1:** Cohort of three children aged 2–4, parent consent and anonymous notes
  - [x] **P1.T1.2:** Session flow, device setup, and interruption/disengagement handling
  - [x] **P1.T1.3:** Clock definitions (open/wake → first ride; first placement → disengage/help, 20-minute cap)

**Result:** verified
**Checkpoint:** f63c31e
**Evidence:** conductor/tracks/clarity-audit_20261110/verification/phase-1.md
**Note:** No squash — the range includes primary commit `f9b15f4` (verification-command portability fix) that the executor did not report; task commits were kept.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/clarity-audit_20261110/verification/phase-1.md
-->

## Phase 2: Report and comparison templates

- **Goal:** Empty, structured artifacts exist for session records, ranked
  friction, and the current-state baseline, with no invented numbers.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-6, AC-2, AC-3, AC-4, NFR-2, NFR-3
- **Touches:** `conductor/tracks/clarity-audit_20261110/report.md`, `conductor/tracks/clarity-audit_20261110/comparison.md`
- **Verification:** `python -c "from pathlib import Path; d = Path('conductor/tracks/clarity-audit_20261110'); r = (d / 'report.md').read_text(encoding='utf-8'); c = (d / 'comparison.md').read_text(encoding='utf-8'); assert all(s in r for s in ('not measured', 'severity', 'child 1', 'child 2', 'child 3')); assert all(s in c for s in ('awaiting observation', 'v0.12.0', 'progressive-disclosure_20261110'))"`
- **Status:** verified

- [x] **P2.T1: Build the session report template** — covers: FR-3, FR-4, FR-6
  - [x] **P2.T1.1:** Three per-child rows with both measures and a "not measured" state
  - [x] **P2.T1.2:** Friction table with child count, severity, and count-then-severity top five
- [x] **P2.T2: Build the comparison artifact** — covers: FR-5, FR-6
  - [x] **P2.T2.1:** v0.12.0 current-state baseline table with all values "awaiting observation"
  - [x] **P2.T2.2:** Cite imported field definitions and state that no pre-feature numbers exist

<!--
**Result:** verified
**Checkpoint:** 8cda390
**Evidence:** conductor/tracks/clarity-audit_20261110/verification/phase-2.md
-->

## Phase 3: Roadmap sync and artifact gate

- **Goal:** The roadmap records the track and a deterministic check proves all
  artifact contracts hold without changing app code.
- **Depends on:** Phase 2
- **Covers:** FR-7, AC-5, AC-6, NFR-1, NFR-2, NFR-3
- **Touches:** `conductor/product.md`, `conductor/tracks/clarity-audit_20261110/verification/check-artifacts.py`, `conductor/tracks/clarity-audit_20261110/verification/artifacts.md`
- **Verification:** `python conductor/tracks/clarity-audit_20261110/verification/check-artifacts.py` **and** `pnpm check`
- **Status:** pending

- [ ] **P3.T1: Mark the roadmap row Shipped** — covers: FR-7
- [ ] **P3.T2: Add the deterministic artifact check and evidence** — covers: AC-6, NFR-1
  - [ ] **P3.T2.1:** Checker asserts required headings, columns, pending values, and AC→FR traceability
  - [ ] **P3.T2.2:** Record commands and results in `verification/artifacts.md`

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
