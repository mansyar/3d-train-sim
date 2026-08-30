# Plan: Release v0.3.0

Chore track — no logic-bearing code, so no TDD tasks; verification is gates
+ smoke + checkpoints per `workflow.md`.

## Phase 1 — Changelog & Version Bump

- [ ] Task: Reconstruct release history and create `CHANGELOG.md`
  - [ ] Pull v0.1.0 and v0.2.0 boundaries from git tags; summarize each release from git log
  - [ ] Write v0.3.0 entry covering Every Layout Rides (multi-train rides, camera cycling, whistle, headlight) and Time of Day & Weather (sky cycle, ambience), plus smaller polish/fix items — parent-readable wording
  - [ ] Adopt a Keep-a-Changelog-style format for future releases
- [ ] Task: Bump `package.json` version to `0.3.0`
- [ ] Task: Update the release runbook in `tech-stack.md` to include the `CHANGELOG.md` step
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
- [ ] Task: Local container smoke check
  - [ ] `docker build` the image locally
  - [ ] Run the container and verify the app loads, SPA fallback works, and cache headers behave (short/no-cache for `sw.js`/manifest/`index.html`, immutable for hashed assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Tag & Ship

- [ ] Task: Merge the release branch to `main` and push
- [ ] Task: Tag `v0.3.0` on the release commit and push the tag
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.3.0` + `:latest`
  - [ ] Coolify webhook fired; production domain serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
