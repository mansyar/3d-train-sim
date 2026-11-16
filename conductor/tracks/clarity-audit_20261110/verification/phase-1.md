# Phase 1 evidence — Observation protocol and clock rules

- Track: clarity-audit_20261110 — Clarity Audit
- Phase: 1 — Observation protocol and clock rules
- Date: 2026-11-17
- Branch: chore/clarity-audit_20261110
- Base: 2c88e7c918d4a1bf7f813f29a9b88920bbeacfec
- Head: bb9951be78917d3c2ceeebe0f1833c2877ba179c
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| artifact | `python -c "from pathlib import Path; t = Path('conductor/tracks/clarity-audit_20261110/protocol.md').read_text(encoding='utf-8'); assert all(s in t for s in ('2\u20134', 'consent', 'time-to-first-ride', 'unassisted session length', '20', 'not measured'))"` | 0 | All six required strings present in `protocol.md`; no output, assertion passed |
| git | `git status --porcelain` | 0 | Clean tree before work began |

The verification command was run exactly as written in the brief (ASCII escape
`2\u20134`, resolving to the en-dash string `2–4`). No fixes or retries were
required.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Cohort of three children aged 2–4, parent consent, repeatable session flow, interruption/disagreement handling | `protocol.md` §1 (cohort 2–4, consent), §3 (6-step session flow), §5 (adult intervention, disengagement, sibling/device, disagreement precedence) | pass |
| FR-2 | time-to-first-ride = app open/wake → first ride; unassisted session length = first self-directed placement → disengage/help, 20-minute cap | `protocol.md` §4.1 and §4.2 with explicit start/stop and cap | pass |
| AC-1 | Cohort 2–4, consent, session steps, both clock definitions, 20-minute cap, interruption handling | `protocol.md` §1, §3, §4, §5; completeness assertion passes all six required strings | pass |
| NFR-3 | Every criterion traces to an FR ID; IDs stable | `protocol.md` §7 traceability table (AC-1 → FR-1/FR-2; FR-1, FR-2); no IDs renumbered | pass |
| NFR-1 / FR-6 (protocol scope) | Artifact-only, no telemetry or identifying data | No app code touched; `protocol.md` §1, §6 forbid recordings/identifying details and keep notes anonymous on-device | pass |

## Evidence paths

- `conductor/tracks/clarity-audit_20261110/protocol.md` — the deliverable (110 lines, 7 sections)
- `conductor/tracks/clarity-audit_20261110/verification/phase-1.md` — this report

## Deviations

None. Only the file in `Touches` (`protocol.md`) and this evidence file were
written. No product or design decision was required.

## Notes

- Per the executor addendum, the prior `conductor-phase` agent was blocked by
  permissions denying writes under `conductor/**` outside `verification/**`;
  this unrestricted executor created the deliverable within `Touches`.
- The brief's corrected verification command (ASCII `2\u20134`) was used; the
  original literal en-dash form was not run.
- `protocol.md` was committed as `bb9951b` (docs(conductor): add clarity audit
  observation protocol); this evidence file is committed in a follow-up commit
  so the report can reference the deliverable's head hash without amending.
