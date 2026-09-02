# Plan: Release v0.5.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump

- [ ] Task: Update `CHANGELOG.md` for v0.5.0
  - [ ] Move `## [Unreleased]` notes into `## [0.5.0] — 2026-09-02`
  - [ ] Parent-readable bullets: tunnels (hill ride-through, merging),
        under-the-hill sounds, winter snow cap, night portal glow, cargo
        deliveries, station makeover
  - [ ] Refresh compare links (`v0.4.0...v0.5.0`, Unreleased →
        `v0.5.0...HEAD`); keep them on `mansyar/3d-train-sim`
- [ ] Task: Bump `package.json` version to `0.5.0`
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
