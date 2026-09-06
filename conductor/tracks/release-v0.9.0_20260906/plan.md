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

## Phase 2 — Local Pre-Tag Verification

- [~] Task: Run the full local gate suite
  - Acceptance: `pnpm check` green (biome + typecheck + vitest, expect
    ~676 tests) and the full Playwright e2e suite green (now includes
    the delight-toys smoke; rerun at `--workers=2` if GPU-context
    flakes recur per the v0.5.0–v0.8.0 lessons).
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
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
