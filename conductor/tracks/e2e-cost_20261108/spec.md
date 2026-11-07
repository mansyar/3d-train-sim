# E2E Cost — Specification

> Requirement IDs are stable. Do not renumber `FR`, `NFR` or `AC` entries after approval; mark withdrawn items as `Withdrawn` instead.

## Overview

Restructure the Playwright suite so the loop a developer runs constantly costs about three minutes instead of
seventeen, while every architectural risk keeps at least one witness and CI still gates every pull request on
the whole suite.

This is a refactor of test code. Nothing about the product changes: no file under `src/` is touched, no
dependency is added, and the store, the save format and the scene graph are untouched.

## Problem / Motivation

The suite was measured before this spec was written (`--project=tablet --reporter=json`):

- 27 spec files, **96 unique tests**, **193 runs** (96 tablet + 96 phone + 1 prod).
- Tablet project alone: **1,105 s of test time, 9.7 min wall** at the documented 2-worker ceiling.
- A clean local run is 16.9 min; CI's e2e job is 19–24 min before the apt step is counted.
- Average 11.5 s per test, of which roughly 2–4 s is booting the app and hydrating the world.

Three wastes drive the cost:

1. **The ×2 profile matrix is about 45% of wall time.** Every test runs on an iPad Mini *and* an iPhone 13,
   yet half of them assert something a viewport cannot change: cargo counts, snapshot salvage, import
   refusals, switch road selection, hill pace.
2. **Boot is paid 96 times.** Nine tests in the switch family re-place the same layout and reload the same
   world; `smoke.spec.ts` repeats the full autosave round trip three times to check three different persisted
   fields.
3. **The suite is contention-fragile in a way that costs whole runs.** Three of the last nine local full runs
   went red (cargo delivery, ambient FPS on tablet, then on phone) and every one passed in isolation. The
   ambient frame-rate test asserts a 10 fps floor locally while the same test allows 2 fps in CI.

There is also an ownership problem: the only way to run "the tests that matter" today is to remember eleven
file names.

## Goals & Success Metrics

- **Goal:** pull-request feedback is under 6 minutes of wall time on GitHub Actions.
  **Metric:** both e2e shards finish in ≤6 min each, measured on this track's own PR.
- **Goal:** the local default loop is under 3 minutes.
  **Metric:** `pnpm e2e` runs the `@smoke` lane (17 runs: ten unique tests across tablet and phone) in ≤3 min on the development machine.
- **Goal:** no architectural risk loses its witness.
  **Metric:** a parity ledger maps all 96 existing tests to either a merged step or a named unit test, with
  zero unexplained removals.
- **Goal:** the change is invisible to the product.
  **Metric:** `git diff --stat` against the base lists no file under `src/`; the unit suite stays at 883 tests
  with unchanged coverage.

## Scope

### In Scope

- A two-tag vocabulary (`@smoke`, `@ci`) and the lane scripts that select them.
- A phone-project allowlist so only layout-sensitive specs run on the phone profile in the PR lane.
- Merging the 27 specs into about 20 files and about 48 tests, using `test.step` for diagnosability.
- A parity ledger that records what each removed assertion is replaced by.
- CI: two e2e shards, plus a nightly scheduled workflow running both profiles.
- Documentation of the vocabulary in `e2e/README.md`, `CONTRIBUTING.md` and `conductor/tech-stack.md`.

### Out of Scope

- Changing what the app does, or any file under `src/`.
- Adding Playwright plugins, coverage tooling or a new reporter dependency.
- Replacing Playwright with another runner.
- The unit and coverage gates, which stay exactly as configured.
- Visual regression screenshots or performance budgets beyond the existing ambient frame-rate canary.
- Manual device testing, which stays in the workflow's human-only verification layer.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Exactly two tags exist: `@smoke` (selects the fast lane) and `@ci` (runs only when `CI` is set). No third tag vocabulary is introduced. | must |
| FR-2 | `@smoke` covers ten tests (eleven before Phase 4 merged the two toybox journeys) spanning eleven behaviours: boot with a clean console and zero external requests, drag-place a piece, ride and stop, an autosave round trip, the parent gate, save salvage, an import round trip, the production shell, phone layout, and offline boot. | must |
| FR-3 | The phone project runs only three files: the smoke boot test, `phone-shell.spec.ts` and `ride-toybox-flow.spec.ts`. The restriction lives in `playwright.config.ts`, not in comments or naming convention. | must |
| FR-4 | The suite is merged to at most 50 unique tests. Every merged body wraps its phases in `test.step` whose name describes the action, so a failure identifies the step that failed. | must |
| FR-5 | Parity: every assertion in the 96 existing tests is either carried into a merged step or removed alongside a named unit test that proves the same behaviour. The parity ledger in the track's verification directory records each removed assertion and its replacement. | must |
| FR-6 | Scripts exist: `pnpm e2e` (the smoke lane), `pnpm e2e:full` (the full tablet suite) and `pnpm e2e:file <path>` (one spec). | must |
| FR-7 | The ambient frame-rate test carries `@ci` and runs only when `CI` is set; it keeps its 2 fps floor so CI can render in software without failing on throughput. | should |
| FR-8 | The CI e2e job runs as two shards (`--shard=1/2` and `--shard=2/2`) in parallel jobs, each keeping the 2-worker ceiling. | must |
| FR-9 | A nightly scheduled workflow runs the full suite on both profiles. | should |
| FR-10 | `e2e/README.md`, `CONTRIBUTING.md` and the Testing row in `conductor/tech-stack.md` document the tags, the two lanes and the profile matrix. | must |
| FR-11 | No file under `src/` changes, no dependency is added, `pnpm check` stays green at 883 unit tests and the coverage thresholds stay unchanged. | must |
| FR-12 | Nine risk classes each keep at least one witness: boot and console health, placement, ride and camera, persistence, parent gate, crossings and switches, cargo, time of day, and offline plus headers. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Total runs drop from 193 to at most 60; unique tests land between 40 and 50 (today 96). |
| NFR-2 | The full tablet suite completes in ≤6 min at 2 workers on the development machine. |
| NFR-3 | The smoke lane completes in ≤3 min on the development machine. |
| NFR-4 | No new dependency and no reporter plugin; the dispatched work uses Playwright's built-in tags, `--grep`, `--shard` and `$env:CI`. |
| NFR-5 | The unit suite and coverage are unchanged: 883 tests, 97.36 / 91.06 / 98.10 / 99.44 on `src/core` + `src/state`. |
| NFR-6 | The 2-worker ceiling per server is preserved; sharding must not raise workers per dev server. |
| NFR-7 | Each CI e2e shard keeps a ceiling of at least 45 minutes, because `playwright install --with-deps` has been observed taking 1–34 minutes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `playwright test --list` reports ≤60 runs and between 40 and 50 unique tests. | FR-4, NFR-1 |
| AC-2 | `pnpm e2e` passes the `@smoke` lane (17 runs, ten unique tests) in ≤3 min. Amended 2026-11-08: eleven became ten when Phase 4 merged `ride-toybox-flow`'s two tagged tests into one journey carrying both behaviours. | FR-2, NFR-3 |
| AC-3 | `pnpm e2e:full` passes the complete tablet suite in ≤6 min. | FR-4, NFR-2 |
| AC-4 | `playwright test --list --project=phone` lists only the runs from the three allowlisted files - 7 runs (5 from `smoke.spec.ts`, 1 `phone-shell`, 1 `ride-toybox-flow`), not the whole suite. Amended 2026-11-08 twice: the original wording said 4, which could not be reached without a third tag, because five `@smoke` tests live inside the allowlisted `smoke.spec.ts`; the count then fell from 8 to 7 when Phase 4 merged the two toybox tests into one. | FR-3 |
| AC-5 | The frame-rate test is skipped locally and present when `CI` is set (demonstrated in both modes). | FR-7 |
| AC-6 | Both CI shards are green on this track's pull request, each finishing in ≤6 min. | FR-8 |
| AC-7 | The parity ledger accounts for every one of the 96 original tests; each removal names the unit test that replaces it; there are zero unexplained entries. | FR-5, FR-12 |
| AC-8 | `pnpm check` is green with 883 tests, and coverage equals the baseline 97.36 / 91.06 / 98.10 / 99.44. | FR-11, NFR-5 |
| AC-9 | The three documents describe the shipped tags, lanes and matrix, and a reader can choose the right command without reading the config. | FR-10 |
| AC-10 | `git diff --stat` against the base shows no file under `src/` and no change to `package.json` dependencies. | FR-11 |

## Edge Cases

- **Tag and allowlist composition.** `@smoke` is applied by `--grep`, while the phone restriction is applied
  by `testIgnore` in the project config. Playwright applies the project's file filter before grep, so the
  smoke lane on the phone project must run 4 tests (boot, phone shell, two ride-toybox), not 11. Phase 1
  proves this with `--list`, not by assumption.
- **Shard and grep interaction.** Sharding is applied after grep. The nightly run therefore does not shard
  (it has no wall-time pressure), and the PR run does not grep (it runs everything).
- **Shared fixtures in a merged test.** `clearMeadow` stays per-test, and no merged test may depend on state
  left by an earlier step of another test. A merged test's steps are sequential by design and must not be
  reorderable.
- **The `prod` project across two shards.** Three projects (tablet, phone, prod) are distributed across two
  shards; `prod.spec.ts` lands in one shard only, so that shard has one more test. This is acceptable and
  recorded rather than balanced by hand.
- **Nightly repetition.** `--repeat-each` multiplies cost, so it is applied only to the two historically noisy
  specs, never to the whole suite.
- **A merged test that starts failing.** Because the parity ledger names which original tests fed each merged
  step, triage can go straight to the step name rather than bisecting a 60-second body.
- **CI without the apt delay.** The 45-minute ceiling stays even though the shard should take 6 minutes,
  because the observed `playwright install --with-deps` variance is the real budget consumer.

## Dependencies

- **Tracks:** `renderer-decomposition_20261108` — merged as PR #69 at `cb9a6c4`; this track's baseline and
  measurements are taken from its 193-run suite. It is complete, so no blocking condition applies.
- **External:** none. No package is added; Playwright 1.62 already provides tags, `--grep` and `--shard`.

## Open Questions & Assumptions

- **Assumption:** merging tests saves the 2–4 s boot cost per eliminated test, so ~48 tests land under
  6 minutes. Phase 6 measures the result instead of projecting it.
- **Assumption:** each CI shard runs on its own runner and starts its own dev server, so 2 workers per shard
  does not recreate the contention that the 2-worker ceiling exists to avoid. If GitHub co-locates shards,
  the wall time will not halve and the evidence must say so.
- **Assumption:** a nightly `schedule` workflow on the default branch costs no pull-request time and does not
  require a repository secret.
- **Question:** whether the ambient frame-rate canary should also run on the nightly phone profile. Default:
  no, because the phone profile is a WebKit emulation with the same throughput characteristics; revisit if a
  phone-only rendering regression is ever found.

## References

- Measured evidence: `.conductor/evidence/e2e-durations.json` (tablet JSON run, 96 tests, 1,105 s).
- `e2e/README.md` — the 2-worker ceiling, the rerun convention and the console-noise allowlist rationale.
- `conductor/workflow.md` — `## Verification Strategy` and `## Workflow Config`.
- `conductor/archive/renderer-decomposition_20261108/` — the parity-ledger precedent for a refactor track.
