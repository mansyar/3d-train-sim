# Phase R1 verification — Review Fixes (F1, F2)

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `c5a7e51ab815ef54f3c4aedb1985224e910cfa54`

## Goal

Resolve review findings F1 and F2 at the root cause, with tests: a cross-family
handoff must yield the shared voice instantly and a stale timer must never
release a successor's greeting; ffmpeg must resolve from `PATH` with an
`FFMPEG` override instead of a user-absolute Windows path.

## R1.T1 — Cross-family yield + release ownership (F1)

`src/state/rituals.ts` exposes `director.activeGreeting`, so the release guard
compares against that live ownership signal rather than introducing a token:
`if (director.activeGreeting === active) director.release();`. The guard runs
before the local `active` is nulled in each stage's completion block.

Both `src/scene/rituals/day.ts` and `src/scene/rituals/dusk-night.ts` now split
their director subscriber: an event the stage owns starts its greeting (and
`night-fireflies` fires the lullaby); any unowned event clears local `active`,
`restingGreeting` and `level`, and hides the actors — day via `chorus.update(0,0,1)`,
`butterflies.update(0,0,1)` and `glow.update(0)`; night via `restoreAmbient(0)`.
This mirrors the non-owning `applyResting` branch both stages already had.

`e2e/rituals-settle.spec.ts` gains `night in flight yields cleanly to a dawn
transition`: set noon → night, wait for `night.level > 0.8 && fireflyCount > 0`,
transition to dawn, then poll. It asserts night was genuinely on stage, day is
`dawn-chorus` with `level > 0.8`, night is fully cleared (`level`, `fireflyCount`,
`settledCritterCount`, `fireflyRise` all 0), exactly one voice change
(`[null, 'dawn-chorus']`), and that the voice is still dawn past the stale night
timer's expiry. Console clean. Targeted: 2 passed (34.3 s), including the
pre-existing rapid-tap test.

## R1.T2 — Portable ffmpeg (F2)

`e2e/rituals-evidence.spec.ts` now resolves `process.env.FFMPEG ?? 'ffmpeg'`;
the Windows absolute path is gone. `execFileSync` is wrapped to throw a clear
message naming both remedies (install on `PATH` or set `FFMPEG`) and preserving
the original error. Targeted run on tablet: 1 passed (41.2 s). The default
`'ffmpeg'` from `PATH` succeeded without an override, and `afterAll` regenerated
all five PNGs and `greeting-cycle.gif` in
`conductor/tracks/20261128-rituals-day-weather/evidence/`.

## Checks

| Command | Result |
| --- | --- |
| `pnpm check` (biome + tsc + vitest) | exit 0 — 219 files, 62 test files / 1069 tests passed |
| `pnpm exec playwright test --project=tablet e2e/rituals-settle.spec.ts` | exit 0 — 2 passed (34.3 s) |
| `pnpm exec playwright test --project=tablet e2e/rituals-evidence.spec.ts` | exit 0 — 1 passed (41.2 s) |

No reds, no retries. Pre-existing warnings only (Vite `configLoader: 'native'`,
THREE `PCFSoftShadowMap` deprecation). The evidence spec regenerated the tracked
bundle as a normal consequence of the verification run; it was not hand-edited.

## Files

- `src/scene/rituals/day.ts` (F1 subscriber + guarded release)
- `src/scene/rituals/dusk-night.ts` (F1 subscriber + guarded release)
- `e2e/rituals-settle.spec.ts` (F1 mid-greeting test)
- `e2e/rituals-evidence.spec.ts` (F2 portable ffmpeg)
- `conductor/tracks/20261128-rituals-day-weather/verification/phase-R1.md` (this evidence)

## Primary verification (2026-11-28T04:18:40+11:00)

- Tree vs phase base `8ee5b6a`: only the four Touches files plus the brief-sanctioned
  regenerated `evidence/` bundle and `verification/phase-R1.md`.
- `pnpm check` re-run by the primary: green, 62 files / 1069 tests.
- Targeted specs re-run by the primary on `[tablet]`: settle 2/2 (incl. the new
  mid-greeting cross-family test), evidence 1/1 (bundle regenerated fresh) — 3 passed.
- F1/F2 root-cause fixes confirmed in the diff (subscriber split + guarded release
  via `director.activeGreeting`; `process.env.FFMPEG ?? 'ffmpeg'`).
- **Result:** verified. **Checkpoint:** `bbf87f3`. **Evidence:** `verification/phase-R1.md`.
