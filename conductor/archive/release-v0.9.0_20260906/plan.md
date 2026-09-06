# Plan: Release v0.9.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`. Branch
`track/release-v0.9.0_20260906` (cut from `origin/main` @ `e4a02e5`)
already exists.

## Phase 1 — Changelog & Version Bump [checkpoint: 5f6e353]

- [x] Task: Promote `CHANGELOG.md` for v0.9.0 (579e06e)
  - Notes: `## [Unreleased]` Added blocks (six-loco fleet, Hilltop
    Junction starter, river life) moved verbatim under new dated
    `## [0.9.0] - 2026-09-06`. New parent-voice entry added for the
    Scenery Delight toys (town tab: windmill, carousel, hot-air
    balloon; winter snow caps; balloon takeoff/drift — tab confirmed
    via `src/core/scenery.ts` catalog). Duplicated river-life sentence
    removed. Compare links refreshed (added `v0.8.0...v0.9.0`,
    Unreleased → `v0.9.0...HEAD`, all on `mansyar/3d-train-sim`);
    `## [Unreleased]` left empty. Files: `CHANGELOG.md` only.
  - Acceptance: Unreleased blocks moved verbatim; delight-toys entry
    present; duplicated sentence removed; compare links refreshed.
- [x] Task: Bump `package.json` version to `0.9.0` (5f6e353)
  - Notes: Single-line version bump. Verified no other in-repo version
    references need changing: a repo-wide grep for `0.8.0` across
    ts/json/html/css hits only the archived v0.8.0 track metadata
    (history) — `package.json` itself, `index.html`, and `src/` are
    clean. Files: `package.json` only.
  - Acceptance: `package.json` version reads `0.9.0`, matching the
    eventual `v0.9.0` tag.
- [x] Task: Phase Verification & Checkpoint (5f6e353)
  - Verification Report (2026-09-06): automated `pnpm check` green —
    biome clean (135 files), `tsc --noEmit` clean, 676/676 vitest
    pass. Scope is docs/data only (`CHANGELOG.md`, `package.json`,
    `conductor/` — no logic-bearing files), so no new unit tests
    required. Manual: user eyeballed the new `## [0.9.0]` section
    (four entries, duplicated sentence gone, empty `[Unreleased]`,
    refreshed compare links) and the version bump — confirmed yes.

## Phase 2 — Local Pre-Tag Verification [checkpoint: 0df5ae5]

- [x] Task: Run the full local gate suite (671fa14)
  - Notes: `pnpm check` green (biome, tsc, 676/676 vitest — run
    2026-09-06, only conductor docs changed since). Full Playwright
    e2e: **121 passed, 0 failed** (9.7m). First attempt ran 82
    failed/39 passed — pure infrastructure collapse (dev/prod servers
    died mid-run: `Could not connect to server`, `Page crashed`,
    websocket 500s) caused by running the Docker build concurrently
    with the suite; solo rerun green immediately with zero app-side
    flakes. Lesson for future releases: never run `docker build`
    concurrently with the e2e suite on this machine. No
    `--workers=2` manual retry needed (Playwright self-configured 2
    workers). Files: none (verification only).
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - [x] `pnpm check` (biome + typecheck + vitest)
  - [x] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2` if GPU-context flakes recur per the v0.5.0–v0.8.0 lessons)
- [x] Task: Local container smoke check (db5bfa16)
  - Notes: `docker build -t tiny-tracks:0.9.0 .` green (image
    db5bfa16, pnpm 11.24.0, vite 8.2.2, 84 modules). Precache: 171
    entries, 10,199 KiB total (~10.0MB, up from v0.8.0's ~9.4MB with
    the loco fleet + delight toy GLBs — expected); largest hashed JS
    `index-BZxK0yUJ.js` 776.5KB (204KB gzip) — far below the 6MB
    per-file precache cap. Container curl smoke all as specified:
    `/` 200 text/html no-cache; `/sw.js` 200 no-cache;
    `/manifest.webmanifest` 200 no-cache; hashed
    `/assets/index-BZxK0yUJ.js` 200 immutable; unknown route → 200
    html (SPA fallback). Container stopped/removed. Files: none
    (verification only).
  - Acceptance: local `docker build` succeeds; running container
    serves `/` as 200 `text/html` `no-cache`, `/sw.js` + manifest
    `no-cache`, hashed `/assets/*.js` immutable, unknown route falls
    back to `index.html` — all per `nginx.conf`; PWA precache weight
    sanity-checked vs the 6MB cap.
  - [x] `docker build` the image locally
  - [x] Run container; verify cache headers, SPA fallback, precache weight
- [x] Task: Phase Verification & Checkpoint (0df5ae5)
  - Verification Report (2026-09-06): `pnpm check` green (biome, tsc,
    676/676 vitest). Full e2e 121/121 (9.7m) — the first attempt's 82
    failures were infrastructure (dev/prod servers starved by a
    concurrent `docker build`; lesson recorded under the gate task),
    solo rerun green with zero app-side flakes. Container
    `tiny-tracks:0.9.0` (db5bfa16) smoke green on all five curl checks
    per `nginx.conf`; precache 171 entries / ~10.2MB, largest file
    776KB — far under the 6MB cap. Scope is verification-only (no app
    code; diff `5f6e353..HEAD` outside `conductor/` is empty), so no
    new unit tests required. Manual: user confirmed yes to ship.

## Phase 3 — Tag & Ship [checkpoint: be60c4d]

- [x] Task: Push branch, open PR "Release v0.9.0", merge to `main` (be60c4d)
  - Notes: PR #53 opened; two `main` races while CI ran — PR #52
    (README/CONTRIBUTING, merge commit `b5d30ec`) and PR #54 (merged
    on main as `112e1d9`, merge commit `b192dfd`). Both conflicts were
    conductor-registry-only (`conductor/tracks.md` rows); zero
    app-code impact. CI green on both heads (e2e 15m58s and 15m38s),
    then squash-merged as `be60c4d` "Release v0.9.0 (#53)". Files:
    `conductor/tracks.md` (conflict resolutions only).
  - [x] Push `track/release-v0.9.0_20260906`, open PR, verify CI green, merge
- [x] Task: Tag `v0.9.0` on the release merge commit and push the tag (be60c4d)
  - Notes: Tag `v0.9.0` on the squash merge commit `be60c4d`, pushed.
    Local `main` fast-forward skipped (branch checked out in the idle
    `3d-train-sim` worktree); `origin/main` is authoritative.
  - [x] `git tag v0.9.0 <merge-sha> && git push origin v0.9.0`
- [x] Task: Watch the Release workflow to green (be60c4d)
  - Notes: Run `34021913046` all green — biome+typecheck 19s,
    vitest 16s, e2e 16m11s, publish 1m13s (Buildx build + push
    `ghcr.io/mansyar/tiny-tracks:0.9.0` + `:latest`, Coolify webhook
    fired → prod deploy triggered). Benign annotation only (Node 20
    deprecation on actions/*, forced to Node 24).
  - [x] Gates pass in CI (biome + tsc + vitest + full e2e)
  - [x] Image published as `ghcr.io/mansyar/tiny-tracks:0.9.0` + `:latest`
  - [x] Coolify webhook fired; prod deploy triggered
  - [x] Family-device verification: cold-load, build a loop, press ▶,
        hear the whistle; parent-gate tray shows **0.9.0**; six
        locomotives and the delight toys visible on the meadow
- [x] Task: Phase Verification & Checkpoint (be60c4d)
  - Verification Report (2026-09-06): PR #53 CI green twice (biome+
    typecheck, vitest, full e2e on two heads); squash-merged as
    `be60c4d`; tag `v0.9.0` pushed; Release run `34021913046` all
    green (gates + publish 1m13s — image `ghcr.io/mansyar/tiny-tracks:0.9.0`
    + `:latest`, Coolify webhook fired). Family device verified by the
    user: cold-load, build a loop, ride + whistle, tray shows 0.9.0,
    six locomotives and the delight toys visible. Scope: no app code
    in this phase beyond the release merge; no new unit tests
    required. Manual: user confirmed yes on the device.

## Notes

(task notes appended under their tasks as work completes)
