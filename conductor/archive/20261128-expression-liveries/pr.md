## Summary

Trains can now dress up: the train drawer gains an icon-only livery tray with
six paint swatches and four sticker stamps per train, whole-body repaint with
a soft pop + happy ding, and arm-then-stamp stickers on four side anchors per
vehicle with oldest-first eviction. Liveries persist across reload inside
snapshot `preferences` (excluded from portable export), restore-default
returns stock paint with zero stickers, and the parent-gated full reset clears
all liveries with the world. No new dependencies, no downloads, offline-safe.

## Track

- **ID:** `20261128-expression-liveries`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261128-expression-liveries/spec.md`](conductor/archive/20261128-expression-liveries/spec.md)
- **Plan:** [`conductor/archive/20261128-expression-liveries/plan.md`](conductor/archive/20261128-expression-liveries/plan.md)
- **Review:** [`conductor/archive/20261128-expression-liveries/review.md`](conductor/archive/20261128-expression-liveries/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Livery state + persistence | Pure store + snapshot prefs | verified | `e398d33` | Store `72af1fb` + save `e398d33`; curated catalogue, stock-as-absence |
| 2: Drawer livery section | Icon-only tray, per-train targeting | verified | `2a1fc0a` | 64px targets; `liveryStore` owned by the drawer, re-exported via `app.ts` |
| 3: Paint application + reward | Whole-body repaint + reward sound | verified | `ddc4592` | Consist-scoped repaint; DEV-gated test witness with disposal cleanup |
| 4: Stickers + restore | Arm-then-stamp + restore-default | verified | `6ee76d4` | 4 anchors/vehicle, oldest-first; reduced motion lands final state |
| 5: Persistence + evidence | Boot restore, offline proof, bundle | verified | `42bd28d` | Widened Touches: missing persistence wiring added (AC-2 needed it) |
| R1: Review fixes | Reset clears liveries | verified | `7ea8495` | Notifying `reset()` + `world.onReset` wiring; consist semantic proven |

## Requirements

- [x] `FR-1` — Drawer livery tray per selected train (test: `e2e/liveries-drawer.spec.ts`)
- [x] `FR-2` — Whole-body repaint with instant feedback (test: `e2e/liveries-paint.spec.ts`)
- [x] `FR-3` — Sticker stamps on side anchors, capped with oldest-first eviction (test: `e2e/liveries-stickers.spec.ts`)
- [x] `FR-4` — Restore-default returns stock with zero stickers (test: stickers + drawer specs)
- [x] `FR-5` — Liveries persist across reload; full reset clears all (tests: `save.test.ts`, evidence reload, `e2e/liveries-reset.spec.ts`)
- [x] `FR-6` — Repaint/stamp reward sounds with instant mute (test: paint spec muted variant)
- [x] `NFR-1` — Icon-only ≥64px targets, no keyboard trap (test: drawer spec)
- [x] `NFR-2` — No new dep, no download, no network (build entry count + offline prod test)
- [x] `NFR-3` — Reduced motion renders final state instantly (tests: paint + stickers specs)
- [x] `NFR-4` — Icon-only UI, no new gestures (drawer spec)
- [x] `NFR-5` — TDD + 80% gate (97.13/91.73/97.25/98.91 over `src/core` + `src/state`)
- [x] `NFR-6` — Pooled sprites, no per-frame allocations (scene code)
- [x] `AC-1` — Tray visible with paints + stickers, clean console
- [x] `AC-2` — Byte-identical IndexedDB reload keeps liveries
- [x] `AC-3` — Fifth stamp evicts oldest; count stays capped
- [x] `AC-4` — Six screenshots + cycle GIF committed (`evidence/`)
- [x] `AC-5` — Muted repaint/stamp plays nothing audible
- [x] `AC-6` — Stickers frozen at rest under reduced motion
- [x] `AC-7` — Full matrix green incl. offline/prod; no new dep/network

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm check` | pass — 63 files / 1098 tests | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — gate green | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| lint | `pnpm check` (biome) | pass | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| typecheck | `pnpm check` (tsc) | pass | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| build | `pnpm build` | pass — 178 precache entries | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| e2e | `pnpm exec playwright test --project=tablet` | pass — 95 passed, 0 failed | `conductor/archive/20261128-expression-liveries/verification/integrated.md` |
| smoke | matrix `smoke.spec.ts` + `prod.spec.ts` | pass | same as above |
| manual-device | human-only | not run (standing rule) | — |

## Media

![Steam engine in stock paint with the livery tray open](https://github.com/user-attachments/assets/c8082a87-45ad-4d73-ae70-8fa317cf6e18)
![One livery cycle across all six consists](https://github.com/user-attachments/assets/acc9719d-542e-4c28-bf07-a13b301ced1a)
Captured against the branch at `f90fb58`; GIF ~1.6 MB, 400 px wide, 10 fps.

## Review

- **Verdict:** `PASS`
- **Rounds:** 1 (round 1 BLOCK → R1 fixes → re-review PASS)
- **Fixed:** 1 finding (F1 reset did not clear liveries)
- **Accepted/deferred:** 0 (strict mode)

## Deviations and risks

- `liveryStore` is created in `src/ui/train-picker.ts` and re-exported through
  `src/ui/app.ts` (one line) so the scene observes the drawer's single instance
  via the sanctioned composition root; no second store. Risk: none — covered by
  the import-graph test and the full suite.
- DEV-only `window.__tinyTracksLivery` witness for scene assertions, cleaned up
  on dispose. Risk: none — gated on `import.meta.env.DEV`, invisible in prod.
- Phase 5 Touches widened mid-run to add the missing persistence wiring
  (`watchLiveryPersistence`/`restoreLiveryPreference` in `persistence.ts`, boot
  restore in `main.ts`) — AC-2 could not pass without it. Risk: none — proven by
  the byte-identical reload test and the full matrix.
- Evidence bundle committed under the track's `evidence/` per AC-4's explicit
  wording, overriding the default media-gitignored rule; the same files attach
  to this PR as hosted media.
- Consist-as-one-vehicle is the intended semantic: paint/restore operate on the
  whole consist; proven by the consist-restore agreement test.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No migrations or feature flags. Save change is additive (`preferences.liveries`,
stock-as-absence, salvage-safe); reverting drops persisted liveries harmlessly.

