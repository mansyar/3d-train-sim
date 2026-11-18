# Release v0.13.0 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Prepare and ship Tiny Tracks v0.13.0. The release brings the version,
parent-facing changelog, and clarity-audit baseline artifact into agreement with
the work already merged since v0.12.0, proves the release branch with the
project's configured CI gates, and pushes the production-triggering `v0.13.0`
tag only after explicit user approval. No player-facing code changes are part of
this track.

## Problem / Motivation

`main` contains merged install onboarding, local insights, accessibility polish,
a pnpm 12/toolchain repair, and a CI performance gate, but `package.json` still
says `0.12.0`, `CHANGELOG.md` has an incomplete `[Unreleased]` section, and the
clarity comparison artifact still names v0.12.0 as its baseline. Until a
`v*` tag is pushed, none of this work reaches family devices; the 30-day
dogfooding gate cannot start on the shipped build.

## Goals & Success Metrics

- **Goal:** produce a coherent, verified v0.13.0 release that can be tagged with
  one explicit approval.
- **Metric:** version, changelog, and audit baseline all name v0.13.0; every
  configured check passes; `review.md` is PASS; the PR is merged; and the tag is
  pushed only after approval.

## Scope

### In Scope

- Bump `package.json` version from `0.12.0` to `0.13.0`.
- Curate `CHANGELOG.md`: move `[Unreleased]` into `## [0.13.0] - 2026-11-18`,
  add parent-facing notes for local insights, install onboarding, and
  accessibility polish, briefly note the behind-the-scenes pnpm/audit and
  performance work, keep an empty `[Unreleased]`, and refresh compare links.
- Retarget `conductor/archive/clarity-audit_20261110/comparison.md` labels from
  v0.12.0 to v0.13.0 while keeping every measured value `awaiting observation`.
- Run the full configured verification matrix on the release branch and record
  results in `verification/integrated.md`.
- Open a release PR, pass `conductor-review`, and record terminal proof.
- After PR merge, ask for explicit approval and then push the annotated
  `v0.13.0` tag at the merge commit.

### Out of Scope

- No `src/`, test, dependency, workflow, or runtime configuration change.
- No `workflow_dispatch` dry run: the user chose PR CI as sufficient.
- No manual tablet check before tagging: the user chose to skip it for this
  release.
- No GHCR image verification or production cold-load check after the tag push:
  the user chose to stop once the tag is pushed.
- No v1.0 ship-gate claim and no clarity-audit measurements.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Set `package.json` version to `0.13.0`. | must |
| FR-2 | Curate `CHANGELOG.md` into a parent-facing `[0.13.0] - 2026-11-18` section with an empty `[Unreleased]` and refreshed compare links. | must |
| FR-3 | Retarget the clarity comparison artifact's version labels to v0.13.0 without changing any `awaiting observation` value. | must |
| FR-4 | Run the full configured verification matrix on the release branch and record it in `verification/integrated.md`. | must |
| FR-5 | Open a release PR with review PASS and terminal proof recorded. | must |
| FR-6 | Push annotated tag `v0.13.0` at the merge commit only after explicit user approval following PR merge. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Keep the diff to version/release docs and Conductor state; no source, test, dependency, or workflow change. |
| NFR-2 | Do not invent audit numbers; baseline values stay `awaiting observation` and privacy claims remain unchanged. |
| NFR-3 | Keep the changelog in parent voice, understandable without technical knowledge. |
| NFR-4 | Existing CI gates remain authoritative; skipped dry-run, manual-device, and post-tag checks are explicit user decisions, not silent omissions. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `package.json` version is `0.13.0`; remaining `0.12.0` strings appear only in CHANGELOG history, archives, or this track's prose. | FR-1 |
| AC-2 | `CHANGELOG.md` has `[0.13.0] - 2026-11-18`, empty `[Unreleased]`, refreshed compare links, and notes for local insights, install onboarding, a11y polish, pnpm/audit, and perf gate. | FR-2 |
| AC-3 | `comparison.md` header, section heading, table heading, and baseline prose name v0.13.0; every measured value remains `awaiting observation`. | FR-3 |
| AC-4 | `pnpm check`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, and `pnpm audit --audit-level=high` all exit 0 on the release branch and are recorded in `verification/integrated.md`. | FR-4 |
| AC-5 | `review.md` records PASS; the PR is open with terminal proof (`pr-open` gate) before the merge question. | FR-5 |
| AC-6 | The tag is not pushed before PR merge and explicit user approval; if approval is declined, the branch stays untagged. | FR-6 |
| AC-7 | After approval, an annotated `v0.13.0` tag points at the squash merge commit and is pushed to origin; the run then stops without GHCR/production verification. | FR-6 |

## Edge Cases

- If any configured check fails, stop before PR/tag and report the failing gate.
- Compare links may reference the not-yet-existing `v0.13.0` tag; record that as
  expected until tagging, not as a broken link.
- If a `v0.13.0` tag already exists, stop; never overwrite or force-push a tag.
- If `main` advances after the release branch is cut, refresh the base and
  re-run verification before tagging.
- If approval is not given after merge, leave the repository untagged and
  report the release as prepared but not shipped.

## Dependencies

- **Tracks:** none — all Phase 2 tracks are merged and archived.
- **External:** GitHub remote, `gh` authentication, and permission to push tags.
  The Coolify webhook and GHCR credentials are owned by the release workflow,
  not this track.

## Open Questions & Assumptions

- **Decision:** v0.13.0 is a semantic minor release.
- **Decision:** clarity baseline is retargeted to v0.13.0; no observation values
  are filled.
- **Decision:** PR CI is sufficient; no `workflow_dispatch` dry run.
- **Decision:** manual tablet check is skipped for this release.
- **Decision:** tag push requires explicit user approval; post-tag deployment
  verification is out of scope.
- **Assumption:** the configured `pnpm/action-setup@v4` reads the `packageManager`
  pin already updated to pnpm 12.21.0.

## References

- `conductor/workflow.md` — Deployment Pre-Deployment Checklist and Steps.
- `conductor/tech-stack.md` — release runbook and tag-driven pipeline.
- `CHANGELOG.md`, `package.json`.
- `conductor/archive/clarity-audit_20261110/comparison.md`.
- `.github/workflows/release.yml`.
