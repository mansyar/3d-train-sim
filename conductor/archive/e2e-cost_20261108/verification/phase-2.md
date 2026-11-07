# Phase 2 verification — mechanical clusters

Track: `e2e-cost_20261108` · branch `refactor/e2e-cost_20261108`
Scope: FR-4, FR-5, FR-12 · plan Phase 2 (P2.T1–P2.T5)

## Status

Merges, `test.step` naming, the pre-deletion run and `pnpm check` are **verified**.
The five sibling deletions and the post-deletion Playwright run are **blocked**: the
sandbox denies `git rm` (see Blockers). The working tree still contains the five
merged-away files; the reduced command and the expected 79-run total are recorded below
for the primary to complete with `git rm`.

## Commands and exit codes

| # | Command | Exit | Output |
|---|---------|------|--------|
| 1 | `pnpm check` | 0 | biome 184 files clean; `tsc --noEmit` clean; vitest **883 passed** (50 files) |
| 2 | `pnpm exec playwright test e2e/switches.spec.ts e2e/switch-3way.spec.ts e2e/switch-slip.spec.ts e2e/switch-mirror.spec.ts e2e/hills.spec.ts e2e/hills-phase2.spec.ts e2e/river.spec.ts e2e/river-life.spec.ts e2e/cargo.spec.ts e2e/wagon-workshop.spec.ts e2e/tunnel.spec.ts e2e/crossing-gate.spec.ts` | 0 | **27 passed (4.6m)**, 2 workers, tablet project (phone/prod match nothing here) |
| 3 | `pnpm exec playwright test --list e2e/switches.spec.ts e2e/hills.spec.ts e2e/river.spec.ts e2e/cargo.spec.ts e2e/tunnel.spec.ts e2e/crossing-gate.spec.ts` | 0 | `Total: 12 tests in 6 files` |
| 4 | post-deletion form (below) | — | **not run** — blocked on `git rm` |

Post-deletion command (to run once the five files are removed):

```
pnpm exec playwright test e2e/switches.spec.ts e2e/hills.spec.ts e2e/river.spec.ts e2e/cargo.spec.ts e2e/tunnel.spec.ts e2e/crossing-gate.spec.ts
```

Run 2 is the pre-deletion form required by the brief; it saw 27 tests because
`tunnel.spec.ts` and `crossing-gate.spec.ts` had already been collapsed during this phase
(29 originals − 2 = 27). Every original from the ten still-present files also ran and
passed in that command.

## Final counts per file

| File | Before | After |
|------|--------|-------|
| `e2e/switches.spec.ts` (+ 3 siblings) | 10 (2+3+3+2) | **3** |
| `e2e/hills.spec.ts` (+ `hills-phase2`) | 5 (2+3) | **2** |
| `e2e/river.spec.ts` (+ `river-life`) | 6 (4+2) | **2** |
| `e2e/cargo.spec.ts` (+ `wagon-workshop`) | 4 (2+2) | **3** |
| `e2e/tunnel.spec.ts` | 2 | **1** |
| `e2e/crossing-gate.spec.ts` | 2 | **1** |
| **Touched files total** | **29** | **12** |

`playwright test --list` totals: **before 96 tablet runs** (phase 1 baseline); after the
five deletions **79 tablet runs** (96 − 17 = 79; the 17 removed = 29 − 12). The verified
after-figure is `12 tests in 6 files` for the touched files; the suite-wide 79 requires
the deletions.

## Parity table

29 original tests. "Step" lists the `test.step` names cover each original's work, in
order; every assertion, fixed wait, screenshot diff, `clearMeadow`/fresh boot, poll and
timeout survives unless the Notes column says otherwise.

### P2.T1 — switches (commits `d265f4b`)

| Old file › old test | New file › new test › steps | Notes |
|---|---|---|
| `switches.spec.ts` › a placed switch loads its GLB and the train rides both branches cleanly | `switches.spec.ts` › every switch kind rides every road › *place a Y switch*; *ride both Y roads with the blades and lever following* | GLB wait, riding checks, 12 s ride, screenshot diff, fetched `.glb` check, external/console all kept. The ride's time is covered by the sampled loop plus `expectSceneChanging` instead of a fixed 12 s at the top. Both roads are now witnessed through `switchPose` as well as mux. |
| `switches.spec.ts` › a Y switch layout survives a reload | › a switch layout re-parks at neutral after a reload › *reload a Y switch layout* | 800 ms settle, 5 s ride, reload, 3 pieces, console — identical. |
| `switch-3way.spec.ts` › a placed three-way rides all three roads with its blades and lever following | › every switch kind rides every road › *place a three-way switch*; *ride all three roads with the blades and lever following* | Original 240 s budget is now the 600 s merged test budget. Blade keys `0.000/-0.210/0.210`, lever-non-null, per-road pairing, screenshot diff, fetched GLB, external/console all kept. |
| `switch-3way.spec.ts` › reduced motion: the scene holds still and the points stay parked at neutral | › a switch under reduced motion still selects the road › *boot the meadow under reduced motion*; *place a three-way and hold it at the parked neutral pose* | `emulateMedia` before load, 12 × 300 ms neutral samples, still riding, console — identical. |
| `switch-3way.spec.ts` › a three-way layout survives a reload and re-parks at neutral | › a switch layout re-parks at neutral after a reload › *reload a three-way and re-park it at neutral* | 15 s `expect.poll` for the re-attached piece, `1e-6` neutral checks, console — identical. |
| `switch-slip.spec.ts` › a placed double slip rides all three roads with its entry blades and lever following | › every switch kind rides every road › *place a double slip*; *ride all three slip roads with the entry blades and lever following* | 15 s poll, per-entry parked asserts, 320-iteration 400 ms loop, canonical blade/lever keys with the two miss-set error messages, screenshot diff, fetched GLB, external/console — identical. |
| `switch-slip.spec.ts` › reduced motion: the scene holds still and the points stay parked at neutral | › a switch under reduced motion still selects the road › *place a double slip under the same frozen scene*; *every slip entry sits exactly on a pose-table value* | Not a duplicate of the 3-way reduced-motion case: this one asserts the per-entry blade groups and the shared lever to `1e-9`, the 3-way one asserts a single blade/lever pair. Both kept, once each. |
| `switch-slip.spec.ts` › a double-slip layout survives a reload and re-parks at neutral | › a switch layout re-parks at neutral after a reload › *reload a double slip and re-park it at neutral* | 800 ms + 5 s ride, 1 piece, 15 s poll, `1e-6` neutral, console — identical. |
| `switch-mirror.spec.ts` › a placed mirror switch loads its GLB and the train rides both branches cleanly | › every switch kind rides every road › *place a mirrored Y switch*; *ride both mirrored Y roads with the blades and lever following* | Mirror poses `0.000`/`+0.210` with lever `0`/`+π/2` added as the per-road witness; 12 s ride replaced by sampling + `expectSceneChanging`; GLB/external/console kept. |
| `switch-mirror.spec.ts` › a mirrored Y layout survives a reload | › a switch layout re-parks at neutral after a reload › *reload a mirrored Y layout* | Identical setup and assertions. |

Duplicate removals (not losses): the two "reduced motion" originals in `switch-3way` and
`switch-slip` shared a name but not a subject (one piece vs per-entry blade groups), so
both assertion sets live once each in the merged reduced-motion test. No other pair
asserted the same thing; the four reload tests were the same shape but for four different
pieces, so each keeps its own step.

Extra coverage added by the merge (not a replacement): a plain straight-line control ride
and a parked-neutral `switchPose` before each ride, which is the "before/after" that shows
the blades and lever move rather than teleport.

### P2.T2 — hills (commit `3a3f415`)

| Old file › old test | New file › new test › steps | Notes |
|---|---|---|
| `hills.spec.ts` › a placed hill run loads its GLBs and the train rides over the crest cleanly | `hills.spec.ts` › the hill run climbs, crests, descends, and survives a reload › *place the hill run on dry land*; *ride over the crest* | Both GLB waits, 6 s ride, screenshot diff, external/console — identical. |
| `hills.spec.ts` › a hill run survives a reload | › the hill run climbs, crests, descends, and survives a reload › *place a graded run flanked by straights*; *ride the graded run*; *reload and keep all five pieces* | 800 ms settle, 5 s ride, 5 pieces, console — identical. Ride is stopped between journeys so the rebuild cannot race a live ride (the originals rebuilt on fresh pages). |
| `hills-phase2.spec.ts` › the bump run loads its GLBs and rides up and over cleanly | › the phase-2 shapes ride and survive a reload › *boot the meadow*; *place the bump run and load its three GLBs*; *ride up and over the bumps* | Three GLB waits, 8 s ride, screenshot diff, console — identical. |
| `hills-phase2.spec.ts` › the elevated corner run loads its GLBs and banks through cleanly | › the phase-2 shapes ride and survive a reload › *place the banked corner run and load its GLB*; *bank through the corner* | Corner layout with rotation 90, GLB wait, 6 s ride, screenshot diff, console — identical. |
| `hills-phase2.spec.ts` › phase-2 pieces survive a reload | › the phase-2 shapes ride and survive a reload › *place the mixed phase-2 layout*; *reload and keep all six pieces* | 6-piece mixed layout, 800 ms settle, reload, 6 pieces, console — identical. |

### P2.T3 — river and river life (commit `4feff15`)

| Old file › old test | New file › new test › steps | Notes |
|---|---|---|
| `river.spec.ts` › a bridge places on water, rejects grass and land toys, and renders the trestle | `river.spec.ts` › the water refuses land toys and the trestle carries the train › *boot the meadow*; *refuse a bridge on grass and toys on water*; *place the bridge and render the trestle* | Three rejection results, before/after screenshots at `(8,8)` rot 90, local/clean — identical. |
| `river.spec.ts` › a pre-river v1 save loads water-crossing straights as bridges — nothing lost | › the water refuses land toys and the trestle carries the train › *migrate a pre-river v1 save* | `clearWorldStorage`, v1 seed, two reloads with 1000 ms waits, piece/scenery maps, local/clean — identical. |
| `river.spec.ts` › a train rides straight across the trestle bridges over the river | › the water refuses land toys and the trestle carries the train › *ride straight across the trestle bridges* | 7-piece row-8 plan, all `placed`, ride, 2500 ms, screenshot diff, local/clean — identical. Adds `clearMeadow` first so the migrated save from the previous step cannot leak into this ride. |
| `river.spec.ts` › the river meadow idles clean — living water, silent console, no external requests | `river.spec.ts` › the river lives: the frog floats, the barge drifts, and a ride stays clean › *let the river meadow idle clean* | 2000 ms settle, 10 s idle, 1500 ms screenshot diff, local/clean — identical. Runs first, on the fresh boot. |
| `river-life.spec.ts` › the frog floats on water, sits on land, and its GLB loads | › the river lives: … › *float the frog on water, sit it on land, and load its GLB* | Tree on water refused, two frogs placed, scenery order, `frog.glb` wait, `barge.glb` resource check, screenshot diff, console — identical. |
| `river-life.spec.ts` › a ride with a water frog, a land frog, and the barge aboard stays clean | › the river lives: … › *ride with a water frog, a land frog, and the barge aboard* | 4-corner loop with two frogs, ride, 8 s, still riding, external/console — identical. |

### P2.T4 — cargo and the wagon workshop (commit `0c85063`)

| Old file › old test | New file › new test › steps | Notes |
|---|---|---|
| `cargo.spec.ts` › wagons load, deliver, and the station keeps the count across a reload | `cargo.spec.ts` › wagons load, deliver, keep the count across a reload, and nothing with no station › *boot and build the station loop*; *ride until the first delivery lands*; *reload and keep the station crate* | 1200 ms boot, crate GLB wait, 8 s ride, 90 s / 1 s delivery poll, restored count equality, external/console — identical. Budget raised 150 s → 180 s for the folded station-less ride. |
| `cargo.spec.ts` › a train with no station never shows cargo and rides exactly as before | › wagons load, deliver, keep the count across a reload, and nothing with no station › *ride a line with no station and count nothing* | 4-corner line, 7 s ride, scenery length 0, console — identical. |
| `wagon-workshop.spec.ts` › per-train presets ride, deliver cargo, and survive a reload | `cargo.spec.ts` › per-train presets ride, deliver cargo, and survive a reload › *boot and build the cargo loop*; *dress steam in coal and diesel in tank*; *ride until the coal pair delivers*; *reload and restore every train choice* | All UI taps/`aria-pressed` checks, `consistAll` triple, 90 s / 2 s delivery poll, `consistOf` steam, phase-1 console check **before** the reload, `consoleErrors.length = 0` after it, phase-2 console check, external — identical. 180 s budget kept. |
| `wagon-workshop.spec.ts` › the chosen pair rides a switch shuttle without a ripple | `cargo.spec.ts` › the chosen pair rides a switch shuttle without a ripple › *boot and place the switch shuttle*; *dress the chosen pair in containers*; *ride a full alternating cycle without a ripple* | Container tap/`aria-pressed`, 12 s + 1.2 s screenshot pair, `consistOf` steam, external/console — identical. 90 s budget kept. |

### P2.T5 — tunnel and crossing gate (commit `bd2ef1d`)

| Old file › old test | New file › new test › steps | Notes |
|---|---|---|
| `tunnel.spec.ts` › a placed tunnel loads its GLB and the train rides through it cleanly | `tunnel.spec.ts` › a run of tunnels rides as one hill and survives a reload › *place a single tunnel and ride through it* | Folds in as a step: `tunnel.glb` wait, whistle toot, 6 s ride, screenshot diff, external/console — identical. |
| `tunnel.spec.ts` › a run of tunnels rides as one hill and survives a reload | › *place a three-tunnel run flanked by straights*; *ride the long hill*; *reload and keep all five pieces* | 800 ms settle, 5 s ride, 5 pieces, console — identical. Budget 120 s covers both journeys. |
| `crossing-gate.spec.ts` › the crossing places from the Rails tab and refuses water | `crossing-gate.spec.ts` › the crossing places from the Rails tab, refuses water, and a pass lifts the gates › *place the gate from the Rails tab and refuse water* | Rails-tab `aria-pressed`, slot visible, drag from slot to `(3,3)`, 600 ms, one piece at `(3,3)`, `(8,8)` → `'water'`, console — identical. |
| `crossing-gate.spec.ts` › the train approach closes the gates, rings the bell, and the pass lifts them | › *build a straight line through the crossing*; *the approach closes the gates and rings the bell*; *the pass lifts them and the ride keeps rolling*; *reload and keep the crossing* | `crossing-gate.glb` wait, 800 ms, 30 s phase wake, 10 s bell true, 30 s all-idle, 10 s bell false, still riding, 7 pieces incl. one gate, external/console — identical. Budget 120 s → 180 s for the folded placement journey. |

## Deviations

- `git rm` for the five merged-away files is denied by the sandbox; the deletions and the
  post-deletion run are reported as blockers instead of being worked around.
- `e2e/river.spec.ts`: added `clearMeadow(page)` before the trestle ride step. Without it
  the v1-migration world from the previous step (bridge at `(8,8)`) would collide with the
  fixed row-8 plan. The originals always started that layout on a fresh page, so this
  restores the same precondition rather than changing an assertion.
- `e2e/cargo.spec.ts`: the first merged test's budget is 180 s (150 s original + the
  30 s default of the folded station-less test), per the "sum of its parts" rule.
- `e2e/crossing-gate.spec.ts`: budget 180 s (the 120 s origin plus the folded placement
  journey's default 30 s with headroom).
- `e2e/hills.spec.ts`: no snow-crown assertion exists in the originals (the crowns are
  separate GLBs but no e2e spec ever asserted them), so the brief's "snow crowns" phrase is
  covered only by the existing hill GLB waits; none were invented.
- The brief asks to assert `switchPose`/`switchRoad` per road. There is no public
  `switchRoad` scene probe (`ride-motion` keeps `switchRoads` internal), so the per-road
  witness uses `switchPose` (blade + lever pairing) for every road; the brief's "wet the
  levers" is read as "watch the levers" and is covered by the parked-neutral pose before
  the ride plus the off-neutral samples afterwards.

## Blockers

`git rm` is denied for this agent. Needed (one commit per task, after the merge commits,
which are already on the branch):

```
git rm e2e/switch-3way.spec.ts e2e/switch-slip.spec.ts e2e/switch-mirror.spec.ts
git rm e2e/hills-phase2.spec.ts
git rm e2e/river-life.spec.ts
git rm e2e/wagon-workshop.spec.ts
```

then run the post-deletion command above and write its exit code here.

## Primary verification

Performed by the primary agent. The subagent could not run `git rm`, so the six deletions and the
post-deletion run were done here.

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — Biome 184 files, `tsc` clean, 50 files / **883 tests** |
| Runs before | `playwright test --list` | **105** total · 96 tablet · 8 phone · 1 prod |
| Runs after | `playwright test --list` | **88** total · **79 tablet** (96 − 17) · 8 phone · 1 prod — exactly the plan's arithmetic |
| Consolidated files | `playwright test` on the six survivors | **12 passed in 3.3 min**, exit 0 (was 29 tests across 12 files) |

**Parity challenged, not trusted.** A raw `expect(` count across the twelve originals (153) versus the
six survivors (149) looked like four lost assertions, so each was traced:

- `hills`: the three `.ride-toggle` `is-riding` checks and the two `consoleErrors` arrays now run
  through the local `expectClean` helper and an `is-riding` check per journey — all five are present
  (5 `is-riding` assertions, 5 `expectClean` calls), and `expect(restored).toBe(5)` survives as
  `expect(await pieceCount(page)).toBe(5)`.
- `cargo`: the older `expect(restored ?? 0).toBe(count ?? -1)` form became
  `expect(await deliveryCount(page, stationId)).toBe(count)` after the reload, which is the same claim
  through the current probe; `totals === 0` and both console checks are present.
- `river`: every migration assertion (`migrated.pieces`, `migrated.scenery`), every `Buffer.compare`
  screenshot-difference check and all water-result checks are present verbatim.
- `switches`: assertions **increased** from 68 to 74, because each ride now also witnesses `switchPose`
  before and after.

So the count delta is helper encapsulation and re-expression, not loss. This is what the AC-7 ledger
has to survive, and it did.

Two substitutions worth naming because they are judgement, not mechanics: the two 12-second fixed
rides became sampled loops plus `expectSceneChanging` (stronger — it asserts motion rather than
duration), and `switch-road` could not be read directly because `ride-motion` keeps its switch roads
internal, so per-road witnessing uses blade/lever pose pairing instead. Both are recorded in the
parity table above.

**Deletion discipline.** `git rm` removed the six replaced files in a single commit *after* the
consolidated files had passed, and `--list` was re-read afterwards to prove the reduced totals. No file
that is still referenced survives as a dangling path: `e2e/README.md` names no individual spec, and the
CI job runs the directory, so nothing had to be repointed.

**Diff review.** `5aea6e2..HEAD` is thirteen files: twelve spec files and the evidence. `hill-pace`,
`smoke` and every file outside Touches are untouched. Every merged test names its steps and keeps its
console-error guard.
