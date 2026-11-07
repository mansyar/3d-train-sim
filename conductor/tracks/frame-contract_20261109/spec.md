# Frame Contract — Specification

> **Stability:** Requirement IDs are stable after approval. Never renumber an approved `FR`, `NFR` or `AC`.
> Mark removed items `Withdrawn` instead of deleting the row.

## Overview

The meadow's frame loop currently knows *that* something must be updated every frame, but not *what* or *in
what order*. `src/scene/lifecycle.ts` owns the RAF loop, the perf tiers, visibility suspend/resume and the
render-scale blit, then calls one opaque `onFrame(dt)` closure. Inside that closure `src/scene/init-scene.ts`
choreographs eleven subsystem updates, computes three derived values between them (`starSpot`, `night`,
`weatherNow`), and carries one return value forward (`visibleSteamPuffs = fleet.update(dt)`).

This track turns that choreography into data: a named, ordered array of systems declared in one module, with
the ordering rationale written down, a fail-fast check that the wired order matches the documented one, and a
browser test that proves every system ticks exactly once per frame.

## Problem / Motivation

- **The order is invisible.** `track-crossings` must run after `fleet` because it reads the riding trains'
  spots; `critters` must run after `fleet` for the same reason; `portal-glow` must run after `day-ambience`
  because it reads the night factor. None of that is stated anywhere a reader or a test can see. It survives
  in a comment ("in this exact order") and in the diff history of a 450-line assembler.
- **The dependency is inferred from call position.** `starSpot`, `night` and `weatherNow` are computed mid-body
  and passed forward by closure capture. Moving two calls swaps which value a subsystem sees, silently.
- **`renderer-decomposition` showed the cost.** Five phases moved 1,100 lines out of one file, and every phase
  had to re-derive the frame order by reading the diff. The next decomposition (`boot-simplification`,
  `process-hygiene`) pays the same tax.
- **Nothing proves the loop runs each system once.** A double update would double live animation speed (or
  halve it), and no test would notice; a skipped system would freeze scenery with every suite still green.

## Goals & Success Metrics

- **Goal:** make the frame order a named, documented, machine-checked contract.
  - **Metric:** `FRAME_SYSTEM_ORDER` lists every per-frame system by name, in order, with a reason per entry.
  - **Metric:** wiring a different order than documented throws at construction instead of shipping.
- **Goal:** prove the loop's cadence in the real browser.
  - **Metric:** an e2e test asserts, for all registered systems, that ticks advance exactly once per RAF and
    that the live order equals the documented order.
- **Goal:** change nothing a player can see.
  - **Metric:** `pnpm check` keeps 883 unit tests green unchanged, the smoke suite stays green, and no
    `src/core` file, dependency, save format or scene-graph API changes outside the fleet probe.

## Scope

### In Scope

- `src/scene/frame-contract.ts`: the `FrameInputs` / `FrameSystem` types, the documented `FRAME_SYSTEM_ORDER`
  tuple, and a runner that validates the wired names and ticks them in order with per-system counters.
- `src/scene/frame-contract.test.ts`: headless unit tests for the runner (order, validation, counters).
- `src/scene/init-scene.ts`: build the systems array and replace the `onFrame` body with one input computation
  and one `runner.run(inputs, dt)`.
- `src/scene/train-fleet.ts`: `update(dt)` becomes `void`; the fleet exposes `steamPuffCount()`.
- A dev-only `frameSystems()` probe on `SceneHandle` returning `{ name, ticks }[]`.
- `e2e/frame-contract.spec.ts`: the once-per-frame and order proof.
- `conductor/tech-stack.md`: the contract and its rationale, in the scene folder map and a short note.

### Out of Scope

- Reordering any subsystem. The order this track documents is the order that ships today.
- Changing pause/resume, perf tiers, render scale or the RAF source (`spin-loop.ts`).
- Extracting the orchestrator out of `init-scene.ts` (that is `boot-simplification_20261109`'s neighbourhood).
- `src/core` changes, new dependencies, save-format or scene-graph format changes.
- Cross-system scheduling (priorities, dependencies declared and topologically sorted). One documented total
  order and a fail-fast check are the whole contract.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | `src/scene/frame-contract.ts` exports `FRAME_SYSTEM_ORDER`, a `readonly` tuple of the thirteen system names in the shipping order, and a `FrameSystemName` type derived from it. | must |
| FR-2 | The module exports `FrameInputs` — `starSpot`, `night`, `rain`, `snow` — as one object the orchestrator fills before the systems run. | must |
| FR-3 | The module exports `FrameSystem` — `{ name: FrameSystemName; update(inputs: FrameInputs, dt: number): void }` — so every system has the same shape and none returns a value. | must |
| FR-4 | `createFrameRunner(systems)` validates that the wired names equal `FRAME_SYSTEM_ORDER` exactly (same length, same order) and throws an error naming the first missing, extra or misplaced system. | must |
| FR-5 | The runner counts ticks per system in place (no allocation per frame) and exposes a snapshot `{ name, ticks }[]` for the probe. | must |
| FR-6 | `init-scene.ts` builds the systems array in the documented order and replaces the inline `onFrame` body with: compute `FrameInputs` once, then `runner.run(inputs, dt)`. | must |
| FR-7 | Each documented entry carries a one-line reason in `frame-contract.ts` explaining why it is where it is (for example: crossings read the fleet's riding spots, so `fleet` must precede `crossings`). | must |
| FR-8 | `train-fleet.update(dt)` returns `void`; the fleet exposes `steamPuffCount()` for the HUD and e2e witness, so no system has a return-value coupling. | must |
| FR-9 | `SceneHandle` exposes `frameSystems(): { name, ticks }[]`, reachable only through the existing dev-only `window.__tinyTracksScene` handle. | must |
| FR-10 | `e2e/frame-contract.spec.ts` asserts the live order equals `FRAME_SYSTEM_ORDER` and that every system's tick count advances exactly one per animation frame. | must |
| FR-11 | `conductor/tech-stack.md` documents the contract: where it lives, the order, the fail-fast rule, and the e2e proof. | must |
| FR-12 | Behaviour is unchanged: same systems, same order, same per-frame inputs, same visible result. No `src/core` file and no dependency changes. | must |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | No new runtime or dev dependency; no new build step. |
| NFR-2 | The per-frame path allocates nothing new: one `FrameInputs` object mutated in place, integer tick counters, snapshots only on demand. |
| NFR-3 | `frame-contract.ts` imports no three.js value (types only), so its unit test runs headless in Vitest without WebGL or DOM. |
| NFR-4 | The emitted JS grows by no more than 1 KB gzipped, measured against the current build. |
| NFR-5 | `pnpm check` stays green with the existing 883 unit tests; the smoke suite stays green; `pnpm build` still emits 178 precache entries. |
| NFR-6 | A mismatch between wired and documented order fails at construction (boot), never at the first frame. |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | `FRAME_SYSTEM_ORDER` lists all thirteen systems: `day-ambience`, `air`, `fleet`, `chug`, `confetti`, `critters`, `crossings`, `delight`, `music-box`, `duck`, `barge`, `portal-glow`, `film-camera`. | FR-1 |
| AC-2 | A runner built with a wrong length, a wrong name or a swapped pair throws, and the message names the offending system. | FR-4, NFR-6 |
| AC-3 | The runner ticks every system once per `run()` and its snapshot matches the documented order. | FR-5 |
| AC-4 | In the browser, `frameSystems()` returns the documented names in order and every `ticks` value advances by exactly the number of animation frames observed. | FR-9, FR-10 |
| AC-5 | No system returns a value; `steamPuffCount()` reports the same numbers the old `fleet.update` returned (the existing steam-puff smoke assertion still passes). | FR-3, FR-8 |
| AC-6 | `pnpm check` passes with 883 unit tests, the smoke spec passes, and `git diff` touches no `src/core` file, no dependency and no lockfile. | FR-12, NFR-1, NFR-5 |
| AC-7 | `conductor/tech-stack.md` names the module, the order, the fail-fast rule and the e2e proof. | FR-11 |

## Edge Cases

- **Reduced motion:** the runner does not know about it. Systems still tick; the frozen-animation behaviour stays
  inside the systems that own it (`delight`, `confetti`). The probe therefore counts ticks, not motion.
- **Hidden tab:** the lifecycle suspends the RAF loop, so ticks stop and resume with it. The contract covers the
  loop's frame, not wall-clock time; the e2e test runs visible.
- **Systems array built once:** the array and the runner are constructed at boot, not per frame. Validation runs
  once, at construction.
- **Ordering that looks arbitrary:** `air` before `fleet` (the chug rate reads the filmed voice, which the fleet
  updates), `portal-glow` after `day-ambience` (night factor). Where the current order looks arbitrary and no
  reason exists, the reason line says so honestly rather than inventing a dependency.
- **Adding a system later:** a new name in `FRAME_SYSTEM_ORDER` without a wired system throws at construction;
  a wired system with an undocumented name fails the type and the runtime check. Both failure modes are covered
  by AC-2.
- **Probe in production:** `__tinyTracksScene` is attached only under `import.meta.env.DEV`, as today; the probe
  inherits that gate and `prod.spec.ts` continues to assert the dev handles are absent.

## Dependencies

- **Tracks:** `renderer-decomposition_20261108` (complete, merged as `cb9a6c4`) — this contract reflects the
  post-split module boundaries. `e2e-cost_20261108` (merged as `410a1c3`) — the new spec must fit the tag and
  matrix rules it established (`@smoke`/`@ci`, phone allowlist).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** thirteen systems is the right granularity. `day-ambience` covers `tick()` then `paint(dt)`, and
  `chug` covers the audio-rate write, because splitting them would invent sub-order no subsystem needs.
- **Assumption:** tick counters live in the runner rather than in each system, so instrumenting a system cannot
  drift from instrumenting the loop. The cost is one integer increment per system per frame.
- **Assumption:** the e2e proof samples tick deltas alongside an in-page RAF counter, so a slow frame budget on a
  loaded machine cannot be mistaken for a skipped system.
- **Question:** should the order array also drive construction order (build systems by iterating it)? Deferred:
  each system needs different arguments, so construction stays explicit and the runner validates the result.

## References

- `conductor/product.md` roadmap row `frame-contract_20261109` (Phase 1, P2, 2d).
- `src/scene/lifecycle.ts` — the loop, perf tiers, visibility, render scale.
- `src/scene/init-scene.ts` — the orchestrator whose `onFrame` body this contract replaces.
- `conductor/archive/renderer-decomposition_20261108/` — the track that created the six scene modules.
- `conductor/archive/e2e-cost_20261108/` — tag, lane and matrix rules the new spec must follow.
