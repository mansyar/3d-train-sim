# Phase 2 verification — Browser proof

Track: `frame-contract_20261109`
Phase base: `05fecc91e8555ad5a9385b7d5c333302e2274157`
Spec commit: `a092d5f`
Covers: FR-10, AC-4

## Command table

| # | Command | Exit | Result | Wall time |
| - | ------- | ---- | ------ | --------- |
| 1 | `pnpm exec playwright test e2e/frame-contract.spec.ts` | 0 | 1 passed (1 test, `tablet` project), test body 3.6s | 9.6s |
| 2 | `pnpm exec playwright test e2e/frame-contract.spec.ts` (instrumented, see below) | 0 | 1 passed, test body 9.0s | 17.7s |
| 3 | `pnpm check` (first attempt combined with #4) | 1 | biome formatter error in the new spec; tsc and vitest not run | — |
| 4 | `pnpm check` | 0 | biome clean (181 files), `tsc --noEmit` clean, vitest 51 files / 892 tests passed in 3.70s | ~10s |
| 5 | `pnpm exec playwright test e2e/frame-contract.spec.ts` (final, on the formatted file) | 0 | 1 passed, test body 5.0s | 22.8s |
| 6 | `pnpm exec playwright test e2e/frame-contract.spec.ts --project=phone` (diagnostic) | 1 | `Error: No tests found.` — expected, see "Projects" below | 1.5s |

The exact verification commands are rows 5 and 4; both exit 0 on the committed spec.

## AC-4 evidence

One boot, one test: `the loop ticks the documented systems in order and exactly once per frame`
(`e2e/frame-contract.spec.ts:36`), two named `test.step`s.

### Order (FR-10 first half)

`frameSystems().map((s) => s.name)` was compared with `toEqual([...FRAME_SYSTEM_ORDER])`, importing the
tuple from `src/scene/frame-contract.ts` rather than restating names. Observed order, laptop dev server:

```
day-ambience, fleet, chug, confetti, critters, crossings,
delight, music-box, duck, barge, portal-glow, film-camera
```

Exact match, 12 of 12, at both the pre-sample and post-sample reads.

### Cadence (FR-10 second half)

Inside a single `page.evaluate`, the spec schedules its own `requestAnimationFrame` chain, reads
`frameSystems()` in the first callback, counts frames until 30 have been observed, and reads again in
the last callback before resolving. Both reads happen at the same point in a frame, so the scene loop's
position in the callback queue cannot bias the delta. No wall-clock assertion anywhere.

Measured (instrumented run 2, deltas captured by a temporary `console.log` that was removed before the
spec commit):

```
frames=30
day-ambience:30  fleet:30  chug:30  confetti:30  critters:30  crossings:30
delight:30  music-box:30  duck:30  barge:30  portal-glow:30  film-camera:30
```

Every one of the twelve systems advanced by exactly the 30 observed frames — no system skipped a frame,
none double-ticked. The same equality assertion passed in rows 1 and 5 (deltas not logged there).

The vacuity floor is `frames >= 10`. The sample targets 30 frames and yielded 30 in every run; if a
machine is slow the window simply takes longer rather than shrinking, because the count, not a duration,
decides when to stop.

### Projects

- `tablet` — runs the spec (its `testIgnore` only excludes `prod.spec.ts`). All passing runs above are
  from this project; it is the only project that executes the file.
- `phone` — does not run it. The phone project's `testMatch` is a deliberate three-file allowlist
  (`smoke`, `phone-shell`, `ride-toybox-flow`) with `grep: /@smoke/`; row 6 records the resulting
  `No tests found`, which is the config working as intended, not a failure of this phase.
- `prod` — cannot run it: `__tinyTracksScene` is exposed only under `import.meta.env.DEV`. The spec is
  excluded by `prod.spec.ts`'s `testMatch`.

## Flake

No flake. Three green runs of the spec on the same machine, 3.6s / 9.0s / 5.0s of test body (the middle
run includes the extra `console.log`, and the spread is dev-server warm-up, not the assertion window).

Deliberate non-flake choices, in case a future reader is tempted to "simplify" them:

- Frames counted, never milliseconds; no `waitForTimeout` as a synchronisation primitive (none in the
  file at all).
- Tick reads bracketed *inside* the RAF chain, not from outside `page.evaluate`.
- `test.setTimeout(90_000)` for boot only, following `smoke.spec.ts`.

## Notes

- Fixed one biome formatter finding during verification (a `.toEqual([...])` call that fits the 100-column
  limit when wrapped). That was fix attempt 1 of 2; no assertion or logic changed. The final spec commit
  `a092d5f` contains the formatted file, and rows 4 and 5 ran against it.
- The spec only works with `prefers-reduced-motion: no-preference`: `startSpinLoop` renders a single
  static frame and returns when reduce matches, so ticks would never advance. Playwright's default
  `reducedMotion` is `no-preference` and `playwright.config.ts` does not override it for `tablet`; a
  future config change to `reduce` would fail this test at the `frames >= 10` floor, which is the
  honest outcome rather than a false pass.
- The `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` line on stderr is a dev-server
  `console.warn`, not a console error; `watchConsoleErrors` does not collect warns and the spec asserts
  the collected array is empty at both steps.
- `pnpm check` reports 892 unit tests, not the 883 named in the spec: Phase 1's `frame-contract.test.ts`
  added the difference. No `src/`, dependency or lockfile change in this phase (one file, 108 lines).

## Primary verification

| Check | Result |
|---|---|
| `pnpm exec playwright test e2e/frame-contract.spec.ts` | exit 0 — **1 passed** in 9.1 s (body 2.9 s) |
| `pnpm check` | exit 0 — Biome clean, `tsc --noEmit` clean, 51 files / **892 tests** |
| Diff scope `05fecc9..HEAD` | exactly the spec plus this file (2 files, +205) |
| `src/`, dependencies, lockfile | untouched |

### Review notes

- The spec imports `FRAME_SYSTEM_ORDER` from the module, so a twelve-to-thirteen drift breaks the test at the
  type level before it can pass with a restated list. That is the right coupling for a witness.
- The cadence measurement is genuinely frame-based: the `before` read and the `after` read both happen inside
  an `requestAnimationFrame` callback, so the scene loop's position in the callback queue cannot bias the
  delta, and the `>= 10 frames` floor stops a stalled loop from passing vacuously while still not asserting a
  frame *rate*.
- One boot, one test, two named steps: a red run names either "order" or "cadence", which is the diagnosis a
  caller needs.
- Accepted limitation, recorded by the subagent: under `prefers-reduced-motion` the spin loop renders a single
  static frame, so this spec would fail at its floor rather than pass falsely. The `tablet` project does not
  request reduced motion today, and Phase 3 records the caveat in `tech-stack.md`.

