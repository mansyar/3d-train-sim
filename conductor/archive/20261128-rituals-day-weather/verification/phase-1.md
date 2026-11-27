# Phase 1 verification — Greeting director

Track: `20261128-rituals-day-weather`
Branch: `feat/20261128-rituals-day-weather`
Phase base: `43a3fdd8842472c874dae52f14359bcef99040bc`

## TDD Red (before implementation)

`pnpm test:coverage` exited 1 with:

- `Error: Cannot find module './rituals' imported from D:/Projects/3d-train-sim/src/state/rituals.test.ts`
- `src/core/import-graph.test.ts`: `src/state/rituals.test imports ./rituals, which resolves to no file`
- 2 failed files; 1051 tests collected, 1050 passed.

This is the expected failure: the tests existed before the module, proving they can fail.

## TDD Green (after implementation)

`pnpm test:coverage` exited 0:

- 61 test files passed, 1060 tests passed (9 new `src/state/rituals.test.ts` tests included).
- Coverage thresholds (≥80% statements/branches/functions/lines over `src/core` + `src/state`) green:
  statements 97.23%, branches 91.51%, functions 97.51%, lines 98.97%.
- Harmless Vite warning about `configLoader: 'native'` / extensionless `./src/core/security-headers`
  in `vite.config.ts:6` (pre-existing, unrelated).

Re-run after the frame-contract edit: identical green result (61 files / 1060 tests, same coverage).

## Files

- `src/state/rituals.test.ts` (new, 9 tests): phase→greeting map, settle window, no fire without
  transition, spam yields only the resting phase once, in-flight voice yields, `release()` frees the
  voice, unsubscribe stops delivery.
- `src/state/rituals.ts` (new): `SETTLE_MS`, `Greeting`, `PHASE_GREETINGS`, `greetingForPhase`,
  `GreetingEvent`, `RitualDirector`, `createRitualDirector()` — pure tick-driven state, no DOM/audio/
  three.js, no dependencies.
- `src/scene/frame-contract.ts`: comment-only documentation of the new system with its reason.
  No runtime tuple entry: `FRAME_SYSTEM_ORDER` is validated at boot by `createFrameRunner`, and the
  wiring (`init-scene.ts`) and `frame-contract.test.ts` are out of this phase's Touches, so adding a
  13th name would break the fail-fast check and the pinned twelve-name tests. Recorded as a deviation
  for the primary; the runtime slot belongs to the greeting-rendering phases.

## Checks not run

- `pnpm exec biome check src/state/rituals.ts src/state/rituals.test.ts src/scene/frame-contract.ts`
  → permission rejected by the phase-executor shell (not retried). Style followed the project's
  Biome settings: single quotes, semicolons, 2-space indent, line width 100, trailing commas.
- `pnpm exec tsc --noEmit`: not attempted; `pnpm exec` is unavailable to this shell. Vitest/TS
  transform of all files passed as part of `pnpm test:coverage`.

## Commit

None — the brief requires explicit instruction from the primary before committing.

## Primary verification (2026-11-28T02:19:32+11:00)

- Tree vs phase base `43a3fdd`: only `src/state/rituals.ts` (new), `src/state/rituals.test.ts`
  (new), `src/scene/frame-contract.ts` (+5 comment lines), `verification/phase-1.md` — matches
  Touches plus the evidence allowlist.
- `pnpm test:coverage` re-run by the primary: green, 97.23% / 91.51% / 97.51% / 98.97%
  (statements / branches / functions / lines) over `src/core` + `src/state`, gate ≥80% met.
- `pnpm vitest run src/state/rituals.test.ts`: 9 passed.
- `pnpm check` (biome + tsc + full suite): initially 1 biome organize-imports error in the new
  test file, fixed by the primary (import-name sort); re-run fully green, 61 files / 1060 tests.
- AC-1 / FR-1 / FR-8 / NFR-5 / NFR-6 covered by the 9 unit tests; deviation (comment-only
  frame-contract entry) accepted — `FRAME_SYSTEM_ORDER` is pinned to twelve names and the
  wiring files are Phase 2–3 scope. Open question carried into the Phase 2/3 briefs.
- **Result:** verified. **Checkpoint:** `d3099f0`. **Evidence:** `verification/phase-1.md`.
