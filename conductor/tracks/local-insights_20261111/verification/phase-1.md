# Phase 1 Evidence — Insights model and clock rules

- **Track:** `local-insights_20261111` (Local Insights)
- **Phase:** 1 — Insights model and clock rules
- **Date:** 2026-11-17
- **Branch:** `feat/local-insights_20261111`
- **Base commit:** `1d6943419ba272c64b7e0612695d17077f244e33`
- **Head commit:** `1fe21803d961409b4456cc8d4abbc42fb7926d3b`
- **Result:** verified

## Summary

A pure `src/core/insights.ts` model records session clock intervals, longest
session, resets, unclean exits and save outcomes, plus plain-word formatting
helpers for the quota estimate and last save outcome. It has no storage, DOM,
timer or module-level mutable state: every function takes an explicit `now` or
state value and returns the next state. P1.T1 was committed Red first (module
missing), then P1.T2 turned it Green. The counters carry no audit-named fields
and no error content — the running marker is a boolean only.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit (Red) | `pnpm check` | 1 | Expected failure: `TS2307: Cannot find module './insights'` in the new test; Biome passed, proving the failure was the missing module, not syntax/style. |
| static + unit (Green) | `pnpm check` | 0 | Biome check 188 files clean; `tsc --noEmit` clean; Vitest 55 files / 955 tests passed (including the 17 new insights tests). |

`pnpm check` is the phase's configured verification command and was run exactly
as written. Its output covers the static (Biome + tsc) and unit (Vitest) layers
required by the workflow; the coverage gate is upheld by the new module being
fully exercised across all branches (zero/negative duration, open-session
guard, dirty/clean boot, non-finite estimate, missing outcome).

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Foreground-to-hidden increments sessions and updates longest; repeated visible events do not double-count; a short session still counts. | `src/core/insights.test.ts` → `session clock` describe: interval counting, duplicate-visible no-op, hidden-without-session no-op, zero-duration guard, longest-only-on-longer, negative-duration guard. | verified (unit scope) |
| AC-2 | A reset increments the reset count and all counters remain readable after it. | `reset counter` describe: `noteReset` increments `resets` and leaves every other field byte-identical (immutable spread). Reload persistence is Phase 2. | verified (unit scope; persistence in Phase 2) |
| AC-3 | A dirty boot marker increments unclean exits once; a clean hide clears it; no error content stored. | `unclean exit marker` describe: clean boot +0, dirty boot +1 with marker retained, clean exit clears. `InsightsState.running` is a boolean; no reason/stack/URL field exists. | verified |
| AC-4 | Usage/quota and last save outcome render in plain words; an unavailable estimate reports plainly instead of throwing. | `formatStorageEstimate` / `formatSaveOutcome` describes: rounded-MB output, unavailable line for a missing or non-finite estimate, `No save yet.` for none/missing, and each recorded outcome. Panel rendering is Phase 3. | verified (pure formatting; DOM panel in Phase 3) |
| AC-8 | Every acceptance criterion traces to at least one FR or NFR. | This phase maps P1.T1/T2 to FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-3, NFR-5; the spec traceability table maps every AC to FR/NFR IDs. | verified |

## Evidence paths

- `src/core/insights.ts` — pure model (Green implementation).
- `src/core/insights.test.ts` — 17 Red-first unit tests.
- Red commit: `176908b` — `test(core): Add failing insights model and clock rule tests`.
- Green commit: `1fe2180` — `feat(core): Add pure local insights model and clock rules`.

## Deviations

None. Changes stayed within `src/core/insights.ts` and `src/core/insights.test.ts`.

## Notes

- The `noUselessSwitchCase` lint and a formatter wrap were corrected before the
  final `pnpm check`; no lint-rule softening was used.
- `noteBoot` must be called once at boot by the Phase 2 wiring; with a boolean
  marker only, a second call on the already-running state would increment again.
- AC-2's reload proof, AC-3's real hide/unload wiring and AC-4's DOM panel are
  intentionally deferred to Phases 2 and 3 per the plan.
- This report is committed separately from the task commits as the phase evidence.
