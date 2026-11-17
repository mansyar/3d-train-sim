# Review — Local Insights

- **Track:** `local-insights_20261111` (Local Insights)
- **Branch:** `feat/local-insights_20261111`
- **Base:** `e86be96aef2f64ca31102294022e9fdfeaa6b6d2`
- **Reviewed head:** `75c813e` (post-fix head `9fc1c54`)
- **Date:** 2026-11-17
- **Reviewer:** `conductor-reviewer` session `ses_e17971817ffemWd2RVtDfMATzB`
- **Verdict:** PASS WITH FINDINGS — all three findings resolved in Phase R1 (one round)

## Checks

| Command | Result |
| --- | --- |
| `pnpm check` | exit 0 — Biome clean, tsc clean, Vitest 56 files / 975 tests at review; 988 tests after R1 |
| `pnpm test:coverage` | exit 0 — 96.64% stmts / 90.22% branch / 97.29% funcs / 98.7% lines; `state` 93.52% / 82.29% (80% gate met) |
| `pnpm exec playwright test e2e/insights.spec.ts` | exit 0 — 1 passed at review; 1 passed after R1 with the clean-hide/reload step |
| `pnpm build` | exit 0 — PWA precache 178 entries |
| `git diff --shortstat base..HEAD -- . ':!conductor'` | 15 files, +1116/−18 (LARGE — reviewed per phase plus cross-phase integration) |
| grep for network/analytics/localStorage under `src/` | no added external URL, beacon, analytics or second local store |

## Coverage summary

FR-1–FR-8, NFR-1–NFR-5 and AC-1–AC-8 are covered across the three phases and the integrated evidence. FR-5 was marked partial at review because the v2 `upgrade` callback lacked a direct test; R1 closed that gap. All acceptance criteria have evidence in `verification/integrated.md` and the per-phase reports. No Critical or High findings.

## Findings and resolutions

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F1 | Medium | `src/state/insights-store.ts` / `src/state/persistence.ts` — v2 dual-store `upgrade` callback never executed by a test; a store omission or version mismatch would ship silently. | `src/state/insights-store.test.ts` and `src/state/persistence.test.ts` capture `openDB`'s `upgrade` callback and assert name/version 2, both stores from an empty DB, only `insights` from a v1 DB, and idempotency (commit `a08d4c9`). |
| F2 | Medium | `src/main.ts` — final session and clean-exit marker persisted fire-and-forget during unload; a lost write can falsely raise `Unexpected closes`. | `e2e/insights.spec.ts` now simulates a real `visibilitychange → hidden`, waits for the write, reloads and asserts `uncleanExits` unchanged with the session carried over; `endInsights()` documents the reliable early persist point and unload deduplication (commits `8c8b18b`, `d0dc6a7`). No localStorage, beacon, new store or network call added. |
| F3 | Low | `src/main.ts` — `formatLongestSession()` always pluralised minutes. | Pure `formatLongestSession()` moved to `src/core/insights.ts` with singular/plural wording and exact-text unit tests; `main.ts` imports it (commit `d0dc6a7`). |

## Accepted items (not findings)

- Phase 3's `src/main.ts` change holds only the required `insights` view provider and longest-session formatter (benign).
- The approved FR-8 `conductor/product.md` shipped marker was applied by the primary after the executor's permission denial.
- Playwright's per-test budget was raised from 90 s to 180 s after a one-off WebGL shader stall; `holdGate()` still uses real ~2.4 s pointer holds and all six-row, read-only, same-origin and persistence assertions remain intact.
- Counters are device diagnostics and are never presented as the clarity audit's human-observed `time-to-first-ride` or `unassisted session length`.

## `needs` disposition

The reviewer's single `needs` item (`git rev-parse HEAD` denied by its shell policy) was non-blocking: the head SHA was obtained via `git log` and independently confirmed by the primary. No outstanding needs.

## Phase R1 evidence

`conductor/tracks/local-insights_20261111/verification/phase-r1.md` — both configured commands re-run by the reviewer-fix executor and independently by the primary (`pnpm check` exit 0, 988 tests; Playwright 1 passed). Checkpoint `9fc1c54`.
