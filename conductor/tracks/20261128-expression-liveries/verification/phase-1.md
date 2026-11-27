# Phase 1 Verification — Livery state + persistence

- **Track:** 20261128-expression-liveries
- **Phase:** 1 — Livery state + persistence
- **Date:** 2026-11-28
- **Branch:** feat/20261128-expression-liveries
- **Base commit:** `f61385259c620becf0564daf0d4dc1500366d4cf`
- **Head commit:** `e398d33e83af091e222e415eb294accd9dd2ff37`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Red — tests first | `pnpm test:coverage` | 1 | Expected failure: `src/state/liveries.test.ts` could not resolve `./liveries`; 4 livery preference assertions failed (missing `preferences.liveries`). |
| Green — implementation, first run | `pnpm test:coverage` | 1 | `vi` was not imported in `src/state/liveries.test.ts` (4 `ReferenceError`s); all other 1087 tests passed. |
| Verification | `pnpm test:coverage` | 0 | 63 files, 1091 tests passed. Coverage: 97.16% statements, 91.52% branches, 97.64% functions, 99.01% lines (gate: 80%). `liveries.ts` 95.77% statements / 90.56% branches; `save.ts` 94.15% statements / 93.56% branches. |
| Git inspection | `git status --short`; `git diff --stat` | 0 | Only the four in-scope files changed. |
| Git inspection | `git rev-parse HEAD`; `git log --oneline --max-count=5 HEAD` | 0 | Confirmed base → commit sequence and head SHA. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 | Per-vehicle livery state (paint + up to four stickers, oldest-first eviction, restore default, per-train isolation), persisted across reloads per train. | `src/state/liveries.test.ts` — catalogue caps, stock boot, set-paint, invalid inputs ignored, stamp order, 5th-stamp eviction `['heart','flower','bolt','star']`, restore-default, hydrate round-trip/corruption, defensive copies, reset, unsubscribe. `src/core/save.test.ts` — serialize/deserialize round-trip with two distinct vehicle ids. | verified (logic half) |
| NFR-5 | Save stays additive: livery rides in `preferences` like wagon outfits; portable world-only export excludes it. | `src/core/save.test.ts` — `preferences.liveries` written only when non-empty; old snapshots and missing/garbage keys boot stock; corrupt entries salvaged with `__proto__` rejected; `buildExport` output has no `preferences` or `liveries`. | verified |
| AC-2 | Reload round-trip: livery of every vehicle byte-identical after reload. | `serializeWorld` → `deserializePreferences` round-trip assertions in `src/core/save.test.ts` (`{ muted, liveries }` with two vehicles); `store.hydrate(store.snapshot())` round-trip in `src/state/liveries.test.ts`. Browser reload wiring lands in Phase 5, as scoped by the plan. | verified (logic half) |

## Evidence paths

- `src/state/liveries.ts` — pure catalogue + store (no DOM/three/Howler); curated 6 paints, 4 shapes, 4 anchors, oldest-first FIFO cap.
- `src/state/liveries.test.ts` — 15 Red-first store tests.
- `src/core/save.ts` — additive `preferences.liveries`, shared forgiving `parseLiveries`, trailing `serializeWorld` parameter.
- `src/core/save.test.ts` — 7 Red-first persistence/portable tests.
- Commits: `72af1fb` (P1.T1), `e398d33` (P1.T2).

## Deviations

None. All changes stayed inside the four files listed in the phase Touches.

## Notes

- The store is the single source of truth for paint/sticker vocabulary and eviction; `src/core/save.ts` validates only structure, so no curated ids are duplicated across the core/state boundary and there is no import cycle (type-only `state → core` import).
- `serializeWorld` gained a trailing 10th parameter, so all existing positional callers remain valid and need no change in this phase.
- The corrupt-entry test uses a non-string `paint` so core can reject it structurally; invalid string ids are rejected by `store.hydrate`, keeping validation responsibilities separate.
- The portable export never emits a `preferences` block, so exclusion is inherent and required no change to `portable.ts`.
- The Vite `configLoader: 'native'` warning is pre-existing and unrelated to this phase.
