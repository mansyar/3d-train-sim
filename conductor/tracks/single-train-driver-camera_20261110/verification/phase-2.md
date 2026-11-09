# Phase 2 Verification — Driver camera and 🎥 cycle

- Track: single-train-driver-camera_20261110
- Phase: 2
- Date: 2026-11-10
- Branch: feat/single-train-driver-camera_20261110
- Base: 2efa4b377255acdf7a65150edba2d6c712e6c274
- Head: 10e2163
- Result: verified

## Summary

The 🎥 cycle now runs Overview → Chase → Driver → wrap for the single riding
train. The driver view sits at the cab eye (2.2 world units above the rig
model origin, 0.6 ahead along the model's current `rotation.y` heading) and
looks level along that heading, with the same eased lerp as chase and no
separate path math. The 🎥 button appears at ≥1 riding train (was ≥2), stays
hidden while idle, and reduced-motion hiding is untouched in `style.css`.
A fresh ride re-films chase; stop returns to overview. The old two-disjoint-
loops journey is replaced by a single-train chase → driver → overview → wrap
journey (AC-4) and an open-line journey proving stop returns home and restart
re-films chase (AC-5). No `ridingTrainCount === 2` witness remains. `pnpm
check` is green (Biome, `tsc --noEmit`, Vitest 52 files / 904 tests).

The Playwright smoke journeys were rewritten but not executed by this
executor: the brief's shell scope covers only git plus the named verification
command (`pnpm check`). The primary should run `pnpm e2e` to prove AC-4/AC-5
at runtime before closing the phase.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static+unit | `pnpm check` | 0 | Biome clean (one format fix applied to the new test title), `tsc --noEmit` clean, Vitest 52 files / 904 tests passed |
| e2e (rewritten, not run here) | `pnpm e2e` | — | Shell scope per brief is git + `pnpm check`; primary to execute (see Notes) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-4 | Driver view at the cab eye looking along heading | `film-camera.ts` driver branch: eye at `model.position + forward * 0.6 + 2.2 up`, look 12 ahead level, `forward = (sin yaw, 0, cos yaw)` from `model.rotation.y`; same `CAMERA_EASE` lerp, no allocation | pass |
| FR-5 | 🎥 visible at ≥1 ride, hidden idle and reduced motion | `ride-controls.ts` threshold `count < 1`; idle stays hidden (`count === 0`); reduced-motion hide still via `style.css` `@media (prefers-reduced-motion: reduce)` (untouched) | pass |
| FR-6 | Cycle Overview → Chase → Driver → wrap; stop returns to overview; restart re-films chase | `cycleFilmTarget`: train → driver (same anchor) → overview → train; `syncFilmed` lands fresh rides on `'train'` and drops to overview when rides end; e2e asserts chase on (re)start and overview after stop | pass |
| AC-4 | Two disjoint loops yield one riding train; 🎥 appears; taps cycle chase → driver (near cab, heading) → overview → wrap | `smoke.spec.ts` single-loop test: `ridingTrainCount() === 1`, film visible, `filmedView()` chase → driver → overview → chase wrap with the same anchor; `waitForFunction` proves the driver camera settles within 4 world units of `primarySpot()` at cab height (y 1–5), vs the chase offset | pass* |
| AC-5 | Open-line-only journey rides the open line; stop returns to overview | `smoke.spec.ts` open-line test: two straights ride with `ridingTrainCount() === 1`, chase → driver (near-cab witness), stop hides 🎥 with `filmedView() === 'overview'`, restart returns to chase | pass* |
| P2.T3.3 | No `ridingTrainCount === 2` witness remains | `grep "=== 2"` in `e2e/` shows only `wagonCount() === 2` (cargo); the old two-loops test is gone | pass |

* Statically vetted (Biome + `tsc` + test-file review) but not executed in
this executor; see Notes for the exact command the primary should run.

## Evidence paths

- `src/scene/film-camera.ts` — driver target, cycle, eye pose, `filmedView` / `cameraSpot` witnesses
- `src/scene/init-scene.ts` — deviation: `SceneHandle.filmedView` / `cameraSpot` passthrough (see Deviations)
- `src/ui/ride-controls.ts` — ≥1 visibility threshold + docs
- `src/ui/app.ts` — cycle docs + 🎥 aria-label ("Switch the camera view")
- `e2e/smoke.spec.ts` — single-loop + open-line journeys; removed two-loops test

## Deviations

- `src/scene/init-scene.ts` (outside Touches): smallest necessary change to
  make AC-4 provable — exposes two dev/e2e witnesses already computed by the
  film camera (`filmedView`, `cameraSpot`) on `SceneHandle`, following the
  existing `primarySpot` / `filmedAnchor` witness pattern; no behavior change.
  It also carries one doc refresh (film-count comment and cycle comment).
- `src/style.css` comment at line 173 still says "two or more trains ride";
  left untouched (outside Touches, comment-only; the rule it describes now
  lives in `ride-controls.ts` at ≥1).

## Primary verification (4.7)

Date: 2026-11-10; Checkpoint: `10e2163`
Commands: `pnpm check` — exit 0 (biome 182 files, `tsc --noEmit`, vitest 52/904). `pnpm e2e` — exit 0 (21 passed, incl. smoke.spec 1063 single-loop driver cycle and 1182 open-line stop-to-overview on tablet+phone), proving AC-4/AC-5 statically flagged pass* evidence.
Compared AC-4/AC-5/FR-4/FR-5/FR-6 against evidence table; runtime proof 2026-11-10 confirmed by primary run.

## Notes

- The new journeys are tagged `@smoke`, so the phone project's grep lane
  covers them as well as tablet. The camera witnesses are viewport-
  independent (world-space), so the near-cab assertion holds on both.
- `pnpm check` runs Biome + `tsc` + Vitest only; `pnpm e2e` was not executed
  here, so runtime proof of AC-4/AC-5 is pending the primary. Suggested:
  `pnpm e2e` (build + `@smoke` lane) and, for the changed file only,
  `pnpm exec playwright test e2e/smoke.spec.ts`. Expected: both new tests
  green on tablet and phone; no console errors.
- Reduced-motion behavior is unchanged by design: the camera module never
  moves the camera and `style.css` keeps the button hidden; the ≥1 threshold
  change does not alter either path.
