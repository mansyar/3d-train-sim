# E2E Cost — Implementation Plan

> **Branch:** `refactor/e2e-cost_20261108`
> **Base:** `main` @ `cb9a6c4ab1e2a3848b21d30eb886d94ca8a7d869`
> **Phase state:** `pending` · `in_progress` · `verified` · `failed` · `blocked` — only the primary agent
> writes this file.

## Phase 1: Lanes and tags

- **Goal:** the two tags, the phone allowlist and the three scripts exist and select the right tests, proven
  by `--list` and by a timed smoke run — before any existing spec body is rewritten.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-6, FR-7, NFR-4, AC-2, AC-4, AC-5
- **Touches:** `playwright.config.ts`, `package.json`, `e2e/smoke.spec.ts`,
  `e2e/world-portability.spec.ts`, `e2e/save-recovery.spec.ts`, `e2e/runtime-guarantees.spec.ts`,
  `e2e/prod.spec.ts`, `e2e/phone-shell.spec.ts`, `e2e/ride-toybox-flow.spec.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test --list` and `pnpm e2e`
- **Status:** verified

- [x] **P1.T1: Declare the tag vocabulary and mark the smoke set** - covers: FR-1, FR-2
  - [x] P1.T1.1: Add `@smoke` to the eleven chosen tests, spread across the five files that own them
  - [x] P1.T1.2: Add `@ci` to the ambient frame-rate test and skip it unless `CI` is set
- [x] **P1.T2: Restrict the phone project to three files** - covers: FR-3
  - [x] P1.T2.1: Allowlist the smoke boot test, `phone-shell` and `ride-toybox-flow` in the project config
  - [x] P1.T2.2: Prove `--list --project=phone` selects only the allowlisted files, and record the count it actually reports
- [x] **P1.T3: Add the lane scripts** - covers: FR-6
- [x] **P1.T4: Prove the lane and the CI gate** - covers: AC-2, AC-5
  - [x] P1.T4.1: Run `pnpm e2e` three times and record the wall time and the test count
  - [x] P1.T4.2: Demonstrate the frame-rate test skipped locally and selected when `CI` is set

**Result:** verified
**Checkpoint:** c970f13
**Evidence:** conductor/tracks/e2e-cost_20261108/verification/phase-1.md

**Deviations:** the phone project selects **8** runs, not the 4 the spec first asked for, because five
`@smoke` tests live inside the allowlisted `smoke.spec.ts`; the user chose to amend AC-4 rather than
add a third tag or split the file, and the amendment is dated in `spec.md`. The phone `testIgnore` for
`prod.spec.ts` was dropped as redundant once `testMatch` became exhaustive. The `pnpm e2e` runs were
performed by the primary agent because the subagent's shell denied the script. Tags are title
suffixes: no assertion, fixture or timeout changed.

## Phase 2: Mechanical clusters

- **Goal:** the five same-feature clusters that share fixtures and layouts collapse from 29 tests to 12,
  each merged test naming its steps, with no assertion lost.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-12
- **Touches:** `e2e/switches.spec.ts`, `e2e/switch-3way.spec.ts`, `e2e/switch-slip.spec.ts`,
  `e2e/switch-mirror.spec.ts`, `e2e/hills.spec.ts`, `e2e/hills-phase2.spec.ts`, `e2e/river.spec.ts`,
  `e2e/river-life.spec.ts`, `e2e/cargo.spec.ts`, `e2e/wagon-workshop.spec.ts`, `e2e/tunnel.spec.ts`,
  `e2e/crossing-gate.spec.ts`
- **Verification:** `pnpm check` and `pnpm exec playwright test e2e/switches.spec.ts e2e/switch-3way.spec.ts e2e/switch-slip.spec.ts e2e/switch-mirror.spec.ts e2e/hills.spec.ts e2e/hills-phase2.spec.ts e2e/river.spec.ts e2e/river-life.spec.ts e2e/cargo.spec.ts e2e/wagon-workshop.spec.ts e2e/tunnel.spec.ts e2e/crossing-gate.spec.ts`
- **Status:** verified

- [x] **P2.T1: Merge the switch cluster (10 → 3)** — covers: FR-4, FR-5, FR-12
  - [x] P2.T1.1: One spec places each switch kind, rides every road, and reloads to neutral
  - [x] P2.T1.2: Fold the reduced-motion and blade-pose assertions into the same file as named steps
- [x] **P2.T2: Merge the hill pair (5 → 2)** — covers: FR-4, FR-5
- [x] **P2.T3: Merge river and river life (6 → 2)** — covers: FR-4, FR-5
- [x] **P2.T4: Merge cargo and the wagon workshop (4 → 3)** — covers: FR-4, FR-5
- [x] **P2.T5: Merge tunnel and crossing gate (4 → 2)** — covers: FR-4, FR-5

**Result:** verified
**Checkpoint:** 81fc042
**Evidence:** conductor/tracks/e2e-cost_20261108/verification/phase-2.md

**Deviations:** the six replaced spec files were deleted by the primary agent, because `git rm` was
denied to the subagent; the post-deletion run and the `--list` totals were taken here. Two substitutions
are judgement rather than mechanics and are recorded in the parity table: the two fixed 12-second rides
became sampled loops plus `expectSceneChanging`, and per-road switch witnessing uses blade/lever pose
pairing because `ride-motion` keeps its switch roads internal. River's consolidated test gained a
`clearMeadow` before the trestle ride to restore the fresh-page precondition the original had.

## Phase 3: The smoke journey

- **Goal:** `smoke.spec.ts` drops from 20 tests to 9 while keeping boot health, the build journey, the three
  persistence facts and the parent gate, each as a named step.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, FR-12
- **Touches:** `e2e/smoke.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/smoke.spec.ts`
- **Status:** pending

- [ ] **P3.T1: Keep boot and console health as one test** — covers: FR-4, FR-12
- [ ] **P3.T2: Merge the build journey** — covers: FR-4
  - [ ] P3.T2.1: One test opens the drawer, walks the tabs, places a toy, rides, cycles the camera and undoes
- [ ] **P3.T3: Merge the persistence round trip** — covers: FR-4
  - [ ] P3.T3.1: One test asserts the chosen train, the chosen sound and the placed toys survive one reload
- [ ] **P3.T4: Merge the parent gate with the day and mute toggles** — covers: FR-4, FR-12

## Phase 4: New modules

- **Goal:** the four newest modules and the three small specs collapse to their target counts, dropping
  assertions only where a named unit test already proves the same behaviour.
- **Depends on:** Phase 3
- **Covers:** FR-4, FR-5, FR-12
- **Touches:** `e2e/world-portability.spec.ts`, `e2e/save-recovery.spec.ts`,
  `e2e/runtime-guarantees.spec.ts`, `e2e/starter-railway.spec.ts`, `e2e/park-spot.spec.ts`,
  `e2e/ride-toybox-flow.spec.ts`, `e2e/delight-toys.spec.ts`, `e2e/sun-moon.spec.ts`
- **Verification:** `pnpm exec playwright test e2e/world-portability.spec.ts e2e/save-recovery.spec.ts e2e/runtime-guarantees.spec.ts e2e/starter-railway.spec.ts e2e/park-spot.spec.ts e2e/delight-toys.spec.ts e2e/sun-moon.spec.ts`
- **Status:** pending

- [ ] **P4.T1: Merge portability (12 → 5)** — covers: FR-4, FR-5
  - [ ] P4.T1.1: Keep one round trip, one salvage, one refusal, one undo and one mid-ride stop
  - [ ] P4.T1.2: Remove the refusal permutations already proven by `portable.test.ts` and cite them
- [ ] **P4.T2: Merge save recovery (6 → 2)** — covers: FR-4, FR-5
  - [ ] P4.T2.1: One test proves salvage and restore; one proves the parent-gate note and dismissal
- [ ] **P4.T3: Merge runtime guarantees (5 → 4)** — covers: FR-4, FR-5
- [ ] **P4.T4: Merge the two galleries (8 → 4)** — covers: FR-4, FR-5
- [ ] **P4.T5: Merge the three small specs** — covers: FR-4, FR-5

## Phase 5: CI shape

- **Goal:** the pull-request e2e job is two parallel shards and a nightly workflow runs both profiles, with
  no change to what a PR must pass.
- **Depends on:** Phase 4
- **Covers:** FR-8, FR-9, NFR-6, NFR-7, AC-6
- **Touches:** `.github/workflows/ci.yml`, `.github/workflows/nightly.yml`
- **Verification:** `pnpm check` and a workflow parse asserting two shard values, the nightly schedule and no
  pull-request trigger on the nightly file
- **Status:** pending

- [ ] **P5.T1: Shard the e2e job into two matrix jobs** — covers: FR-8, NFR-6, NFR-7
  - [ ] P5.T1.1: Matrix over the two shard values, keeping 2 workers and the 45-minute ceiling per job
- [ ] **P5.T2: Add the nightly workflow** — covers: FR-9
  - [ ] P5.T2.1: Schedule the full suite on both profiles, with repetition only for the two noisy specs

## Phase 6: Ledger, docs and final measurement

- **Goal:** the parity ledger accounts for every original test, the three documents describe the shipped
  vocabulary, and the projected runtimes are measured rather than asserted.
- **Depends on:** Phase 5
- **Covers:** FR-5, FR-10, AC-1, AC-3, AC-7, AC-8, AC-9, AC-10
- **Touches:** `e2e/README.md`, `CONTRIBUTING.md`, `conductor/tech-stack.md`,
  `conductor/tracks/e2e-cost_20261108/verification/parity.md`
- **Verification:** `pnpm check` and `pnpm e2e:full` and `pnpm exec playwright test --list`
- **Status:** pending

- [ ] **P6.T1: Close the parity ledger** — covers: FR-5, AC-7
  - [ ] P6.T1.1: Map every one of the 96 original tests to a merged step or a named unit test
  - [ ] P6.T1.2: Prove each cited unit test exists and passes
- [ ] **P6.T2: Document the vocabulary** — covers: FR-10, AC-9
- [ ] **P6.T3: Measure the outcome** — covers: AC-1, AC-3, AC-8, AC-10
  - [ ] P6.T3.1: Record run counts, both lane durations and the absence of `src/` changes

<!--
The primary agent appends after verification:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/e2e-cost_20261108/verification/phase-1.md
-->
