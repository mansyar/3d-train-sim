# Phase 4 verification — new modules

Track: `e2e-cost_20261108` · branch `refactor/e2e-cost_20261108`
Scope: FR-4, FR-5, FR-12 · plan Phase 4 (P4.T1–P4.T5)

## Status

**Verified.** The eight touched files carry 38 originals in 19 tests, both verification
commands exit 0, and every removed assertion is either carried into a named `test.step` or
paired below with the unit test that proves it. One merge target moved the witness of an
undo (see P4.T4 notes); no wait was shortened, no poll widened, no budget lowered.

## Commands and exit codes

| # | Command | Exit | Output |
|---|---------|------|--------|
| 1 | `pnpm check` | 0 | biome 178 files clean, `tsc --noEmit` clean, vitest **883 passed** (50 files) |
| 2 | `pnpm exec playwright test e2e/world-portability.spec.ts e2e/save-recovery.spec.ts e2e/runtime-guarantees.spec.ts e2e/starter-railway.spec.ts e2e/park-spot.spec.ts e2e/delight-toys.spec.ts e2e/sun-moon.spec.ts e2e/ride-toybox-flow.spec.ts` | 0 | **20 passed (2.4m)**, 2 workers — 19 tablet runs + 1 phone run (`ride-toybox-flow` `@smoke`) |
| 3 | `pnpm exec playwright test --list` | 0 | `Total: 57 tests in 21 files` (tablet 49, phone 7, prod 1 → **50 unique**) |
| 4 | `pnpm exec playwright test --list --grep "@smoke"` | 0 | `Total: 17 tests in 6 files` (tablet 10, phone 7 → **10 unique** `@smoke` tests) |
| 5 | `pnpm exec playwright test --list --project=phone` | 0 | `Total: 7 tests in 3 files` |

Before (same five commands, before any Phase-4 edit):

| Measure | Before | After |
|---|---|---|
| runs (`--list` total) | 77 (tablet 68 + phone 8 + prod 1) | **57** (tablet 49 + phone 7 + prod 1) |
| unique tests | 69 (tablet 68 + prod 1) | **50** |
| `@smoke` runs (`--list --grep "@smoke"`) | 19 (tablet 11 + phone 8) | **17** (tablet 10 + phone 7) |
| `@smoke` unique tests | 11 | **10** |
| phone runs (`--list --project=phone`) | 8 in 3 files | **7** in 3 files |

Run 2 of the earlier (pre-fix) suite was red once: `starter-railway` asserted the undo
target of a pristine oval, but in the merged journey the reload before it had restored
`station-village`. The assertion now names the build the undo actually restores
(`14/5`), and the pristine-oval undo is witnessed by the same test's first step. Fixed and
re-run: 20 passed on both the fix run and the final run in the table above.

### `@smoke` and phone deltas, as measured

The `@smoke` set shrank by one unique test because `ride-toybox-flow.spec.ts`'s **two**
tagged tests are now one tagged test with both behaviours as steps (the brief's "only if
both survive as steps"). The merged test keeps the tag and keeps running on the phone:

- `@smoke`: 11 → **10** unique (17 runs across tablet + phone).
- phone: 8 → **7** runs, still only `smoke.spec.ts`, `phone-shell.spec.ts` and
  `ride-toybox-flow.spec.ts`.

This is the measured result, not a tuned one: FR-2's "eleven" and AC-4's amended "8 phone
runs" now read 10 and 7 and need the primary's reconciliation.

## Final counts per file

| File | Before | After |
|------|--------|-------|
| `e2e/world-portability.spec.ts` | 12 | **5** |
| `e2e/save-recovery.spec.ts` | 6 | **2** |
| `e2e/runtime-guarantees.spec.ts` | 5 | **4** |
| `e2e/starter-railway.spec.ts` | 4 | **2** |
| `e2e/park-spot.spec.ts` | 4 | **2** |
| `e2e/delight-toys.spec.ts` | 2 | **1** |
| `e2e/sun-moon.spec.ts` | 2 | **1** |
| `e2e/ride-toybox-flow.spec.ts` | 3 | **2** |
| **Touched total** | **38** | **19** |

## Budgets (sum of the parts, nothing lowered)

| Merged test | Originals folded in | Sum |
|---|---|---|
| portability › a saved meadow stays out of reach… | #2 (60 s) + #3 (90 s) | 150 s |
| portability › an empty meadow is a world… | #4 (60 s) + #5 (60 s) | 120 s |
| portability › save and load stay out of reach until the hold… | #1 (120 s) + #7 (90 s) + #8 (60 s) | 270 s |
| portability › undo puts the pre-import meadow back | #10 (60 s) | 60 s |
| portability › importing mid-ride stops the train… | #11 (90 s) + #12 (90 s) | 180 s |
| recovery › a boot salvages… `@smoke` | #1 (120 s) + #5 (60 s) | 180 s |
| recovery › a boot restores the last good save… | #2 (60 s) + `world-portability` #9 (120 s) | 180 s |
| guarantees › the preview and dev servers… | #1 (120 s) + #2 (30 s default) | 150 s |
| starter-railway › fresh boot shows the cozy oval… | #1 (30 s) + #2 (150 s) | 180 s |
| starter-railway › presets round-trip… | #3 (120 s) + #4 (150 s) | 270 s |
| park-spot › fresh boot parks the opener… | #1 (30 s) + #2 (30 s) | 60 s |
| park-spot › every gallery starter… | #4 (150 s) + #3 (30 s) | 180 s |
| delight-toys › the three delight toys… | #1 (90 s) + #2 (30 s) | 120 s |
| sun-moon › the sun/moon button… | #1 (60 s) + #2 (60 s) | 120 s |
| ride-toybox-flow › riding hides the build tools… | #1 (30 s) + #2 (30 s) | 60 s |

One boot per merged test: every `goto` except the ones the originals already had inside a
journey (each gallery reload, the recovery reloads, the sun-moon reloads) is gone. No
merged test navigates between steps.

## Parity table

38 originals, one row each. "Steps" lists the `test.step` names in the merged test; every
assertion, fixed wait, poll, screenshot diff and console/external check survives unless the
Dropped table below says otherwise.

### P4.T1 — `world-portability.spec.ts` (12 → 5)

| Old test | New test › steps | Notes |
|---|---|---|
| save and load stay out of reach until the parent gate is held | save and load stay out of reach until the hold, and a refusal is reported, not trusted › *neither the tray nor either file control is on screen*; *the two-second hold is the only door to the file controls* | All three hidden pre-hold, the hold, tray visible, accessible name `Parent controls`, both file controls visible — identical. Console at the end of the merged test. |
| saving writes the starter meadow as a dated v3 file | a saved meadow stays out of reach, saves, and re-imports byte for byte `@smoke` › *the export is a dated v3 world file with no device preferences*; *the Save control downloads exactly those bytes* | Name regex `^tiny-tracks-\d{4}-\d{2}-\d{2}\.json$`, version 3, arrays, no `preferences`, ids match the live meadow, `download` event + `.portable-export` click, `suggestedFilename`, downloaded bytes === exported JSON, `Saved <name>` note — identical. |
| a saved meadow re-imports byte for byte `@smoke` | same merged test › *clearing the meadow empties it*; *re-importing the file is lossless, byte for byte* | `@smoke` moved onto the merged test. `captured.pieces.length > 0`, empty after clear, import, `Loaded the meadow.`, pieces/scenery via `toyShapeOf`, second export === first — identical. |
| a salvaged file keeps its valid toys and names the broken one | an empty meadow is a world, and a salvage keeps its toys and names the broken one › *one unknown toy is skipped, named, and the rest lands* | Starter export + `not-a-toy` at 7,7, clear, import, exact note `Loaded the meadow. Skipped 1 broken toy.`, surviving ids and scenery — identical. |
| an empty meadow saves and re-imports empty | same merged test › *an empty meadow exports and re-imports empty* | Empty export, empty import, `{piece: [], scenery: []}`, `.ride-toggle` disabled — identical. |
| an oversized file is refused and changes nothing | — | **Dropped** — witness in Dropped table. |
| unreadable files are refused and changes nothing | save and load stay out of reach until the hold… › *an unreadable file is refused and changes nothing* | Malformed JSON refused, exact note, export unchanged — identical. The version-99 and `[]` permutations are dropped with witnesses. |
| a refusal after the tray is dismissed stays visible | same merged test › *a rail tap dismisses the armed tray*; *re-arming opens the tray with no stale note*; *a refusal after the dismissal reopens the tray report-only* | Dismissal, import while the tray is shut, tray back with `is-reporting`, note visible with the refusal text, controls hidden, world unchanged — identical (the re-arm/blank-note assertion is staged before the second refusal). |
| a refusal replaces the recovery note, and re-arming restores it | `save-recovery.spec.ts` › a boot restores the last good save, and a refusal replaces the note it writes › *a refusal replaces the note, and re-arming restores it* | **Moved, not dropped** — the original was already a restored boot; it now lives with the restored boot it duplicates instead of paying a second one. Same seeding (`current: 'garbage'`, previous = piece-10/11), refusal replaces the note, `.mute-toggle` closes the tray, re-arm restores `Your meadow was restored from the last good save.`, export unchanged. |
| undo puts the pre-import meadow back | undo puts the pre-import meadow back › *an import lands as one undoable change*; *one take-back restores the meadow that was there* | Import, ids `piece-1`/`piece-2`, undo visible + click, starter ids back — identical. |
| importing mid-ride stops the train before the meadow changes | importing mid-ride stops the train before the meadow changes, even for the same meadow › *a different meadow lands only after the ride has stopped* | Ride, `is-riding` (15 s), `Stop the train`, tray mid-ride, import, note, stopped, `Ride the train`, ids `piece-1`/`piece-2` — identical. |
| importing the very same meadow still stops the ride explicitly | same merged test › *the very same meadow still stops the ride explicitly* | Ride again, import the same bytes, stopped, both aria-labels, export === the imported JSON — identical. New action added: the report-only tray left by the first step is dismissed with a meadow tap before the second ride, so the ride control is actually clickable. |

### P4.T2 — `save-recovery.spec.ts` (6 → 2)

| Old test | New test › steps | Notes |
|---|---|---|
| a boot salvages the corrupt snapshot and keeps every valid piece `@smoke` | a boot salvages the corrupt snapshot, keeps every valid piece and tells a grown-up `@smoke` › *only the three readable toys survive the salvage* | Seeding after `waitForStoredCurrent`, `clearSlots`, `writeSlots`, reload, ids `piece-1/2/3` — identical; tag kept. |
| the salvage notice shows once and its dismissal lasts the session | same merged test › *the gate reports the salvage with an exact singular count*; *the dismissal lasts the session, and the tray still arms* | Exact singular text, `.recovery-dismiss` → hidden, tap outside → tray hidden + gate label back, re-arm → tray visible + note still hidden — identical. |
| a boot restores the previous save when current is unreadable | a boot restores the last good save, and a refusal replaces the note it writes › *the backup world comes back whole*; *the restored status is only visible to a grown-up* | `current: 'garbage'`, previous piece-10/11, ids, gate, restored line — identical. |
| a boot ignores an empty salvage and restores the previous save | — | **Dropped** — witness in Dropped table. |
| a duplicate-only salvage still tells a grown-up | — | **Dropped** — witness in Dropped table. |
| both unreadable slots seed the starter meadow without a console error | — | **Dropped** — witness in Dropped table. |

### P4.T3 — `runtime-guarantees.spec.ts` (5 → 4)

| Old test | New test › steps | Notes |
|---|---|---|
| the preview server sends the full policy on every asset class | the preview and dev servers send the full policy, relaxing only style-src in dev › *the preview document carries the policy*; *every asset class carries the same policy* | Document policy, `/sw.js` 200 + manifest, hashed script/`.glb`/`.woff2` each 200 + full policy, `no-cache` on `/index.html`, `/sw.js` and the hashed script (with the nginx-only comment) — identical. |
| the dev server sends the same policy, with only style-src relaxed | same merged test › *the dev server relaxes exactly one directive, style-src* | 200, CSP === `securityHeadersFor({ dev: true })`, nosniff, no-referrer, equal directive count, exactly one widened, it is `style-src` — identical. |
| the meadow boots, places a toy and rides with the network off `@smoke` | unchanged | Still `@smoke`, still Chromium, still separate. |
| nothing leaves the app origin during boot, placement and ride | unchanged | Chromium; offline ride preserved. |
| an injected inline script is refused while the app bundle runs | unchanged | Still separate and on Chromium; the CSP refusal needs the strict policy, not a merged journey. |

The file-level `test.use({ browserName: 'chromium' })` still applies to all four tests, so
the offline ride and the CSP refusal remain separate witnesses.

### P4.T4 — galleries (8 → 4 together)

| Old test | New test › steps | Notes |
|---|---|---|
| starter-railway › fresh boot shows the cozy oval and rides with a clean console | starter-railway › fresh boot shows the cozy oval and rides, and each gallery preset applies and rides › *the fresh meadow is the cozy oval*; *the seeded oval rides*; *the boot stayed silent* | DB wipe + reload boot, counts `{pieces: 10, scenery: 4}`, ride, error list cleared after the boot's reload (`errors.length = 0`), console [] once; the external-request list is asserted once at the end of the merged journey over a superset window (constraint 5). |
| starter-railway › each gallery preset applies behind the gate and rides | same merged test › *each gallery preset applies behind the gate and rides* | All four presets with their counts (10/4, 14/5, 18/2, 17/3), 2.5 s settle, undo visible, ride each — identical. |
| starter-railway › apply, undo, reload, reset round-trip | starter-railway › presets round-trip through undo and reload, and the dressed train survives with them › *a preset applies over the seeded oval and one ↩️ takes it back*; *the applied world persists across a reload*; *the parent gate reset still clears to an empty meadow* | Seeded 10/4, village 14/5, undo 10/4, re-apply, reload + settle, 14/5, armed gate click, 0/0 — identical. |
| starter-railway › gallery apply preserves the train and wagon picks across undo and reload | same merged test › *a gallery apply preserves the dressed train across undo*; *the junction and its dressed diesel persist across a reload* | Diesel + coal `aria-pressed`, hilltop 17/3, dressed diesel/coal, undo, dressed again, re-apply, reload, 17/3 + dressed — identical **except** the undo now names the build the reload restored (`14/5`, `station-village`) instead of the pristine oval; the pristine-oval undo is asserted by the first step of the same test, so the behaviour "one ↩️ takes back the apply" keeps its witness. |
| park-spot › fresh boot parks the opener on dry rails of the largest loop | park-spot › fresh boot parks the opener on dry rails, and pressing play adopts it without a jump › *the opener rests on dry rails, not at world origin* | Cell `{3,7}`, distance from origin > 4, `wagonCount()` 2 — identical. |
| park-spot › pressing play adopts the parked opener without a jump | same merged test › *pressing play continues from exactly that spot* | `parkedSpot` before, `startRide`, `primarySpot` after, drift < 1 — identical. |
| park-spot › an empty saved world parks the opener on dry land near the heart | park-spot › every gallery starter, and an empty meadow, parks the opener on its nearest dry cell › *an empty saved world parks on dry land near the heart* | `clearMeadow`, 300 ms, reload, cell `{6,7}`, distance > 4 — identical. The final console check keeps its original window (no reset after this reload), as in the original. |
| park-spot › every gallery starter parks the opener on its nearest dry rail cell | same merged test › *each starter parks on the dry rail cell nearest the heart* | `station-village` 4,7 / `river-crossing` 6,8 / `hilltop-junction` 4,7, 2.5 s + reload each, error list cleared after each reload, half-cell distance + distance from origin — identical. |

### P4.T5 — small merges

| Old test | New test › steps | Notes |
|---|---|---|
| delight-toys › the three delight toys load their GLBs and the balloon takes wing | delight-toys › the three delight toys load their GLBs, the balloon takes wing, and winter caps them › *each delight toy drags in and loads its own GLB*; *the balloon takes wing and stays under its cruise ceiling* | Clear, three placements, three GLB waits, scenery count, 60 s altitude poll, ceiling < 1.7 — identical; external/console once at the end over the whole journey. |
| delight-toys › winter toggles the delight snow caps without a sound | same merged test › *winter toggles the snow caps without a sound* | Windmill GLB wait, `setDelightSnow(true)` 300 ms, `(false)` 300 ms — identical (placement reuses the windmill already on the meadow; the second `clearMeadow` and second placement are gone, the toggle assertions are not). |
| sun-moon › the sun/moon button turns the day, and its icon previews the phase a tap brings | sun-moon › the sun/moon button turns the day, previews the next phase, and survives a reload › *the button is toddler-sized and its icon agrees with the sky*; *every tap turns the page and previews the phase it brings* | Visible, ≥ 64 × 64, icon/phase agreement on first showing, 4 taps each with the icon preview — identical; its own console assertion is kept at the same point in the journey (before the reload's reset). |
| sun-moon › the chosen time of day survives a reload, and a legacy save still boots to morning | same merged test › *the chosen time of day survives a reload*; *a legacy save from before the button still boots to morning* | Park on `night`, stored phase `night`, 1 s, reload, `night` + ☀️, strip `preferences`, reload, `morning` + ☀️ — identical. |
| ride-toybox-flow › riding hides the build tools and stopping returns them `@smoke` | ride-toybox-flow › riding hides the build tools, and stopping returns them with the five tabs intact `@smoke` › *the ride hides the build tools and stopping returns them* | Undo visible, ride, toys/trains/trash/undo hidden, whistle + mute visible, stop, all four back, `pieces().length === 2` — identical; tag kept, still in the phone allowlist. |
| ride-toybox-flow › five tabs hold their toys; the adventure row swipes on phones `@smoke` | same merged test › *five tabs hold their toys; the adventure row swipes on phones* | 5 tabs, per-tab counts 10/9/3/7/4, visible panel, adventure `scrollWidth > clientWidth` — identical. Both `@smoke` behaviours survive as steps, which is the condition the brief set for this merge. |
| ride-toybox-flow › first piece invites, loop closure pops, slots are all pictures | unchanged | Untagged, tablet-only; no reason to fold it and no assertion to trade. |

## Dropped, with witness

Every entry is an assertion that was removed outright. Everything else was carried.

| Removed assertion | Original | Witness that proves the same behaviour |
|---|---|---|
| The whole oversized-file test: instrumented `File`/`Blob`/`FileReader` read counters, import of a 1 048 577-byte file, `too big` note, zero reads, export unchanged | `world-portability` › an oversized file is refused and changes nothing | `src/core/portable.test.ts` › **`readImport size guard › refuses a file one byte over the cap without carrying a world`** and **`readImport size guard › checks size before parsing`**; the "nothing changed" half is **`readImport refusal › leaves no world behind on a refusal`**. The brief names this permutation as unit-owned; the browser read-counter instrumentation was the only non-unit-provable part and goes with it. |
| Version-99 refusal: dismiss, re-open, import `{"version":99}`, note `not a Tiny Tracks meadow`, export unchanged | `world-portability` › unreadable files are refused and changes nothing | `src/core/portable.test.ts` › **`readImport refusal › refuses %j without carrying a world`** (the `{"version":99}` case) and **`leaves no world behind on a refusal`** |
| Empty-array refusal: dismiss, re-open, import `[]`, same note, export unchanged | `world-portability` › unreadable files are refused and changes nothing | `src/core/portable.test.ts` › **`readImport refusal › refuses %j without carrying a world`** (the `[]` case); the note itself is `src/ui` copy, and the surviving malformed-JSON step in the same test still proves the note appears and the world is untouched |
| A boot with `current` = an all-invalid salvage and a good `previous` restores the previous world and shows the restored line | `save-recovery` › a boot ignores an empty salvage and restores the previous save | `src/state/persistence.test.ts` › **`indexeddb storage › restores the previous world when current is only an empty salvage`** and **`never promotes an empty salvage over a good previous`**; the note text is **`src/core/recovery.test.ts` › `recoveryNotice › reports a restored backup calmly, without counts`**, and the surviving restored-boot test asserts that note in the browser |
| A duplicate-only salvage keeps the first claimant per cell and tells a grown-up `We saved your meadow and skipped 1 broken toy.` | `save-recovery` › a duplicate-only salvage still tells a grown-up | `src/core/save.test.ts` › **`snapshot recovery — malformed entries never destroy valid work › keeps the first claimant of a duplicated cell and counts the later ones`** (and **`world snapshots › keeps the first claimant of a duplicated cell and drops the rest`**); the exact singular copy is **`src/core/recovery.test.ts` › `recoveryNotice › reports a duplicate-only salvage in the singular`** |
| Both slots unreadable boots the starter meadow, piece ids equal a fresh boot's, no console error | `save-recovery` › both unreadable slots seed the starter meadow without a console error | `src/state/persistence.test.ts` › **`indexeddb storage › falls back to fresh when both slots are unreadable or missing`**; the no-throw half is **`src/core/save.test.ts` › `snapshot recovery — malformed entries never destroy valid work › never throws and always reports a defined status for hostile input`**; a clean-console boot is still asserted by both surviving recovery tests |

No other assertion was removed. Duplicate `goto`/boot calls, a duplicated
`clearMeadow`/placement pair (`delight-toys`), and repeated end-of-test console checks that
became one check over a superset window were consolidated, not dropped (constraint 5).

## Notes for the primary

- FR-2 ("eleven `@smoke` tests") and AC-4 ("8 phone runs") now measure 10 and 7. The
  `ride-toybox-flow` merge is the cause and the brief sanctioned it ("only if both survive
  as steps"); both behaviours are steps of the surviving tagged test.
- `world-portability` #9 moved into `save-recovery.spec.ts` rather than being rewritten as a
  sixth portability boot: it already seeded a restored boot, and the recovery file is where
  `current`/`previous` slot logic belongs.
- `starter-railway`'s dressed-train undo now expects the reloaded village (`14/5`) rather
  than the pristine oval (`10/4`); the pristine-oval undo is the same test's first step.

## Primary verification

Independent run on the reported head `ff4d214`.

| Check | Command | Result |
|---|---|---|
| Static + unit | `pnpm check` | pass — 50 files / **883 tests** |
| This phase | the eight-spec command from the plan | **20 passed in 2.6 min**, exit 0 |
| Suite size | `playwright test --list` | **57 runs in 21 files** (49 tablet + 7 phone + 1 prod = 50 unique) |
| Smoke lane | `--list --grep "@smoke"` | **17 runs, 10 unique**, 6 files |
| Phone lane | `--list --project=phone` | **7 runs**, 3 allowlisted files |
| Per-file counts | source `test(` count | portability 5, recovery 2, guarantees 4, starter 2, park 2, delight 1, sun-moon 1, toybox 2 |

**Diff scope.** `fecd623..HEAD` is exactly the eight Touches files plus this evidence: nine files,
+899/−925. `helpers.ts`, `playwright.config.ts`, `package.json` and every other spec are untouched, so
the lane and matrix from Phases 1–3 are unchanged by this phase.

**Witness check, not trust.** Five witness names cited in the dropped table were grepped in `src/` and
all resolve: `persistence.test.ts:506` (empty-salvage restore), `save.test.ts:214` (first claimant of a
duplicated cell), `portable.test.ts:130` (size checked before parsing), `persistence.test.ts:550` (fresh
when both slots are unreadable), `recovery.test.ts:48` (duplicate-only singular). A witness that does not
exist would make the drop a silent loss, so the table is only as good as this check.

**Counts reconciled in the spec.** Phase 4's `ride-toybox-flow` merge took `@smoke` from eleven to ten
and the phone lane from eight to seven. The user chose to keep the merge and amend the descriptors:
FR-2 now says ten tests spanning eleven behaviours, AC-2 now says "the `@smoke` lane (17 runs, ten
unique) in ≤3 min", AC-4 now says seven runs. AC-1's "40–50 unique" lands at exactly 50, so the spec's
range is still satisfied without slack.
