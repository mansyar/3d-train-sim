# Release v0.15.0 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Ship the two already-merged player-facing improvements — the visible station
cargo hand-off (#86) and layered drifting clouds (#87) — as `v0.15.0`, aligning
the release documentation, the clarity baseline labels and the known
`conductor/product.md:115` drift. This is a release chore only: no gameplay,
rendering or input behaviour changes. Merging to `main` never deploys; only a
`v*` tag triggers the release pipeline.

## Problem / Motivation

Both features are merged and independently verified on `main` (`da63f08`,
`e13f652`), but devices still run v0.14.1 because only tags publish. The
`CHANGELOG.md` `[Unreleased]` section contains only the cargo entry; the sky
entry was deliberately excluded by its frozen spec. `conductor/product.md:115`
still reads "v0.14.1 release gates pending" although v0.14.1 shipped, and
`conductor/archive/clarity-audit_20261110/comparison.md` still labels its
baseline v0.14.1. Without a release, none of the new work reaches the child and
the documented baseline remains stale.

## Goals & Success Metrics

- **Goal:** Publish v0.15.0 from a clean release branch after a green full local
  matrix and two consecutive green release-workflow dry runs.
- **Metric:** `package.json` is `0.15.0`; changelog, roadmap wording and clarity
  labels are aligned; every configured check exits 0; both dry runs pass with
  deploy skipped; the tag is created from the squash merge commit and the
  tag-triggered workflow is watched to completion. Zero clarity numbers and zero
  v1.0 claims are invented.

## Scope

### In Scope

- Bump `package.json` to `0.15.0` without dependency or lockfile changes.
- Curate a parent-facing `CHANGELOG.md`: empty `[Unreleased]`, a dated
  `[0.15.0] - 2026-11-20` section containing both the cargo hand-off and the
  layered-cloud entries, and refreshed compare links.
- Restore shipped wording at `conductor/product.md:115` for v0.14.1, leaving the
  rest of the roadmap, the Phase 3 options, the anti-roadmap and the v1.0 ship
  gate unchanged.
- Retarget the clarity `comparison.md` baseline labels from v0.14.1 to v0.15.0
  while every measured cell remains `awaiting observation`.
- Run the full configured local verification matrix and two consecutive
  `workflow_dispatch` release dry runs from the release branch.
- Open the release PR with PASS review and terminal proof, merge it, create and
  push annotated tag `v0.15.0` at the squash commit, and watch the tag workflow.

### Out of Scope

- Runtime changes to `src/`, e2e/unit tests, `playwright.config.ts` or
  `release.yml`.
- Dependency, `pnpm-lock.yaml`, save-format, storage-key, parent-gate, viewport
  or kid-UI changes.
- Manual iPad Safari / Android Chrome checks; GHCR package mutation; clarity
  audit measurements; Phase 3 work; v1.0 gate claims.
- Deleting, overwriting or force-pushing v0.14.0 or v0.14.1 tags.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Bump `package.json` to `0.15.0` with no dependency or lockfile diff. | must |
| FR-2 | Curate `CHANGELOG.md`: empty `[Unreleased]`, dated `[0.15.0] - 2026-11-20` with plain-language cargo and sky entries, and refreshed compare links. | must |
| FR-3 | Restore shipped wording at `conductor/product.md:115` for v0.14.1, leaving the rest of the roadmap and the v1.0 gate untouched. | must |
| FR-4 | Retarget clarity `comparison.md` baseline labels to v0.15.0; all eight `awaiting observation` cells remain unchanged. | must |
| FR-5 | Full configured local verification matrix passes on final release content. | must |
| FR-6 | Two consecutive `workflow_dispatch` dry runs from the release branch pass all gates with deploy skipped. | must |
| FR-7 | Release PR with PASS review and terminal proof; merge; auto-tag `v0.15.0` at the squash commit, push the tag, and watch the tag workflow. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No runtime source, test, dependency or workflow changes; release docs plus Conductor state only. |
| NFR-2 | No telemetry, network calls, storage keys, save format, parent gate, viewport or kid-UI changes. |
| NFR-3 | Clarity cells stay `awaiting observation`; no child data, timings, v1.0 claim or measured clarity values. |
| NFR-4 | No tag overwrite or force-push; dry runs never publish or deploy; GHCR 403 reported as unknown. |
| NFR-5 | All configured checks green: Biome, tsc, unit tests, 80% coverage gate, build, Playwright and audit. |
| NFR-6 | Manual iPad Safari / Android Chrome checks are human-only and not claimed by the agent. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `package.json` is `0.15.0`; no dependency or lockfile diff. | FR-1 |
| AC-2 | Changelog has empty `[Unreleased]`, a dated v0.15.0 section with both cargo and sky entries, and refreshed compare links. | FR-2 |
| AC-3 | `product.md:115` states v0.14.1 shipped; the v1.0 gate and Phase 3 wording are unchanged. | FR-3 |
| AC-4 | Comparison baseline labels are v0.15.0; the eight `awaiting observation` cells are intact; no numbers invented. | FR-4 |
| AC-5 | Biome, tsc, unit, coverage, build, Playwright (two shards) and audit all exit 0 on final content. | FR-5 |
| AC-6 | Two distinct dry-run IDs are recorded, each with all gates green and deploy skipped. | FR-6 |
| AC-7 | Review PASS; archive/metadata/PR terminal proof committed; PR merged; annotated `v0.15.0` tag resolves to the squash commit and exists on origin. | FR-7 |
| AC-8 | Tag-triggered workflow watched to completion and publish state reported; GHCR 403 = unknown; no manual-device or v1.0 claim. | FR-7, NFR-6 |

## Edge Cases

- A dry run fails, is cancelled, or deploys: stop without tagging; record the run and reason.
- The second dry run fails after the first passes: do not tag; record both runs honestly.
- `v0.15.0` already exists locally or remotely: stop before tagging; never overwrite a tag.
- Review returns BLOCK: do not merge or tag; follow the review-fix flow or stop.
- GHCR visibility returns 403: report package availability as unknown, not verified or unpublished.
- Tag workflow is cancelled or times out: report cancellation/timeout and do not claim publication.
- A needed doc edit touches product roadmap semantics beyond line 115: stop and ask rather than rewriting the roadmap.

## Dependencies

- **Tracks:** none — `station-cargo-clarity_20261120` (#86) and
  `sky-detail_20261120` (#87) are merged into the base.
- **External:** GitHub Actions `release.yml`, GitHub PR/CI APIs via `gh`, the
  pnpm toolchain, and read-only GHCR package visibility.

## Open Questions & Assumptions

- **Assumption:** Both merged features are release-ready; all their checks were green at merge.
- **Assumption:** Two successful dry runs are sufficient evidence before tagging, both dispatched from this release branch with `dry_run=true`.
- **Assumption:** No manual tablet check is required for this release, per the user's standing choice.
- **Assumption:** v0.14.0 and v0.14.1 tags remain historical and are never retagged.
- **Assumption:** The v1.0 3/3-child gate remains unmet and is not claimed anywhere in release docs.

## References

- PRs: https://github.com/mansyar/3d-train-sim/pull/86 , https://github.com/mansyar/3d-train-sim/pull/87
- `conductor/archive/release-v0.14.0_20261119/` — previous minor-release plan and evidence conventions
- `conductor/archive/switch-e2e-stability_20261119/` — previous patch-release dry-run and tag conventions
- `conductor/archive/clarity-audit_20261110/comparison.md` — baseline labels and eight `awaiting observation` cells
- `conductor/product.md:115` — known shipped-wording drift
- `conductor/tech-stack.md` — Build & Deployment Pipeline runbook
