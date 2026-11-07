# Phase 1 — The contract and the wiring

- **Track:** `frame-contract_20261109`
- **Phase:** 1 of 3
- **Date:** 2026-11-09
- **Branch:** `refactor/frame-contract_20261109`
- **Base:** `bfbdac1b10d446e3f42fae1256ff00d4b92c4aa2`
- **Head:** `506a33d4c5129d8f3f6480cc2cf626b4ef406976`
- **Result:** `verified`

## Commits

| Commit | Task | Message |
|---|---|---|
| `b744ccf023a4f18fa8a55902f396a81da2877437` | P1.T2 (red, test-first) | `test(scene): prove the frame contract order and tick counters` |
| `1a009a97948f61e168fb07e4f1bc0f6edcded4e0` | P1.T1 | `feat(scene): add the named frame contract and its runner` |
| `7ed52e952b316c4c8f8a3fc7a6f57966a01cb035` | P1.T3 | `refactor(scene): publish the fleet's puff count without a return value` |
| `506a33d4c5129d8f3f6480cc2cf626b4ef406976` | P1.T4 | `refactor(scene): drive the frame loop from the named contract runner` |

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static + unit | `pnpm check` | 0 | Biome 180 files clean; `tsc --noEmit` clean; Vitest 51 files, **891 passed** (883 pre-existing + 8 new) |
| e2e smoke | `pnpm exec playwright test e2e/smoke.spec.ts` | 0 | **13 passed, 1 skipped, 0 failed** (2.5 min) on the final run |

### Smoke flake (recorded, not hidden)

The exact smoke command was run three times:

1. Run 1 — **1 failed, 13 passed**: `parent-gate` spec failed on **tablet and phone** at
   `e2e/smoke.spec.ts:810` (`aria-label` never reached `/Confirm/i` after a 2400 ms hold).
2. Run 2 — **1 failed, 13 passed**: the same step failed on **phone only**; tablet passed.
3. Run 3 — **0 failed, 13 passed, 1 skipped**, exit 0.

The failing step is a DOM hold-timer (`setTimeout(armConfirm, 2000)` in `src/ui/parent-gate.ts`)
unrelated to the frame loop; the spec is the suite's documented contention-sensitive one
(`nightly.yml` repeats `smoke` with `--repeat-each=2`). It failed on both projects when the
machine was loaded and passed on the final exact run. Not attributed to this track.

## Red step (test-first)

`src/scene/frame-contract.test.ts` was written before the module existed. The first verification
run (same `pnpm check` command) stopped at Biome on the new test file's import order (fixed), and
the next run failed the typecheck exactly as intended:

```text
src/scene/frame-contract.test.ts(8,8): error TS2307: Cannot find module './frame-contract' or its corresponding type declarations.
src/scene/frame-contract.test.ts(42,34): error TS7006: Parameter 'name' implicitly has an 'any' type.
... (one implicit-any per callback that derives its type from the missing module)
[ELIFECYCLE] Command failed with exit code 1.
```

A narrower `pnpm exec vitest run src/scene/frame-contract.test.ts` was denied by permissions, so
the red proof comes from the configured `pnpm check` gate instead (see Blockers).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | `FRAME_SYSTEM_ORDER` lists all twelve systems in order | `frame-contract.test.ts` › *FRAME_SYSTEM_ORDER › names the twelve systems in the shipping order* compares the tuple against the twelve literal names; the tuple itself is `src/scene/frame-contract.ts` | pass |
| AC-2 | Wrong length, wrong name and swapped pair throw, naming the offender | `frame-contract.test.ts` › *throws and names the missing system* (`missing system "portal-glow"`), *throws and names an unexpected system* (`unexpected system "air"`), *throws on a swapped pair, naming the misplaced system and the index* (`expected "crossings" at index 5, got "delight"`) | pass |
| AC-3 | One tick per system per `run()`, snapshot in documented order | `frame-contract.test.ts` › *ticks every system once per run, in the documented order* (three runs → every counter `3`, call log equals the order ×3), *hands every system the same FrameInputs object* (reference identity), *snapshots a fresh array whose names and ticks match the counters* | pass |
| AC-5 | No system returns a value; `steamPuffCount()` reports the old numbers | `FrameSystem.update` is typed `void` (no system carries a value forward); `TrainFleet.update(dt): void` + `steamPuffCount()` in `train-fleet.ts`; the existing e2e assertion `steam puffs at the chimney: a whistle burst, a ride, and the whole fleet` passed in the final smoke run (`> 0` at burst/ride, `=== 0` when stopped) | pass |

AC-4 (browser once-per-frame proof) and AC-6/AC-7 (measurement + tech-stack note) belong to
Phases 2 and 3 and are **not proven here**. `frameSystems()` exists and compiles, but no browser
test calls it yet.

## The `starSpot` allocation (deliberate exception)

`onFrame` still allocates one `{ x, z }` object per frame when a train rides:

```ts
const star = fleet.primary();
frameInputs.starSpot = star ? { x: star.model.position.x, z: star.model.position.z } : null;
```

This is unchanged behaviour and intentional: the camera, critters, duck and portal glow need a
snapshot of the spot, and reusing one mutable object would let a later system read a spot another
system already mutated (or keep a stale reference). Everything else in the per-frame path is
allocation-free — one preallocated `FrameInputs`, fixed-size integer counters, no `map`/spread in
`run()`, snapshots only when the probe is called.

## Deviations

1. **`FrameInputs.rain` / `snow` are `number` (0..1), not `boolean`** as the brief sketched.
   The shipping code passes `WeatherIntensity.rain` / `.snow` — eased 0..1 values — into
   `CritterMood`, `DuckMood` and the barge. Coercing to a boolean would change what critters,
   the duck and the barge receive (e.g. rain 0.4 → 1), violating FR-12/AC-5. The brief's own
   `onFrame` pseudocode copies `weather.rain` straight into `frameInputs.rain`, so the numeric
   shape is what that code requires. Files: `src/scene/frame-contract.ts`,
   `src/scene/frame-contract.test.ts`.
2. No files outside the phase `Touches` were modified. `git diff --stat <base>..HEAD` shows only
   `frame-contract.ts`, `frame-contract.test.ts`, `init-scene.ts`, `train-fleet.ts` — no
   `src/core`, no dependency, no lockfile.

## Notes

- **Input sampling order (superseded).** The subagent's first wiring filled `FrameInputs` before the
  runner started, which made `night`/`weather` lag the ambience clocks by one frame. The primary
  closed that in the same phase: `day-ambience` now publishes `night`/`rain`/`snow` immediately
  after `tick()`/`paint(dt)`, so consumers read this frame. The note is kept as the record of what
  was wrong and why the publish-from-the-owner pattern exists (see the rework below).
- Every rationale comment from the old `onFrame` body survives, moved onto the system it
  describes (chug tempo, critter mood, crossing gates, delight, music boxes, duck, barge, portal
  glow). The "in this exact order" line now points at the contract module.
- `FRAME_SYSTEM_ORDER` is a single `as const` tuple with one `//` reason per entry (FR-7), and
  `FrameSystemName` is derived from it, so adding a name without a wired system (or wiring an
  undocumented one) fails the type and the construction check.
- `pnpm check` reports 891 tests: the 883 existing tests remain green, plus 8 new contract tests.
- `frame-systems` probe is wired but only exercised in Phase 2; nothing in this phase calls it.

## Blockers in this run (informational — the phase did not need them)

| Command | Why | Denied result | Covered by |
|---|---|---|---|
| `pnpm exec vitest run src/scene/frame-contract.test.ts` | the narrow red/green loop for one new spec | `permission.rejected: Permission denied: shell` | `pnpm check`, which runs `vitest run` for the whole suite |

## Primary verification

Run on HEAD after the phase report, tree clean apart from the changes below.

| Check | Result |
|---|---|
| `pnpm check` | exit 0 — Biome clean, `tsc --noEmit` clean, 51 files / **892 tests** (883 pre-existing + 9 new) |
| `pnpm exec playwright test e2e/smoke.spec.ts` | exit 0 — **13 passed, 1 skipped** (the `@ci` canary) in 1.8 min |
| Diff scope `bfbdac1..HEAD` | exactly the four Touches plus this file (5 files, +547/−49) |
| `src/core`, dependencies, lockfile | untouched |

### Review notes

- **Order preserved.** The systems array is the old `onFrame` body split into twelve
  closures, in the same sequence; every behavioural comment moved to the system it
  describes. The runner validates names *and* positions at construction, and the
  "equal length, every name present, duplicate past the end" case has its own throw.
- **One behaviour delta found and closed by the primary.** The first wiring sampled
  `night`/`rain`/`snow` before `frameRunner.run`, so critters, the duck, the barge and
  the portal glow read the *previous* frame's mood — before this phase they read the
  value the paint had just produced. The `day-ambience` system now publishes
  `inputs.night/rain/snow` immediately after `tick()`/`paint(dt)`, so mood values are
  once again this frame's. The subagent flagged the lag honestly; the fix is one block in
  the system that owns those values, and `frame-contract.test.ts` gained a test ("lets an
  earlier system publish values a later one reads") for the publish-then-read *pattern* —
  the wiring itself is what review round 1 caught for `starSpot`, and the same owner
  pattern now covers it in `fleet`.
- **Accepted deviation:** `FrameInputs.rain`/`.snow` are `0..1` intensities, not
  booleans (the brief guessed booleans). Weather eases between states and those values
  flow into `CritterMood`/`DuckMood`, so coercing them would have changed behaviour.
- **Known remaining allocation:** `starSpot` is still one object literal per frame. It is
  unchanged behaviour and deliberate: systems need a snapshot, and a reused mutable
  spot would alias across them.
- **Not proven here:** `frameSystems()` compiles and is wired, but nothing calls it until
  Phase 2 (AC-4). AC-5 rests on the smoke suite, which passed.

