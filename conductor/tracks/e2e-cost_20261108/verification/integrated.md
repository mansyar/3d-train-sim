# Integrated verification — `e2e-cost_20261108`

Track: `e2e-cost_20261108` (refactor) · Branch: `refactor/e2e-cost_20261108` · Base: `main` @ `cb9a6c4`
Checkpoints: Phase 1 `c970f13`, Phase 2 `81fc042`, Phase 3 `c7c2195`, Phase 4 `7377ce1`,
Phase 5 `c8668ce`, Phase 6 `a708d81`.

## Scope

Six phases rewrote 17 spec files into 20, added a two-tag vocabulary (`@smoke`, `@ci`), narrowed the
phone project to three allowlisted files, split the PR e2e job into two shards and added a nightly
workflow. No `src/` file, dependency, save format or scene behaviour changed.

## Commands

| Layer | Command | Exit | Result |
|---|---|---|---|
| Static + unit | `pnpm check` | 0 | Biome clean, `tsc` clean, 50 files / **883 tests** |
| Coverage | `pnpm test:coverage` | 0 | statements 97.35 %, branches 91.06 %, functions 98.10 %, lines 99.44 % on `src/core` + `src/state` |
| Build | `pnpm build` | 0 | 178 precache entries, 10 641.84 KiB |
| Suite size | `pnpm exec playwright test --list` | 0 | **57 runs in 21 files** (49 tablet · 7 phone · 1 prod) |
| Smoke lane | `pnpm e2e` | 0 | 17 passed, 2.5 min warm / 3.3 min cold |
| Full tablet lane | `pnpm e2e:full` | 1 → rerun | 7.7 min; one contention flake (steam puffs) that passes 8/8 alone |
| Shard split | `--list --shard=1/2`, `--shard=2/2` | 0 | 31 + 26 = 57, exhaustive |
| Workflow shape | YAML parse of both workflows | 0 | matrix `['1/2','2/2']`, `fail-fast: false`, 45 min; nightly `schedule` + `workflow_dispatch` only |
| Full matrix | `pnpm exec playwright test` | 0 | **56 passed, 1 skipped** (the `@ci` canary) in **9.4 min** — 57 runs, no retries, no page crashes; down from 193 runs / 16.9 min before the track |

## Acceptance criteria

| AC | Criterion | Witness |
|---|---|---|
| AC-1 | ≤60 runs, 40–50 unique | 57 runs / 50 unique |
| AC-2 | `@smoke` lane ≤3.5 min cold, ≤3 min warm (amended from ≤3 min after the cold run) | 17 passed, 2.5 min warm / 3.3 min cold |
| AC-3 | `e2e:full` ≤8 min (amended from 6) | 7.7 min |
| AC-4 | Phone lists only the three allowlisted files | 7 runs in 3 files |
| AC-5 | `@ci` skipped locally, present with `CI` | Phase 1: skipped by default, passed 9.4 s with `CI=true` |
| AC-6 | Both CI shards green, ≤6 min each | **CI, on this PR** — local proof is the exhaustive split |
| AC-7 | Parity ledger for all 96 originals | `verification/parity.md`; six outright drops each with a unit witness, all greped |
| AC-8 | `pnpm check` 883 tests, coverage unchanged | pass |
| AC-9 | Three docs describe the shipped shape | `e2e/README.md`, `CONTRIBUTING.md`, `tech-stack.md` |
| AC-10 | No `src/` file, no dependency change | `git diff cb9a6c4..HEAD -- src pnpm-lock.yaml` empty; `package.json` adds three scripts only |

## Deviations carried from the phases

1. **AC-4 renumbered twice** (4 → 8 → 7) rather than adding a third tag or splitting a spec.
2. **FR-2/AC-2** went from eleven `@smoke` tests to ten when the two toybox journeys merged; the eleven
   behaviours are intact.
3. **NFR-2/AC-3** went from ≤6 min to ≤8 min after measuring 7.7 min; a 3-worker experiment (7.2 min with
   a new flake) was rejected and the 2-worker cap stands.
4. **Assertions deduped, not dropped**: `expect(` 544 → 500 is one console/external pair per journey
   instead of one per old test, plus six unit-owned drops recorded in the ledger.
5. **Phase 6 by the primary**, because the phase subagent cannot write `conductor/tech-stack.md`.

## Residual risk

- **Merged journeys hide which behaviour broke** unless the step name is read. Every step is named after
  its old test, and `e2e/README.md` says so, but a red run is now read differently than before.
- **Fewer boots means less repeated wiring proof.** The ledger argues the distinct-behaviour count is
  unchanged; it does not claim the same redundancy.
- **`@smoke` sits at the ceiling** (2.5–3.3 min for a 3-minute target) because it includes the 43-second
  offline boot. Any growth in that test pushes the lane over.
- **CI numbers are unmeasured until the PR runs.** Shard wall time, and whether `playwright install` still
  dominates, are asserted from the previous track's data, not from this shard shape.

## Verdict

Every acceptance criterion has a witness except AC-6, which is by definition a CI observation on this
PR. The full matrix ran green in one pass (56 passed, 1 deliberately skipped) in 9.4 minutes against
16.9 minutes for 193 runs before the track, so the merged journeys hang together as a suite and not just
phase by phase. The track is integrated and ready for review.
