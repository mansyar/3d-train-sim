# Phase 3 verification — Dusk and night greetings

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `d04eca7f1bc575871e5d699fed5b391bd8f59a34`

## P3.T1 — Dusk (FR-5)

- `createSettlingCritters()` is a single preallocated `BufferGeometry`/`PointsMaterial` pair with a
  hard cap of 16 points. `level` fades it, `liveliness = 1 - level` lowers the flock from a flutter
  onto the meadow as the windows warm — the "critters settle" half of FR-5. Deterministic index
  hashes (no `Math.random`) make screenshots reproducible.
- "Windows warm" reuses the existing `window-glow.ts` path: the stage calls `setGlowNight()` with
  `ambient night + 0.45 * envelope`, boosting the dusk bed (0.55) to full warmth, then restores the
  ambient value when the moment ends. This is the same shared-material pattern `day-ambience.ts`
  uses, so no new glow owner is introduced.
- The stage ignores day greetings and never releases a voice it does not own, mirroring `day.ts`.

## P3.T2 — Night (FR-6)

- `createRisingFireflies()` is a second capped pool (24 points, additive) that climbs from the grass
  to the night hover as the envelope rises — a distinct surge on top of the clock's ambient
  fireflies, not a duplicate of `scene/fireflies.ts`.
- Headlight boost reuses the actual `Headlight[]` the fleet owns: the stage paints
  `ambient night + envelope` into those same instances and restores the bed on exit.
- **Lullaby hook:** `DuskNightRituals.registerLullabyHook()` is the single Phase 4 attachment point.
  `init-scene.ts` registers a counted no-op today; the night greeting fires every registered hook
  exactly once. The witness exposes `lullabyHooks` (count) and `lullabyFires` (firings). The synthesized
  motif itself is Phase 4 scope and is not implemented here.

## P3.T3 — Reduced-motion resting states for all five greetings

- `applyResting(greeting)` on both stages paints a frozen pose with `dt = 0` (no time advance) and
  no liveliness: dawn chorus, morning butterflies, noon halo, dusk settled critters + warm windows,
  night risen fireflies + full headlight. The day stage was extended with the same seam; this is the
  one deviation from the literal Touches list, explicitly called for by P3.T3 ("extend the day stage
  if needed").
- Under reduced motion the spin loop renders one static frame and never calls `onFrame`, so the
  director's `tick` never fires. `init-scene.ts` therefore applies the resting pose directly on
  boot (silent — no lullaby) and on every phase transition (night transition fires the hook, as a
  tap is a user gesture). Reduced motion rests bodies, not sound — the music-box precedent.
- Both witnesses carry `restingGreeting` so Phase 5 can prove the frozen states without a RAF loop.
  Full reduced-motion and rapid-tap e2e proofs remain Phase 5 scope per the brief.

## Wiring

`src/scene/init-scene.ts` (wiring only): creates both stages from the one director, passes the
ambient `nightFactor()` and the fleet `headlights` into the night stage, registers the lullaby hook,
applies resting poses under reduced motion, ticks `nightRituals.update(dt)` after the existing day
stage in `onFrame`, exposes `nightRituals()` on the dev handle, and tears everything down in
`dispose()`. `frame-contract.ts` and its test were left untouched.

## Files

- `src/scene/actors/dusk-night-actors.ts` (new): pooled, capped settling-critter and rising-firefly
  families, deterministic motion, `dispose()`.
- `src/scene/rituals/dusk-night.ts` (new): `DuskNightWitness`, `LullabyHook`, `GREETING_MS`-based
  envelope reuse, dusk/night subscribe/render/restore stage, inert fail-safe.
- `src/scene/rituals/day.ts` (modified, deviation): `restingGreeting` witness field, `applyResting()`,
  `DayRitualOptions.reducedMotion` gate.
- `src/scene/init-scene.ts` (modified, wiring only): imports, stage construction, resting seam,
  frame tick, dev witness, teardown.
- `e2e/rituals-night.spec.ts` (new): settles dusk and night via `setDayPhase`, waits on the real
  frame-driven witness, asserts warmth / settling / rise / headlight / one-hook / caps / clean
  console, and writes two screenshots.

## Checks

- `pnpm check` (biome + tsc + vitest) → exit 0, 212 files checked, 61 test files / 1060 tests passed.
  An early `pnpm exec biome check .` exited 1 on four organize-import/format findings in the new
  files; fixed by hand with `edit`, then green. Harmless pre-existing Vite `configLoader: 'native'`
  warning.
- `pnpm exec playwright test e2e/rituals-night.spec.ts` → exit 0, 1 passed on `[tablet]` (4.9 s),
  zero console errors. Both steps waited for `activeGreeting === expected && level > 0.8`.
- Full Playwright suite is Phase 5 scope.

## Screenshots (gitignored, not committed)

- `.conductor/media/20261128-rituals-day-weather/dusk.png` — warm lit windows, settling critters over
  the rails, dusk sky.
- `.conductor/media/20261128-rituals-day-weather/night.png` — risen fireflies over the meadow, train
  headlight beam on, windows glowing.

Both were visually inspected and confirmed to show the intended moments.

## Commit

None — the brief requires explicit instruction from the primary before committing.

## Primary verification (2026-11-28T02:42:24+11:00)

- Tree vs phase base `d04eca7`: only `src/scene/actors/dusk-night-actors.ts`,
  `src/scene/rituals/dusk-night.ts` (new), `src/scene/rituals/day.ts` (+48, P3.T3 seam),
  `src/scene/init-scene.ts` (wiring), `e2e/rituals-night.spec.ts` (new) and
  `verification/phase-3.md` — matches Touches plus the P3.T3-sanctioned day-stage seam.
- `pnpm check` re-run by the primary: green, 61 files / 1060 tests.
- `pnpm exec playwright test e2e/rituals-night.spec.ts` re-run by the primary: 1 passed on
  `[tablet]`, zero console errors; dusk + night screenshots regenerated.
- FR-5/FR-6/FR-9, AC-2 (night), AC-3 (night) covered; caps asserted in-browser (16 critters,
  24 fireflies); lullaby hook registered once, motif deferred to Phase 4.
- **Result:** verified. **Checkpoint:** `c450027`. **Evidence:** `verification/phase-3.md`.
