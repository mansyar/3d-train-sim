# E2E Stability Runbook

How to run the Playwright suite and, more importantly, how to read it when
something goes red. (New to the repo? See [CONTRIBUTING.md](../CONTRIBUTING.md)
for setup and the project workflow first.) The suite asserts **zero console
errors** on a toy app
that loads 3D models and plays audio — which makes it sensitive to
environmental noise. This document is the accumulated stability record of
releases v0.5.0 → v0.7.0 (track `e2e-stability_20260904`).

## Running

```sh
pnpm e2e                     # the lane you want: build, then the @smoke journeys (~2 min)
pnpm e2e:full                # the whole tablet suite, minus CI-only canaries (~4 min)
pnpm e2e:file e2e/undo.spec.ts   # one spec, no build
pnpm exec playwright test    # every run, every profile (what CI shards)
```

## Lanes, tags and the device matrix

Two tags, and nothing else:

- **`@smoke`** - ten journeys that answer "did we break the toy?". Boot with a clean console and zero
  external requests, drag-place, ride and stop, an autosave round trip, the parent gate, save salvage, an
  import round trip, the production shell, the phone layout, and the offline boot. This is `pnpm e2e`.
- **`@ci`** - measurements that only mean something on a slow runner. Currently the ambient-FPS canary,
  which skips itself unless `CI` is set. `pnpm e2e:full` inverts the filter so a laptop run does not
  measure its own GPU.

The **phone** project runs three allowlisted files (`smoke`, `phone-shell`, `ride-toybox-flow`), not the
suite: the phone risks are layout and ride-mode toolbars, and everything else is identical code paths
already proven on the tablet profile. The **prod** project runs one test against `vite preview`.

The full matrix is ~57 runs (49 tablet + 7 phone + 1 prod). CI splits it into two shards
(`--shard=1/2`, `--shard=2/2`) on separate runners; a nightly workflow runs both profiles and repeats the
two contention-sensitive specs. `--shard` splits *after* `--grep` and project filters, so a lane and a
shard compose.

**When a merged journey fails, the step name is the diagnosis.** Every former test is now a `test.step`
with the old test's name, so the failed step points at the behaviour, not at a 40-line body.

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

## Time budgets for real-time choreography

Specs that ride live choreography (gates, cargo deliveries) must set an
explicit `test.setTimeout(...)` that outlives their own allowed waits —
Playwright's 30 s default is smaller than the sums those specs permit on a
busy shared runner. Precedents: `crossing-gate` 120 s (≈80 s of witnessed
waits plus the reload boot), `wagon-workshop` 180 s with a 90 s delivery
poll, `delight-toys` 90 s, `music-box` 180 s. Flakes of this class are budget
bugs, not product bugs — fix the budget, never weaken the assertion.
(Track `e2e-ci-budgets_20260913`.)

## Release authority

The **ubuntu e2e run in the release pipeline is the release authority**.
Windows-local e2e is a development convenience; WebKit noise that trips
only zero-console assertions on Windows does not block a release (v0.7.0
precedent), but functional assertion failures do — always.
