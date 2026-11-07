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

<!-- When a phase is verified, the primary agent replaces the placeholders below
     with the Result, Checkpoint SHA and Evidence path.

     **Result:** verified
     **Checkpoint:** <short-sha>
     **Evidence:** conductor/tracks/deps-guardrails_20261107/verification/phase-1.md
-->
