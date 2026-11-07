# Review — Frame Contract

| | |
|---|---|
| **Track** | `frame-contract_20261109` |
| **Branch** | `refactor/frame-contract_20261109` |
| **Range** | `410a1c3..48927ad` (round 1 at `1ff4a2f`; round 2 at `fdb0626`; round 3 at `48927ad`) |
| **Rounds** | 3 |
| **Verdict** | **PASS** — rounds 1 and 2 each BLOCK (1 High); round 3 confirmed every finding closed with nothing new. All findings were fixed in Phases R1–R2 |

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

## Findings — round 2

Round 2 confirmed F3 and F6 and refuted part of F1/F2: the fix had added the `fleet` publisher but left the
pre-run fill in `onFrame`.

| ID | Sev | File | What | Resolution |
|---|---|---|---|---|
| R2-F1 | **High** | `src/scene/init-scene.ts:433-439` | The pre-run `starSpot` fill survived, so the frame allocated a second, discarded spot per frame and a comment still named it as the publisher — the line whose deletion is the actual fix had no test guarding it | Fixed in Phase R2: `onFrame` is only `frameRunner.run(frameInputs, dt)` |
| R2-F2 | Medium | `verification/integrated.md:45-64` | The promised residual-risk bullet was absent and deviation #2 still said "a unit test now proves the publish-then-read pattern" | Fixed: bullet added; wording scoped to "the runner permits publish-then-read" |
| R2-F3 | Low | `verification/integrated.md:22,33-34` | Stale witness cells: 892 tests, "compares live names to the tuple", AC-2 without the duplicate case | Fixed: 893, literal-order witness, duplicate message |
| R2-F4 | Low | `src/scene/frame-contract.test.ts:81` | The duplicate test asserted only the counts, not the named repeat | Fixed: asserts the whole message |

## Findings — round 3

Round 3 checked the committed blob rather than the summary, since round 2 had caught a report that was wrong about its
own tree. Verdict **PASS**, no findings.

- `git show HEAD:src/scene/init-scene.ts` — `onFrame` (432-437) is a four-line comment plus `frameRunner.run(frameInputs, dt)` at 436. No fill, no `fleet.primary()` call, no second comment claiming to publish.
- `grep -n 'starSpot\s*[:=]' src` — the boot seed at `init-scene.ts:309` (overwritten before any consumer) and the one publish at `:335`, immediately after `fleet.update(dt)` at `:328`; the rest are the interface field and test locals. One write per frame, after the move, which is what base did.
- Consumers `critters` (`:360`), `duck` (`:395`) and `portal-glow` (`:414`) all follow `fleet` (`:326`); `chug` (`:344`) still reads `fleet.primary()` after the move, as base did.
- F2–F4 and `phase-R1.md`'s ownership paragraph verified line by line.

One caveat carried into the PR: `integrated.md`'s "9.1 s" spec time and "+546 B" gzip delta were measured before the R1
edits. Both still pass, and the gzip budget keeps 478 B of headroom, but they are not post-fix numbers and should not be
quoted as such.

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
| 2 | BLOCK | 0 | 1 | 1 | 2 | 4 |
| 3 | PASS | 0 | 0 | 0 | 0 | — |
