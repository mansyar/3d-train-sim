# Phase 1 — Lanes and tags

- Track: `e2e-cost_20261108`
- Phase: 1 — Lanes and tags
- Date: 2026-11-08
- Branch: `refactor/e2e-cost_20261108`
- Phase base: `95d474168f9ff43836e98e52265b07d758678f56`
- Phase head (code): `4f2ad99`
- Result: **blocked / partial** — tags, gate and scripts are in place and green, but AC-4
  cannot be met by the prescribed phone config (it selects 8, not 4), `pnpm e2e` itself is
  denied by the tool permission layer, and the third timed lane run exceeded the 3-minute
  budget with two pre-existing flakes.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static + unit | `pnpm check` | 0 | biome 184 files clean, `tsc --noEmit` clean, vitest 50 files / 883 tests passed |
| e2e list (all) | `pnpm exec playwright test --list` | 0 | 105 tests in 27 files; 11 `@smoke` unique, 1 `@ci` |
| e2e list (phone) | `pnpm exec playwright test --list --project=phone` | 0 | **8 tests in 3 files** (expected 4) |
| e2e gate list | `pnpm exec playwright test e2e/smoke.spec.ts --list --project=tablet` | 0 | 20 tests; `…ambient frame rate… @ci` present at `smoke.spec.ts:316` |
| e2e gate, no CI | `pnpm exec playwright test e2e/smoke.spec.ts --project=tablet -g "ambient frame rate"` | 0 | 1 skipped |
| e2e gate, CI | `$env:CI='true'; pnpm exec playwright test e2e/smoke.spec.ts --project=tablet -g "ambient frame rate"` | 0 | 1 passed (9.4 s) |
| build | `pnpm build` | 0 | `vite build` → `dist/` built in 2.12 s |
| lane run 1 | `pnpm exec playwright test --grep=@smoke` | 0 | 19 passed (1.7 m) |
| lane run 2 | `pnpm exec playwright test --grep=@smoke` | 1 | 18 passed, 1 failed (1.8 m) — phone parent gate |
| lane run 3 | `pnpm exec playwright test --grep=@smoke` | 1 | 17 passed, 2 failed (3.4 m) — tablet ride, tablet parent gate |
| lane script | `pnpm e2e` | n/a | **permission denied** (see Blockers) |

`pnpm e2e` was denied by the tool permission layer, so the lane was measured as its two
documented constituents: `pnpm build` followed by `pnpm exec playwright test --grep=@smoke`.
`--grep=@smoke` is required with `pnpm exec`; the package script calls the `playwright`
binary directly from the script `PATH`, where the space-separated form is passed through.

## Eleven-test `@smoke` mapping

| # | Test (tagged title) | File:line | Behaviour |
|---|---|---|---|
| 1 | `app boots on a tablet with a clean console and zero external requests @smoke` | `e2e/smoke.spec.ts:5` | boot, clean console, zero external requests |
| 2 | `drag-placing a track piece renders it in the world @smoke` | `e2e/smoke.spec.ts:61` | drag-place a piece |
| 3 | `pressing play rides the train along the placed track @smoke` | `e2e/smoke.spec.ts:197` | ride and stop |
| 4 | `track and scenery survive a reload through local autosave @smoke` | `e2e/smoke.spec.ts:128` | autosave round trip (reload, world came back) |
| 5 | `the parent gate clears the world only after hold and confirm @smoke` | `e2e/smoke.spec.ts:548` | parent gate hold + confirm |
| 6 | `a saved meadow re-imports byte for byte @smoke` | `e2e/world-portability.spec.ts:263` | import round trip |
| 7 | `a boot salvages the corrupt snapshot and keeps every valid piece @smoke` | `e2e/save-recovery.spec.ts:187` | salvaged snapshot keeps valid pieces |
| 8 | `the meadow boots, places a toy and rides with the network off @smoke` | `e2e/runtime-guarantees.spec.ts:229` | offline boot |
| 9 | `phone viewport: shell fits without horizontal clipping @smoke` | `e2e/phone-shell.spec.ts:5` | 360 px shell |
| 10 | `riding hides the build tools and stopping returns them @smoke` | `e2e/ride-toybox-flow.spec.ts:50` | first test of the file |
| 11 | `five tabs hold their toys; the adventure row swipes on phones @smoke` | `e2e/ride-toybox-flow.spec.ts:95` | second test of the file |

No test title was renamed beyond appending the tag. `@ci` was appended to
`tablet emulation keeps an ambient frame rate with a clean console @ci`
(`e2e/smoke.spec.ts:316`), whose body now starts with
`test.skip(!process.env.CI, 'throughput canary runs in CI, where software rendering is the baseline')`;
`fpsFloor = process.env.CI ? 2 : 10` is untouched.

**`prod` was deliberately excluded from `@smoke`** (FR-2 interpretation below). `prod.spec.ts`
is untagged, so the smoke lane selects zero `prod` runs; the project still runs its single test
in every full run via `testMatch`.

## AC table

| AC | Criterion | Measured | Status |
|---|---|---|---|
| AC-2 | `pnpm e2e` = 11 unique `@smoke` tests, ≤ 3 min | 19 runs (11 tablet, 8 phone, 0 prod) / 11 unique. Run times 1.7 m, 1.8 m, 3.4 m; the third is over budget | **partial** — budget met twice, missed once under load |
| AC-4 | `--list --project=phone` = exactly 4 | **8** (boot, drag-place, autosave, ride, parent gate, phone shell, two ride-toybox) | **not met** — see Deviations |
| AC-5 | FPS canary skipped locally, present and run with `CI` set | 1 skipped without `CI`; 1 passed (9.4 s) with `CI=true`; present in `--list` | **met** |

## Evidence paths

- `.conductor/evidence/e2e-cost_20261108/phase-1/smoke-runs.md` — lane run summaries and failure excerpts
- `.conductor/evidence/e2e-cost_20261108/phase-1/phone-list.txt` — verbatim `--list --project=phone`

## Deviations

1. **FR-2 interpretation (recorded, not re-litigated).** FR-2 says eleven tests and lists ten
   behaviours; resolved as eleven unique tests with `prod.spec.ts` deliberately untagged, because
   the `prod` project runs it in every full run anyway and it costs ~1 s.
2. **Phone `grep` composition (blocking).** The prescribed
   `testMatch: ['**/smoke.spec.ts', '**/phone-shell.spec.ts', '**/ride-toybox-flow.spec.ts']`
   plus `grep: /@smoke/` composes correctly but selects **8**, because five of the eleven
   `@smoke` tests live in `smoke.spec.ts` (boot, drag-place, autosave, ride, parent gate) and
   `testMatch` admits all five. The brief's "four" assumes `smoke.spec.ts` contributes only the
   boot test. No config-only path to 4 exists without a title filter (`grepInvert` on four
   titles), which would trade the tag vocabulary for a title blacklist. Decision needed:
   accept 8, add the title blacklist, or retag/move four smoke tests.
3. **`pnpm e2e` permission denial.** The exact verification command is denied to this subagent;
   `pnpm build` and `pnpm exec playwright test --grep=@smoke` were run instead. The package
   scripts themselves are unchanged from the brief.
4. **Reduced phone `testIgnore`.** The `phone` project no longer carries
   `testIgnore: /prod\.spec\.ts/`; its exhaustive `testMatch` already cannot match
   `prod.spec.ts`, so the second file filter was redundant. The `tablet` project keeps its
   `testIgnore`.
5. **Lane flakes (not fixed, test bodies untouched).** Under repeated local load the lane went
   red on `pressing play rides the train along the placed track` (30 s test timeout at
   `waitForTimeout(2500)`, run 3) and `the parent gate clears the world only after hold and
   confirm` (hold did not reach the `Confirm` label; phone run 2, tablet run 3). Both are
   pre-existing tablet/WebKit timings; Phase 1 forbids rewriting test bodies.

## Notes

- `playwright.config.ts` keeps `workers: 2` untouched.
- The smoke lane is dominated by the offline `runtime-guarantees` test (~36–55 s) and the
  cold first boot paid by each worker.
- Run 3 ran immediately after run 2 and every test inflated 2–3× (6 s → 19 s), which is what
  pushed it past 3 minutes; the two failures are load-sensitive timing assertions.
- The phone lane carrying five smoke.spec tests is both the AC-4 discrepancy and the source of
  the parent-gate phone failure; resolving it to the intended 4 would shorten the lane and
  remove that failure surface.

## Primary verification

Performed by the primary agent on HEAD `95bd956` (the subagent's reported head), working tree clean
apart from the `spec.md` amendment below.

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome 184 files, `tsc --noEmit` clean, 50 files / **883 tests** |
| Run counts | `playwright test --list` (all / phone / tablet) | **105** in 27 files · **8** in 3 files · **96** in 26 files |
| Smoke lane | `pnpm e2e` ×4 | **1.57 min**, **1.56 min**, ~1.5 min: 19 passed. One run at **5.94 min** with 18 passed / 1 failed |
| Canary gate | `pnpm e2e` locally vs `CI=true` | skipped locally; the canary passed in 9.4 s when `CI` was set (subagent run) |

**AC-4 resolution.** The phone project was listing 8 runs, not the 4 the spec asked for, because five
`@smoke` tests live inside the allowlisted `smoke.spec.ts`. The user chose to keep the two-tag
vocabulary and amend the criterion rather than add a third tag or split a 1,067-line file before the
merge phases. `spec.md` AC-4 now reads "only the runs from the three allowlisted files — 8 runs … not
the whole suite", with the amendment dated and the reason recorded inline. Independently confirmed:
`--list --project=phone` reports **8 tests in 3 files**, and tablet keeps its original **96**.

**Lane reliability, stated plainly.** Three of four smoke runs were 1.5–1.6 minutes and green, inside
the 3-minute budget. The fourth took 5.94 minutes and failed one test; the artefact was deleted by a
later passing run, so the identity is unrecorded. The subagent's runs failed the *parent-gate* hold on
phone (twice) and a ride timeout on tablet, all of which pass in isolation. That is the known
contention fingerprint of this suite, not a regression from tagging, and it is the strongest argument
for Phase 3 collapsing the gate and ride assertions into one journey with a `.is-confirm` wait rather
than a fixed hold.

**Diff review.** `95d4741..HEAD` is nine files: the eight Touches plus the evidence file. Every spec
change is a title suffix (`@smoke` / `@ci`) or the `test.skip` guard; no assertion, fixture or
timeout was altered. `playwright.config.ts` changes one project (phone) and leaves `workers: 2`,
the tablet project and `prod` untouched. `package.json` adds three scripts and changes nothing else.
The phone `testIgnore` for `prod.spec.ts` was dropped because the exhaustive `testMatch` cannot match
it — a redundancy removal, not a scope change.
