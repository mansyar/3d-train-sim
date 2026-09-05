# Plan: Release v0.8.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump [checkpoint: 735da63]

- [x] Task: Promote `CHANGELOG.md` for v0.8.0 (f6c0e8d)
  - Notes: Moved both `## [Unreleased]` Added blocks (crossing gate +
    gentle bumps/banked corners) verbatim under new dated
    `## [0.8.0] - 2026-09-05`; `## [Unreleased]` left empty; compare
    links refreshed (`v0.7.0...v0.8.0` added, Unreleased →
    `v0.8.0...HEAD`, all on `mansyar/3d-train-sim`). Files: `CHANGELOG.md` only.
  - Acceptance: `## [Unreleased]` Added blocks (crossing gate +
    bumps/banked corners) move verbatim into new dated
    `## [0.8.0] - 2026-09-05`; compare links refreshed
    (`v0.7.0...v0.8.0` added, Unreleased → `v0.8.0...HEAD`, all on
    `mansyar/3d-train-sim`); `## [Unreleased]` left empty.
  - [x] Move `## [Unreleased]` Added blocks verbatim into `## [0.8.0] - 2026-09-05`
  - [x] Refresh compare links (`v0.7.0...v0.8.0`, Unreleased → `v0.8.0...HEAD`); keep them on `mansyar/3d-train-sim`
- [x] Task: Bump `package.json` version to `0.8.0` (8808e5f)
  - Notes: Single-line version bump; verified no other in-repo version
    references needed changing (no `0.7.0` strings in `src/`,
    `package.json` (besides the bumped line), `index.html`, or
    `vite.config.ts` — remaining hits are history, compare links, and
    archive docs). Files: `package.json` only.
  - Acceptance: `package.json` version reads `0.8.0`, matching the
    eventual `v0.8.0` tag.
  - [x] Single-line version bump; verify no other in-repo version references need changing (remaining `0.7.0` strings are history, compare links, and archive docs)
- [x] Task: Phase Verification & Checkpoint (735da63)
  - Verification Report (2026-09-05): automated `pnpm check` green —
    biome clean, `tsc --noEmit` clean, 641/641 vitest pass. Scope is
    docs/data only (`CHANGELOG.md`, `package.json`, `conductor/` — no
    logic-bearing files), so no new unit tests required. Manual: user
    eyeballed the new `## [0.8.0]` section, compare links, and version
    bump — confirmed yes.

## Phase 2 - Local Pre-Tag Verification

- [x] Task: Run the full local gate suite (e10a93c)
  - Notes: `pnpm check` green (biome, tsc, 641/641 vitest — run
    2026-09-05 on identical app tree; only `plan.md` changed since).
    Full Playwright e2e at `--workers=2`: **109 passed, 0 failed**
    (8.4m). The v0.7.0-era `wagon-workshop` Windows `blob:`-noise flake
    did not recur — all functional + console assertions green locally.
    Files: none (verification only).
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - [x] `pnpm check` (biome + typecheck + vitest)
  - [x] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2` if GPU-context flakes recur per the v0.5.0/v0.6.0/v0.7.0 lessons)
- [x] Task: Local container smoke check (ba75a3d)
  - Notes: `docker build -t tiny-tracks:0.8.0 .` green (image
    ba75a3d, 72.6MB — on par with v0.7.0's 72MB). Curl smoke all as
    specified: `/` 200 html no-cache; `/sw.js` 200 no-cache;
    `/manifest.webmanifest` 200 no-cache; hashed
    `/assets/index-Boo6pLbL.js` 200 immutable; unknown route → 200
    html (SPA fallback). Container stopped/removed. PWA sanity: largest
    dist entry ~753KB bundle, GLBs ~150-177KB each — all far below the
    6MB per-file precache cap; total dist ~9.4MB (modest growth vs
    v0.7.0's ~9.03MB from the gate + 6 hill GLBs, as expected). Files:
    none (verification only).
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`; PWA precache weight
    sanity-checked vs the 6MB cap.
  - [x] `docker build` the image locally
  - [x] Run container; verify app loads, SPA fallback, cache headers (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed assets) + precache weight
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
