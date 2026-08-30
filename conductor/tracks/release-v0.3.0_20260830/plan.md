# Plan: Release v0.3.0

Chore track — no logic-bearing code, so no TDD tasks; verification is gates
+ smoke + checkpoints per `workflow.md`.

## Phase 1 — Changelog & Version Bump

- [x] Task: Reconstruct release history and create `CHANGELOG.md`
  - [x] Pull v0.1.0 and v0.2.0 boundaries from git tags; summarize each release from git log
  - [x] Write v0.3.0 entry covering Every Layout Rides (multi-train rides, camera cycling, whistle, headlight) and Time of Day & Weather (sky cycle, ambience), plus smaller polish/fix items — parent-readable wording
  - [x] Adopt a Keep-a-Changelog-style format for future releases
  - **Summary:** Created `CHANGELOG.md` at the repo root in Keep a
    Changelog style, written for parents. v0.1.0 and v0.2.0 entries
    reconstructed from `git tag`/`git log` (archived track plans matched
    the log); v0.3.0 entry covers multi-train rides, camera cycling,
    per-train whistle, night headlight, day/night & weather, and the
    smaller polish/fix items, plus `## [Unreleased]` and compare links
    for future releases. *(commit 1e2b560)*
- [x] Task: Bump `package.json` version to `0.3.0`
  - **Summary:** `package.json` → `0.3.0`, in sync with the eventual
    `v0.3.0` tag per the runbook rule. *(commit 9755c8b)*
- [x] Task: Update the release runbook in `tech-stack.md` to include the `CHANGELOG.md` step
  - **Summary:** Runbook step 2 now updates `CHANGELOG.md` (move notes
    out of `## [Unreleased]` into a dated `## [X.Y.Z]` section, refresh
    compare links); gates step covers pnpm check + Playwright e2e; steps
    renumbered 1–6.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Verified `CHANGELOG.md` carries v0.1.0, v0.2.0, and
    v0.3.0 entries plus `[Unreleased]` and compare links; `package.json`
    version is `0.3.0`; runbook includes the changelog step; all Phase 1
    work committed on the release branch; no `v0.3.0` tag exists yet
    (correct — tagging happens in Phase 3).

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
