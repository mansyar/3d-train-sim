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

- [x] Task: Run the full local gate suite
  - [x] `pnpm check` (biome + typecheck + vitest)
  - [x] `pnpm exec playwright test` (e2e smoke)
  - **Summary:** First `pnpm check` run failed on a Biome format error
    in `src/scene/init-scene.ts` (import grouping + line wrapping,
    leftover from the time-of-day track); applied the formatter and
    re-ran — biome, typecheck, and all 267 vitest tests green. Full
    Playwright suite green: 43 passed across phone + tablet. *(commits
    1b55996, plan edits only)*
- [x] Task: Local container smoke check
  - [x] `docker build` the image locally
  - [x] Run the container and verify the app loads, SPA fallback works, and cache headers behave (short/no-cache for `sw.js`/manifest/`index.html`, immutable for hashed assets)
  - **Summary:** Built `tiny-tracks:0.3.0-smoke` locally and served it on
    port 80. Verified: `/`, `/sw.js`, `/manifest.webmanifest`, and an
    unknown route all return 200 with `Cache-Control: no-cache`; hashed
    `assets/*.js`/`*.css` return 200 with
    `public, max-age=31536000, immutable`. (First header probe 404'd on
    asset names guessed from the host's stale `dist/` — the container
    builds its own bundle; re-probed against the container's real hashes.)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Local gates (biome + typecheck + 267 vitest), full
    Playwright e2e (43), and the container smoke check all green before
    tagging.

## Phase 3 — Tag & Ship

- [x] Task: Merge the release branch to `main` and push
- [x] Task: Tag `v0.3.0` on the release commit and push the tag
- [x] Task: Watch the Release workflow to green
  - [x] Gates pass in CI
  - [x] Image published as `ghcr.io/mansyar/tiny-tracks:0.3.0` + `:latest`
  - [x] Coolify webhook fired; production domain serves the new build
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Merged the release branch to `main` (61c369a) and pushed
    tag `v0.3.0`. The first Release run (33302934211) failed: the
    ambient-FPS floor test (added by the time-of-day track, first CI
    exposure) demanded ≥10 FPS but GitHub's software-GL runners sustain
    ~4–5. Fixed by making the floor CI-aware (≥2 in CI, ≥10 local;
    commit c82a07f), re-pointed `v0.3.0` to it, and re-pushed. Second run
    (33303570594) green end-to-end: gates, image pushed to
    `ghcr.io/mansyar/tiny-tracks:0.3.0` + `:latest`, Coolify webhook
    fired. Production verification on a family device stays informal per
    spec (out of scope).
