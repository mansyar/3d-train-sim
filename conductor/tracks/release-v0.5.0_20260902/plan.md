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

## Phase 2 - Local Pre-Tag Verification [checkpoint: ccdbc8e]

> **Verification Report (2026-09-02):** Automated — `pnpm check` green
> (biome, `tsc --noEmit`, 404/404 Vitest); Playwright 59/59 after a
> `--workers=2` rerun of 5 GPU-contention flakes (10-worker first pass hit
> WebGL context exhaustion; not a product regression — zero `src/` changes
> in this track). Docker build + container smoke green (cache headers and
> SPA fallback exactly per `nginx.conf`). Manual verification: user
> reviewed the results table and confirmed "Yes, ship it" (2026-09-02).

- [x] Task: Run the full local gate suite (first run: 12 workers flaked 5
      WebGL-parallelism tests; rerun at 2 workers green)
  - [x] `pnpm check` (biome + typecheck + vitest)
  - [x] `pnpm exec playwright test` (e2e smoke)
  - Notes: `pnpm check` fully green (biome clean, `tsc --noEmit` clean,
    404/404 Vitest tests). First Playwright run: 54/59 passed; 5 failures
    were a local parallelism artifact — 10 workers exhausted GPU WebGL
    contexts (`gl.getShaderPrecisionFormat` TypeError during renderer
    init, clustered timeouts). All 5 passed on rerun with `--workers=2`
    (35.9s). No `src/` changes in this track, so no product regression.
- [x] Task: Local container smoke check
  - [x] `docker build` the image locally
  - [x] Run container; verify app loads, SPA fallback, cache headers
        (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed
        assets)
  - Notes: Built `tiny-tracks:v0.5.0-local` (723.64 kB JS / 192.33 kB
    gzip; PWA precache 141 entries / ~8.97 MB). Container smoke via curl:
    `/` → 200 `text/html` `no-cache`; `/sw.js` → `no-cache`;
    `/manifest.webmanifest` → `no-cache`; `/assets/index-azP8Dkrq.js` →
    `public, max-age=31536000, immutable`; SPA fallback `/some/deep/route`
    → 200 `text/html` `no-cache`. All as specified by `nginx.conf`.
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
