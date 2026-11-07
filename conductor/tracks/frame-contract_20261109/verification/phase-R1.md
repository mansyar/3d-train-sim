# Phase R1 — Review Fixes — Verification

**Track:** `frame-contract_20261109`
**Performed by:** primary agent (findings touch `conductor/` state, which the phase subagent cannot write)

## Goal

Close the six round-1 findings: the stale `starSpot` (same defect class as the mood lag), the over-claiming
publish test, the load-bearing browser order assertion, the untested duplicate guard, the inaccurate evidence
claims, and the `FrameInputs` JSDoc.

## Commands

| Command | Exit | Result |
|---|---|---|
| `pnpm exec biome check . --write` | 0 | 181 files, fixed 2 (formatting after the edits) |
| `pnpm exec tsc --noEmit` | 0 | clean |
| `pnpm test` | 0 | 51 files / **893 tests** (892 + the appended-duplicate case) |
| `pnpm exec playwright test e2e/frame-contract.spec.ts` | 0 | 1 passed (17.9 s) |

## F1 — `starSpot` was a frame late

Before: `onFrame` filled `frameInputs.starSpot` from `fleet.primary()` and then called `frameRunner.run()`, but
`fleet.update(dt)` runs *inside* the run. So `critters`, `duck` and `portal-glow` received the primary train's
position as of the previous frame. The pre-phase `onFrame` body sampled after the fleet tick, so this was a genuine
behaviour change — the identical mistake Phase 1 had made for `night`/`rain`/`snow` and fixed there.

After: the `fleet` system publishes the spot itself, immediately after the move:

```ts
{
  name: 'fleet',
  update(inputs, dt) {
    fleet.update(dt);
    const star = fleet.primary();
    inputs.starSpot = star ? { x: star.model.position.x, z: star.model.position.z } : null;
  },
},
```

and `onFrame` is now only `frameRunner.run(frameInputs, dt)`. Everything downstream reads this frame's position,
because everything downstream runs after `fleet`. The comment on the system records why one object per frame is the
deliberate exception to "the frame path allocates nothing", and why a reused mutable spot would alias.

Note on the round-2 review: the first attempt at this fix added the `fleet` publisher but left the pre-run fill in
`onFrame`, so the frame allocated a second, discarded spot and two comments named different publishers. Review round
2 caught it (`Review — Frame Contract`, round-2 F1). The fill is now deleted and the ownership comment lives only on
the system that owns the value.

No test distinguishes the old wiring from the new one — a browser probe for `frameInputs()` would, but adding a
second dev surface to prove a value three systems consume indirectly was not worth the surface. The smoke suite
covers that the consumers still behave; the correctness argument is the ordering, which the contract makes explicit.

## F2 — the publish test overstated itself

`frame-contract.test.ts` now says what it proves: the runner hands one shared object to ordered calls, so a producer
can publish and a consumer can read later in the same run. That `init-scene.ts` publishes from the right slot is a
wiring property, covered by the smoke suite and recorded in `integrated.md` as residual risk (below).

## F3 — the browser order assertion is now independent

The spec had compared the live order to `[...FRAME_SYSTEM_ORDER]` imported from the module. The runner already
throws when the tuple and the wiring disagree, so that assertion could only prove the app booted. The spec now
spells the twelve names out in `DOCUMENTED_ORDER`, with a comment saying why: a coordinated reorder of both the tuple
and the wiring — the one change a self-referential assertion can never catch — now fails the browser test.

## F4 — the duplicate guard is tested and its message is honest

The guard is reachable only when every name is present, in order, and one documented name is appended past the
documented end. New case: `wiring.push(systems[0])` must throw. The message became
`frame contract: expected 12 systems, got 13 — "day-ambience" repeats a documented slot`, and the comment above it
says plainly that the positional check caught mid-list duplicates.

## F5 — evidence corrected

- `integrated.md` no longer claims "the same arguments"; it states that two values are published by their owning
  system rather than sampled by the orchestrator, and that consumers still read this frame.
- `phase-1.md` keeps the mood-lag record but marks it superseded, and no longer claims "the old semantics hold
  exactly and no system reads a stale frame" — review round 1 disproved exactly that sentence for `starSpot`.
- `integrated.md` and `phase-3.md` now label the tech-stack work AC-7 and the check/diff scope AC-6, matching the
  spec. `integrated.md`'s AC-6 row carries the real witness (Biome/`tsc` clean, 893 tests, diff scope).

## F6 — `FrameInputs` documents ownership

The JSDoc now says each value is published by the system that owns it (`fleet` owns `starSpot`; `day-ambience` owns
`night`/`rain`/`snow`) so every later consumer reads this frame, and the orchestrator only seeds the object.

## Residual risk

- **Wiring is not unit-tested.** A test can prove the runner shares one object; only the app can prove which system
  writes which field. The ordering makes the current wiring correct by construction and the smoke suite would catch
  a gross break (critters freezing), but a subtle wrong-slot publish would be caught by eye, not by CI.
- **Cadence witness is one window, one boot.** It proves ticks-per-frame, not that each system does its work.
- **Reduced motion** would fail the cadence witness at its frame floor rather than pass falsely.

## Notes

No `src/core` file, dependency or lockfile was touched. The net effect on `src/` is three files: `init-scene.ts`
(publish from `fleet`), `frame-contract.ts` (JSDoc + message), `frame-contract.test.ts` (comment + one case).
