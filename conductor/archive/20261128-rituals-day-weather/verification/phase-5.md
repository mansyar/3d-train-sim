# Phase 5 verification — Settle hardening and evidence

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `24b6504dca0b3ca648170a5b2e7b5744748c4a5e`

## Goal

Spam-proof settle, resting states everywhere, full `pnpm check` green, and a
committed-ready evidence bundle (FR-8/FR-9/FR-10, NFR-1–NFR-4, AC-4–AC-8).

This is attempt 2. Attempt 1 left four untracked specs and an evidence bundle
in the tree before a provider failure. Those artefacts were verified and
completed in place — nothing was rewritten from scratch. `verification/phase-4.md`
was left untouched (the primary's 9-test correction stands).

## P5.T1 — Reduced-motion e2e (AC-6)

`e2e/rituals-reduced-motion.spec.ts` emulates `prefers-reduced-motion: reduce`
before `goto`, then jumps away-to-target via `window.__tinyTracksScene.setDayPhase`
and reads the `rituals()` / `nightRituals()` witnesses synchronously, with no
RAF dependency. For all five greetings it proves:

- `restingGreeting` matches the settled phase and the opposite stage is null;
- `level` is 1, `activeGreeting` is null (the director never announces);
- capped resting poses: chorus ≤ 20, butterfly ≤ 28, critters ≤ 16,
  fireflies ≤ 24, `fireflyRise` 1, `headlightLevel` 1, glow/windowWarmth > 0.8;
- `lullabyHooks` 1, night fires the lullaby (`lullabyFires > 0`) while dusk does
  not (0);
- a 250 ms wall-clock pause leaves every witness unchanged.

Targeted: 1 passed (33.5 s). Full matrix: 1 passed (3.3 s). Clean console.

## P5.T2 — Rapid-tap e2e (AC-5)

`e2e/rituals-settle.spec.ts` sets dawn, clicks `.day-toggle` four times inside a
single `page.evaluate` (no frame between taps), asserts `activeGreeting` is
still null and `level` 0 immediately, then samples five seconds of RAF and
counts null→greeting transitions. Exactly one greeting fires, for the settled
phase (`night-fireflies`), `lullabyDelta` is 1, and the console is clean. This
pins FR-8's "only the settled phase speaks" and NFR-1's bounded work.

Targeted: 1 passed (14.7 s). Full matrix: 1 passed (7.9 s).

## P5.T3 — Offline/prod regression (AC-8)

`e2e/rituals-offline.spec.ts` follows the established `runtime-guarantees.spec.ts`
pattern: warms the service worker on the `vite preview` origin (5198), goes
offline, reloads, confirms the shell and `.day-toggle`, taps twice, and asserts
no request leaves the app origin (blob/data/about/devtools schemes allowed) and
no console error. A fresh `pnpm build` preceded the runs so preview served the
current bundle. No new dependency, no network call, no save-schema change;
sun/moon behaviour is also covered by the unchanged `sun-moon.spec.ts` (ok).

Targeted: 1 passed (29.5 s). Full matrix: 1 passed (12.4 s). The `prod` project's
`prod.spec.ts` also passed (no debug grid toggle, shell intact).

## P5.T4 — Evidence bundle (AC-4)

`e2e/rituals-evidence.spec.ts` captures five settled greetings at 480×720 with
Playwright video on, waits for quiet between phases, and in `afterAll` copies
the five PNGs into `conductor/tracks/20261128-rituals-day-weather/evidence/` and
converts the recording to `greeting-cycle.gif` with the brief-supplied ffmpeg.
The filter chain (`fps=10,scale=400:-1:flags=lanczos`, palettegen/paletteuse,
`-t 5`, `-loop 0`) enforces the budget structurally: ≤400 px wide, ≤10 fps,
≤5 s, one cycle. Bundle: `dawn.png`, `morning.png`, `noon.png`, `dusk.png`,
`night.png`, `greeting-cycle.gif`. Regenerated fresh by both the targeted run
and the full matrix (anchors logged for all five phases); visually checked
dawn/noon/night renders. GIF remains ~1.9 MB, within budget.

## Checks

| Command | Result |
| --- | --- |
| `pnpm build` | exit 0 — fresh `dist/` for preview/offline (warning: Vite `configLoader: 'native'`, pre-existing) |
| `pnpm exec playwright test e2e/rituals-settle.spec.ts e2e/rituals-reduced-motion.spec.ts e2e/rituals-offline.spec.ts --project=tablet` | exit 0 — 3 passed (1.3 m) |
| `pnpm exec playwright test e2e/rituals-evidence.spec.ts --project=tablet` | exit 0 — 1 passed (1.3 m) |
| `pnpm check` (biome + tsc + vitest) | exit 0 — 219 files, 62 test files / 1069 tests passed |
| `pnpm exec playwright test` (full matrix, all projects) | exit 0 — 98 passed, 1 skipped (10.3 m) |

No reds. The Phase 4 watch item (WebGL-context flake in `toybox-clarity.spec.ts`
under load) did not recur — all six `toybox-clarity` tests passed on both
`tablet` and `phone` in the full run, with no console errors attributable to
rituals code paths. No retry was needed; related-vs-unrelated verdict: moot.

## Files

- `e2e/rituals-settle.spec.ts` (new, AC-5)
- `e2e/rituals-reduced-motion.spec.ts` (new, AC-6)
- `e2e/rituals-offline.spec.ts` (new, AC-8)
- `e2e/rituals-evidence.spec.ts` (new, AC-4, GIF capture)
- `conductor/tracks/20261128-rituals-day-weather/evidence/{dawn,morning,noon,dusk,night}.png` and `greeting-cycle.gif` (new)
- `conductor/tracks/20261128-rituals-day-weather/verification/phase-5.md` (this evidence)

No source changes were needed: phases 1–4 already carry the settle and resting
logic, and all witnesses asserted here existed at the phase base.

## Commit

None — the brief requires explicit instruction from the primary before
committing. All files are staged-ready in the working tree.

## Primary verification (2026-11-28T03:53:03+11:00)

## Result

verified. Every box checked; `pnpm check` green; full Playwright matrix green
including offline/prod profiles; evidence bundle fresh and committed-ready.
