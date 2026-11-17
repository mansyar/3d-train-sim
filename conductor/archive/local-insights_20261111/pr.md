## Summary

Adds a parent-only, on-device insights panel behind the existing two-second hold
gate. Sessions, longest session, resets, unexpected closes, storage estimate and
last save outcome are stored in a separate IndexedDB store, never transmitted,
and deliberately not presented as the clarity audit's human-observed measures.
The world snapshot, export format and kid-facing UI are unchanged.

## Track

| Phase | Checkpoint | Result |
| --- | --- | --- |
| Insights model and clock rules | `3315635` | verified |
| Local persistence and capture wiring | `302643e` | verified |
| Gated panel, Playwright journey and docs | `b4f9998` | verified |
| Review fixes | `9fc1c54` | 2 Medium + 1 Low findings resolved |

- Type: feature (high priority)
- Branch: `feat/local-insights_20261111`
- Base: `main` @ `e86be96aef2f64ca31102294022e9fdfeaa6b6d2`

## Requirements

- [x] FR-1 — session = foreground→hidden, every completed interval counted
- [x] FR-2 — parent reset increments a persistent counter
- [x] FR-3 — boolean unclean-exit marker, no reason or stack content
- [x] FR-4 — storage estimate + last save outcome in plain words
- [x] FR-5 — separate `insights` IndexedDB store; snapshot/export unchanged
- [x] FR-6 — read-only panel inside the existing hold-gated parent tray
- [x] FR-7 — no network, analytics, identifiers or export inclusion
- [x] FR-8 — roadmap, README and CHANGELOG updated
- [x] NFR-1 — TDD pure model, 80% coverage gate met
- [x] NFR-2 — no telemetry; privacy guidelines unchanged
- [x] NFR-3 — boundary-only writes, no per-frame work
- [x] NFR-4 — kid UI unchanged; hold gate remains the only long-press
- [x] NFR-5 — graceful unavailable/failure states
- [x] AC-1..AC-8 — evidenced in phase reports and `verification/integrated.md`

## Verification

| Check | Result |
| --- | --- |
| `pnpm check` | exit 0 — Biome 191 files clean, tsc clean, Vitest 56 files / 988 tests |
| `pnpm test:coverage` | exit 0 — 96.64% stmts / 90.22% branch / 97.29% funcs / 98.7% lines; `state` 93.52% / 82.29% |
| `pnpm exec playwright test e2e/insights.spec.ts` | exit 0 — 1 passed: hidden → hold → six rows → resets → reload → clean hide → same-origin requests |
| `pnpm build` | exit 0 — PWA precache 178 entries |
| CI | pending on PR |

## Media

Not applicable for review: the visible change is a small text panel inside the
existing parent tray; the Playwright journey covers its gated behaviour without
capturing private diagnostic values.

## Review

`conductor-reviewer`: **PASS WITH FINDINGS** (F1/F2 Medium, F3 Low). All three
resolved in one Phase R1 round: direct v2 upgrade tests in both database
helpers, a clean-hide/reload e2e proof, and a tested singular/plural formatter.
See `review.md` and `verification/phase-r1.md`.

## Deviations

- `src/main.ts` appears in Phase 3's diff for the required lazy insights view
  provider; it contains no state logic. Phase R1 moved the longest-session
  formatter into pure core code with exact-text tests.
- The approved `conductor/product.md` shipped marker was applied by the primary
  after the executor's permission denial.
- Playwright's per-test budget was raised from 90 s to 180 s after a one-off
  WebGL shader-compile stall; no assertion was weakened.

## Follow-ups

A parent can now observe the real counters on their own device. They are not a
substitute for the clarity audit's three observed sessions; those remain a
separate human-observation task.

## Rollback

Revert the merge commit to remove the panel and store code. The v2 IndexedDB
migration is additive (a new `insights` object store); reverting the code leaves
the extra local store inert, and does not alter world snapshots or exports.
