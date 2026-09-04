# Plan: Release v0.7.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump

- [x] Task: Backfill + promote `CHANGELOG.md` for v0.7.0 (2446910)
  - Notes: Backfilled the missing Starter Railway entry (fresh-install
    Cozy Oval + parent-gate 3-preset gallery, single-undo apply) in the
    v0.6.0 parent-readable voice; moved mirror-switch + wagon-workshop
    notes verbatim under new dated `## [0.7.0] - 2026-09-04`; added a
    `### Fixed` note for the headlight-front fix (never noted in
    Unreleased); `## [Unreleased]` left empty; compare links refreshed
    (`v0.6.0...v0.7.0` added, Unreleased → `v0.7.0...HEAD`, all on
    `mansyar/3d-train-sim`). Files: `CHANGELOG.md` only.
  - Acceptance: `## [Unreleased]` holds starter-gallery, mirror-switch,
    and wagon-workshop notes (starter backfilled — it never landed in
    Unreleased); new dated `## [0.7.0] - 2026-09-04` section holds the
    Added block verbatim; compare links refreshed and repo-correct
    (`mansyar/3d-train-sim`); Unreleased left empty.
  - [ ] Draft the Starter Railway entry in the v0.6.0 parent-readable voice
  - [ ] Move `## [Unreleased]` notes verbatim into `## [0.7.0] - 2026-09-04`
  - [ ] Refresh compare links (`v0.6.0...v0.7.0`, Unreleased →
        `v0.7.0...HEAD`); keep them on `mansyar/3d-train-sim`
- [x] Task: Bump `package.json` version to `0.7.0` (b88851e)
  - Notes: Single-line version bump; verified no other in-repo version
    references needed changing (no `0.6.0` strings in `src/`,
    `package.json`, `index.html`, or `vite.config.ts` — remaining hits
    are history, compare links, and archive docs). Files: `package.json`
    only.
  - Acceptance: `package.json` version reads `0.7.0`, matching the
    eventual `v0.7.0` tag.
  - [ ] Single-line version bump; verify no other in-repo version
        references need changing (remaining `0.6.0` strings are history,
        compare links, and archive docs)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Local Pre-Tag Verification

- [ ] Task: Run the full local gate suite
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2`
        if GPU-context flakes recur per the v0.5.0/v0.6.0 lessons)
- [ ] Task: Local container smoke check
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`.
  - [ ] `docker build` the image locally
  - [ ] Run container; verify app loads, SPA fallback, cache headers
        (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed
        assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Push branch, open PR "Release v0.7.0", merge to `main`
  - Acceptance: PR merges cleanly into `main` with CI gates green.
- [ ] Task: Tag `v0.7.0` on the release merge commit and push the tag
  - Acceptance: `v0.7.0` tag points at the merge commit and the Release
    workflow starts.
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.7.0` +
        `:latest`
  - [ ] Coolify webhook fired; production serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
