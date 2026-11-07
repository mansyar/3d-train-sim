# Dependency Guardrails — Implementation Plan

> **Branch:** `chore/deps-guardrails_20261107`
> **Base:** `main` @ `b99999abcaf8bad1200c194c524a7835c5681f63`
>
> **Phase states:** `pending`, `in_progress`, `verified`, `failed`, `blocked`.
> Only the primary agent writes this file.

## Phase 1: Renovate policy and its coverage guard

- **Goal:** `renovate.json` declares the cadence, the soak and the groupings, and a unit test proves that no direct dependency escapes the config.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-4, AC-1, AC-2, AC-3
- **Touches:** `renovate.json`, `src/core/renovate-config.test.ts`
- **Verification:** `pnpm check`
- **Status:** verified
- [x] **P1.T1: Write the Renovate policy** — covers: FR-1, FR-2, FR-3, FR-4
  - [x] P1.T1.1: Create `renovate.json` extending `config:recommended`, with `dependencyDashboard: true`, a weekly Monday schedule before the working day in `Australia/Sydney`, `minimumReleaseAge: "3 days"`, `rebaseWhen: "conflicted"` and no automerge
  - [x] P1.T1.2: Add `packageRules` for the coupled pairs (`three` + `@types/three`, `vite-plugin-pwa` + `workbox-window`), a test-tooling group, a lint/type group, and a separate majors group
  - [x] P1.T1.3: Validate the config with `renovate-config-validator` and record the output; if the validator cannot run offline, record that plainly rather than claiming it passed
- [x] **P1.T2: Guard the config against drift** — covers: FR-5
  - [x] P1.T2.1: Read `package.json` and `renovate.json` in a test and assert every direct dependency is matched by at least one `packageRules` pattern
  - [x] P1.T2.2: Assert both members of each coupled pair resolve to the same group name, and that majors never share a group with minors
  - [x] P1.T2.3: Demonstrate the guard failing on a temporary unmatched dependency, then revert it and show the test green again

**Result:** verified
**Checkpoint:** 0915650
**Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-1.md
**Deviations:** the phase agent's sandbox denied the validator, so the primary ran it (`npx --yes --package renovate@latest renovate-config-validator renovate.json`, exit 0, "Config validated successfully against 1 file(s)"). Seven groups ship rather than the brief's four-plus-two: `howler`/`@types/howler` turned out to be a third coupled pair, and `idb`/`@fontsource/baloo-2` needed a home for the coverage test to pass.

## Phase 2: The audit gate

- **Goal:** a fourth CI gate fails a pull request carrying a high or critical advisory, and runs in under a minute.
- **Depends on:** Phase 1
- **Covers:** FR-6, FR-7, FR-8, NFR-2, NFR-3, AC-4, AC-5, AC-7
- **Touches:** `.github/workflows/ci.yml`, `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- **Verification:** `pnpm audit --audit-level=high` and `pnpm check`
- **Status:** verified
- [x] **P2.T1: Add `Gate · audit` to CI** — covers: FR-6, FR-7, NFR-3
  - [x] P2.T1.1: Add an independent job running `pnpm audit --audit-level=high`, with a five-minute ceiling and no dependency on Playwright, the build or the other gates
  - [x] P2.T1.2: Keep the existing workflow filters intact, so the gate runs on every push and pull request that touches code
- [x] **P2.T2: Prove the gate bites** — covers: FR-6, FR-8, NFR-2, AC-4, AC-5
  - [x] P2.T2.1: Run the gate on the clean tree, record its exit code and measured duration
  - [x] P2.T2.2: Force a vulnerable version back into the lockfile, show the gate exiting non-zero, then revert and show `pnpm-lock.yaml` returning byte-identical
  - [x] P2.T2.3: If a dated ignore turns out to be required, add it to the pnpm settings with a date and a reason; otherwise record that none was needed
- [x] **P2.T3: Clear the audit backlog first** — covers: FR-6, AC-4, AC-5
  - [x] P2.T3.1: Record the pre-gate baseline (45 findings, 15 high) so the starting point is public
  - [x] P2.T3.2: Bump `vite` inside its range, then override `source-map-js`, `undici`, `fast-uri` and `brace-expansion` in `pnpm-workspace.yaml` with the advisory id beside each
  - [x] P2.T3.3: Prove the tree still ships — `pnpm check`, `pnpm build` and the full 193-spec suite green with the overrides in place

**Result:** verified
**Checkpoint:** 691f4a7
**Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-2.md
**Deviations:** the spec assumed a green baseline; it was red (15 high). Rather than ship the gate with five ignores, the phase clears the fixable advisories first, so `package.json`, `pnpm-workspace.yaml` and `pnpm-lock.yaml` are part of this diff. pnpm 11 ignores `pnpm.overrides` in `package.json` — the overrides live in `pnpm-workspace.yaml`. No dated ignore shipped: every high had a fixed version. Four moderate and two low advisories remain, below the agreed threshold and listed in the evidence.

## Phase 3: Documentation

- **Goal:** the cadence, soak, gate and ignore rule are written where the next contributor looks.
- **Depends on:** Phase 2
- **Covers:** FR-9, AC-6
- **Touches:** `conductor/tech-stack.md`, `conductor/product.md`, `CONTRIBUTING.md`
- **Verification:** `pnpm check`
- **Status:** verified
- [x] **P3.T1: Document the maintenance policy** — covers: FR-9
  - [x] P3.T1.1: Add a dependency-maintenance row to `conductor/tech-stack.md` naming the config, the cadence, the soak, the audit gate and the dated-ignore rule, with today's date
  - [x] P3.T1.2: Add a short note to `CONTRIBUTING.md` telling a contributor what a Renovate PR is and that it merges only after all four gates are green
- [x] **P3.T2: Record the roadmap outcome** — covers: FR-9
  - [x] P3.T2.1: Mark `deps-guardrails_20261107` shipped in the `conductor/product.md` roadmap, and record that enabling the Renovate app on the repository is a manual step outside this track

**Result:** verified
**Checkpoint:** 9ad7f35
**Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-3.md
**Deviations:** the tech-stack row documents the four `overrides` beside the policy, because they are what keeps the gate green and a future reader needs to know why they exist. Installing the Renovate GitHub app was not performed — it is a repository setting, recorded as the remaining manual step in the roadmap row.

## Phase R1: Review Fixes

- **Goal:** close the seven round-1 findings, above all the two that would have broken a real build — a tree-wide `brace-expansion` major inside `minimatch@5` and a Dockerfile that omits `pnpm-workspace.yaml`.
- **Depends on:** Phase 3
- **Covers:** F1, F2, F3, F4, F5, F6, F7
- **Touches:** `pnpm-workspace.yaml`, `Dockerfile`, `src/core/renovate-config.test.ts`, `src/core/dependency-overrides.test.ts`, `conductor/tracks/deps-guardrails_20261107/verification/integrated.md`
- **Verification:** `pnpm check` and `pnpm audit --audit-level=high`
- **Status:** verified
- [x] **R1.T1: Scope the brace-expansion override per consumer major** — covers: F1
  - [x] R1.T1.1: Replace the tree-wide range with `"minimatch@5>brace-expansion": ">=2.1.7 <3"` and `"minimatch@10>brace-expansion": ">=5.0.11"`
  - [x] R1.T1.2: Add `src/core/dependency-overrides.test.ts`, resolving each installed minimatch copy and asserting the brace-expansion it requires is callable
  - [x] R1.T1.3: Show the guard failing under the tree-wide override, then passing once scoped
- [x] **R1.T2: Copy the pnpm settings into the image** — covers: F2
  - [x] R1.T2.1: Add `pnpm-workspace.yaml` to the build stage's `COPY`
  - [x] R1.T2.2: Reproduce the frozen install in a temp directory with and without the file, and record both exit codes
- [x] **R1.T3: Make the automerge guard exact** — covers: F3
  - [x] R1.T3.1: Assert `automerge` is exactly `false`, reject any per-rule `automerge` and `platformAutomerge: true`, widen the types, and add a string-valued case
- [x] **R1.T4: Stop counting rules that cannot deliver an update** — covers: F4
  - [x] R1.T4.1: Require a `groupName`, `enabled !== false` and a minor-or-patch scope before a rule counts as coverage; read optional and peer dependencies; add a rejection case
- [x] **R1.T5: Measure the gate and fix the AC table** — covers: F5
  - [x] R1.T5.1: Time `pnpm audit --audit-level=high`, record the number, and renumber the integrated AC rows to the spec
- [x] **R1.T6: Cap `fast-uri` inside ajv's major** — covers: F6
  - [x] R1.T6.1: Change the override to `">=3.1.7 <4"` and record the resolved version
- [x] **R1.T7: Lower the anti-vacuity floor** — covers: F7
  - [x] R1.T7.1: Drop the floor from 15 to 10, keeping the `three` assertion

**Result:** verified
**Checkpoint:** b3193d0
**Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-R1.md
**Deviations:** the fixes were authored by the primary in one pass (four code files, with runtime checks against the installed tree), so they share one commit rather than one per finding. `docker build` was not run — no daemon locally or in CI — so the temp-directory frozen install is the witness.

## Phase R2: Second-round review fixes

- **Goal:** make the two new witnesses actually witness — a shape check that skips a major it should examine, and a `platformAutomerge` assertion that reads an absent key whose default is `true`.
- **Depends on:** Phase R1
- **Covers:** R2-F1, R2-F2, R2-F3, R2-F4, R2-F5, R2-F6
- **Touches:** `src/core/dependency-overrides.test.ts`, `src/core/renovate-config.test.ts`, `renovate.json`, `conductor/tracks/deps-guardrails_20261107/review.md`
- **Verification:** `pnpm check`, `pnpm audit --audit-level=high` and `pnpm exec playwright test`
- **Status:** verified
- [x] **R2.T1: Table the brace-expansion shapes per major** — covers: R2-F1
  - [x] R2.T1.1: Replace the `major >= 6` skip with `SHAPE_BY_MAJOR` (5, 9 → callable; 10 → namespace) and fail loudly on an unknown major
  - [x] R2.T1.2: Assert the number of copies examined equals the number found
  - [x] R2.T1.3: Prove every `overrides` selector binds to a package the store holds, so a renamed or dropped consumer cannot leave a silent no-op
- [x] **R2.T2: Make automerge unfalsifiable-by-default** — covers: R2-F2, R2-F3, R2-F4
  - [x] R2.T2.1: Set `"platformAutomerge": false` in `renovate.json` and re-validate it
  - [x] R2.T2.2: Extract `automergeOffenders(policy)` used by both automerge tests, with cases for a string value, a per-rule platform toggle and an explicit per-rule `false`
- [x] **R2.T3: Correct the review record** — covers: R2-F5, R2-F6
  - [x] R2.T3.1: Use the real commit ranges and the honest full-suite result, and refresh the stale counts
- [x] **R2.T4: Wait for boot before clearing the meadow** — covers: R2-F6
  - [x] R2.T4.1: Make `clearMeadow` await the readiness flag, because a reset that lands before hydration is silently undone by the snapshot — the tablet `tabbed toybox walkthrough` failure was four scenery where two were placed

**Result:** verified
**Checkpoint:** a5e4a43
**Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-R2.md

**Deviations:** the phase was authored by the primary (round-2 fixes are test,
config and one e2e helper), so it lands in one commit. The full suite was run
three times and failed one contention-sensitive spec each time — a different one
— while every failure passed on isolated repeats; the ambient-FPS spec is a
throughput measurement on a shared box, and CI is the authority for that suite.
The `clearMeadow` race found while running it is fixed rather than recorded as
flaky.

<!-- When a phase is verified, the primary agent replaces the placeholders below
     with the Result, Checkpoint SHA and Evidence path.

     **Result:** verified
     **Checkpoint:** <short-sha>
     **Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-1.md
-->
