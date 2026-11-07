# Dependency Guardrails — Specification

> **Stability note:** IDs are stable once approved. Do not renumber `FR`, `NFR` or
> `AC` items; mark withdrawn items as `Withdrawn` instead.

## Overview

Make dependency maintenance a standing habit rather than a manual chore: Renovate
proposes a small, reviewable batch of updates every week, and CI refuses to merge a
dependency tree that carries a high or critical security advisory.

## Problem / Motivation

The project has fifteen direct dependencies plus their transitive tree, declared with
caret ranges, and no maintenance automation at all:

- Nothing notices when `three`, `vite` or `vitest` ships a patch, so the project drifts
  until a build breaks or a wanted fix is several minor versions away.
- Nothing notices when an advisory lands in a package already in the tree. A static,
  offline app limits *runtime* exposure, but these packages are executed by the CI
  runners and baked into the Docker image, and `three` ships inside the bundle.
- `pnpm install` on a machine without the lockfile resolves ranges fresh, so a
  compromised or broken fresh release can enter an install without a reviewable diff.

The roadmap already names the remedy (`deps-guardrails_20261107`: grouped Renovate
config, `pnpm audit` gate); this track defines exactly what that means.

## Goals & Success Metrics

- **Goal:** a weekly update batch small enough to review in one sitting, with no
  automerge. **Metric:** at most one PR per coupled group per week, each mergeable by a
  human reading the diff.
- **Goal:** a high or critical advisory cannot merge. **Metric:** a deliberately
  vulnerable install turns the audit gate red; a clean tree turns it green in under 60 s.
- **Goal:** no dependency escapes maintenance. **Metric:** a unit test fails when a direct
  dependency is matched by no Renovate rule.

## Scope

### In Scope

- `renovate.json` at the repository root: recommended preset, dependency dashboard,
  weekly schedule, three-day soak, coupled-package groups, majors kept apart.
- A unit test that reads `package.json` and `renovate.json` and fails when the config
  stops covering a direct dependency or splits a coupled pair.
- A fourth CI gate, `Gate · audit`, running `pnpm audit --audit-level=high`.
- Documentation of the cadence, the soak, the gate and the ignore rule.

### Out of Scope

- Changing how versions are declared: caret ranges stay, and the lockfile pins builds.
- Automerge of any kind.
- Self-hosting Renovate, or generating an SBOM.
- Scanning `public/` assets (vendored kits, already licence-checked).
- Replacing `pnpm audit` with a third-party scanner.

## Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | `renovate.json` exists at the repository root, extends `config:recommended`, and enables the dependency dashboard | must |
| FR-2 | Updates are proposed weekly on Monday before the working day in `Australia/Sydney`, and are never automerged | must |
| FR-3 | A version must have been published for at least three days before Renovate proposes it (`minimumReleaseAge`) | must |
| FR-4 | Coupled packages are grouped so they cannot split: `three` with `@types/three`, and `vite-plugin-pwa` with `workbox-window`; a test-tooling group and a lint/type group collect the rest; major updates stay in their own group, apart from minor and patch | must |
| FR-5 | A unit test reads `package.json` and `renovate.json` and fails if any direct dependency is matched by no rule, or if the two members of a coupled pair resolve to different groups | must |
| FR-6 | A CI job named `Gate · audit` runs `pnpm audit --audit-level=high` on every push and pull request and fails the run on a high or critical advisory | must |
| FR-7 | The audit gate is independent: it does not wait on the e2e job, and the e2e job does not wait on it | should |
| FR-8 | An advisory with no patched version is recorded as a dated, commented ignore in `pnpm.auditConfig`, never as a blanket exemption for dev dependencies | must |
| FR-9 | `conductor/tech-stack.md`, `CONTRIBUTING.md` and the roadmap row in `conductor/product.md` record the policy | should |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Adds no runtime dependency, no bundle bytes and no new asset |
| NFR-2 | `Gate · audit` completes in under 60 seconds on a CI runner |
| NFR-3 | The existing gates are unchanged, and PR wall time grows by at most one minute |
| NFR-4 | `renovate.json` passes `renovate-config-validator`; the validator output is recorded in the phase evidence |
| NFR-5 | No new secret, token or workflow permission; authentication stays with the Renovate GitHub app |

## Acceptance Criteria

| ID | Criterion | Verifies |
|----|-----------|----------|
| AC-1 | `renovate.json` declares the recommended preset, the dashboard, the weekly Sydney schedule and the three-day soak | FR-1, FR-2, FR-3 |
| AC-2 | The guard test proves both members of each coupled pair resolve to one group name, and that every direct dependency is matched | FR-4, FR-5 |
| AC-3 | Adding a dependency that no rule matches makes the guard test fail; removing it makes it pass again, both demonstrated | FR-5 |
| AC-4 | `pnpm audit --audit-level=high` exits non-zero against a deliberately vulnerable install and returns to zero once the install is reverted | FR-6, FR-8 |
| AC-5 | The audit job's measured duration is recorded and is under 60 seconds | NFR-2 |
| AC-6 | `tech-stack.md`, `CONTRIBUTING.md` and the roadmap row describe the cadence, the soak, the gate and the ignore rule | FR-9 |
| AC-7 | `pnpm check` is green with the existing suite, and the other three gates still pass | NFR-3 |

## Edge Cases

- **No advisories at all:** `pnpm audit` exits 0 and the gate is green. This must be the
  common case, not something to apologise for.
- **Registry unreachable:** the gate fails loudly. A network blip must never read as
  "no vulnerabilities", so there is no retry-until-green and no `|| true`.
- **Advisory with no fix:** a dated ignore with a reason, plus a follow-up track. The
  ignore is narrow: one advisory ID, or one package, never "all dev dependencies".
- **Renovate PR conflicts after another merge:** `rebaseWhen: conflicted` keeps the PR
  current without automerge.
- **A major update that breaks a gate:** it stays an open PR with a red check. It is
  never queued for automerge, because there is no automerge.
- **A newly added dependency:** the guard test fails until the author either matches it
  with a rule or confirms it belongs to an existing group. That is the point.

## Dependencies

- **Tracks:** `save-resilience_20261107` (#65), `world-portability_20261107` (#66) and
  `runtime-guarantees_20261107` (#67), all merged.
- **External:** the Renovate GitHub app must be installed on `mansyar/3d-train-sim`;
  configuration alone proposes nothing. The npm registry must be reachable from CI.

## Open Questions & Assumptions

- **Assumption:** Renovate runs as the hosted GitHub app. This track adds no workflow,
  token or secret for it.
- **Assumption:** `pnpm audit` is the sanctioned advisory source; no GitHub dependency
  review action and no third-party scanner.
- **Assumption:** caret ranges are the project's convention and stay unchanged.

## References

- `conductor/product.md` — roadmap row `deps-guardrails_20261107` (Phase 0, P1, 0.5d)
- `conductor/tech-stack.md` — pinned toolchain and the CI gate descriptions
- `conductor/workflow.md` — `## Workflow Config`, verification strategy
- [Renovate configuration reference](https://docs.renovatebot.com/configuration-options/)
