# Phase 3 verification — the smoke journey

Track: `e2e-cost_20261108` · branch `refactor/e2e-cost_20261108`
Scope: FR-4, FR-5, FR-12 · plan Phase 3 (P3.T1–P3.T4)
Touches: `e2e/smoke.spec.ts` (only file changed)

## Status

**Verified.** `e2e/smoke.spec.ts` is 9 tests where it was 20, every merged body names its
`test.step`s, no assertion was dropped, and both required commands exit `0`. One boot per test:
no merged test calls `page.goto('/')` between its steps.

## Commands and exit codes

| # | Command | Exit | Output |
|---|---------|------|--------|
| 1 | `pnpm check` | 0 | Biome 178 files clean; `tsc --noEmit` clean; vitest **883 passed** (50 files) |
| 2 | `pnpm exec playwright test e2e/smoke.spec.ts` | 0 | **13 passed, 1 skipped (1.8 m)**, 2 workers — 9 tablet + 5 phone runs (`@ci` skipped locally) |
| 3 | `pnpm exec playwright test --list` | 0 | `Total: 77 tests in 21 files` |
| 4 | `pnpm exec playwright test --list --grep '@smoke'` | 0 | `Total: 19 tests in 6 files` |
| 5 | `pnpm exec playwright test --list --project=phone` | 0 | `Total: 8 tests in 3 files` |

The first `--grep @smoke` invocation failed at exit 1 with `option '-g, --grep <grep>' argument
missing` — PowerShell consumed the bare `@smoke` token. Re-run quoted (command 4); the quote is a
shell necessity, not a different selection.

## Run time before and after

| | Before (20 tests) | After (9 tests) |
|---|---|---|
| Runs from this file | 25 (20 tablet + 5 phone) | **14** (9 tablet + 5 phone) |
| Tablet test time | ≈3 min — the track's own baseline JSON (`.conductor/evidence/e2e-durations.json`) sums 94.0 s for the first eleven tests alone, and the documented suite average is 11.5 s/test for the twenty | **102.6 s** — measured per test in command 2 |
| Whole-file wall time | not re-measured in this phase (the file no longer exists in its old form) | **1.8 min** for all 14 tablet+phone runs |

Measured after-durations (tablet): boot 6.2 s · build journey 18.8 s · ride/station 18.2 s ·
puffs 12.9 s · persistence 9.3 s · parent gate + day + mute 24.4 s · cargo 7.7 s · camera 5.1 s ·
`@ci` skipped. Eleven boots were eliminated. The before figure for the file is derived from the
track's recorded baseline, because the old body was not re-run in this phase; the test-time total
above is measured, not projected.

## Parity table

20 originals → 9 tests. "Step" lists the `test.step` names that carry each original's work, in
order. Every assertion, fixed wait, screenshot diff, `clearMeadow`/fresh boot, poll and budget
survives unless the Notes column says otherwise.

### P3.T1 — boot and console health (one test)

| Old › behaviour | New test › steps | Notes |
|---|---|---|
| `app boots on a tablet with a clean console and zero external requests @smoke` — title, canvas, two toy slots, six train picks, three toots, 1000 ms settle, zero external requests, silent console | `app boots on a tablet with a clean console and zero external requests @smoke` › *the shell, the canvas and both rail slots appear*; *every train pick sticks and the whistle toots for each*; *nothing left the page and the console stayed silent* | Test unchanged in substance; only wrapped in steps. The request collector still spans the whole boot, so the zero-external claim covers the asset loads. `@smoke` kept. |

### P3.T2 — the build journey

| Old › behaviour | New test › steps | Notes |
|---|---|---|
| `drag-placing a track piece renders it in the world @smoke` — 1500 ms settle, screenshot before/after, drag the first `.piece-slot` to `(640,380)` in 10 steps, 600 ms, diff, zero external, silent console | `the build journey: drag-place, rotate, lift, trash and take back @smoke` › *drag a track piece out of the Rails tab onto the meadow* | Same drag, same target, same 600 ms, same `Buffer.compare`. The screenshot pair is now taken with the drawer already open on Rails (the original's `before` was pre-drawer), which makes the diff witness the drop rather than the panel. `@smoke` kept on the merged test. |
| `drag-placing scenery decorates the meadow` — Nature tab, scenery slot to `(640,380)`, 600 ms, diff, zero external, silent console | › *drag a tree from the Nature tab onto the meadow* | Verbatim; the drawer is closed first so the original's closed-drawer `before` precondition holds. |
| `a quick tap on a placed toy rotates it 90 degrees in place` — clearMeadow, straight at `(2,8)`, `cellToScreen`, tap, 400 ms, `rotation === 90` | › *a quick tap on a placed toy rotates it 90 degrees in place* | Verbatim. The dead `const placed = await page.evaluate(...); void placed;` is now a plain awaited evaluate — no assertion lost. |
| `lifting a placed toy shows a ✕ chip that deletes it on tap` — clearMeadow, straight, lift 20/20 in 4 steps, chip visible, chip tap, 400 ms, 0 pieces, 0 scenery | › *lifting a placed toy shows a ✕ chip that deletes it on tap* | Verbatim, including the un-released mouse press that the chip's click completes. |
| `drag-to-trash still deletes a lifted toy over the rail` — clearMeadow, straight at `(6,8)`, lift 16/16, travel to the trash centre in 10 steps, 400 ms, 0 pieces, 0 scenery | › *drag-to-trash deletes a lifted toy over the rail, and undo takes it back* | Verbatim. The brief's "and undoes" is the added tail: after the bin the `.undo-toggle` is visible, one tap hides it and returns the piece (`undo.spec.ts` proves the same contract). |
| `tabbed toybox walkthrough: place a critter and a station, then ride` — drawer hidden, Rails tab on first open, Nature 3 slots, Town panel + station, Critters 4 slots, drag a sheep and a station to `(2,2)`/`(13,13)`, both kinds placed, free 2×2 loop, ride 4000 ms, still riding, zero external, silent console | › *walk the toybox tabs, place a critter and a station, then ride* | Verbatim, and it runs last so nothing follows a live ride. The Rails-tab assertion needs a fresh page's default tab: the earlier step taps Rails before closing the drawer, and the drawer remembers its tab, so the reopened drawer is on Rails again (recorded as a deviation). `clearMeadow` stays at the step's start, exactly where the original had it. |

### P3.T3 — the persistence round trip

| Old › behaviour | New test › steps | Notes |
|---|---|---|
| `selected train survives a reload through local autosave` — `clearCookies`, ready, steam then tram with 100/300 ms, reload, 1200 ms, tram still pressed | `the chosen train, the chosen sound and the placed toys survive one reload @smoke` › *place a piece and a tree, choose tram over steam, and mute*; *reload once, after the autosave settles*; *the train, the mute and both toys came back* | The 100/300 ms train waits survive. The originals' three reloads become **one**; the post-reload settle takes the longest of the three (1500 ms, not the 1200 ms), so no wait is shortened. No console assertion exists in this original and none was invented for it — the merged console check belongs to the other two. |
| `track and scenery survive a reload through local autosave @smoke` — clearMeadow, straight `(2,7)` + tree `(3,7)` at 90, 500 ms, reload, 1500 ms, one piece and one scenery, silent console | same test › *place a piece and a tree, …*; *reload once, …*; *… both toys came back* | `clearMeadow` and both `'placed'` guards kept; `toHaveLength(1)` on pieces and scenery kept. `@smoke` kept on the merged test. |
| `the sound choice survives a reload through local autosave` — false → click → true, 400 ms, reload, 1500 ms, still true, silent console | same test › *… and mute*; *… the mute … came back* | The 400 ms settle is kept before the reload. |

### P3.T4 — parent gate, day and mute

| Old › behaviour | New test › steps | Notes |
|---|---|---|
| `the parent gate clears the world only after hold and confirm @smoke` — place + diesel, 400 ms, gate `aria-label`, 300 ms quick press, 2400 ms hold → /Confirm/, tap away dismisses, 2400 ms hold, forced tap, 400 ms, 0 pieces + steam, reload, 1500 ms, 0 pieces restored, zero external, silent console | `the parent gate clears the world only after hold and confirm, and the day and mute toggles answer @smoke` › *build a meadow and read the gate*; *a quick toddler press releases early and cancels silently*; *a tap anywhere else dismisses the armed confirm*; *hold, confirm, and the meadow returns to its factory default*; *the fresh empty world is what autosave keeps* | Every press length, label check and reload kept. The gate box is read once, after the 400 ms settle, at the same coordinates the original used. `@smoke` kept. |
| `ambient day/weather cycles keep the meadow alive with a clean console` — ready, 10 s idle, screenshot, 1500 ms, screenshot, diff, zero external, silent console | › *the idle meadow keeps drifting on its own* | 10 s idle and 1500 ms diff kept. It runs after the gate's reload, so the meadow is the factory default and no ride is live — the original's "no ride, no touches" precondition, restored by queuing it after the reset. |
| `the sound box mounts: toot, mute flip, silent console` — whistle visible + toot, mute false → true → false, silent console | › *the sound box mounts: a toot and a mute flip* | Verbatim; sound still starts on, so the first `aria-pressed="false"` check is unchanged. |
| — (no original) | › *the day toggle turns the page and previews the next phase* | The brief's "day toggle": the 🌙 button is tapped, the phase must change and the icon must preview the phase a tap brings (`moon` for noon/dusk), the same contract `sun-moon.spec.ts` owns. Added coverage, not a replacement. |

### P3.T4 continued — the lane's other tests

| Old › behaviour | New test › steps | Notes |
|---|---|---|
| `tablet emulation keeps an ambient frame rate with a clean console @ci` | same title, unchanged, `test.step` around the 5 s frame count | Stays a **separate** test: it is skipped locally, so folding it into a journey would skip that journey. `@ci`, the 90 s budget, the 2/10 fps floor and the skip keep their wording. |
| `cargo wagons ride along, survive a train switch and a reload` — loop `'placed'` guards, wagon poll, ride 2500 ms, two wagons, diesel switch, 800 ms, two wagons, reload, 4 pieces + diesel, wagon poll, zero external, silent console | `cargo wagons ride along, survive a train switch and a reload` › *build the corner loop and wait for both wagons to couple*; *mid-lap the whole little train is out there with two wagons*; *switching trains mid-ride keeps the new engine and its wagons*; *the world and the wagon set come back unchanged on reload*; *nothing left the page and the console stayed silent* | Same test, steps only — no shared fixture with the build journey (its own layout, its own reload, a mid-ride train switch), so it keeps its own boot. |
| `two disjoint loops ride two trains and the 🎥 button cycles them` — two loops, film toggle hidden, ride, `ridingTrainCount === 2`, film visible, four `filmedAnchor` reads | `two disjoint loops ride two trains and the 🎥 button cycles them` › *lay two disjoint corner loops and start the ride*; *each tap cycles the chase camera and wraps around*; *nothing left the page and the console stayed silent* | Same test, steps only. The camera cycle needs two disjoint loops, which no other journey has. |
| `steam puffs emit during rides, stop cleanly, and cover the fleet` — 60 s budget, loop, 700 ms, ride, puffs > 0, stop, puffs 0, six train taps at 300 ms | `steam puffs at the chimney: a whistle burst, a ride, and the whole fleet` › *the ride puffs, stops cleanly, and every engine takes a turn* | Same loop, same polls, same 300 ms fleet walk. The loop is already placed by the whistle step above it, so it is not rebuilt; the originals' separate fresh-page layout was identical. |
| `whistle toots puff steam at the chimney, then dissipate` — loop, 800 ms, toot, puffs > 0, puffs 0, silent console | same test › *a whistle burst puffs at the chimney, then dissipates* | Verbatim, and it runs **first** so the chug cannot be mistaken for the burst (the original's comment made the same point by tooting before the ride). |
| `riding a loop with a station stops at it and rolls on cleanly` — 1500 ms, clearMeadow, four corners + station `'placed'` guard, 800 ms, ride, 7000 ms, still riding, diff, zero external, silent console | `pressing play rides the track, and a loop with a station stops and rolls on @smoke` › *ride a loop with a station, stop at it and roll on cleanly* | Verbatim. |
| `pressing play rides the train along the placed track @smoke` — clearMeadow, two straights, 800 ms, ride, 2500 ms + 1200 ms diff, zero external, silent console | same test › *ride a two-piece straight line* | Verbatim. `@smoke` kept on the merged test. |

### Duplicate assertions kept once

The zero-external-request claim and the silent-console claim were asserted by 15 of the 20 originals
(each over its own page lifetime). They now run **once per merged test** over a longer lifetime —
a superset of the same window, so nothing that was once witnessed is now unwitnessed. This is the
only class of "kept once"; no behavioural assertion repeats across the twenty.

## Tag counts (as reported, not as projected)

| Count | Before | After |
|---|---|---|
| Unique tests, this file (tablet) | 20 | **9** |
| Runs, this file (tablet + phone) | 25 | **14** |
| `--grep @smoke` — runs | 19 | **19** |
| `--grep @smoke` — unique tests | 11 | **11** |
| `@smoke` in `smoke.spec.ts` | 5 | **5** |
| `--list` suite total | 105 (96 tablet / 8 phone / 1 prod) | **77** (68 tablet / 8 phone / 1 prod) |
| `--project=phone` | 8 in 3 files | **8 in 3 files** |

`--grep @smoke` reports **19 runs = 11 tablet + 8 phone**, and the eleven tablet rows are the eleven
unique `@smoke` tests FR-2 names. The phone project still lists 8 in 3 files: five come from
`smoke.spec.ts` because five `@smoke` tests live inside the allowlisted file, which is the AC-4
amendment, unchanged by this phase. Neither figure was adjusted to match the spec.

## Deviations

- `e2e/smoke.spec.ts` — the Rails-tab precondition of the tabbed walkthrough. That original opened a
  fresh page, so its first drawer open was on Rails; merged, earlier steps had left the drawer on
  Nature. The rotate step taps Rails and closes the drawer, and the drawer remembers its tab, so the
  walkthrough's `aria-pressed="true"` on Rails holds. Same assertion, restored precondition.
- `e2e/smoke.spec.ts` — between the two ride journeys the merged test stops the ride before laying
  the second layout, and the puffs test reuses the whistle step's loop instead of rebuilding it. Both
  originals built on a fresh, idle page; a live ride refuses builds, so stopping (or reusing) restores
  that precondition. No wait was shortened.
- `e2e/smoke.spec.ts` — added a `.day-toggle` step (tap, phase must change, icon previews the next
  phase) as P3.T4 asks; `smoke.spec.ts` had no day-toggle assertion before. Added coverage.
- `e2e/smoke.spec.ts` — the undo tail on the trash step (visible → tap → hidden → piece back) is also
  new to this file; the contract is `undo.spec.ts`'s, and it is the brief's "and undoes".
- `e2e/smoke.spec.ts` — budgets are the sum of the folded parts: build journey 180 s (6 × 30 s),
  ride/station 90 s (2 × 30 s), puffs 90 s (60 + 30), persistence 90 s (3 × 30 s), parent gate 90 s
  (3 × 30 s). Single-test budgets (90 s `@ci`, no budget on cargo or the camera) are unchanged.
- File header comment added describing the nine-test layout. No test body was deleted.

## After this phase

Suite-wide `--list` is 77 runs (68 tablet / 8 phone / 1 prod) - down from 105 at Phase 2's close by
this file's eleven tablet runs. The 11 `@smoke` runs, the 8 phone runs and the 883 unit tests all hold.

## Primary verification

Performed by the primary agent on the reported head.

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome clean, `tsc` clean, 50 files / **883 tests** |
| This spec | `playwright test e2e/smoke.spec.ts` | **13 passed, 1 skipped in 1.79 min**, exit 0 |
| Runs | `--list` / `--phone` / `--grep @smoke` | **77** in 21 files · **8** in 3 files · **19** runs (11 tablet + 8 phone) |
| Test count in file | source count | **9** `test(` blocks, 5 tagged `@smoke`, the `@ci` canary separate |

The spec went from 20 tests and ~172 s of tablet time to 9 tests and one 1.79-minute run across both
profiles, so the file also stopped paying 20 boots and 20 `waitForReady` settles.

**Assertion audit.** `expect(` fell from 101 to 94 and `waitForTimeout` from 49 to 40, so I traced both.
The wait drop is boot removal (fewer `goto` + settle pairs). The assertion drop is one class only: the
per-test `external requests` + `console errors` pair is now asserted once per merged journey over a
window that covers every step, instead of once per old test — a dedup, not a loss, and the boot test
still checks both across the whole session. Distinctive assertions were then spot-checked in the new
file and all present: `fpsFloor`, `filmedAnchor()` null-then-wrap, `starting` non-null, `toys.map` (2),
`restored.pieces` (2), `active > 0` (2), `.delete-chip` (2), `toBe(4)`. The old idle-ambience test's
10 s + 1.5 s screenshot comparison survives verbatim inside "the idle meadow keeps drifting on its own".

**Judgement worth naming.** The subagent added two assertions that no original had (a `.day-toggle`
phase-advance check and an undo tail on the trash step). Both assert real behaviour and are recorded
rather than removed; a merge that adds a witness is not a scope violation when the alternative is
merging two behaviours without proving either.

**Diff review.** `dabe90e..HEAD` is two files: `e2e/smoke.spec.ts` and this evidence file. `helpers.ts`,
the config and every other spec are untouched, and no tag moved off a test that carries smoke
behaviour — FR-2's eleven still holds.
