# Release v0.15.1 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Ship the deterministic performance-gate fix, together with the already-merged
station cargo hand-off (#86) and layered drifting clouds (#87), as `v0.15.1`.
The `v0.15.0` tag was created at `15dbc05` and its tag workflow
(`44730179589`) failed on the now-corrected wall-clock perf floor; `publish`
was skipped, so no image push or deploy shipped those features. The later
deterministic gate fix merged as `85d0193` (#89). Merging to `main` never
deploys; only a `v*` tag triggers the release pipeline. This track is a release
chore only — no gameplay, rendering, or input behavior changes.

## Problem / Motivation

Devices can still run an older build because `v0.15.0` never completed its tag
workflow. `package.json` is already `0.15.0`, the changelog has no entry for
the perf-gate fix, `conductor/product.md:113` still describes the removed
`2.5 ticks/s` hard floor, and `conductor/product.md:114` still lists station
cargo and sky detail as future ideas although both merged. The clarity
`comparison.md` baseline still labels v0.15.0, which was never shippable.
Without a fresh release, the child cannot receive the new visuals on a stable
gate, and the documented baseline would remain misleading.

## Goals & Success Metrics

- **Goal:** Publish v0.15.1 from a clean release branch after a green full
  local matrix and two consecutive green release-workflow dry runs.
- **Metric:** `package.json` is `0.15.1`; changelog, roadmap wording and clarity
  labels are aligned; every configured check exits 0; both dry runs pass with
  deploy skipped; the annotated tag is created from the squash merge commit and
  its workflow is watched to completion. Zero clarity numbers and zero v1.0
  claims are invented.

## Scope

### In Scope

- Bump `package.json` to `0.15.1` without dependency or lockfile changes.
- Curate a parent-facing `CHANGELOG.md`: keep `[Unreleased]` empty, add a dated
  `[0.15.1] - 2026-11-23` section with a plain-language note that the updates
  now reach tablets reliably after a behind-the-scenes reliability fix, and
  refresh the compare links. Existing v0.15.0 cargo/sky entries remain as
  history.
- Update `conductor/product.md`: line 113 to describe the deterministic
  frame-contract gate instead of the removed `2.5 ticks/s` floor; line 114 to
  say station cargo and sky detail shipped rather than remaining future ideas;
  add shipped rows for `station-cargo-clarity_20261120`,
  `sky-detail_20261120`, and `perf-floor-stability_20261120`. The v1.0 ship
  gate, Phase 3 options and anti-roadmap remain unchanged.
- Retarget the clarity `comparison.md` baseline labels from v0.15.0 to v0.15.1
  while every measured cell remains `awaiting observation`.
- Run the full configured local verification matrix and two consecutive
  `workflow_dispatch` release dry runs from the release branch.
- Open the release PR with PASS review and terminal proof, merge it, create and
  push annotated tag `v0.15.1` at the squash commit, and watch the tag workflow.

### Out of Scope

- Runtime changes to `src/`, e2e/unit tests, `playwright.config.ts` or
  `release.yml`; dependency, `pnpm-lock.yaml`, save-format, storage-key,
  parent-gate, viewport or kid-UI changes.
- Manual iPad Safari / Android Chrome checks; GHCR package mutation; clarity
  audit measurements; Phase 3 work; v1.0 gate claims.
- Deleting, overwriting or force-pushing v0.14.0, v0.14.1 or v0.15.0 tags.
- Deploying from a branch or claiming publication when the tag workflow has
  not completed successfully.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Bump `package.json` to `0.15.1` with no dependency or lockfile diff. | must |
| FR-2 | Curate `CHANGELOG.md`: empty `[Unreleased]`, dated `[0.15.1] - 2026-11-23` with a plain-language reliability entry, existing v0.15.0 history preserved, and refreshed compare links. | must |
| FR-3 | Correct the three product-drift points in `conductor/product.md` exactly as scoped above; leave all other roadmap semantics, v1.0 gate, Phase 3 and anti-roadmap unchanged. | must |
| FR-4 | Retarget clarity `comparison.md` baseline labels to v0.15.1; all eight `awaiting observation` cells remain unchanged. | must |
| FR-5 | Full configured local verification matrix passes on final release content. | must |
| FR-6 | Two consecutive `workflow_dispatch` dry runs from the release branch pass all gates with deploy skipped. | must |
| FR-7 | Release PR with PASS review and terminal proof; merge; auto-tag `v0.15.1` at the squash commit, push the tag, and watch the tag workflow. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No runtime source, test, dependency or workflow changes; release docs plus Conductor state only. |
| NFR-2 | No telemetry, network calls, storage keys, save format, parent gate, viewport or kid-UI changes. |
| NFR-3 | Clarity cells stay `awaiting observation`; no child data, timings, v1.0 claim or measured clarity values. |
| NFR-4 | No tag overwrite or force-push; `v0.15.0` is immutable; dry runs never publish or deploy; GHCR 403 reported as unknown. |
| NFR-5 | All configured checks green: Biome, tsc, unit tests, 80% coverage gate, build, Playwright and audit. |
| NFR-6 | Manual iPad Safari / Android Chrome checks are human-only and never agent-claimed. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `package.json` is `0.15.1`; no dependency or lockfile diff. | FR-1 |
| AC-2 | Changelog has empty `[Unreleased]`, a dated v0.15.1 section with a plain-language entry, preserved v0.15.0 history, and refreshed compare links. | FR-2 |
| AC-3 | `product.md` describes the deterministic gate, says cargo/sky shipped, has the three shipped rows, and leaves the v1.0 gate, Phase 3 options and anti-roadmap unchanged. | FR-3 |
| AC-4 | Comparison baseline labels are v0.15.1; the eight `awaiting observation` cells are intact; no numbers invented. | FR-4 |
| AC-5 | Biome, tsc, unit, coverage, build, Playwright (two shards) and audit all exit 0 on final content. | FR-5 |
| AC-6 | Two distinct dry-run IDs are recorded, each with all gates green and deploy skipped. | FR-6 |
| AC-7 | Review PASS; archive/metadata/PR terminal proof committed; PR merged; annotated `v0.15.1` tag resolves to the squash commit and exists on origin. | FR-7 |
| AC-8 | Tag-triggered workflow watched to completion and publish state reported; GHCR 403 = unknown; no manual-device or v1.0 claim. | FR-7, NFR-6 |

## Edge Cases

- A dry run fails, is cancelled, or deploys: stop without tagging; record the run and reason.
- The second dry run fails after the first passes: do not tag; record both runs honestly.
- `v0.15.1` already exists locally or remotely: stop before tagging; never overwrite a tag.
- Review returns BLOCK: do not merge or tag; follow the review-fix flow or stop.
- GHCR visibility returns 403: report package availability as unknown, not verified or unpublished.
- Tag workflow is cancelled or times out: report cancellation/timeout and do not claim publication.
- A product-doc edit would touch roadmap semantics beyond the scoped lines and three shipped rows: stop and ask rather than rewriting the roadmap.

## Dependencies

- **Tracks:** none — `station-cargo-clarity_20261120` (#86),
  `sky-detail_20261120` (#87), `release-v0.15.0_20261120` (#88) and
  `perf-floor-stability_20261120` (#89) are merged into the base.
- **External:** GitHub Actions `release.yml`, GitHub PR/CI APIs via `gh`, the
  pnpm toolchain, and read-only GHCR package visibility.

## Open Questions & Assumptions

- **Assumption:** The `v0.15.0` tag workflow failed before publish/deploy; no GHCR push or Coolify deploy occurred from it.
- **Assumption:** Two successful dry runs are sufficient evidence before tagging, both dispatched from this release branch with `dry_run=true`.
- **Assumption:** No manual tablet check is required for this release, per the user's standing choice.
- **Assumption:** v0.14.0, v0.14.1 and v0.15.0 tags remain historical and are never retagged or overwritten.
- **Assumption:** The v1.0 3/3-child gate remains unmet and is not claimed anywhere in release docs.
- **Assumption:** Product-doc edits are limited to the scoped drift and three shipped rows.
- **User decision (2026-11-23):** After reviewing the repo state, the user chose to cut v0.15.1 from `main` so the merged visuals ship on the deterministic perf gate before clarity observation.

## References

- PRs: https://github.com/mansyar/3d-train-sim/pull/86 , https://github.com/mansyar/3d-train-sim/pull/87 , https://github.com/mansyar/3d-train-sim/pull/88 , https://github.com/mansyar/3d-train-sim/pull/89
- Failed `v0.15.0` tag workflow: https://github.com/mansyar/3d-train-sim/actions/runs/44730179589
- `conductor/archive/release-v0.15.0_20261120/` — previous minor-release plan and evidence conventions
- `conductor/archive/perf-floor-stability_20261120/` — deterministic perf-gate fix and dry-run evidence
- `conductor/archive/clarity-audit_20261110/comparison.md` — baseline labels and eight `awaiting observation` cells
- `conductor/product.md:113-115` — known product drift
- `conductor/tech-stack.md` — Build & Deployment Pipeline runbook
