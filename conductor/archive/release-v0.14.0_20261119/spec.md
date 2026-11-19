# Release v0.14.0 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Prepare and ship Tiny Tracks v0.14.0, the first release that includes the merged
toybox clarity work. The release aligns the version, parent-facing changelog, and
clarity comparison artifact with `main`, proves the branch with the configured
local verification matrix and a release-workflow dry run, opens a reviewed PR,
automatically tags the squash merge commit after merge, and watches the
tag-triggered release workflow. No player-facing source code changes are part of
this track.

## Problem / Motivation

`main` contains the merged toybox clarity feature (paged dense tabs,
hand-authored piece icons, outside-board removal with undo) but `package.json`
still says `0.13.0` and `CHANGELOG.md` has an empty `[Unreleased]`. The earlier
v0.13.0 tag exists, but its release workflow was cancelled during Playwright
browser installation and the `publish` job was skipped, so GHCR `0.13.0` /
`latest` were not published by that run. Without a new, verified tag, the
toybox clarity work cannot reach family devices. This track makes v0.14.0 the
authoritative shipped baseline without inventing clarity-audit measurements or
rewriting the existing v0.13.0 tag.

## Goals & Success Metrics

- **Goal:** produce a coherent, verified v0.14.0 release that can be tagged
  automatically after its PR merges.
- **Metric:** version, changelog, and clarity baseline all name v0.14.0; every
  configured check passes locally; the release-workflow dry run completes with
  all gates green and no publish; `review.md` is PASS; the PR is merged; the
  annotated `v0.14.0` tag points at the squash merge commit; and the
  tag-triggered workflow completion is reported.

## Scope

### In Scope

- Bump `package.json` version from `0.13.0` to `0.14.0`.
- Curate `CHANGELOG.md`: move `[Unreleased]` into
  `## [0.14.0] - 2026-11-19`, add parent-facing notes for paged toybox tabs,
  hand-drawn piece icons, and easier removal by dragging a placed piece beyond
  the board; keep `[Unreleased]` empty; refresh compare links.
- Retarget `conductor/archive/clarity-audit_20261110/comparison.md` labels from
  v0.13.0 to v0.14.0 while keeping every measured value `awaiting observation`.
- Correct the historical clarity-audit artifact link in `conductor/product.md`
  from `conductor/tracks/clarity-audit_20261110/` to
  `conductor/archive/clarity-audit_20261110/`.
- Run the full configured verification matrix on the release branch and record
  results in `verification/integrated.md`.
- Run a `workflow_dispatch` release dry run from the release branch before
  tagging and require all gates plus image build to succeed without publish or
  deploy.
- Open a release PR, pass `conductor-review`, and record terminal proof.
- After PR merge, automatically create and push annotated tag `v0.14.0` at the
  squash merge commit, then watch the tag-triggered release workflow and report
  its completion.

### Out of Scope

- No `src/`, test, dependency, workflow, or runtime configuration change.
- No manual tablet check: the user explicitly chose to skip it for this release.
- No GHCR tag inspection that requires extra package scope; if `gh` returns 403,
  report the workflow run facts instead.
- No v1.0 ship-gate claim and no clarity-audit measurements.
- No overwrite, deletion, or force-push of the existing `v0.13.0` tag.
- No second Phase 3 feature track.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Set `package.json` version to `0.14.0`. | must |
| FR-2 | Curate `CHANGELOG.md` into a parent-facing `[0.14.0] - 2026-11-19` section with an empty `[Unreleased]` and refreshed compare links. | must |
| FR-3 | Retarget the clarity comparison artifact's version labels to v0.14.0 without changing any `awaiting observation` value. | must |
| FR-4 | Correct the clarity-audit artifact link in `conductor/product.md` to the archive path. | must |
| FR-5 | Run the full configured verification matrix on the release branch and record it in `verification/integrated.md`. | must |
| FR-6 | Run a `workflow_dispatch` release dry run from the release branch before tagging and require all gates plus image build to succeed without publish or deploy. | must |
| FR-7 | Open a release PR with review PASS and terminal proof recorded. | must |
| FR-8 | After PR merge, automatically create annotated tag `v0.14.0` at the squash merge commit and push it. | must |
| FR-9 | Watch the tag-triggered release workflow to completion and report publish outcome, treating a 403 GHCR query as unknown rather than failure. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Keep the diff to version/release docs and Conductor state; no source, test, dependency, or workflow change. |
| NFR-2 | Do not invent audit numbers; baseline values stay `awaiting observation` and privacy claims remain unchanged. |
| NFR-3 | Keep the changelog in parent voice, understandable without technical knowledge. |
| NFR-4 | The manual tablet check is explicitly skipped by user decision, not silently omitted. |
| NFR-5 | Existing CI gates and the release dry run remain authoritative; a failed gate stops the release before tagging. |
| NFR-6 | The v0.13.0 tag is historical and untouched; v0.14.0 supersedes it as the shipped baseline. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `package.json` version is `0.14.0`; remaining `0.13.0` strings appear only in CHANGELOG history, archives, or this track's prose. | FR-1 |
| AC-2 | `CHANGELOG.md` has `[0.14.0] - 2026-11-19`, empty `[Unreleased]`, refreshed compare links, and parent notes for toybox paging, icons, and removal. | FR-2 |
| AC-3 | `comparison.md` header, section heading, table heading, and baseline prose name v0.14.0; every measured value remains `awaiting observation`. | FR-3 |
| AC-4 | `conductor/product.md` links the clarity artifact under `conductor/archive/`, not `conductor/tracks/`. | FR-4 |
| AC-5 | `pnpm check`, `pnpm test:coverage`, `pnpm build`, `pnpm exec playwright test`, and `pnpm audit --audit-level=high` all exit 0 on the release branch and are recorded in `verification/integrated.md`. | FR-5 |
| AC-6 | A `workflow_dispatch` release dry run completes with all gates and image build green, no publish/deploy, and its run URL is recorded. | FR-6 |
| AC-7 | `review.md` records PASS; the PR is open with terminal proof before the merge gate. | FR-7 |
| AC-8 | After PR merge, an annotated `v0.14.0` tag points at the squash merge commit and is pushed without a second user confirmation. | FR-8 |
| AC-9 | The tag-triggered release workflow is watched to completion; success, failure, or skipped publish is reported, and a 403 GHCR query is reported as unknown rather than inferred. | FR-9 |

## Edge Cases

- If any local check or the release dry run fails, stop before PR/tag and report the
  failing gate.
- Compare links may reference the not-yet-existing `v0.14.0` tag; record that as
  expected until tagging.
- If a `v0.14.0` tag already exists, stop; never overwrite or force-push a tag.
- If `main` advances after the release branch is cut, refresh the base and re-run
  verification before tagging.
- If the tag-triggered workflow is cancelled or its publish job is skipped, report
  the run as failed for publication even if earlier gates passed.
- If GHCR package inspection returns 403, rely on workflow job conclusions and
  report the image as unverified rather than claiming publication.

## Dependencies

- **Tracks:** none — all Phase 2 tracks are merged and archived.
- **External:** GitHub remote, `gh` authentication, permission to push tags, and
  the release workflow's existing GHCR/Coolify secrets. The agent does not handle
  those secrets directly.

## Open Questions & Assumptions

- **Decision:** v0.14.0 is a semantic minor release.
- **Decision:** clarity baseline is retargeted to v0.14.0; no observation values
  are filled.
- **Decision:** a release-workflow dry run is required before tagging because
  the v0.13.0 release workflow timed out and skipped publish.
- **Decision:** tagging is automatic after PR merge; no separate tag-approval
  question is asked.
- **Decision:** the manual tablet check is skipped for this release.
- **Decision:** after tag push, watch the release workflow; do not perform extra
  GHCR probing if permissions are insufficient.
- **Assumption:** `workflow_dispatch` with `dry_run=true` runs all gates and the
  image build without pushing or deploying, as defined in `release.yml`.

## References

- `conductor/workflow.md` — Deployment Pre-Deployment Checklist and Steps.
- `conductor/tech-stack.md` — release runbook and tag-driven pipeline.
- `CHANGELOG.md`, `package.json`, `conductor/product.md`.
- `conductor/archive/clarity-audit_20261110/comparison.md`.
- `conductor/archive/release-v0.13.0_20261118/spec.md` and `plan.md`.
- `.github/workflows/release.yml`.
