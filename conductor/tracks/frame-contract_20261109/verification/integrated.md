# Integrated verification — Frame Contract

Track: `frame-contract_20261109`
Branch: `refactor/frame-contract_20261109`
Base: `main @ 410a1c38531321d5e9e7b5304b3819e9af62c9b8`
Phase checkpoints: Phase 1 `292d685`, Phase 2 `1013811`, Phase 3 `e22ad9d`

## Scope

Every per-frame subsystem is now a named entry in one documented order, validated at boot, and driven through a
single reused `FrameInputs`. The browser proves the cadence. Nothing visible changed: the twelve systems run in
exactly the order the old `onFrame` body ran them, with the same arguments.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static | `pnpm exec biome check .` | 0 | 181 files, no findings |
| Types | `pnpm exec tsc --noEmit` | 0 | clean |
| Unit | `pnpm test` | 0 | 51 files / **892 tests** (883 baseline + 9 contract tests) |
| Coverage | `pnpm test:coverage` | 0 | 97.36% statements / 91.06% branches / 98.10% functions / 99.44% lines — gate is 80% |
| Build | `pnpm build` | 0 | 178 precache entries, 10,643.46 KiB; gzip JS **+546 B** vs base |
| Frame witness | `pnpm exec playwright test e2e/frame-contract.spec.ts` | 0 | 1 passed (9.1 s) — 30 frames, every system +30 ticks |
| Smoke | `pnpm exec playwright test e2e/smoke.spec.ts` | 0 | 13 passed, 1 skipped (`@ci` canary) in 1.8 min |
| Full matrix | `pnpm exec playwright test` | see below | tablet + phone + prod |

## Acceptance criteria

| ID | Criterion | Witness |
|---|---|---|
| AC-1 | `FRAME_SYSTEM_ORDER` lists all twelve systems in shipping order | `frame-contract.test.ts` (order test); browser test compares live names to the tuple |
| AC-2 | A wrong length, wrong name or swapped pair throws, naming the offender | `frame-contract.test.ts` — missing, unexpected (`air`), swapped-pair messages |
| AC-3 | Counters are in place and the snapshot is on demand | `frame-contract.test.ts` (three runs → all 3s; snapshot is a fresh array) |
| AC-4 | The running app ticks documented names in order, once per frame | `e2e/frame-contract.spec.ts` — 30 frames, twelve systems at `:30` |
| AC-5 | No visible change; the smoke suite stays green | `e2e/smoke.spec.ts` 13 passed; `steamPuffCount()` still feeds its assertion |
| AC-6 | The tech stack documents the contract and its proof | `conductor/tech-stack.md` folder map + E2E row |
| AC-7 | The cost is measured, and the budget holds | 178 precache entries unchanged, gzip **+546 B** (≤1 KB), 883 baseline tests untouched |

## Deviations carried from the phases

1. `FrameInputs.rain`/`.snow` are `0..1` intensities, not booleans — weather eases and those values feed
   `CritterMood`/`DuckMood`, so coercing them would have changed behaviour.
2. The primary closed a one-frame mood lag found during review: `night`/`rain`/`snow` are published by the
   `day-ambience` system immediately after `tick()`/`paint(dt)`, restoring the pre-phase semantics exactly. A
   unit test now proves the publish-then-read pattern.
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
- **The cadence witness is one boot and one window.** It proves the loop ticks once per frame over ~30 frames,
  not that a specific system does its work correctly; the smoke and per-feature specs still carry that.
- **Reduced motion:** under `prefers-reduced-motion` the spin loop renders one static frame, so the witness fails
  at its frame floor rather than passing. Recorded in `tech-stack.md`.
- Real iPad/Android behaviour remains the manual-device layer, unchanged by this track.

## Verdict

Three phases verified, every acceptance criterion has an automated witness, and the refactor is behaviour-neutral
by construction (same systems, same order, same arguments) and by measurement (smoke green, full matrix green).
Ready for review.
