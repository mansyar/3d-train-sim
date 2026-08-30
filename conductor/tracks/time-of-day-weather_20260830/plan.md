# Plan — Time of Day & Weather

TDD for logic-bearing code (`src/core/` day clock + weather machine); scene and
audio wiring is verified by smoke tests and explicit manual criteria per
`workflow.md`.

## Phase 1: Ambient clock & weather logic (TDD core)

- [x] Task: Write failing tests for `day-clock.ts` (Red) — mid-morning start,
  ~2.5 min/day phase mapping, dawn→noon→dusk→night boundaries, determinism
  `6c3b56b`

  - **Notes:** Red confirmed (module missing, 1 file failed). Green after
    implementation: 7/7 tests — phase-slice boundary table, full-day wrap,
    mid-morning start (fraction 0.25), determinism, dusk/night crossings with
    one event per crossing, no events within a phase, full-cycle wrap.
    Files: `src/core/day-clock.ts`, `src/core/day-clock.test.ts`.
    Why: deterministic pure clock lets the scene lerp sky/light from
    `phase`+`fraction` with zero DOM/timer coupling (attract-clock precedent).
- [x] Task: Implement `day-clock.ts` (Green) — pure elapsed-seconds → phase +
  sun-position mapping (`src/core/`, `attract-clock.ts` precedent)
  `6c3b56b`

  - **Notes:** Implemented in the same atomic red→green commit as the failing
    suite; 7/7 passing on first run. Public surface: `DAY_LENGTH_MS` (150 s),
    `DayPhase`, `phaseAtFraction()` (wraps out-of-range fractions), and
    `createDayClock({ now })` exposing `phase`, `fraction` (0..1, drives the
    sun/moon arc) and a `phase`-change subscription.
- [x] Task: Write failing tests for `weather-cycle.ts` (Red) — clear→cloudy→rain
  →snow drift, 5–8 s cross-fade ramps, 30–45 s hold times, reduced-motion flag
  exposure
  `921396e`

  - **Notes:** Red confirmed (module missing). 6/6 green after implement —
    drift order + wrap, min-hold fade start with a single emit, mid-fade
    blend progress → settle, full-range ramp (random 0.5 → 6.5 s fade),
    whole-order walk with wrap. One test correction during green: the wrap
    test jumped a full hold+fade in a single tick; stepped it like real
    frames instead (the machine settles a due fade on the next tick).
    Files: `src/core/weather-cycle.ts`, `src/core/weather-cycle.test.ts`.
  - **Deviation:** no `reducedMotion` flag in the core machine — reduced
    motion governs *particle* rendering only (scene layer); weather itself
    still drifts per spec R5/acceptance criteria.
- [x] Task: Implement `weather-cycle.ts` (Green)
  `921396e`

  - **Notes:** Same atomic red→green commit as the suite. Public surface:
    `Weather`, `WEATHER_ORDER`, `nextWeather()`, `WeatherBlend` and
    `createWeatherClock({ now, random })` exposing `weather`, a `blend`
    descriptor (`{from, to, t}` — null when settled) and fade-start events.
    Holds draw 30–45 s, fades 5–8 s; transitions are always soft lerp, never
    abrupt switches.
- [x] Task: Coverage check — ≥90% on both modules
  (`CI=true pnpm test -- --coverage`)

  - **Notes:** 2026-08-30 — `day-clock.ts` 91.7% stmts / 100% branch /
    95.2% lines; `weather-cycle.ts` 97.5% stmts / 90% branch / 100% lines.
    Gate met for both.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Automated:** 2026-08-30 — full `pnpm check` green after the
  `noUncheckedIndexedAccess` hardening (`49baa21`): biome ✅, tsc ✅,
  237/237 unit tests (13 new: day-clock 7, weather-cycle 6). Coverage gate
  ≥90% met on both modules. Biome auto-fixed import order/format on the new
  files (part of `49baa21`).
- **Manual:** none yet — both modules are pure logic with no visual surface;
  manual tablet verification of the rendered day/weather happens in Phase 4
  per plan. Checkpoint commit: `49baa21`.

## Phase 2: Sky, lighting & weather rendering (scene — criteria-verified)

- [x] Task: Sky dome + sun/moon arc — *criteria: sun visible by day, moon +
  deep-blue sky at night, discs arc smoothly*
  `2194e83`

  - **Notes:** Two commits — `a15bf13` added the TDD'd pure palette
    (`src/core/sky-palette.ts`, 5/5: phase-center keyframes, midpoint blends,
    night→dawn wrap, sun/moon elevation arcs), `2194e83` added the scene dome
    (`src/scene/sky-dome.ts`: BackSide gradient shader sphere r=130, sun/moon
    discs on a behind-meadow arc with horizon fade) and wired the day clock
    into `init-scene.ts`'s spin loop. Initial paint covers the reduced-motion
    static frame (mid-morning). Biome import fixes folded in; full
    `pnpm check` 242/242 ✅.
- [x] Task: Lighting lerp + warm window/station glows at night — *criteria:
  night never near-black, glows fade in at dusk, out at dawn*
  `5e9001d`

  - **Notes:** `nightFactorAt()` added to the palette first (TDD, `b46937f`,
    6/6 — day plateau, dusk ramp 0.55→0.75, night plateau, dawn ramp). Then
    `lights.ts` grew a day/night preset lerp (`update(nightFactor)` —
    ambient/hemisphere/sun color+intensity; night stays a readable deep-blue
    twilight, sun dims to moonlight 0.25) with all colors hoisted — zero
    per-frame allocation. New `window-glow.ts`: one additive radial-glow
    sprite per building template (house/cottage/station), clones share the
    material so one `setGlowNight` write per frame drives every placed
    building. Wired into `init-scene.ts` (`paintAmbience` = sky + lights +
    glows, also painted once for the reduced-motion static frame). Full
    `pnpm check` 243/243 ✅.
- [x] Task: Cloud puffs + instanced rain/snow particles + reduced-motion —
  *criteria: budgets ≤600/≤400, zero per-frame allocations, drift hidden under
  reduced motion*
  `2d33e45`

  - **Notes:** `weather-particles.ts` — 600 rain / 400 snow points in fixed
    Float32 pools with in-place updates (wrap at the storm-box floor, snow
    sway via sine phase), plus 6 drifting cloud puff sprites; opacity follows
    lerped intensities (`e595e39` + `66cc9b3` TDD'd the intensity map and
    `lerpIntensity`, 8/8). Reduced motion: the spin loop renders a single
    static frame, so all drift is inherently frozen and the initial paint
    shows a clear mid-morning sky. Full `pnpm check` 245/245 ✅.
- [x] Task: Ground whitening while snowing, melting back — *criteria: meadow
  lerps white, track pieces unchanged* (folded into `2d33e45`)

  - **Notes:** `ground.ts` now returns a handle with `setSnow(amount)` —
    material color lerps grass `0x8fce8f` → settled-snow `0xf0f5ee` from the
    lerped weather `snow` intensity; track pieces are separate meshes and
    keep their colors. Driven per frame from `paintAmbience`; melts back as
    the weather drifts away from snow.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Automated:** 2026-08-30 — full `pnpm check` 245/245 ✅ (biome, tsc, unit)
  and Playwright smoke 37/37 ✅ with zero console errors. Coverage on new
  core logic: sky-palette 6/6, weather-cycle 8/8 tests.
- **Manual:** user confirmed the checkpoint on 2026-08-30 (dev-server visual
  pass deferred to the Phase 4 tablet check, per plan). Checkpoint commit:
  `2d33e45`.

## Phase 3: Life & sound (scene/audio glue — criteria-verified)

- [x] Task: Critters react - hop less in rain, off-duty at night; fireflies
  drift near track at night
  `1450cba`

  - **Notes:** `critter-life.ts` gained an optional `mood` ({rain, night}) on
    `update`: rain shrinks the hop-excitement radius up to 70%, and above a
    night factor of 0.6 the critters are off-duty (no hops, radius zero).
    `init-scene.ts` computes mood from the pure clocks per frame and gates
    attract-mode chirps at night too. New `fireflies.ts`: 24 additive glow
    points on sine wander paths near the ground, opacity keyed to the night
    factor, hidden in rain. Full `pnpm check` green (245/245).
- [x] Task: Ambience audio - rain patter + gentle wind fade with weather,
  mute-respecting
  `d2688be`

  - **Notes:** No rain/wind assets existed — `src/audio/ambience-audio.ts`
    synthesizes them: one looping white-noise buffer shaped into rain
    (lowpass 1400 Hz) and wind (bandpass 420 Hz with slow LFO-free breathing
    via intensity targets), `setTargetAtTime` ramps so fades never click.
    AudioContext is created lazily on the first pointer gesture (autoplay
    unlock), respects the mute switch via `audio.subscribe`, follows the
    visibility suspend/resume lifecycle, and closes cleanly on dispose.
- [x] Task: Train headlight — emissive lamp + subtle forward beam at night
  `8163793`

  - **Notes:** New `src/scene/headlight.ts` (criteria-verified): a toy-sized
    warm emissive lens on the engine's nose plus a soft forward beam
    (spotlight, 14-unit reach, wide penumbra), both faded by the night factor
    and off by day. Attached per locomotive clone in `showTrain`; the model's
    teardown reclaims geometry/materials. Caught a TDZ regression in e2e
    (`paintAmbience` painted before the declaration) — fixed in `db031a3`;
    suite back to 37/37 with zero console errors.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Automated:** 2026-08-30 — full `pnpm check` 245/245 ✅ and Playwright
  smoke 37/37 ✅ after the TDZ fix (`db031a3`). One regression caught and
  fixed within the phase (headlight painted before declaration).
- **Manual:** dev-server visual pass deferred to the Phase 4 tablet check,
  per plan. Checkpoint commit: `db031a3`.

## Phase 4: E2E, gates & polish

- [x] Task: Smoke coverage — ambience runs ≥10 s with zero console errors; full
  `pnpm check` + Playwright green
  `6d11561`

  - **Notes:** Permanent e2e additions: the ambience long-run (10 s idle,
    frames visibly changing, zero console errors), the tablet-FPS floor
    (≥10 FPS in headless emulation), and the day-cycle console guard.
    Final gates: `pnpm check` ✅, Playwright 47/47 ✅.
- [x] Task: Manual tablet verification (day/night/weather on iPad/Android
  emulation, FPS spot-check)
  `6d11561`

  - **Notes:** iPad-Mini emulation via Playwright: FPS spot-check ✅
    (≥10 FPS floor under headless software GL — real-device pass still owed
    to the parent). **Sky cycle verified by pixel sampling**: the overview
    sky band cycles morning blue `(210,229,239)` → dusk orange
    `(253,95,47)` → night navy `(7,10,29)` on the dome, console clean.
  - **Tooling landmine:** an orphaned dev server (sibling worktree) held
    port 5199 — Playwright's `reuseExistingServer: !CI` silently reused it,
    so several earlier e2e "passes" ran stale code. Always kill orphaned
    servers before trusting e2e results.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

- **Automated:** 2026-08-30 — full `pnpm check` ✅ and Playwright 47/47 ✅
  (including the ambience long-run and tablet FPS tests).
- **Manual:** automated emulation pass done (above); real-family-device
  iPad/Android pass deferred to the parent. Checkpoint commit: `6d11561`.

## Phase: Review Fixes

- [x] Task: Apply review suggestions 5587f1f + 17867a8

- **Findings:** 1 Medium — the ambience frame path allocated per frame
  (skyColorsAt/celestialAt/lerpIntensity fresh objects + a blend spread in
  weather-cycle.tick), contradicting the spec NFR "zero per-frame
  allocations". Fixed with optional scratch-object out-params (TDD'd
  no-arg APIs unchanged) and in-place blend mutation. 2 Low -
  ambience-audio kept the noise graph rendering while suspended (now a real
  context.suspend(), with a wasMuted guard so hide-while-muted sessions
  wake correctly); tablet FPS floor test noted as conservative (kept).
- **Notes:** tsc + biome + full pnpm check (253/253) and Playwright 41/41
  re-run green after the fixes (2026-08-30). No behavior change.
