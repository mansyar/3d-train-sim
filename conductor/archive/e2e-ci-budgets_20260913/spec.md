# Spec — E2E CI Time Budgets: Crossing Gate & Wagon Workshop (`e2e-ci-budgets_20260913`)

**Type:** Bug

## Overview

On 2026-09-13 the post-merge `main` runs for PR #57 and PR #58 went red on
tablet-profile e2e tests while the same trees passed their PR runs and local
suites:

- `e2e/crossing-gate.spec.ts` — "the train approach closes the gates, rings
  the bell, and the pass lifts them" failed on three consecutive `main` runs
  (including #57's, before any music-box code existed). It relies on
  Playwright's default 30 s test budget while its own witnessed waits allow up
  to ~80 s (30 s approach + 10 s bell + 30 s settle + 10 s bell-off) and then
  still needs the post-pass reload to boot.
- `e2e/wagon-workshop.spec.ts` — "per-train presets ride, deliver cargo, and
  survive a reload" parked on a 45 s cargo-delivery poll; a busy runner can
  take longer than that before the first station delivery lands.

Both are wall-clock budget bugs in the specs, not app defects: an explicit
budget costs nothing on fast machines and removes the flake class on slow
runners.

## Functional Requirements

- **F1.** `e2e/crossing-gate.spec.ts`: the approach/bell/pass/reload test sets
  `test.setTimeout(120_000)` with a one-line comment explaining that it must
  outlive its ~80 s of allowed waits plus the reload boot.
- **F2.** `e2e/wagon-workshop.spec.ts`: the delivery poll allows 90 s
  (`{ timeout: 90_000, intervals: [2000] }`) and the test budget grows to
  `180_000` so it outlives the poll, with the existing comment updated to
  match.
- **F3.** No assertion is weakened and no app code changes — only wall-clock
  budgets.

## Non-Functional Requirements

- No app/runtime, bundle, or plugin changes.
- Ubuntu e2e remains the release authority; the PR e2e gate stays the tripwire.
- Fast local runs keep their duration (budgets only cap, never delay).

## Acceptance Criteria

1. Both specs pass locally on the tablet and phone profiles.
2. The PR CI e2e gate is green.
3. The post-merge `main` run on the merged commit is green.
4. `biome check` and `tsc --noEmit` stay clean (no source touched).

## Out of Scope

- App behavior, animation, or motion-timing changes.
- Re-balancing other specs, worker counts, or the CI matrix.
- Re-running or hiding the historical red `main` runs.

## Decisions Log

- 2026-09-13: Budgets sized as multiples of each spec's own allowed waits
  (crossing-gate ~80 s → 120 s; wagon 45 s poll → 90 s poll with a 180 s test),
  matching the `wagon-workshop` (120 s) and `delight-toys` (90 s) precedent
  instead of inventing a global timeout setting.
