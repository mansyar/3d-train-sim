# Plan: Release v0.5.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump [checkpoint: 9662980]

> **Verification Report (2026-09-02):** Phase changed only non-logic files
> (`CHANGELOG.md`, `package.json`) — no unit tests required. Sanity check:
> `node -e require('./package.json')` parsed with `version=0.5.0`. Manual
> verification suggested (`git diff 14c28d4 -- CHANGELOG.md package.json`);
> user confirmed "Yes, looks good" (2026-09-02).

- [x] Task: Update `CHANGELOG.md` for v0.5.0 (d16d8b3)
  - [x] Move `## [Unreleased]` notes into `## [0.5.0] - 2026-09-02`
  - [x] Parent-readable bullets: tunnels (hill ride-through, merging),
        under-the-hill sounds, winter snow cap, night portal glow, cargo
        deliveries, station makeover
  - [x] Refresh compare links (`v0.4.0...v0.5.0`, Unreleased →
        `v0.5.0...HEAD`); keep them on `mansyar/3d-train-sim`
  - Notes: Renamed the Unreleased section to `## [0.5.0] - 2026-09-02`
    (matching the existing `- YYYY-MM-DD` style rather than an em-dash);
    all bullet text kept verbatim — it was already parent-readable. Added
    the `[0.5.0]: .../compare/v0.4.0...v0.5.0` link and re-pointed the
    `[Unreleased]` link at `v0.5.0...HEAD`. Modified: `CHANGELOG.md`.
    Why: marks the two features since v0.4.0 (tunnels, cargo deliveries)
    as shipped content under the version being cut.
- [x] Task: Bump `package.json` version to `0.5.0` (9662980)
  - Notes: Single-line edit of `"version": "0.4.0"` → `"0.5.0"`. Modified:
    `package.json`. Why: version tags drop the `v`, so the package version
    must equal the release version for the build/gates and image naming
    kept consistent with prior releases.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
- [ ] Task: Local container smoke check
  - [ ] `docker build` the image locally
  - [ ] Run container; verify app loads, SPA fallback, cache headers
        (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed
        assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Push branch, open PR "Release v0.5.0", merge to `main`
- [ ] Task: Tag `v0.5.0` on the release merge commit and push the tag
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.5.0` +
        `:latest`
  - [ ] Coolify webhook fired; production serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
