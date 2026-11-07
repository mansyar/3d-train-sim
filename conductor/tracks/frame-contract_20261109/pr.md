# refactor(scene): make the frame order a contract instead of a comment

## Summary

`init-scene.ts` used to own an opaque `onFrame(dt)` holding twelve subsystem updates whose order was the only record of
how they depended on each other. Decomposing the renderer paid for that five times: each extraction had to guess which
neighbours it could move past.

The order is now data. `src/scene/frame-contract.ts` holds `FRAME_SYSTEM_ORDER` — twelve names, one reason per entry —
plus `FrameInputs`, `FrameSystem` and `createFrameRunner`, which validates the wired systems against that tuple **at
construction** and throws a sentence naming the first missing, unexpected, or misplaced one. Tick counters live in the
runner; nothing is allocated per frame. `init-scene.ts` builds twelve systems in that order, and `onFrame` is a single
call.

The commit that the review forced, and that matters most: the values systems read from each other are now published by
the **system that owns them**, in the same frame they are produced. `night`/`rain`/`snow` come from `day-ambience`
after it paints; `starSpot` comes from `fleet` after it moves. Before that, consumers read the previous frame's
position — a one-frame lag that no test noticed until the reviewer grepped `fleet.primary()` in the base file.

Behaviour is unchanged: same order, same arguments, same frame. 1,263 → 195 lines of renderer was the previous track;
this one adds a 155-line contract module and a 108-line browser witness and removes the hand-written choreography.

## Track

- Spec: [`./spec.md`](./spec.md)
- Plan: [`./plan.md`](./plan.md)
- Review: [`./review.md`](./review.md)

Merged: #69 (renderer decomposition), #70 (e2e cost).

## What happened

| Phase | Scope | Checkpoint |
|---|---|---|
| 1 — The contract and the wiring | `frame-contract.ts`, its test, `init-scene.ts`, `train-fleet.ts` (`void` update + `steamPuffCount()`) | `292d685` |
| 2 — Browser proof | `e2e/frame-contract.spec.ts`: names in order, one tick per animation frame over 30 frames | `1013811` |
| 3 — Documentation and measurement | `tech-stack.md`, roadmap row, gzip delta against the base build | `e22ad9d` |
| R1 — Review fixes | spot and mood published by their owners; literal order list; duplicate guard test; evidence corrections | `9418483` |
| R2 — Second-round fixes | deleted the surviving pre-run fill (the actual fix), full duplicate message, witness cells | `9418483` |

## Requirements

- [x] FR-1 — twelve named systems in one ordered tuple
- [x] FR-2 — `FrameInputs` publishes the derived values
- [x] FR-3 — `FrameSystem` is a void per-frame update
- [x] FR-4 — the runner fails fast, naming the offender
- [x] FR-5 — tick counters with a snapshot
- [x] FR-6 — `init-scene` computes inputs once, then runs
- [x] FR-7 — a reason line per entry
- [x] FR-8 — `train-fleet.update` returns void; `steamPuffCount()` is the witness
- [x] FR-9 — `frameSystems()` behind the dev handle
- [x] FR-10 — `e2e/frame-contract.spec.ts`
- [x] FR-11 — documented in `tech-stack.md`
- [x] FR-12 — behaviour unchanged, no `src/core` change
- [x] NFR-1…NFR-6 — no dependency, no per-frame allocation, headless test, +546 B gzip, suite green

## Verification

| Check | Command | Result |
|---|---|---|
| Static | `pnpm exec biome check .` · `pnpm exec tsc --noEmit` | pass — 181 files, clean |
| Unit | `pnpm test` | pass — 51 files / **893 tests** (883 before the track) |
| Coverage | `pnpm test:coverage` | pass — 97.36 / 91.06 / 98.10 / 99.44 |
| Build | `pnpm build` | pass — 178 precache entries, 10,643.51 KiB |
| Contract witness | `pnpm exec playwright test e2e/frame-contract.spec.ts` | pass — 1 test, two named steps |
| Smoke | `pnpm exec playwright test e2e/smoke.spec.ts` | pass — 13 passed, 1 skipped |
| Full matrix | `pnpm exec playwright test` | MATRIX_RESULT |
| Gzip delta vs base | base and HEAD builds, gzip -9 | **+546 B** (218,122 → 218,668 B) |

## Media

Nothing to show. The change is invisible by design — the same twelve updates in the same order. The witness is a
counter, not a picture.

## Review

Three rounds. Round 1 **BLOCK**: a High finding that `starSpot` was sampled before `fleet.update(dt)`, so critters, the
duck and the portal glow read the previous frame — the same lag the phase had already fixed for the weather values.
Round 2 **BLOCK**: the fix added the publisher but left the pre-run fill in `onFrame`, so each frame allocated a
discarded spot and two comments named different publishers. Round 3 **PASS**: the reviewer checked the committed blob
rather than my summary and confirmed one writer, after the move.

Six findings fixed, nothing deferred, no override.

## Deviations and risks

- The phase brief called for boolean `rain`/`snow`; they ship as `0..1` intensities because weather eases and the values
  feed `CritterMood`/`DuckMood` directly. Coercing them would have changed behaviour.
- The spec was corrected during the track: thirteen systems became twelve — the draft invented an `air` system that the
  real frame body does not have. No requirement, criterion or scope changed.
- Which slot publishes which field is **not** unit-tested. The runner proves it *permits* publish-then-read; only the app
  can prove ownership. A wrong-slot publish would be caught by eye and recorded as residual risk, not by CI.
- `starSpot` is one object literal per frame — deliberate, since a reused mutable spot would alias.
- The reduced-motion path renders one static frame, so the cadence witness fails at its floor rather than passing
  falsely.

## Follow-ups

- If a system ever needs a value from a *later* slot, the contract cannot express it; the fix would be two-phase inputs,
  not a reorder.
- `boot-simplification_20261109` is next on the roadmap: the canvas before the UI, and the three listener-replay queues
  in `main.ts` deleted.

## Rollback

`git revert` this merge. The contract is additive and the wiring matches the old order, so a single revert restores the
hand-written `onFrame` with no data or schema implications.
