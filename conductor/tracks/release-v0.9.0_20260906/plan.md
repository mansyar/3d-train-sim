# Plan: Release v0.9.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`. Branch
`track/release-v0.9.0_20260906` (cut from `origin/main` @ `e4a02e5`)
already exists.

## Phase 1 — Changelog & Version Bump

- [ ] Task: Promote `CHANGELOG.md` for v0.9.0
  - Acceptance: `## [Unreleased]` Added blocks (loco fleet, Hilltop
    Junction starter, river life) move verbatim into new dated
    `## [0.9.0] - 2026-09-06`; a new parent-voice entry covers the
    Scenery Delight toys (windmill, carousel, hot-air balloon, snow
    caps, balloon wander); the duplicated river-life sentence
    ("…and it hops with a soft ribbit (quiet when the meadow is
    muted)." twice) is removed; compare links refreshed
    (`v0.8.0...v0.9.0` added, Unreleased → `v0.9.0...HEAD` on
    `mansyar/3d-train-sim`); `## [Unreleased]` left empty.
  - [ ] Move `## [Unreleased]` blocks verbatim into `## [0.9.0] - 2026-09-06`
  - [ ] Add the missing Scenery Delight toys entry
  - [ ] Remove the duplicated river-life sentence
  - [ ] Refresh compare links
- [ ] Task: Bump `package.json` version to `0.9.0`
  - Acceptance: `package.json` version reads `0.9.0`, matching the
    eventual `v0.9.0` tag; no other in-repo version references need
    changing (remaining `0.8.0` strings are history, compare links,
    archive docs).
  - [ ] Single-line version bump; verify no other version references need changing
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - Acceptance: `pnpm check` green (biome + typecheck + vitest, expect
    ~676 tests) and the full Playwright e2e suite green (now includes
    the delight-toys smoke; rerun at `--workers=2` if GPU-context
    flakes recur per the v0.5.0–v0.8.0 lessons).
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
- [ ] Task: Local container smoke check
  - Acceptance: `docker build -t tiny-tracks:0.9.0 .` succeeds; running
    container serves `/` 200 `text/html` `no-cache`, `/sw.js` +
    manifest `no-cache`, hashed `/assets/*.js` immutable, unknown route
    → `index.html` SPA fallback (per `nginx.conf`); precache weight
    sanity vs the 6MB per-file cap.
  - [ ] `docker build` the image locally
  - [ ] Run container; verify cache headers, SPA fallback, precache weight
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Tag & Ship

- [ ] Task: Push branch, open PR "Release v0.9.0", merge to `main`
  - [ ] Push `track/release-v0.9.0_20260906`, open PR, verify CI green, merge
- [ ] Task: Tag `v0.9.0` on the release merge commit and push the tag
  - [ ] `git tag v0.9.0 <merge-sha> && git push origin v0.9.0`
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI (biome + tsc + vitest + full e2e)
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.9.0` + `:latest`
  - [ ] Coolify webhook fired; prod deploy triggered
  - [ ] Family-device verification: cold-load, build a loop, press ▶,
        hear the whistle; parent-gate tray shows **0.9.0**; six
        locomotives and the delight toys visible on the meadow
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

(task notes appended under their tasks as work completes)
