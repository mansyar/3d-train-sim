# Plan: Release v0.8.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump

- [ ] Task: Promote `CHANGELOG.md` for v0.8.0
  - Acceptance: `## [Unreleased]` Added blocks (crossing gate +
    bumps/banked corners) move verbatim into new dated
    `## [0.8.0] - 2026-09-05`; compare links refreshed
    (`v0.7.0...v0.8.0` added, Unreleased → `v0.8.0...HEAD`, all on
    `mansyar/3d-train-sim`); `## [Unreleased]` left empty.
  - [ ] Move `## [Unreleased]` Added blocks verbatim into `## [0.8.0] - 2026-09-05`
  - [ ] Refresh compare links (`v0.7.0...v0.8.0`, Unreleased → `v0.8.0...HEAD`); keep them on `mansyar/3d-train-sim`
- [ ] Task: Bump `package.json` version to `0.8.0`
  - Acceptance: `package.json` version reads `0.8.0`, matching the
    eventual `v0.8.0` tag.
  - [ ] Single-line version bump; verify no other in-repo version references need changing (remaining `0.7.0` strings are history, compare links, and archive docs)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2` if GPU-context flakes recur per the v0.5.0/v0.6.0/v0.7.0 lessons)
- [ ] Task: Local container smoke check
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`; PWA precache weight
    sanity-checked vs the 6MB cap.
  - [ ] `docker build` the image locally
  - [ ] Run container; verify app loads, SPA fallback, cache headers (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed assets) + precache weight
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Push branch, open PR "Release v0.8.0", merge to `main`
  - [ ] Push `track/release-v0.8.0_20260905`, open PR, verify CI green, merge
- [ ] Task: Tag `v0.8.0` on the release merge commit and push the tag
  - [ ] `git tag v0.8.0 <merge-sha> && git push origin v0.8.0`
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI (biome + tsc + vitest + full e2e)
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.8.0` + `:latest`
  - [ ] Coolify webhook fired; prod deploy triggered (family-device verification: cold-load, loop, play, whistle — manual, user)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
