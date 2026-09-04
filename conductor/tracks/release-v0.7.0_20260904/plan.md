# Plan: Release v0.7.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump [checkpoint: b3ddc0a]

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
  - [x] Single-line version bump; verify no other in-repo version
        references need changing (remaining `0.6.0` strings are history,
        compare links, and archive docs)
- [x] Task: Phase Verification & Checkpoint (b3ddc0a)
  - Verification Report (2026-09-04): automated `pnpm check` green —
    biome clean, `tsc --noEmit` clean, 566/566 vitest pass. Scope is
    docs/data only (`CHANGELOG.md`, `package.json`, `conductor/` — no
    logic-bearing files), so no new unit tests required. Manual: user
    eyeballed the new `## [0.7.0]` section, compare links, and version
    bump — confirmed yes.

## Phase 2 - Local Pre-Tag Verification [checkpoint: 24a249b]

- [x] Task: Run the full local gate suite (6c76953)
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - Progress: `pnpm check` green (biome, tsc, 566/566 vitest). E2e at
    `--workers=2`: 89 passed, 2 failed — both the same
    `wagon-workshop` tablet+phone test, tripping only on the
    zero-console-errors assertion (`blob:` texture fetches blocked by
    access-control checks in Windows headless Chromium). All functional
    assertions in that test pass (crate delivery lands, reload restores
    every consist). Single-spec rerun: phone passed, tablet failed the
    same assertion — flaky across projects, pre-existing on `main`
    (release branch is docs-only), and already flagged as environmental
    noise in the wagon-workshop review.
  - Decision (2026-09-04, user-confirmed): proceed with the release;
    the ubuntu release-pipeline e2e is the authority and will safely
    stop the release if the failure is real. The noise is filed as the
    planned e2e-stability follow-up chore (out of scope for this track).
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2`
        if GPU-context flakes recur per the v0.5.0/v0.6.0 lessons)
- [x] Task: Local container smoke check (0189458)
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`.
  - Notes: `docker build -t tiny-tracks:0.7.0 .` green (image
    0189458). Curl smoke all as specified: `/` 200 html no-cache;
    `/sw.js` 200 no-cache; `/manifest.webmanifest` 200 no-cache;
    hashed `/assets/index-Cr-rtSEB.js` 200 immutable; unknown route →
    200 html (SPA fallback). Container stopped/removed. Files: none
    (verification only).
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`.
  - [ ] `docker build` the image locally
  - [x] Run container; verify app loads, SPA fallback, cache headers
        (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed
        assets)
- [x] Task: Phase Verification & Checkpoint (24a249b)
  - Verification Report (2026-09-04): `pnpm check` green (biome, tsc,
    566/566 vitest). E2e 89/91; the 2 failures are the known
    Windows-local blob-noise in `wagon-workshop` (functional assertions
    pass; user confirmed proceeding with Linux CI as authority).
    Container `tiny-tracks:0.7.0` (72MB) smoke green on all six curl
    checks per `nginx.conf`. Manual: user confirmed yes to ship.

## Phase 3 - Tag & Ship [checkpoint: CLOSEOUT]

- [x] Task: Push branch, open PR "Release v0.7.0", merge to `main` (4ece74d)
  - Notes: PR #39, CI green, squash-merged as `4ece74d`.
- [x] Task: Tag `v0.7.0` on the release merge commit and push the tag (4050e6e)
  - Notes: First tag on `4ece74d` triggered release run 33848476412,
    which FAILED gates: Linux e2e 87/91 (starter-railway tablet
    fresh-boot + phone gallery, wagon-workshop tablet + phone
    per-train). Root cause (not Windows-environmental as first
    thought): the specs' own reloads tear down a live WebGL page and
    headless Chromium reports the doomed context's fetch fallout as
    uncaught errors. Fix on branch
    `track/e2e-settle-before-reload_20260904` (PR #40, merged as
    `4050e6e`): two-phase clean-console asserts — assert everything
    before the reload, drain the teardown window, assert the fresh
    load + interactions. No app code touched. Linux dry_run gates
    green, then tag moved (`git tag -f`, old tag pointed at a run
    that published nothing) and pushed.
- [x] Task: Watch the Release workflow to green (33855984060)
  - [x] Gates pass in CI (biome + tsc + vitest + full e2e)
  - [x] Image published as `ghcr.io/mansyar/tiny-tracks:0.7.0` +
        `:latest` (digest `sha256:2f5534cb…`)
  - [x] Coolify webhook fired; prod deploy triggered (family-device
        verification: cold-load, loop, play, whistle — manual, user)
- [x] Task: Phase Verification & Checkpoint (CLOSEOUT)
  - Verification Report (2026-09-04): release run 33855984060 fully
    green; image pushed; webhook fired. Follow-up candidate (out of
    scope): e2e-stability chore to systematize the reload pattern
    across remaining specs.
