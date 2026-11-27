## Summary

The day/weather clock now greets the child: each of the five phases settles into
a short living vignette (dawn chorus, morning butterflies, noon full-sun glow,
dusk window warmth, night fireflies + headlight + one lullaby phrase), each with
its own synthesized motif through the existing Howler unlock path. Settle is
spam-proof (one voice, settled phase only), reduced motion freezes every
greeting at rest, and the bundle stays offline-capable with no new dependencies.

## Track

- **ID:** `20261128-rituals-day-weather`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261128-rituals-day-weather/spec.md`](conductor/archive/20261128-rituals-day-weather/spec.md)
- **Plan:** [`conductor/archive/20261128-rituals-day-weather/plan.md`](conductor/archive/20261128-rituals-day-weather/plan.md)
- **Review:** [`conductor/archive/20261128-rituals-day-weather/review.md`](conductor/archive/20261128-rituals-day-weather/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Greeting director | Phase→greeting map + settle rule | verified | `d3099f0` | Frame-contract entry comment-only (12-name order pinned; reasoned) |
| 2: Day greetings | Dawn chorus, morning butterflies, noon glow | verified | `d35b17b` | Procedural pooled actors; no GLB, no precache growth |
| 3: Dusk and night greetings | Window warmth, firefly surge, headlight, lullaby hook | verified | `c450027` | Resting hooks on both stages |
| 4: Per-phase motifs | Distinct synth motifs, instant mute | verified | `183d07f` | Night reuses songbook lullaby (`src/core/melodies.ts`) |
| 5: Settle hardening and evidence | Spam/resting proofs, bundle | verified | `2f3a5fd` | GIF format primary-resolved; committed under `evidence/` |
| R1: Review fixes | F1 yield/ownership, F2 ffmpeg | verified | `bbf87f3` | Ownership-guarded `release()`; `PATH` ffmpeg resolution |

## Requirements

- [x] `FR-1` — Phase entry fires its greeting once settled (test: `src/state/rituals.test.ts`)
- [x] `FR-2` — Dawn chorus critters + chime (test: `e2e/rituals-day.spec.ts`)
- [x] `FR-3` — Morning butterflies + motif (test: `e2e/rituals-day.spec.ts`)
- [x] `FR-4` — Noon glow, liveliest critters + motif (test: `e2e/rituals-day.spec.ts`)
- [x] `FR-5` — Dusk windows warm, critters settle + motif (test: `e2e/rituals-night.spec.ts`)
- [x] `FR-6` — Night fireflies, headlight, one lullaby phrase (test: `e2e/rituals-night.spec.ts`)
- [x] `FR-7` — Distinct synth motifs, zero downloads (test: `src/audio/rituals.test.ts`)
- [x] `FR-8` — Spam greets settled phase only; single voice (test: `e2e/rituals-settle.spec.ts`)
- [x] `FR-9` — Reduced motion renders resting state instantly (test: `e2e/rituals-reduced-motion.spec.ts`)
- [x] `FR-10` — Sun/moon behavior unchanged (test: `e2e/rituals-offline.spec.ts`)
- [x] `NFR-1` — 60 FPS, pooled/capped actors (in-browser cap asserts)
- [x] `NFR-2` — No new dep, no download, no network (offline spec, precache 178 entries unchanged in kind)
- [x] `NFR-3` — Cold start <5 s, no meaningful precache growth (no async loads)
- [x] `NFR-4` — Icon-only, no new gestures (no UI text added)
- [x] `NFR-5` — TDD + 80% gate (97.23/91.51/97.51/98.97 over `src/core` + `src/state`)
- [x] `NFR-6` — Frame-contract order documented (comment-only entry with reasons)
- [x] `AC-1` — Map pinned incl. settle-vs-spam
- [x] `AC-2` — Every greeting visible e2e, clean console
- [x] `AC-3` — Five screenshots committed (`evidence/`)
- [x] `AC-4` — Animated greeting-cycle GIF committed (`evidence/greeting-cycle.gif`)
- [x] `AC-5` — Rapid-tap plays exactly one settled greeting
- [x] `AC-6` — All greetings frozen at rest under reduced motion
- [x] `AC-7` — `pnpm check` green
- [x] `AC-8` — Full matrix green incl. offline/prod; no new dep/network

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `pnpm check` | pass — 62 files / 1069 tests | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| coverage | `pnpm test:coverage` | pass — gate green | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| lint | `pnpm check` (biome) | pass — 219 files | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| typecheck | `pnpm check` (tsc) | pass | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| build | `pnpm build` | pass | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| e2e | `pnpm exec playwright test` | pass — 98 passed, 1 skipped | `conductor/archive/20261128-rituals-day-weather/verification/integrated.md` |
| smoke | matrix `smoke.spec.ts` + `prod.spec.ts` | pass | same as above |
| manual-device | human-only | not run (standing rule) | — |

## Media

![Night fireflies greeting with headlight](https://github.com/user-attachments/assets/34b9f54e-853c-4a56-a1bf-0b61fc26e0b6)
![One noon greeting cycle](https://github.com/user-attachments/assets/8091081f-239a-4f55-b71d-089d7b781b92)
Captured against the branch at `bbf87f3` (bundle refreshed post-fix in `07b0875`); GIF ~1.8 MB, 400 px wide, 10 fps.

## Review

- **Verdict:** `PASS`
- **Rounds:** 1 (round 1 BLOCK → R1 fixes → re-review PASS)
- **Fixed:** 2 findings (F1 cross-family yield/ownership, F2 ffmpeg portability)
- **Accepted/deferred:** 0 (strict mode)

## Deviations and risks

- Frame-contract runtime slot omitted by design: the director is event-driven and
  the twelve-name `FRAME_SYSTEM_ORDER` is pinned by boot code and its unit test;
  the NFR-6 entry is comment-only with reasons. Risk: none — verified by suite.
- Songbook lives at `src/core/melodies.ts` (brief said `src/audio/`); import only.
- Evidence bundle committed under the track's `evidence/` per AC-4's explicit
  wording, overriding the default media-gitignored rule; the same files attach
  to this PR as hosted media.
- `tasks_total` corrected 18 → 17 (actual plan task headers; all 20 boxes checked).

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No migrations, feature flags, or data changes — visual/behavioral only, save schema untouched.
