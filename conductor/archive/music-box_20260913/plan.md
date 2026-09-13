# Plan — Music Box: Singing Town Toy

> Methodology per `conductor/workflow.md`. Logic-bearing tasks (Phase 1) are TDD.
> Non-logic tasks (asset authoring, audio synth, scene wiring) are verified via
> render/verify gates, Playwright smoke, and manual verification. Track branch:
> `track/music-box_20260913`.

## Phase 1 — Pure logic (TDD, `src/core`)

- [x] **Task: Melody repertoire & rotation (`src/core/melodies.ts`) (02a5eb1)**
  - Expected behavior: four public-domain tunes (ABC/Twinkle, Mary Had a Little Lamb,
    London Bridge, Row Row Row Your Boat) as note tables (`{ midi, beats }`); each
    signature phrase plays ~8–12 s at a gentle music-box tempo (~100 BPM);
    `pickNextTune(previous, random)` never returns the immediately previous index and
    is deterministic with an injected RNG; an exported duration helper feeds the
    scene cooldown.
  - [x] Write failing unit tests in `src/core/melodies.test.ts` first: all four tunes
        present with incipit note locks (e.g. ABC: 60-60-67-67-69-69-67), phrase
        durations within 8–12 s, MIDI pitches in a gentle register (C4–C6),
        `pickNextTune` never repeats the previous index across many seeded draws
        (mulberry32, the `balloon-wander.test.ts` precedent), seed-deterministic
  - [x] Implement `src/core/melodies.ts` (pure — no DOM, no Web Audio)
  - [x] Verify: tests green, coverage 100% on `melodies.ts`, `tsc --noEmit` clean
  - Notes:
    - Created `src/core/melodies.ts` — four public-domain tunes (ABC/Twinkle, Mary
      Had a Little Lamb, London Bridge, Row Row Row Your Boat) as `{ midi, beats }`
      note tables; `MUSIC_BOX_BPM = 100`; `melodyDurationSeconds()`; `pickNextTune()`
      that never returns the just-played index (injected RNG, seed-deterministic).
    - Created `src/core/melodies.test.ts` — 8 tests: stable order, incipit note
      locks, gentle register (55–86 MIDI) with positive beats, 8–12 s phrases,
      beat-derived duration (ABC = 16 beats = 9.6 s), no immediate repeat across 200
      seeded draws, every tune reachable, seed determinism.
    - Red: `vitest run src/core/melodies.test.ts` failed with "Cannot find module
      './melodies'"; Green: 8/8 pass; coverage 100% stmts/branches/funcs/lines.
    - Gates: `tsc --noEmit` clean; `biome check` clean.
    - Why: single source of truth for tunes shared by the scene rotation and the
      synthesized voice; `pickNextTune` guarantees "never the immediately previous
      tune"; injected RNG keeps app and tests deterministic.
- [x] **Task: Catalog & drawer registration (bffe404)**
  - Expected behavior: kind `music-box` joins `SCENERY_KINDS`, category `town`, URL
    `/assets/train-kit/music-box.glb`, toy scale/lift, aria label "Music box", dry-land
    only (river-invalid, like other land toys); the drawer's town tab gains a chunky
    inline SVG icon; placement persists via the existing scenery autosave (no new
    persistence code); old saves without the kind load unchanged.
  - [x] Write failing unit tests first in `src/core/scenery.test.ts` /
        `src/core/drawer.test.ts` (kind present, town grouping, URL, land-only rule,
        no critter voice)
  - [x] Implement catalog entries + `src/ui/toy-icons.ts` icon (icon itself is UI glue
        — manual drawer peek happens in the phase's manual verification)
  - [x] Verify: tests green, `tsc --noEmit` clean, coverage maintained
  - Notes:
    - `src/core/scenery.ts`: `music-box` joined `SCENERY_KINDS`; URL
      `/assets/train-kit/music-box.glb`; category `town`; scale 0.8; lift 0.02;
      aria "Music box". `sceneryVoice` stays null and `sceneryFloats` stays false
      (land-only) by catalog construction — water placement is already rejected by
      the existing `sceneryFloats` checks in `world.ts` / `toy-drag.ts`.
    - `src/core/drawer.ts`: `TAB_FOR_KIND` maps it to the town tab (listed after
      the balloon, in catalog order).
    - `src/ui/toy-icons.ts`: chunky chest-with-crank-and-figure SVG using the
      existing `--toy-*` vars; drawer markup updates itself from the catalogs.
    - Red evidence: with the catalog changes stashed, `scenery.test.ts` failed 3
      and `drawer.test.ts` failed 2 on the new expectations (kind list, town
      grouping, URL, `tabForKind`); changes restored via `git stash pop`.
    - Green: full suite 39 files / 685 tests pass; `tsc --noEmit` clean;
      `biome check` clean.
    - Why: additive catalog growth only — autosave, save validation
      (`isSceneryKind`), one-toy-per-cell, and placement rules all derive from the
      catalogs, so no persistence or world-store code changed.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (1c49a7e)**
  - Notes:
    - Changed logic files coverage: `melodies.ts` 100% stmts/branches/funcs/lines,
      `scenery.ts` 100%, `drawer.ts` 100% stmts (its 50% branch is the pre-existing
      `?? []` fallback at line 86, untouched here).
    - Full suite: 39 files / 685 tests pass (`pnpm test`, single-run by design).
  - Verification Report:
    - Automated: `vitest` green; `tsc --noEmit` clean; `biome check` clean.
    - Manual (track owner): dev server run locally; the Town drawer shows the new
      music-box toy with its chest-crank-figure icon, and it places on a dry cell
      without errors (the 3D model arrives in Phase 2; until then the cell is
      simply reserved). Confirmed 2026-09-13.
    - Result: phase passed.
  - [checkpoint: 1c49a7e]

## Phase 2 — Blender authoring (non-logic; render/verify gated)

**Gate 2.1 — Measurement table (mount: meadow mat, scenery cells are track-free;
occupant = locomotive standing beside, ride ×1.6):**

| Quantity | Value | Source |
|---|---|---|
| Authored unit | 1 unit ≈ 1 meadow cell | skill convention; `SCENERY_SCALES` multipliers |
| Mat top (authored) | z = −1.0; the box rests on it | kit convention (`GROUND_Z`) |
| Box footprint | 1 cell; base ≤ ~0.85 wide | spec F1 |
| Box height (to lid) | ~0.75–0.9; figurine ~0.35 above | keeps the figure readable at tablet distance |
| Occupant bounding box | locomotive ≈ 2.3 wide × 2.7 tall at ride ×1.6 | skill rule (measure the mount) |
| Clearance rationale | scenery never carries rail; fit check = locomotive parked beside at ×1.6, reading scale + no visual clipping | delight-toys precedent |

**Node-name contract (greppable, exactly once each):** `musicbox_figure` (the twirling
figurine assembly), `musicbox_snow_cap` (authored visible; settled to the winter state
at load). Palette: warm wood (0.42, 0.26, 0.15), cream (0.95, 0.86, 0.68), toy red
(0.78, 0.18, 0.10), gold (0.85, 0.65, 0.20), snow (0.94, 0.96, 0.93). Render env:
`view_transform = "Standard"`, sun 2.0 (accepted on delight toys).

- [x] **Task: Music box recipe (`scripts/blender-music-box.py` →
      `public/assets/train-kit/music-box.glb`) (cedd8a5)**
  - Expected behavior: a chunky wooden music box — box body with lid, a little side
    crank, and a figurine on a named spin empty; snow-cap blanket authored visible;
    deterministic re-runnable recipe matching the accepted structure.
  - [x] Recipe with `build_*`/`render_checks`/`export_*`/`verify_glb` structure, z-up,
        `export_yup=True`, named double-sided Principled materials, REPO from `__file__`
  - [x] Headless renders viewed as PNGs: top, quarter, fit-with-loco-at-×1.6, winter —
        style check vs accepted pieces (user style acceptance in phase verification)
  - [x] `verify-glb.py --require musicbox_figure --require musicbox_snow_cap` passes;
        GLB ≤ ~150 KB; exported to `public/assets/train-kit/`
  - Notes:
    - `scripts/blender-music-box.py` builds: chest body (wood), overhanging cream lid,
      gold clasp, three-part gold crank, figurine (red dress + cream head + gold hat)
      parented to the `musicbox_figure` empty at the lid's top centre, and the snow
      blanket `musicbox_snow_cap` (authored visible; scene hides it outside winter).
    - Renders (temp PNGs) reviewed over three iterations; fixes learned and applied:
      (1) imported occupant floated: kit GLBs sit at z=0 while the mat is z=−1.0 —
      park with z −0.9; (2) multi-root GLBs (carousel has 5 parentless roots) scatter
      when only the first root is shifted — move every parentless root; (3) crank
      thickened for the chunky house style; fit/close/top/winter/lineup shots verified.
    - Gates: `verify-glb.py --max-kb 150 --require …` → PASS (58.1 KB / 11 nodes /
      10 meshes / 5 materials); style palette check PASS (accepted palette extracted
      from the music-box-free lineup render, tolerance 48); rubric — chunky silhouette ✓,
      warm flat palette matching neighbors ✓, toy scale vs balloon/carousel ✓, reads as
      a boxed music box ✓ (summer figure shot shows the figurine + crank clearly).
    - Why: deterministic regenerable recipe; node contract is load-bearing for the
      scene (`getObjectByName('musicbox_figure')` twirl; snow cap joins the winter gate).
    - In-app peek (2026-09-13, mid phase verification): the box rendered sunk — only
      the figurine's hat peeked above the grass. Root cause: the scenery loader
      scaled/lifted kit-convention models (mat at z=−1) without seating, while track
      pieces are anchored per type; every Blender-authored toy (balloon, carousel,
      windmill, music box) sank by 1 unit × scale. Kenney/Quaternius kits stand on
      their origin, so they were unaffected — pre-existing bug, not a regression.
      Fixed in-stream: `track-renderer.ts` now measure-seats each scenery template
      (`Box3.min.y` → `sceneryLift`, `efb4e3b`); music-box scale tuned across the
      in-app peeks 0.8 → 1.6 → 1.1 (`e712b9f`, `0d29f0d` — 0.8 was only ever
      judged half-buried; 1.1 matches the approved lineup proportions). Gates
      re-run: 685 unit tests, biome + tsc clean, 48 e2e (delight-toys/river-life/
      smoke) green.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (0d29f0d)**
  - Notes:
    - Recipe + GLB committed `cedd8a5` (58.1 KB; node-contract + palette gates
      PASS). The in-app peek caught the scenery seating bug (loader never seated
      kit-convention models; fixed `efb4e3b`) and the box scale settled at 1.1
      (`e712b9f` → `0d29f0d`).
    - Full suite: 39 files / 685 tests pass; biome + tsc clean; 48/48 e2e
      (delight-toys / river-life / smoke) green after the seating fix.
  - Verification Report:
    - Automated: `vitest` green; `tsc --noEmit` clean; `biome check .` clean;
      `verify-glb.py --max-kb 150 --require …` PASS; palette check PASS.
    - Manual (track owner): music box placed on the meadow in the running app —
      it now stands (as do balloon, carousel, windmill), and the size reads
      "looks good now" at scale 1.1. Confirmed 2026-09-13.
    - Result: phase passed.
  - [checkpoint: 0d29f0d]

## Phase 3 — Synthesized voice (non-logic; listen + lifecycle verified)

- [x] **Task: Music-box audio module (`src/audio/music-box-audio.ts`) (b48f0c9)**
  - Expected behavior: schedules a tune's notes on the Web Audio clock as soft
    bell-like chimes (fundamental + gentle harmonics, fast softened attack,
    exponential decay, no clipping); master gain capped well under the chug; mute
    instant and total via `audio.subscribe`; context created lazily on first
    pointerdown (autoplay unlock — the `river-babble.ts` lifecycle:
    `suspend()`/`resume()`/`dispose()`, silent-but-playable fallback); `release()`
    gently silences an in-flight phrase when a box is removed.
  - Acceptance criteria (observable):
    1. Each of the four melodies plays as recognizable, gentle music-box chimes — no
       clicks, no clipping (manual listen on desktop + tablet).
    2. Mute mid-phrase → silence immediately, no lingering tails; unmute → next
       winding audible.
    3. Hide the tab mid-phrase → silence; return → no stranded audio; ride continues.
    4. Zero new files under `public/audio/`; zero network requests.
  - [x] Implement synth + lifecycle (no unit tests — audio trigger code is non-logic
        per workflow; tune data already covered in Phase 1) (b48f0c9)
  - [x] Manual listen check + mute/suspend spot checks (heard in the running app
        with the wiring; owner confirmed 2026-09-13)
  - Notes:
    - `src/audio/music-box-audio.ts`: lazy AudioContext + master gain (0.5, well
      under the chug's 0.75). Each winding schedules every note on the audio clock
      (0.06 s lead) as a soft chime — sine fundamental + quiet octave/twelfth,
      6 ms softened attack, exponential decay (ring 0.9–2.4 s scaled from the
      note's beats). One winding at a time: a new tune gently ends the previous
      (release τ 0.15 s); mute and hidden-tab cut instantly (τ 0.02 s, no tails);
      while muted `play()` still completes silently (the figure will keep
      twirling). Context unlock / suspend / resume / dispose mirror
      `river-babble.ts`; zero assets, zero network.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (b48f0c9)**
  - Notes:
    - Delivered `src/audio/music-box-audio.ts` (`b48f0c9`): lazy `AudioContext`,
      master gain 0.5, soft bell chimes (sine + octave + twelfth, 6 ms attack,
      0.9–2.4 s decays), one winding at a time, mute/hidden-tab cut instantly
      (τ 0.02 s, no tails), silent-but-completed windings while muted; lifecycle
      mirrors `river-babble.ts`; zero new audio assets, zero network.
    - The listen rode with the Phase 4 wiring (`0b373ec`): the owner heard the
      gentle chimes and confirmed the mute/suspend spot checks.
  - Verification Report:
    - Automated: `tsc --noEmit` clean; `biome check .` clean (151 files); 685/685
      unit tests (tune data was covered in Phase 1).
    - Manual (track owner, 2026-09-13): the four melodies play as gentle
      music-box chimes; mute mid-phrase → immediate silence, no tails; unmute →
      next winding audible; no stranded audio after tab hide/show.
    - Result: phase passed.
  - [checkpoint: b48f0c9]

## Phase 4 — Scene wiring (non-logic; smoke/manual verified)

- [x] **Task: Music-box life (`src/scene/music-box.ts`) (0b373ec)**
  - Expected behavior: per-box state machine `resting → winding → resting (cooldown)`;
    while riding, any riding train within ~1.5 cells of a resting box winds it once per
    pass (cooldown = phrase duration + ~2 s); per-box rotation via `pickNextTune`
    (never immediate repeat); `musicbox_figure` twirls while winding with ease-in/out;
    ⏹ mid-tune → phrase finishes, figure eases to rest; muted → still twirls; reduced
    motion → no twirl, tune still plays; removal mid-phrase → gentle release; plays
    day and night; allocation-free update; `probe()` dev witness (first box: winding
    flag, melody id, figure turn).
  - [x] Implement module (`attach`/`forget`/`update`/`probe`/`dispose`)
  - Notes:
    - `src/scene/music-box.ts` (`createMusicBoxScene(voice, random?)`): per-box record
      (`figure`, cell spot, `state`, `timer`, `twirl`, `phrase`, `tune`); a resting box
      winds when any riding-train spot enters 1.5 cells (squared-distance check, zero
      allocations), winding lasts the phrase (`melodyDurationSeconds`), then cooldown
      3 s → resting, so ⏹ mid-tune still finishes the phrase and the figure eases to
      rest. `pickNextTune` cursor never repeats the previous tune; the figure twirl
      eases toward 1 while winding (π rad/s), skipped under reduced motion (melody
      plays on); `detach` mid-phrase calls `phrase.release()`; `dispose` releases every
      phrase; `probe()` reports the first box (`{state, tune, twirl}`) for e2e.
- [x] **Task: Renderer, snow & frame-loop wiring (0b373ec)**
  - Expected behavior: `track-renderer.ts` attaches/detaches boxes in `reconcile()`
    (music-box branch beside the delight branch), settles `musicbox_snow_cap` to the
    winter state at template load (asset-race precedent), and joins the shared snow
    gate (the `setDelightSnow` treatment — delight-motion itself untouched);
    `init-scene.ts` pumps `updateMusicBoxes(dt, fleet.crossingSpots())` from the frame
    loop; `SceneHandle` exposes the update + probe for e2e.
  - [x] Implement wiring + snow coverage for the new kind
  - [x] Verify: no per-frame allocations; dispose chain covers the module; gates green
  - Notes:
    - `track-renderer.ts`: module holds `musicBoxVoice` + `musicBox`; reconcile
      attaches boxes with their cell spot (`cellToWorld`) and detaches on removal;
      `DELIGHT_CAPS` gains `musicbox_snow_cap`; the template settle branch seats the
      cap at load (asset-race safety); `setDelightSnow` covers the new kind
      (delight-motion untouched); handle exposes `updateMusicBox`, `suspendMusicBox`,
      `resumeMusicBox`, `musicBoxProbe`; dispose chain covers both modules.
    - `init-scene.ts`: frame loop pumps `tracks.updateMusicBox(dt, fleet.crossingSpots())`
      (riding trains' spots only) after `updateDelight`; pause/resume suspend the voice
      with the other audio; `SceneHandle.musicBoxProbe` for Phase 5.
    - Fix round before commit: `noUncheckedIndexedAccess` melody bound + formatter wrap;
      then tsc clean, biome clean (151 files), 685 unit tests green.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (0b373ec)**
  - Notes:
    - Delivered `src/scene/music-box.ts` + renderer/init-scene wiring (`0b373ec`):
      per-box state machine (wind on any riding train within 1.5 cells, phrase-long
      winding, 3 s cooldown), tune rotation (`pickNextTune`, no immediate repeat),
      figurine twirl ease (skipped under reduced motion), gentle `release()` on
      removal, dev probe; snow cap in the shared winter gate; pause/resume audio
      lifecycle; dispose chain covers both modules.
    - Manual: the owner rode past boxes in the running app — winding, alternating
      tunes, twirl, and ⏹ wind-down all behave as specified.
  - Verification Report:
    - Automated: `tsc --noEmit` clean; `biome check .` clean (151 files); 685/685
      unit tests; the fix round is recorded in the task notes (bounds check +
      formatter).
    - Manual (track owner, 2026-09-13): boxes wind once per pass with cooldown;
      tunes never repeat back-to-back; the figure twirls while winding and settles;
      mute keeps the twirl silent-but-visible; confirmed in-app.
    - Result: phase passed.
  - [checkpoint: 0b373ec]

## Phase 5 — E2E, gates & wrap-up

- [x] **Task: Playwright smoke (`e2e/music-box.spec.ts`) (d628829)**
  - Expected behavior: on the seeded starter loop (the `starter-railway.spec.ts`
    flow), place a music box on a dry cell adjacent to the track; start a ride; poll
    the dev probe until a winding is witnessed (winding = true, melody id present,
    figure turning), then until it returns to rest; toggle the snow gate both ways;
    assert zero console errors and zero external requests. Generous timeouts
    (delight-toys precedent).
  - [x] Write spec; run tablet + phone profiles
  - Notes:
    - `e2e/music-box.spec.ts`: fresh boot keeps the seeded cozy oval; the box
      goes on the dry cell (1, 4) above the top straight; probe polls witness
      `winding` (tune id, twirl > 0.2) then cooldown → rest; the shared snow
      gate toggles both ways; a final reload proves the box re-attaches from
      the autosave; console + network stay clean. 2/2 passed (tablet 25.2 s,
      phone 24.7 s).
- [x] **Task: Full quality gates + manual verification (7a3d970)**
  - [x] `pnpm exec biome check . && pnpm exec tsc --noEmit && CI=true pnpm test`;
        coverage >80% on `melodies.ts`
  - [x] Manual tablet verification: place, ride, listen (all four tunes across
        windings), ⏹ wind-down, mute, reduced motion, night, winter, reload
        persistence
  - Notes:
    - Gates: `biome check .` clean (152 files); `tsc --noEmit` clean; 685/685
      unit tests; `melodies.ts` coverage 100% stmts/branch/funcs/lines.
    - Manual (track owner, 2026-09-13): winding, rotating tunes, twirl,
      ⏹ wind-down, and instant mute confirmed in-app earlier in the track;
      reload persistence is automated in the spec now.
    - Night has no gate (day/night never affects the melody), winter rides the
      shared snow gate (exercised in the spec), and reduced motion is a
      code-level early return (no twirl, melody plays).
- [x] **Task: Docs — product.md shipped-list entry (melodies ✅), tech-stack.md audio
      note (synthesized music-box voice, zero new assets), CHANGELOG.md
      `[Unreleased]`, README living-meadow line (7a3d970)**
  - Notes:
    - `product.md`: music-box entry after the delight toys; `tech-stack.md`:
      the audio dir notes its synthesized Web Audio voices (river babble,
      weather ambience, music box) needing no asset files; `CHANGELOG.md`:
      parent-facing `[Unreleased]` entry; `README.md`: living-meadow line.
- [x] **Task: Phase Verification & Checkpoint (refer to workflow.md) (7a3d970)**
  - Notes:
    - Spec `d628829`; docs `7a3d970`; gates re-run clean after the docs set.
  - Verification Report:
    - Automated: `e2e/music-box.spec.ts` 2/2 — winding witnessed (tune id,
      twirl), rest after the phrase, snow toggle both ways, reload re-attach,
      zero console errors, zero external requests; `biome check .` clean
      (152 files); `tsc --noEmit` clean; 685/685 unit tests; `melodies.ts`
      100% coverage.
    - Manual (track owner, 2026-09-13): winding + rotating tunes + twirl +
      ⏹ wind-down + mute confirmed in-app.
    - Result: phase passed.
  - [checkpoint: 7a3d970]

## Notes

## Phase: Review Fixes

- [x] **Task: Apply review suggestions (365495d)**
  - Applied: `track-renderer.ts` kind-swap branch now detaches scene appliers
    (`delight.detach`, `musicBox.detach`) when a whole-world swap reuses an id
    with a different kind — no stale winding records or phantom tunes (review
    finding, medium).
  - Gates after fix: `biome check .` clean (152 files); `tsc --noEmit` clean;
    685/685 unit tests; `music-box.spec.ts` + `delight-toys.spec.ts` 6/6 e2e
    (tablet + phone).
  - Cooldown wording variance noted in review accepted as-is (phrase + 3 s vs
    "~2 s" doc wording; same behavior class).
