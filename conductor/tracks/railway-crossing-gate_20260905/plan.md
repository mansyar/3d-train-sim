# Plan: Railway Crossing Gate

Feature track per `spec.md`. A new placable `crossing-gate` track piece:
straight rail with road strip, crossbuck + two swinging barrier gates,
blinking lantern (active any time; idle at night), real bundled bell
sound, winter snow cap. Phase 1 is logic-bearing (TDD per `workflow.md`):
piece type, pure proximity state machine, save round-trip. Phase 2 is
asset + audio + scene animation. Phase 3 closes with e2e, docs, and
final gates.

## Phase 1 — Core: Crossing Piece, Proximity Semantics & Save (TDD)

- [x] Task: Add the `crossing-gate` piece type (tests first in
  `pieces.test.ts`, `save.test.ts`, `drawer.test.ts`)
  - [x] `PIECE_TYPES` gains `'crossing-gate'`; `BASE_ENDPOINTS` =
        `['north', 'south']` (straight through-road)
  - [x] Terrain rule: dry land only (ghost red over water, via existing
        `validatePlacement`)
  - [x] Save round-trip: snapshot containing a crossing-gate; pre-feature
        snapshots load unchanged; no version bump
  - [x] Catalog ripple: `drawer.ts` Rails tab entry; renderer placeholder
        maps (→ straight GLB until Phase 2); hand-drawn SVG icon in
        `ui/app.ts`
  - **Notes:** Red phase = 9 failing tests across 5 files (terrain tests
    passed pre-implementation — rules are type-agnostic). Green commits:
    `28cfeac` (catalog + drawer + icon + renderer placeholder maps),
    `16a4cc7` (terrain, ride, additive-save coverage). TDD gotcha: the
    new pathing loop test initially used an E-W straight on the west
    side — fixed to N-S (`rotation 0`).
- [x] Task: Pure proximity state machine in `src/core/crossings.ts`
  (TDD: `crossings.test.ts`)
  - [x] Per-crossing states: idle → closing → active(gates closed) →
        lifting → idle; eased timings as pure data
  - [x] Warning distance (approach) and exit distance (cleared) per
        crossing; multiple trains on one crossing's line don't flap the
        gate (gate stays closed until the *last* train clears)
  - [x] Crossings are independent; up to 4 concurrent trains handled;
        state is runtime-derived only — never serialized
  - **Notes:** `1838b83`. Constants (cells): warning 2.25, hold 2.25,
    exit 1.25, occupy 0.75; closing 0.6 s, lifting 0.8 s. No-flap: once
    down, `hold` distance (≥ exit) keeps gates closed until the last
    train clears; re-close guard during lifting at ≤ exit distance.
    Pure + allocation-light (one motion object per step).
- [x] Task: Ride/pathing coverage — crossing rides as a plain straight
  (extend `pathing.test.ts` if the existing rail-crossing type shares
  code)
  - [x] Trains roll through at normal speed; wagons/crates follow; no
        pause, no slowdown
  - **Notes:** Covered in `16a4cc7`: 8-piece closed loop with a
    crossing-gate rides closed; step `from/to` = the gate's endpoints;
    entry/exit heights 0 (flat).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Notes:** Gates at `1838b83`: Vitest 613/613 across 36 files,
    `tsc --noEmit` clean, `biome check src` clean. Manual verification
    deferred to Phase 2 (visuals/audio land there; core-only phase has
    no scene output).
- [checkpoint: 1838b83]

## Phase 2 — Asset, Sound & Scene Animation

- [x] Task: Crossing asset in Blender (house rules from `tech-stack.md`)
  — `scripts/blender-crossing-gate.py`
  - [x] Straight from the kit + road strip + crossbuck post; named node
        contract `crossing_gates` (two barrier arms) + `crossing_lantern`;
        winter snow-cap variant; deterministic recipe; export + verify
        GLB (target ≤ ~60 KB)
  - **Notes:** `a199b3e`. Recipe mirrors `blender-switch.py`; ran headless
    (Blender MCP unavailable). Fixed along the way: parent-local coords
    for gate pivots + lantern lamps (world coords double-offset children),
    material-slot assignment preserved via count-based face tracking +
    append-only slots (clearing slots clamps material_index), loco fit
    dz measured deterministically (wheels at −0.84 vs rail crowns
    −0.82). Verified: top + three-quarter renders accepted; open-pose
    arms numerically on the shoulder (x ±1.98, y ≈ −2.95); closed arms
    span the road (y −2.99..−2.07). **Deviation:** GLB 84,456 bytes vs
    the ~60 KB soft target (kit straight rails are ~30 KB of it) — within
    the 150 KB house hard limit, accepted. Node contract:
    `crossing_gates` root + `crossing_gate_east`/`crossing_gate_west`
    pivots (arms authored closed, open = east −90°/west +90° about the
    glTF Y axis), `crossing_lantern` + `crossing_lamp_0`/`_1` (separate
    materials for alternating blink), `crossing_snow_cap` (hidden at
    load, tunnel precedent). 12 nodes, 8 materials.
- [x] Task: Source & bundle the bell sound
  - [x] Real railroad-crossing bell recording (CC0/public-domain
        preferred), softened + volume-capped; `public/audio/CREDITS.md`
        updated if attribution required; documented synthesized fallback
        if no suitable real recording is found; fully local

  > **Notes — bell**: found CC0 candidates on Freesound after Commons hits
  > all proved license-incompatible (CC BY-SA). Chose lipalearning's
  > "train crossing bell.wav" (#427974, CC0) — a single soft tubular-bell
  > ding, toy-appropriate; the WCH Mechanical Bell (#857864, CC0) was the
  > backup. Downloaded the public hq preview CDN mp3, trimmed to the
  > 1.147 s ding with ffmpeg (band-pass 150–5200 Hz, 4 ms fade-in,
  > 95 ms fade-out, +10.5 dB, loudnorm I=−24 TP=−6, limiter −6 dB, mono
  > 44.1 kHz), bundled as `public/audio/crossing-bell.ogg` (12.5 KB) +
  > `.mp3` (14.5 KB) per the dual-format convention. CREDITS.md row added
  > (Freesound / lipalearning / CC0 1.0). No synthesized fallback needed.
  > Commit `11ddea9`.
- [x] Task: Scene wiring & animation (acceptance-criteria verified; no
  unit tests for glue)
  - [x] Gate swing tween driven by the Phase 1 state machine;
        squash-and-stretch on close/lift; instant snap under
        `prefers-reduced-motion`; event-driven, no per-frame cost outside
        tweens
  - [x] Lantern blinks red while active (day or night); soft idle blink
        at night only (reuse window-glow/portal-glow patterns)
  - [x] Bell plays on closing, rings while active, stops on clear;
        mute-respecting and instant; snow cap applies in winter

  > **Notes — scene wiring** (commits `b10f5a6`, `8991caa`): the core machine
  > gained an optional `out` target on `advanceCrossing` (`b10f5a6`, with its
  > own reuse test) so the frame loop reuses one motion per crossing instead
  > of allocating. `track-renderer.ts` carries the pose layer: `PIECE_URLS`
  > swapped to `crossing-gate.glb`; `trackCrossing` caches arm pivots and
  > clones the two lamp materials per placed clone so lanterns blink
  > independently; `updateCrossings(dt, trains, night)` converts world spots
  > to cell space through preallocated pools (`trainPool`/`trainView`),
  > advances each gate with the reused motion, poses arms with ease-out
  > swing (east −90°, west +90° about +y) + squash-stretch bump peaking
  > mid-swing (reduced motion snaps, no wobble), blinks lanterns (2 Hz
  > alternating while awake, 0.8 Hz soft paired night idle past night 0.35),
  > and nudges `audio.setCrossingBell` on awake↔idle edges (bell rings from
  > closing until the last gate rests). `setCrossingSnow` mirrors
  > `setTunnelSnow` (`crossing_snow_cap`); the template load honors live
  > snow state; reconcile removals + kind swaps prune motion/parts; dispose
  > clears both. `init-scene.ts` collects riding rigs' spots into a
  > 4-slot pool inside the existing rig loop and calls
  > `tracks.updateCrossings(dt, view, night)` after `updateCritters`;
  > `paintAmbience` calls `setCrossingSnow(base.snow >= FROZEN_SNOW)`.
  > No allocations in the frame path; tests 619/619, tsc + biome clean.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

  > **Notes — Phase 2 verification**: gates at `8991caa`: Vitest 619/619
  > (36 files), `tsc --noEmit` clean, `biome check src` clean. Asset
  > verified with real renders + numeric bboxes (closed arms span the road
  > y −2.99..−2.07, open arms rest on the shoulder x ±1.98, wheel line
  > −0.84 vs rail crowns −0.82, road top −0.96); GLB 84,456 bytes (over
  > the ~60 KB soft target, within the 150 KB house limit — deviation
  > accepted, the kit straight's 640-vert rail mesh is most of it). Bell
  > logic covered by 6 new controller tests (mute/suspend/unmute paths).
  > Visual scene behavior (swing, blink, bell, snow) is e2e-verified in
  > Phase 3 per the workflow's glue rule.

  [checkpoint: 8991caa]

## Phase 3 — E2E, Docs & Wrap-Up

- [x] Task: `e2e/crossing-gate.spec.ts` (touch-emulated tablet viewport,
  no console errors)
  - [x] Place a crossing from the Rails tab on dry land; red ghost over
        water; snap works
  - [x] Train approach → gates close + lantern blinks + bell; after pass
        → gates lift; reload restores the placed crossing

  > **Notes** (commits `da8098a`, `9b07b48`, `275a41f`): the spec drives
  > both tests through the dev handles (smoke/tunnel pattern) — UI-drag
  > placement from the Rails tab onto (3,3), store-level water refusal at
  > (8,8) backing the red ghost, and a 7-piece straight line with the gate
  > mid-line. The ride test witnesses gate phases + the bell edge through
  > new scene debug aids (`crossingPhases()`, `bellRinging()` — commit
  > `da8098a`). **Why a scene witness instead of a network assertion:** the
  > headless WebKit suite never fetches any Howler media (not even the
  > pre-existing chug loop — verified empirically with a scratch probe:
  > ride running, unmuted, zero `/audio/*` requests, console clean), so
  > audio-fetch assertions are unobservable in this environment. Night/
  > winter e2e was dropped: no dev hooks exist to force time-of-day or
  > weather (checked `init-scene`, day clock, weather cycle), and adding
  > forcing machinery is outside this track — the snow-cap template hook
  > mirrors `tunnel_snow_cap`, whose winter behavior shipped without an
  > e2e variant too. 4/4 spec runs pass (tablet + phone). One expected
  > ripple fixed: `ride-toybox-flow`'s rails tab count 3 → 4 (`275a41f`).
- [x] Task: Docs — `CHANGELOG.md` (Unreleased) parent-friendly note;
  `product.md` feature mention; `e2e/README.md` if the suite shape
  changes

  > **Notes** (`abee7c1`): CHANGELOG Unreleased gains a parent-friendly
  > "railway crossing gate" paragraph; `product.md` names the piece in the
  > Build step and gains a ✅ shipped roadmap bullet (Blender-authored via
  > a checked-in recipe, track id + date). No `e2e/README.md` change — the
  > suite shape (workers, profiles, allowlist) is unchanged; the new spec
  > follows the existing conventions.
- [x] Task: Final gates — `biome check`, `tsc --noEmit`, full Vitest
  suite, Playwright suite; Phase Verification & Checkpoint (Refer to
  workflow.md)

  > **Notes**: `pnpm build` + full Playwright suite (all projects,
  > foreground): 101 passed + the 2 count-ripple failures above → fixed
  > and re-run green (6/6 in that spec). Vitest 619/619, `tsc --noEmit`
  > clean, `biome check src e2e` clean. Full-suite reruns logged per the
  > runbook; the Windows WebKit blob: noise did not trip this run.

  [checkpoint: 275a41f]
