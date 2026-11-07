# Integrated verification — Frame Contract

Track: `frame-contract_20261109`
Branch: `refactor/frame-contract_20261109`
Base: `main @ 410a1c38531321d5e9e7b5304b3819e9af62c9b8`
Phase checkpoints: Phase 1 `292d685`, Phase 2 `1013811`, Phase 3 `e22ad9d`

## Scope

Every per-frame subsystem is now a named entry in one documented order, validated at boot, and driven through a
single reused `FrameInputs`. The browser proves the cadence. Nothing visible changed: the twelve systems run in
exactly the order the old `onFrame` body ran them. Two values are now published by the system that owns them
rather than sampled by the orchestrator — `night`/`rain`/`snow` after `day-ambience` ticks, and `starSpot` after
`fleet` moves — so every consumer still reads this frame, which is what the old body did by calling in that order.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static | `pnpm exec biome check .` | 0 | 181 files, no findings |
| Types | `pnpm exec tsc --noEmit` | 0 | clean |
| Unit | `pnpm test` | 0 | 51 files / **893 tests** (883 baseline + 10 contract tests) |
| Coverage | `pnpm test:coverage` | 0 | 97.36% statements / 91.06% branches / 98.10% functions / 99.44% lines — gate is 80% |
| Build | `pnpm build` | 0 | 178 precache entries, 10,643.46 KiB; gzip JS **+546 B** vs base |
| Frame witness | `pnpm exec playwright test e2e/frame-contract.spec.ts` | 0 | 1 passed (9.1 s) — 30 frames, every system +30 ticks |
| Smoke | `pnpm exec playwright test e2e/smoke.spec.ts` | 0 | 13 passed, 1 skipped (`@ci` canary) in 1.8 min |
| Full matrix | `pnpm exec playwright test` | 0 | **57 passed, 1 skipped** (`@ci` canary) in **8.6 min** — 58 runs, no retries, no page crashes |

## Acceptance criteria

| ID | Criterion | Witness |
|---|---|---|
| AC-1 | `FRAME_SYSTEM_ORDER` lists all twelve systems in shipping order | `frame-contract.test.ts` (order test); browser test compares live names to a list spelled out in the spec, so a coordinated tuple+wiring reorder fails |
| AC-2 | A wrong length, wrong name or swapped pair throws, naming the offender | `frame-contract.test.ts` — missing, unexpected (`air`), swapped-pair, and appended-duplicate (`expected 12 systems, got 13 — "day-ambience" repeats a documented slot`) messages |
| AC-3 | Counters are in place and the snapshot is on demand | `frame-contract.test.ts` (three runs → all 3s; snapshot is a fresh array) |
| AC-4 | The running app ticks documented names in order, once per frame | `e2e/frame-contract.spec.ts` — 30 frames, twelve systems at `:30` |
| AC-5 | No visible change; the smoke suite stays green | `e2e/smoke.spec.ts` 13 passed; `steamPuffCount()` still feeds its assertion |
| AC-6 | `pnpm check` passes; the diff touches no `src/core`, no dependency, no lockfile | Biome + `tsc` clean, 51 files / **893 tests**; `git diff --stat` = scene files + spec only |
| AC-7 | The tech stack documents the contract and its proof | `conductor/tech-stack.md` folder map + E2E row |

## Deviations carried from the phases

1. `FrameInputs.rain`/`.snow` are `0..1` intensities, not booleans — weather eases and those values feed
   `CritterMood`/`DuckMood`, so coercing them would have changed behaviour.
2. The primary closed a one-frame mood lag found during review: `night`/`rain`/`snow` are published by the
   `day-ambience` system immediately after `tick()`/`paint(dt)`, and `starSpot` by the `fleet` system immediately
   after `fleet.update(dt)`, so consumers read this frame. A unit test proves the runner *permits* publish-then-read
   (one shared object, ordered calls); which slot publishes is a wiring property, listed under residual risk.
3. `starSpot` remains one object literal per frame — deliberate and unchanged; systems need a snapshot and a
   reused mutable spot would alias across them.
4. The spec's early draft said thirteen systems including a non-existent `air`; corrected to twelve before
   implementation and recorded in the spec's edge cases.
5. The phase-3 documentation was written by the primary because the subagent is denied `conductor/` writes.

## Residual risk

- **Order enforcement is construction-time, not compile-time.** Adding a thirteenth system means editing the
  tuple and the wiring together; forgetting the wiring throws at boot, forgetting the tuple throws a type error.
  Nothing prevents someone from reordering the tuple *and* the wiring in one commit — that is the behaviour
  change the reason lines exist to make visible in review.
- **Wiring is not unit-tested.** A unit test can prove the runner hands one shared object to ordered calls; only
  the app can prove which system writes which field. The ordering makes the current wiring correct by construction
  and the smoke suite would catch a gross break (critters freezing, portal dark), but a wrong-slot publish would be
  caught by eye, not by CI. `e2e/frame-contract.spec.ts` proves order and cadence, not ownership.
- **The cadence witness is one boot and one window.** It proves the loop ticks once per frame over ~30 frames,
  not that a specific system does its work correctly; the smoke and per-feature specs still carry that.
- **Reduced motion:** under `prefers-reduced-motion` the spin loop renders one static frame, so the witness fails
  at its frame floor rather than passing. Recorded in `tech-stack.md`.
- Real iPad/Android behaviour remains the manual-device layer, unchanged by this track.

## Verdict

Three phases verified, every acceptance criterion has an automated witness, and the refactor is behaviour-neutral
by construction (same systems, same order, each value still read in the same frame it was produced) and by
measurement (smoke green, coverage flat, gzip +546 B). The full matrix then ran green in one pass: 57 passed and one
deliberately skipped canary in 8.6 minutes across 58 runs, up one run from before the track because
`e2e/frame-contract.spec.ts` is a new tablet test. Review closed in three rounds — two blocks, then a pass.
Ready for review.
