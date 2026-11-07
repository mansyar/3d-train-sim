# Phase R1 — Review Fixes — Verification

Track: `e2e-cost_20261108` · Branch: `refactor/e2e-cost_20261108` · Base `cb9a6c4`
Performed by: the primary agent (the review-fix findings touch `conductor/` state and the phase subagent is
denied writes there).

## Goal

Close the seven findings from review round 1, of which one is a false pass rather than a wording problem.

## F1 (High) — the scenery drop was dead

`e2e/smoke.spec.ts:104` dropped the tree at `(640, 380)`, the same screen point the track piece had just
been dropped at, with no `clearMeadow` between. A cell is held by either array (`src/state/world.ts:144`)
and `placeScenery` refuses a held cell (`:254`), so `toy-drag.ts:296-298` wobble-returned the toy. The only
assertion compared a screenshot taken with the drawer **closed** to one taken with it **open**, so the
drawer panel alone satisfied it.

**Fix.** The step now opens the drawer on Nature, resolves a known free cell through
`__tinyTracksScene.cellToScreen({x:2,y:2})`, drags there, and asserts the world: `scenery()` grew by
exactly one and the new entry is `{kind:'tree', cell:{x:2,y:2}}`. The starter meadow already holds four
scenery toys, so the count is captured before the drag rather than asserting an absolute.

**Red proof (the witness bites).** Reverting only the drop target to `(640, 380)` while keeping the new
assertion:

```
Error: expect(received).toHaveLength(expected)
Expected length: 5
Received length: 4
```

That is the old behaviour, named: no toy placed, test red. With the free cell restored: `1 passed (41.2s)`.
The full smoke file on both projects: **13 passed, 1 skipped (1.8 min)**.

## F2 (Medium) — doc times contradicted the measurements

`e2e/README.md` advertised `pnpm e2e` ~2 min and `pnpm e2e:full` ~4 min; the recorded runs are 2.5–3.3 and
7.7 min. The Running block now says ~3 and ~8 min, with a paragraph giving the measured range and what
dominates it (the 43 s offline boot), and `CONTRIBUTING.md` carries the same pair plus the correction that
`e2e:full` is the tablet half of what a PR runs, not the whole of it.

## F3 (Medium) — AC-2 was eased without saying so

AC-2 still read ≤3 min while a cold run took 3.3. Amended to "≤3.5 min, and ≤3 min once the build is warm",
with the date, both measurements, and the reason the earlier wording would have recorded a pass it did not
have. NFR-3 carries the same number. This is the treatment AC-3 got, applied consistently.

## F4 (Medium) — one witness in the ledger was overstated

The oversized-file row claimed the note copy survived. It does not: `src/ui/parent-gate.ts:187` (the
`too-large` sentence, used at `:270`) is asserted by no test after the browser case was dropped. The row now
says so explicitly, and the ledger's "what this does not claim" section records it as debt rather than
glossing it.

## F5 (Low) — the nightly repeated a spec the phone project cannot run

`e2e/cargo.spec.ts` matches nothing under the phone `testMatch`, so the phone leg repeated only the smoke
file while reporting a green step. The repeat step now passes cargo for the tablet leg only, and the header
comment says the phone profile runs its allowlist rather than "both profiles end to end".

## F6 / F7 (Low) — two commands described wrongly

`e2e:full` is described as the tablet half CI runs, not "what a PR effectively runs". `e2e:file`'s
"no build" note gained the caveat that specs touching the 5198 preview origin need one.

## Commands

| Check | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome 178 files clean, `tsc` clean, 50 files / **883 tests** |
| The fixed journey | `playwright test e2e/smoke.spec.ts -g "build journey"` | 0 | 1 passed (41.2 s) |
| Red proof | same, drop target reverted to `(640,380)` | 1 | failed at the new assertion: expected 5 scenery, received 4 |
| Smoke file, both profiles | `playwright test e2e/smoke.spec.ts --project=tablet --project=phone` | 0 | 13 passed, 1 skipped (the `@ci` canary) in 1.8 min |
| Workflow shape | PyYAML parse of `.github/workflows/nightly.yml` | 0 | repeat step's `run` is a single shell string with the tablet-only conditional |

## Notes

- No `src/` file changed; the fix is entirely in the test, the docs, the workflow and the spec wording.
- The starter-meadow count was the second surprise of this phase: asserting `scenery()` equals one toy
  failed on the first run because the cozy-oval starter ships four. The delta assertion is the honest form.
- Remaining debt, recorded not fixed: the `too-large` note copy has no test. Closing it means exporting the
  constant or asserting the rendered sentence, both of which belong in a UI-copy track rather than here.
