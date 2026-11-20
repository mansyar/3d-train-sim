# Phase 1 Verification — Pure cloud-layer math and contract guards

- **Track:** `sky-detail_20261120` — Sky Detail
- **Phase:** 1 — Pure cloud-layer math and contract guards
- **Date:** 2026-11-20
- **Branch:** `feat/sky-detail_20261120`
- **Base commit:** `8d575053fad3a1f0807c83b173433e032e4580ee`
- **Head commit (before evidence):** `88adb2dc3b619ad4442c1f06998216d666d421dd`
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| RED (initial) | `pnpm check && pnpm test:coverage` | 1 | Biome `assist/source/organizeImports` on the new test file; import order corrected in place. Not the intended red reason. |
| RED (confirmed) | `pnpm check && pnpm test:coverage` | 1 | Biome clean; `tsc --noEmit` failed with `src/core/cloud-layers.test.ts(13,8): error TS2307: Cannot find module './cloud-layers'`. Expected TDD missing-module red. Test file committed first (`33468e1`). |
| GREEN (initial) | `pnpm check && pnpm test:coverage` | 1 | Biome formatter wanted the long `layerOffset` signature wrapped; signature corrected in place. Not a test failure. |
| GREEN (final) | `pnpm check && pnpm test:coverage` | 0 | Biome checked 203 files clean; tsc clean; Vitest 60 files / 1047 tests passed; coverage gate met (see below). |
| Static (scope) | `git diff --name-only 8d575053fad3a1f0807c83b173433e032e4580ee` | 0 | Only `src/core/cloud-layers.test.ts` and `src/core/cloud-layers.ts`. |
| Static (scope) | `git diff --stat 8d575053fad3a1f0807c83b173433e032e4580ee` | 0 | 2 files changed, 246 insertions, 0 deletions. |
| Static (purity) | native `grep` for `import`, `fetch(`, `localStorage`, `indexedDB`, `http(s)://`, `window.`, `document.` in `src/core/cloud-layers.ts` | 0 | No matches — zero imports, no storage/network/DOM access. |

Final coverage summary (project scope; gate is 80% on `src/core` + `src/state`):

| Metric | Result | Gate |
| --- | --- | --- |
| Statements | 97.18% (1832/1885) | 80% — pass |
| Branches | 91.48% (859/939) | 80% — pass |
| Functions | 97.45% (422/433) | 80% — pass |
| Lines | 98.95% (1612/1629) | 80% — pass |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Exactly two cloud layers with distinct depth and drift speed | `cloud-layers.test.ts` → `cloud layer descriptors > exposes exactly two layers with distinct depth and drift speed`: `CLOUD_LAYERS` has length 2, near has greater depth and speed than far. Unit witness only; the live-scene/e2e witness is Phase 2 (`P2.T3`). | verified (unit portion) |
| AC-3 | Drift over frames, near faster than far, wrapping inside the arc | `layerOffset` tests: `advances by speed × dt and is deterministic`, `drifts the near layer faster than the far layer over the same frames` (600 frames at 1/60 s), `wraps inside the arc and stays non-negative` (multi-lap jump and negative offset), plus scratch-identity tests. | verified |
| AC-5 | No per-frame allocation / new meshes; perf-budget e2e green | `cloudCover` and `layerOffset` scratch tests assert `out` identity over 1000 repeated calls (`seen.size === 1`); no `new Mesh`/`new Texture`/material creation exists in the pure module (static grep); `out ??` allocates only on the non-frame path. Perf-budget e2e is Phase 2 (`P2.T4`, AC-8). | verified (unit/static portion) |
| AC-7 | No save/schema/UI/audio/dependency/clarity diff; comparison 8× `awaiting observation`; no v1.0 claim | `git diff --name-only` and `--stat` from the phase base list only the two allowed files: no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `src/core/save.ts`, state, scene, UI, audio, e2e, Conductor docs or clarity artifacts changed; the 8-cell comparison is untouched; no version/claim text changed. | verified |

### P1.T3 — visual-only contract guard (explicit static assertion)

The diff from the phase base was asserted to contain **only**:

```text
src/core/cloud-layers.test.ts
src/core/cloud-layers.ts
```

Therefore: no new save key, snapshot key or schema; no dependency change; no UI, audio, telemetry or network identifier change; no scene/e2e change; the 8-cell `awaiting observation` clarity comparison and `product.md` are untouched. `src/core/cloud-layers.ts` is structurally pure — zero imports and no DOM/storage/network calls (static grep above).

## Evidence paths

- `src/core/cloud-layers.ts` — pure helpers and frozen descriptors
- `src/core/cloud-layers.test.ts` — TDD tests (13 cases)
- `conductor/tracks/sky-detail_20261120/verification/phase-1.md` — this report
- No large artifacts were produced, so `.conductor/evidence/` was not used.

## Deviations

None. All changes are inside the phase Touches (the evidence path follows the brief's explicit `Evidence` section: `conductor/tracks/sky-detail_20261120/verification/phase-1.md`, i.e. the track-local `verification/phase-1.md`).

## Notes

- TDD was enforced: the failing test file was committed first (`33468e1`, missing-module red), then the implementation (`88adb2d`). A green-only report was not produced.
- The pre-existing Vite `configLoader: 'native'` extensionless-import warning at `vite.config.ts:6:36` appears in both Vitest runs. It is unrelated and was left alone as instructed.
- Two corrections were needed before the final green run: a Biome import-order fix in the test file and a Biome line-wrap fix in the implementation signature. Neither was a test failure, and no check needed more than one fix/re-run.
- AC-1 and AC-5 also name e2e/perf witnesses. Phase 1 covers their pure unit/static halves only; the live-scene and Playwright witnesses belong to Phase 2 per the plan and are not claimed here.

## Primary verification

- Exact command `pnpm check && pnpm test:coverage` re-run by the primary: both stages exit 0. Biome checked 203 files clean, `tsc --noEmit` clean, Vitest 60 files / 1047 tests passed; coverage 97.18% statements / 91.48% branches / 97.45% functions / 98.95% lines, all above the 80% gate.
- Working tree clean after the subagent's commits apart from untracked `.conductor/` runtime state; `git diff --name-only 8d575053fad3a1f0807c83b173433e032e4580ee..HEAD` lists exactly `src/core/cloud-layers.test.ts`, `src/core/cloud-layers.ts`, and this evidence file.
- Squash guard: the range contains only the three reported commits (`33468e1`, `88adb2d`, `3c873a7`); no merge commit, user commit, or unreported file. Accepted for squash.
- The pre-existing Vite `configLoader: 'native'` warning at `vite.config.ts:6:36` remains untouched; it is unrelated to this phase.
