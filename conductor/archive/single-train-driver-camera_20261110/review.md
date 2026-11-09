# Review — single-train-driver-camera_20261110

- Track: single-train-driver-camera_20261110
- Date: 2026-11-10
- Branch: feat/single-train-driver-camera_20261110
- Base: 93e919e6fc46103e9b013a96f479a4b8b28b58f9
- Head: ce3ddd9 (review base; fixes 8f8eff3 + R1 follows)
- Verdict: PASS WITH FINDINGS, all findings resolved
- Review rounds: 1

## Summary

Range 93e919e..ce3ddd9, non-conductor diff 12 files, 350 insertions/105 deletions. `pnpm check` 904 tests, coverage 97.24%/90.34%/97.84%, build clean, e2e 21 passed, full matrix 59 passed/1 skipped. No Critical/High/Medium findings. Three Low documentation drifts (below) fixed in Phase R1. Reviewer session `ses_e3df000c6ffeFH5AykfKEKdrRK`.

Read-only reviewer confirmed: `selectRideComponents` closed-first filter + ride `selectRideComponents(...,1)` + `if (active.size>0) return true` no-swap guard; all call sites cap 1 (ride.ts:95, park-spot.ts:48, park-pose.ts:30); default cap=4 helper-only; driver eye `+forward*0.6 +2.2`, look `+forward*12`, same `CAMERA_EASE` lerp no per-frame allocation; 🎥 `hidden = count<1` (init-scene ridesList.length), idle + reduced-motion hidden; `ridingTrainCount === 2` only in conductor/**, none in e2e/; `init-scene.ts filmedView()/cameraSpot()` witnesses compliant.

## Findings and resolutions

| Sev | Location | Finding | Status |
|---|---|---|---|
| Low | src/style.css:172-173 | Comment “present only while two or more trains ride” stale | **Fixed in Phase R1** — changed to “present only while at least one train rides (≥1, app frame toggles hidden)”. |
| Low | src/core/pathing.ts:389-392 | `rideComponentsOf` doc “every loop and line gets its own train” stale (behavior correct, all components returned) | **Fixed in Phase R1** — changed to “one component per connected track; ride selection picks the single loop-then-longest component; helper returns all components”. |
| Low | src/scene/park-pose.ts:17 | “largest ride’s step” doc stale after park-spot rename (`largest→selected`), though FR-7 behavior correct | **Fixed in Phase R1** — changed to “selected ride’s … step (longest looped, else longest)”. |
| Low | spot check | `init-scene.ts` witnesses + `style.css` comment deviations | Accepted — witnesses smallest-necessary, style.css note recorded not silent. |

No findings were added after the fixes. Re-run `pnpm check` is the complete evidence for Phase R1.
