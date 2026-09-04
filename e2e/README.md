# E2E Stability Runbook

How to run the Playwright suite and, more importantly, how to read it when
something goes red. The suite asserts **zero console errors** on a toy app
that loads 3D models and plays audio — which makes it sensitive to
environmental noise. This document is the accumulated stability record of
releases v0.5.0 → v0.7.0 (track `e2e-stability_20260904`).

## Running

```sh
pnpm exec playwright test                          # full suite, 2 workers (config default)
pnpm exec playwright test e2e/wagon-workshop.spec.ts   # one spec
```

- **Workers are capped at 2** in `playwright.config.ts`. This is not a
  suggestion: higher worker counts hammer the single shared dev server
  until it stops accepting connections, and the rest of the run goes red
  with `page.goto: Could not connect to server` noise (observed with a
  10-worker local default).
- Run long suites **in the foreground**. Background/managed shells can be
  throttled mid-soak; both observed server collapses happened there, while
  identical foreground runs sailed through.
- Do not stack `--repeat-each` soak runs locally: they collapsed the shared
  dev + preview servers mid-run even at 2 workers. Soak runs belong in CI.

## The one allowlisted noise: WebKit `blob:` texture fetches

The tablet/phone device profiles (`iPad Mini`, `iPhone 13`) run headless
**WebKit**. Under load, WebKit intermittently rejects GLTFLoader's internal
`blob:`-URL texture fetches (the embedded-PNG GLBs: hills, crossing,
switches) with:

```
Fetch API cannot load blob:http://… due to access control checks
```

The field record (wagon-workshop_20260904 and release-v0.7.0_20260904
archives in `conductor/archive/`) shows this noise **only ever tripped
zero-console-error assertions while every functional assertion kept
passing**, across specs (wagon-workshop, undo, starter-railway) and three
releases. It is allowlisted in exactly one place —
`isEnvironmentalConsoleNoise()` in `e2e/helpers.ts` — and filtered at
collection time by `watchConsoleErrors()`, the single collector every spec
uses.

Rules for the allowlist:

- **Page errors (uncaught exceptions) are never allowlisted** — those are
  real crashes.
- Extending the allowlist requires a field-recorded signature (verbatim
  message, spec, device profile) cited in `e2e/helpers.ts`. The once-seen
  `colormap.png` variant deliberately is **not** allowlisted — it must keep
  failing until it shows a pattern.
- If a red run shows only this fingerprint, rerun before investigating.

## Rerun convention

On a red run whose only failures are the allowlisted-noise-adjacent
console assertions:

1. Rerun the failed spec, then the suite at `--workers=2` (already the
   default).
2. If it's green, log it and move on — no product investigation is owed
   for a single environmental trip.
3. Repeated trips of the *same* environmental signature across runs is a
   stability bug: extend or tighten the allowlist with evidence.

## Release authority

The **ubuntu e2e run in the release pipeline is the release authority**.
Windows-local e2e is a development convenience; WebKit noise that trips
only zero-console assertions on Windows does not block a release (v0.7.0
precedent), but functional assertion failures do — always.
