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

- [~] Task: Sky dome + sun/moon arc — *criteria: sun visible by day, moon +
  deep-blue sky at night, discs arc smoothly*
- [ ] Task: Lighting lerp + warm window/station glows at night — *criteria:
  night never near-black, glows fade in at dusk, out at dawn*
- [ ] Task: Cloud puffs + instanced rain/snow particles + reduced-motion —
  *criteria: budgets ≤600/≤400, zero per-frame allocations, drift hidden under
  reduced motion*
- [ ] Task: Ground whitening while snowing, melting back — *criteria: meadow
  lerps white, track pieces unchanged*
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Life & sound (scene/audio glue — criteria-verified)

- [ ] Task: Critters react — hop less in rain, off-duty at night; fireflies
  drift near track at night
- [ ] Task: Ambience audio — rain patter + gentle wind fade with weather,
  mute-respecting
- [ ] Task: Train headlight — emissive lamp + subtle forward spotlight at night
  only
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: E2E, gates & polish

- [ ] Task: Smoke coverage — ambience runs ≥10 s with zero console errors; full
  `pnpm check` + Playwright green
- [ ] Task: Manual tablet verification (day/night/weather on iPad/Android
  emulation, FPS spot-check)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
