# Plan: Release v0.4.0

Chore track — no logic-bearing code, so no TDD tasks; verification is gates
+ smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog, Version Bump & Registry Housekeeping

- [ ] Task: Update `CHANGELOG.md` for v0.4.0
  - [ ] Move notes from `## [Unreleased]` into a dated `## [0.4.0]` section
  - [ ] Summarize River & Bridge (meadow river, seasonal ice, bridge pieces,
        the duck, river babble ambience, save migration) and Performance
        Guardrails (FPS probe, adaptive quality tiers, `?perf=debug`
        overlay, water polish) — parent-readable wording
  - [ ] Refresh compare links; keep an empty `## [Unreleased]`
- [ ] Task: Bump `package.json` version to `0.4.0`
- [ ] Task: Archive the completed `release-v0.3.0_20260830` track
  - [ ] Move `conductor/tracks/release-v0.3.0_20260830/` to
        `conductor/archive/`
  - [ ] Update `conductor/tracks.md` (registry row + archive list)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
- [ ] Task: Local container smoke check
  - [ ] `docker build` the image locally
  - [ ] Run the container and verify the app loads, SPA fallback works, and
        cache headers behave (short/no-cache for `sw.js`/manifest/
        `index.html`, immutable for hashed assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Merge the release branch to `main` and push
- [ ] Task: Tag `v0.4.0` on the release commit and push the tag
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.4.0` + `:latest`
  - [ ] Coolify webhook fired; production domain serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
