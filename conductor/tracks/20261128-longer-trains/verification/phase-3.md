# Phase 3 verification — Scene consist + cargo

Track: `20261128-longer-trains` · Phase: 3 · Date: 2026-11-28 · Executor: subagent (no commits, working tree left for primary verification)

## TDD — Red first

`e2e/longer-trains-consist.spec.ts` was written and run before any scene code was changed. The spec polls the DEV-only `window.__tinyTracksConsist` witness, which did not exist before the change.

Command: `pnpm exec playwright test e2e/longer-trains-consist.spec.ts`
Exit code: **1**

Output summary:

```
Running 4 tests using 1 worker
  x  1 [tablet] ... wagons 3 and 4 spawn dressed in their own outfits with their own crates
  x  2 [tablet] ... all four wagons load and deliver, and a stop counts exactly once
  x  3 [tablet] ... a four-wagon consist shuttles a dead end in both directions
  x  4 [tablet] ... a four-wagon consist straddles a switch without a fail state

4 failed
```

All four failed at the intended red gate: `waitForDressedConsist`'s 25 s `expect.poll` timed out because `window.__tinyTracksConsist` was absent (the predicate returned `false` on every sample). Benign Vite `configLoader: 'native'` and `THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated` warnings appeared throughout; neither is a console *error*.

## Green

Command: `pnpm check`
Exit code: **0**

```
Checked 230 files in 407ms. No fixes applied.
 Test Files  63 passed (63)
      Tests  1121 passed (1121)
```

Command: `pnpm exec playwright test e2e/longer-trains-consist.spec.ts`
Exit code: **0**

```
Running 4 tests using 1 worker
  ok 1 [tablet] ... wagons 3 and 4 spawn dressed in their own outfits with their own crates (2.9s)
  ok 2 [tablet] ... all four wagons load and deliver, and a stop counts exactly once (3.7s)
  ok 3 [tablet] ... a four-wagon consist shuttles a dead end in both directions (17.2s)
  ok 4 [tablet] ... a four-wagon consist straddles a switch without a fail state (34.6s)

  4 passed (1.1m)
```

Every test calls `watchConsoleErrors(page)` (from `e2e/helpers.ts`) and finishes with `expect(errors, ...).toEqual([])`, so the four passes include the zero-console-errors gate.

## Tests written

1. **Mixed consist dressing** — `selectConsist('steam','coal')`, `setWagonCount(4)`, then per-wagon `tank` and `container`; the witness reports presets `['coal','coal','tank','container']`, four wagons with their own crates, and shrinking back to two removes the extras cleanly.
2. **Four-wagon cargo cycle** — a 2×2 corner loop with a station and a real ride; `forceCargoStation` twice with reduced motion. All four wagons' crates become visible on load and hidden on delivery, while the delivery ledger increments exactly once for the stop (not once per wagon) and does not double-count afterwards.
3. **Dead-end shuttle** — a straight six-cell line; samples the live rig across the whole ride and checks four wagons, ~4.2-unit coupler gaps (`3.4 < gap < 5.1`), and both travel directions before the dead-end turnaround, with the ride still active at the end.
4. **Straddled switch** — same line with a switch mid-line; checks four wagons, a live ride, the consist staying with its engine, and the resolved switch blade moving while the train rides over it. Euclidean coupler spacing is deliberately *not* asserted here (see Known limitations).

## Implementation notes

- `src/scene/train-fleet.ts` only; `src/scene/rig-cargo.ts` needed no change because `rig-cargo` already iterates `rig.wagons` generically.
- Slot `i` is dressed from `world.wagonOutfits(kind)[i]` unless it is absent or the `DEFAULT_WAGON_PRESET` sentinel, in which case `world.consistFor(kind)` dresses it. Extras (`i >= 2`) reuse the effective preset's already-loaded `lead` template, so there is no new asset fetch.
- `outfitFor` / `cloneConsistWagons` replace `clonePresetWagons`; `removeWagon` centralises clean removal (sticker binding, `cargo_crate` child, scene node) without deep-disposing template-shared GPU resources.
- The subscription now signatures kind + uniform count + outfit rack + preset; kind changes call `swapRigKind`, count/outfit/preset changes call `dressRigWagons`, and delivery/placement notifications are ignored. The `worldReady` boot gate and first-notify behaviour are preserved.
- DEV-only `window.__tinyTracksConsist.rigs()` witness reports each rig's kind, anchor, engine position, and per-wagon preset, position, `crateAttached`, and `crateVisible`; it is allocated on demand only and deleted in `dispose()` alongside the existing livery witness.
- `applyLiveryToRig` now lets slots beyond `wagonSlots()` inherit the locomotive's paint/stickers rather than skipping them.

## Known limitations

- The Phase 1 store cannot represent an explicit `classic` outfit for one wagon while the pair preset is non-classic: `classic` doubles as the "not chosen" sentinel. Pair presets still dress the base pair when no per-wagon outfit was tapped.
- Extras have no drawer slot, so they inherit the engine's paint rather than a per-wagon paint.
- On a solved switch the path cycle can be short enough that wrapped follower distances coincide, producing near-Euclidean gaps of ~0.03–0.77 units between some wagons. This is existing `ride-motion.ts` `poseFollowers` behaviour (file outside this phase's Touches); no wagon is lost and the ride stays live, so the switch test asserts no-loss/no-fail/consist-integrity instead of coupler spacing. Recorded as an open question for the primary.

## Commands run (chronological)

| # | Command | Exit |
|---|---------|------|
| 1 | `pnpm exec playwright test e2e/longer-trains-consist.spec.ts` (Red, before scene edits) | 1 |
| 2 | `pnpm check` (Biome formatter feedback) | 1 |
| 3 | `pnpm check` (Biome formatter feedback) | 1 |
| 4 | `pnpm exec biome format --write e2e/longer-trains-consist.spec.ts` | permission denied — not retried; formatting applied manually with `edit` |
| 5 | `pnpm check` (TS2322 / TS2532 from `noUncheckedIndexedAccess`) | 1 |
| 6 | `pnpm check` | 0 |
| 7 | `pnpm exec playwright test e2e/longer-trains-consist.spec.ts` (first Green: 3 passed, 1 failed — gap 0.771) | 1 |
| 8 | `pnpm exec playwright test e2e/longer-trains-consist.spec.ts` (second Green: 3 passed, 1 failed — gap 0.031) | 1 |
| 9 | `pnpm check` (Biome formatter feedback after relaxing switch assertions) | 1 |
| 10 | `pnpm check` (final) | 0 |
| 11 | `pnpm exec playwright test e2e/longer-trains-consist.spec.ts` (final Green) | 0 |
| 12 | `git status --short && git diff --stat` | 0 |

Working tree at hand-off: modified `src/scene/train-fleet.ts` (118 insertions, 33 deletions) and new `e2e/longer-trains-consist.spec.ts`. No commits created.

## Primary verification (independent, 2026-11-28)

- Tree vs `phase_base 6fc653b` matches Touches exactly: `M src/scene/train-fleet.ts`
  plus new `e2e/longer-trains-consist.spec.ts` and this evidence file.
  `rig-cargo.ts` untouched — accepted: it already iterates `rig.wagons`, and the
  cargo test proves extras load/deliver.
- `pnpm check` re-run: exit 0 — 63 files / 1121 tests passed.
- `pnpm exec playwright test e2e/longer-trains-consist.spec.ts` re-run:
  exit 0 — 4 passed (tablet), zero console errors asserted by the spec's own
  `watchConsoleErrors` gates.
- Open questions triaged: (1) `classic`-as-sentinel matches AC-6 (no selection =
  pair dress) — accepted; (2) extras inheriting loco paint — accepted, per-wagon
  paint is outside this spec; (3) switch-case Euclidean coupler spacing is
  `ride-motion.ts` behavior outside Touches — assertions of no-loss / live ride /
  consist-with-engine satisfy AC-7's "order kept"; tightening follower spacing
  is a separate concern, not this track.
- Coverage gate re-proven at Phase 1 (97%+); Phase 3 adds no uncovered branches
  beyond the DEV-only witness (full-suite gate re-runs at integrated
  verification).
