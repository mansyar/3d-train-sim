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
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) —
      checkpoint `9662980` recorded above; user confirmed.

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

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) —
      checkpoint `ccdbc8e` recorded above; user confirmed "Yes, ship it".

## Phase 3 - Tag & Ship [checkpoint: 62b64de]

> **Verification Report (2026-09-02):** Release run 33585202265 (tag
> `v0.5.0` → commit `62b64de`) fully green: `gates` ✓ 6m51s (biome,
> typecheck, 404 Vitest, Playwright e2e smoke incl. the deflaked cargo
> spec), `publish` ✓ 1m11s (image pushed to
> `ghcr.io/mansyar/tiny-tracks:0.5.0` + `:latest`; Coolify deploy webhook
> fired). On-device verification out of scope per spec ("workflow green =
> shipped"). User confirmed continuation throughout.

- [x] Task (in-flight correction): Fix flaky cargo e2e delivery timing
  - Notes: The tag-run Release workflow (run 33583780716) failed its e2e
    smoke: `e2e/cargo.spec.ts` read the delivery counter once after a fixed
    15 s wait and got 0 on both profiles on slow CI runners (the same test
    flaked locally at 10 workers). Fix is test-only (no `src/` changes):
    poll the counter with `expect.poll` (45 s timeout, 2 s intervals)
    instead of a single read. Verified locally: biome + `tsc --noEmit`
    clean; cargo spec 4/4 green on tablet+phone. Modified: `e2e/cargo.spec.ts`.
    Why: the release must not gate on a timing-sensitive single read.
- [x] Task: Push branch, open PR "Release v0.5.0", merge to `main`
  - Notes: Three PRs landed as the flake was chased: PR #27 (release
    notes/version, merge `e78c53e`), PR #28 (`expect.poll` deflake, merge
    `5486107`), PR #29 (`test.setTimeout(90_000)` so the 45 s poll can
    outlive Playwright's 30 s default on loaded CI runners, merge
    `62b64de`). Local main synced to `62b64de`.
- [x] Task: Tag `v0.5.0` on the release merge commit and push the tag
  - Notes: Tag moved with the deflake work per the Protocol-A re-tag
    procedure (delete remote tag → verify 404 → push at the intended
    commit). Runs 33583780716 and 33584364961 failed on the cargo e2e
    before the final fix; the interim tag push at `5486107` triggered run
    33585094400, which was **canceled before completion** (it built the
    pre-fix commit and could not succeed). Final tag: `62b64de`.
- [x] Task: Watch the Release workflow to green
  - [x] Gates pass in CI
  - [x] Image published as `ghcr.io/mansyar/tiny-tracks:0.5.0` +
        `:latest`
  - [x] Coolify webhook fired; production serves the new build
  - Notes: Run 33585202265 green end-to-end (gates 6m51s, publish 1m11s).
    Only non-blocking annotations: Node 20 deprecation warnings from
    pinned action versions (pre-existing since v0.4.0).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) —
      checkpoint `62b64de`; release shipped per run 33585202265.
