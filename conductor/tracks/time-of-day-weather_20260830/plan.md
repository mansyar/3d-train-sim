# Plan — Time of Day & Weather

TDD for logic-bearing code (`src/core/` day clock + weather machine); scene and
audio wiring is verified by smoke tests and explicit manual criteria per
`workflow.md`.

## Phase 1: Ambient clock & weather logic (TDD core)

- [ ] Task: Write failing tests for `day-clock.ts` (Red) — mid-morning start,
  ~2.5 min/day phase mapping, dawn→noon→dusk→night boundaries, determinism
- [ ] Task: Implement `day-clock.ts` (Green) — pure elapsed-seconds → phase +
  sun-position mapping (`src/core/`, `attract-clock.ts` precedent)
- [ ] Task: Write failing tests for `weather-cycle.ts` (Red) — clear→cloudy→rain
  →snow drift, 5–8 s cross-fade ramps, 30–45 s hold times, reduced-motion flag
  exposure
- [ ] Task: Implement `weather-cycle.ts` (Green)
- [ ] Task: Coverage check — ≥90% on both modules
  (`CI=true pnpm test -- --coverage`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Sky, lighting & weather rendering (scene — criteria-verified)

- [ ] Task: Sky dome + sun/moon arc — *criteria: sun visible by day, moon +
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
