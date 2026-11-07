# Review — Frame Contract

| | |
|---|---|
| **Track** | `frame-contract_20261109` |
| **Branch** | `refactor/frame-contract_20261109` |
| **Range** | `410a1c3..HEAD` (round 1 reviewed at `1ff4a2f`; round 2 reviewed at the Phase R1 commit) |
| **Rounds** | 1 |
| **Verdict** | **BLOCK** — one High; all six findings fixed in Phase R1 |

## Summary

The contract itself is the right shape and the right size. Twelve systems, one `as const` tuple with a reason per
entry, a runner that validates names *and* positions at construction and fails with a sentence naming the offender,
in-place counters with an on-demand snapshot, and a browser witness that samples 30 animation frames and proves
every system advanced exactly 30 ticks. `frame-contract.ts` imports nothing, so its test runs headless; the runner
allocates nothing per frame.

The reviewer found one real defect of exactly the class the phase had already fixed once: `starSpot` was filled
before `frameRunner.run()`, but `fleet.update(dt)` runs inside the run, so `critters`, `duck` and `portal-glow`
received the primary train's position from the **previous** frame. The primary had closed the identical lag for
`night`/`rain`/`snow` during Phase 1 and did not generalise the lesson to the spot; the reviewer did. Phase R1
publishes the spot from the `fleet` system, after the move, which is where the value is owned.

The rest were precision problems: a unit test that proved the shared-object pattern while reading as if it proved
the wiring, a browser order assertion that could not fail independently of boot, an untested length guard, and
evidence text that overstated what changed.

## Verification

| Check | Result |
|---|---|
| `pnpm check` | pass — 51 files / **893 tests**, Biome and `tsc` clean |
| Coverage | 97.36% statements / 91.06% branches / 98.10% functions / 99.44% lines |
| `pnpm build` | 178 precache entries, 10,643.46 KiB; gzip JS **+546 B** vs the base build |
| `e2e/frame-contract.spec.ts` | 1 passed — 30 frames, twelve systems at `:30` |
| Smoke | 13 passed, 1 skipped (`@ci` canary) in 1.8 min |

## Requirements coverage

| ID | Implemented by | Verified by | Status |
|---|---|---|---|
| FR-1 | `FRAME_SYSTEM_ORDER` | order test; browser order step | covered |
| FR-2 | `FrameInputs` | shared-object test; publish-then-read test | covered |
| FR-3 | `FrameSystem.update` returns void | type; `steamPuffCount()` | covered |
| FR-4 | `assertWiredOrder` | missing / unexpected / swapped / duplicate tests | covered |
| FR-5 | `createFrameRunner` counters | three-runs test; browser cadence step | covered |
| FR-6 | `init-scene.ts` wiring | smoke suite + `starSpot` fix in R1 | covered (was partial) |
| FR-7 | one reason per tuple entry | source | covered |
| FR-8 | `train-fleet.ts` void + `steamPuffCount()` | steam-puff smoke assertion | covered |
| FR-9 | `frameSystems()` probe | browser spec | covered |
| FR-10 | `e2e/frame-contract.spec.ts` | the spec itself | covered |
| FR-11 | `conductor/tech-stack.md` | folder map + E2E row | covered |
| FR-12 | no `src/core`, no dependency, no lockfile | diff scope | covered (was partial) |
| NFR-1 | zero imports in the contract module | source | covered |
| NFR-2 | one object per frame, no per-run allocation | code review + `starSpot` note | covered |
| NFR-3 | headless unit test | `frame-contract.test.ts` | covered |
| NFR-4 | gzip +546 B of a 1 KB budget | build measurement | covered |
| NFR-5 | 178 precache entries, 883 baseline tests green | build + test run | covered |
| NFR-6 | construction-time failure | four throw tests | covered |
| AC-1 | order tuple | order test | covered |
| AC-2 | throws naming the offender | message assertions | covered |
| AC-3 | counters in place, snapshot on demand | three-runs test | covered |
| AC-4 | browser order + cadence | `frame-contract.spec.ts` | covered |
| AC-5 | no visible change | smoke 13 passed | covered |
| AC-6 | `pnpm check` + diff scope | check run, diff stat | covered |
| AC-7 | tech stack documents contract and proof | `tech-stack.md` | covered |

## Findings — round 1

| ID | Sev | File | What | Resolution |
|---|---|---|---|---|
| F1 | **High** | `src/scene/init-scene.ts:431-433` | `starSpot` filled before the run while `fleet.update` runs inside it, so critters, the duck and the portal glow read last frame's train position — the same class as the mood lag Phase 1 closed | Fixed: `fleet` publishes `inputs.starSpot` after `fleet.update(dt)`; the pre-run fill is deleted |
| F2 | Medium | `src/scene/frame-contract.test.ts:124-143` | The publish test fakes the publisher inside the runner, so it proves the shared object, not that `init-scene` publishes from the right slot | Fixed: comment and name scope it to the pattern; the wiring gap is recorded as residual risk in `integrated.md` |
| F3 | Low | `e2e/frame-contract.spec.ts:45-54` | Order assertion imported the same tuple the runner validates, so it could only prove the app booted | Fixed: the spec now spells the twelve names out, so a coordinated tuple+wiring reorder fails |
| F4 | Low | `src/scene/frame-contract.ts:117-122` | Length guard reachable only for a duplicate appended past index 11, untested, comment read as if general | Fixed: appended-duplicate test; message now says `expected 12 systems, got 13 — "…" repeats a documented slot` |
| F5 | Low | evidence | `integrated.md` claimed "same arguments"; `phase-1.md` over-claimed "no stale frame" and kept a superseded note; AC-6/AC-7 labels swapped in two files | Fixed in Phase R1 |
| F6 | Low | `src/scene/frame-contract.ts:49-53` | `FrameInputs` JSDoc said the orchestrator computes the values, though `day-ambience` and `fleet` publish them | Fixed: JSDoc states the publish-from-the-owner rule |

## Overrides

None. Strict mode; nothing deferred.

## Plan compliance

Phases 1–3 verified at `292d685`, `1013811`, `e22ad9d`; Phase R1 verified at the commit below. Recorded deviations:
`rain`/`snow` are `0..1` intensities rather than booleans; the primary closed the mood lag inside Phase 1; Phase 3
was performed by the primary because the subagent cannot write under `conductor/`; twelve systems, not the thirteen
an early draft listed; gzip delta measured like-for-like against a detached base worktree.

## Out of scope

Real iPad/Android frame behaviour (manual-device layer), construction-order coupling between systems beyond the
documented order, and any reordering of the twelve systems — all explicitly out of the spec's scope.

## Debt

- `starSpot` is still one object literal per frame. Deliberate: systems need a snapshot, a reused mutable spot
  would alias, and one small addition per frame is not a GC concern at this scale.
- Under `prefers-reduced-motion` the spin loop renders a single static frame, so the cadence witness would fail at
  its ≥10-frame floor rather than pass falsely. Documented in `tech-stack.md`.

## Doc sync

`synced` — `conductor/tech-stack.md` gained the frame-contract block and the E2E-row caveat; `conductor/product.md`
marks the roadmap row shipped.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
|---|---|---|---|---|---|---|
| 1 | BLOCK | 0 | 1 | 1 | 4 | 6 |
