# Phase 2 verification — Day greetings (dawn / morning / noon)

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `0cc688c09d0641d5d2d8a209e33acfe909e7a991`

## P2.T1 — Actor-authoring spike (decision + cap check)

**Decision: procedural three.js pooled families, not checked-in Blender/GLB recipes.**

- NFR-1 (pooled, capped): `createChorusCritters`, `createButterflies` and `createNoonGlow` each
  allocate once at boot and hold hard caps. `CHORUS_CAP = 20` points; `BUTTERFLY_CAP = 14` butterflies
  rendered as `14 × 2 = 28` wing points; one glow sprite + one fill light. Each family owns a single
  `BufferGeometry` + `PointsMaterial` pair, with a preallocated `Float32Array` and
  `DynamicDrawUsage`. `update()` only rewrites existing transforms/opacity — no meshes, no arrays,
  no object creation on the frame path. Deterministic index hashes replace `Math.random`, so
  screenshots are reproducible.
- NFR-3 (precache, no first-greeting hitch): there are no async loads, no fetch, no new files under
  `public/`, so Workbox precache size is unchanged and nothing can hitch on first greeting. The glow
  texture is generated locally from a `CanvasTexture`, never fetched.
- Fail-safe: `createDayRituals()` catches actor-build failure and returns an inert witness, so a
  broken GL context cannot abort boot. Dusk/night events are ignored by the day stage.
- Cap check in the browser: the e2e spec asserts `chorusCount ≤ 20`, `butterflyCount ≤ 28`, dawn
  shows exactly 20 chorus points with zero butterflies, morning shows butterflies with zero chorus,
  and noon shows 20 chorus points with the glow at full level.

## Carried question — frame-contract runtime slot

**Answer: no 13th runtime slot.** `FRAME_SYSTEM_ORDER` is pinned to twelve names and validated at
boot by `createFrameRunner`; `frame-contract.test.ts` and `e2e/frame-contract.spec.ts` both hardcode
the twelve (`e2e/frame-contract.spec.ts` is outside this phase's Touches). The day rituals need no
`FrameInputs`: they are event-driven (`dayAmbience.subscribeDayPhase` → `director.observe`) plus a
per-frame `update(dt)`/`director.tick(dt * 1000)` called from the existing `onFrame` after
`frameRunner.run(...)`. The Phase 1 comment-only NFR-6 line remains the accurate documentation.
`frame-contract.ts` and its test were therefore left untouched.

## Files

- `src/scene/actors/day-fliers.ts` (new): pooled chorus / butterfly / noon-glow families; caps,
  deterministic motion, `dispose()`.
- `src/scene/rituals/day.ts` (new): `GREETING_MS`, pure `greetingEnvelope()`, `createDayRituals()`,
  `RitualWitness`, inert fail-safe. Subscribes only to the three day greetings; releases the
  director's voice after the stage window.
- `src/scene/init-scene.ts` (wiring only): imports, `rituals()` probe on `SceneHandle`, director
  subscription, `tick`/`update` in `onFrame`, teardown in `dispose()`.
- `e2e/rituals-day.spec.ts` (new): settles dawn, morning and noon through `setDayPhase`, waits on
  the frame-driven witness, asserts caps/family exclusivity/no console errors, and writes three
  screenshots.

## Checks

- `pnpm check` (biome + tsc + vitest) → exit 0, 209 files checked, 61 test files / 1060 tests passed.
  First run exited 1 on seven Biome organize-import/format findings in the new files; fixed by hand
  with `edit` (the `--write` formatter invocation was rejected by the phase shell), then re-run green.
  Harmless pre-existing Vite `configLoader: 'native'` warning.
- `pnpm exec playwright test e2e/rituals-day.spec.ts` → exit 0, 1 passed on `[tablet]` (48.7 s),
  no console errors. Each `test.step` waited for `activeGreeting === expected && level > 0.8`.
- Full Playwright suite is Phase 5 scope.

## Screenshots (gitignored, not committed)

- `.conductor/media/20261128-rituals-day-weather/dawn.png` — amber dawn sky, chorus wake-up.
- `.conductor/media/20261128-rituals-day-weather/morning.png` — pale morning sky, butterflies.
- `.conductor/media/20261128-rituals-day-weather/noon.png` — bright additive halo plus liveliest
  chorus.

All three were visually inspected. The large black polygon at the horizon is a pre-existing scene
artifact, not a regression: the same shape is visible in the older
`.conductor/media/toybox-clarity_20261119/frame-1.png` capture.

## Commit

None — the brief requires explicit instruction from the primary before committing.

## Primary verification (2026-11-28T02:32:01+11:00)

- Tree vs phase base `0cc688c`: only `src/scene/init-scene.ts` (+20 wiring lines),
  `src/scene/actors/day-fliers.ts`, `src/scene/rituals/day.ts`, `e2e/rituals-day.spec.ts`
  (new) and `verification/phase-2.md` — matches widened Touches plus evidence/e2e allowlist.
- `pnpm check` re-run by the primary: green, 61 files / 1060 tests.
- `pnpm exec playwright test e2e/rituals-day.spec.ts` re-run by the primary: 1 passed on
  `[tablet]` (1.1 m), zero console errors; three screenshots regenerated under
  `.conductor/media/20261128-rituals-day-weather/`.
- FR-2/FR-3/FR-4, AC-2 (day), AC-3 (day) covered; spike decision (procedural pooled
  families) and cap check recorded; frame-slot question answered (no slot, reasoned).
- Pre-existing horizon polygon confirmed out of scope (matches older capture).
- **Result:** verified. **Checkpoint:** `d35b17b`. **Evidence:** `verification/phase-2.md`.
