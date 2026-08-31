# Plan: Release v0.4.0

Chore track — no logic-bearing code, so no TDD tasks; verification is gates
+ smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog, Version Bump & Registry Housekeeping

- [x] Task: Update `CHANGELOG.md` for v0.4.0
  - [x] Move notes from `## [Unreleased]` into a dated `## [0.4.0]` section
  - [x] Summarize River & Bridge (meadow river, seasonal ice, bridge pieces,
        the duck, river babble ambience, save migration) and Performance
        Guardrails (FPS probe, adaptive quality tiers, `?perf=debug`
        overlay, water polish) — parent-readable wording
  - [x] Refresh compare links; keep an empty `## [Unreleased]`
  - **Summary:** `## [0.4.0] — 2026-08-31` now carries parent-readable
    bullets for the river (sky-shimmering water, shallows, drifting
    highlights), trestle bridges, ice & thaw, the duck, river babble, and
    the pre-river save migration ("your old worlds keep working"); the
    existing perf-guardrail bullets (adaptive quality, `?perf=debug`)
    moved under the dated section. Compare links refreshed
    (`v0.3.0...v0.4.0`, `Unreleased: v0.4.0...HEAD`); `## [Unreleased]`
    left empty for future work. *(commit 634f6fe)*
- [x] Task: Bump `package.json` version to `0.4.0`
  - **Summary:** `package.json` → `0.4.0`, in sync with the eventual
    `v0.4.0` tag per the runbook rule. *(commit 402cf4c)*
- [x] Task: Archive the completed `release-v0.3.0_20260830` track
  - [x] Move `conductor/tracks/release-v0.3.0_20260830/` to
        `conductor/archive/`
  - [x] Update `conductor/tracks.md` (registry row + archive list)
  - **Summary:** All four v0.3.0 track files moved to
    `conductor/archive/release-v0.3.0_20260830/` (git rename, 100%
    similarity); the registry row now links to the archive path (status
    stays `done`), and the archive list already carried the track's name.
    `conductor/tracks/` now holds only this active v0.4.0 track.
    *(commit 6cd7191)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - **Summary:** Phase 1 changed only `.md`/`.json` files (CHANGELOG,
    package.json version, conductor registry/archive) — no logic-bearing
    code, so no new unit tests required. Automated gates green: `pnpm
    check` — biome clean, `tsc --noEmit` clean, vitest 27 files / 338
    tests passed. Manual checklist (changelog wording & compare links,
    version sync with the eventual tag, registry/archive consistency)
    presented; user confirmed continuation. Checkpoint at HEAD 4d0953e.

## Phase 2 - Local Pre-Tag Verification

- [x] Task: Run the full local gate suite
  - [x] `pnpm check` (biome + typecheck + vitest)
  - [x] `pnpm exec playwright test` (e2e smoke)
  - **Summary:** Gates green with no fixes needed this time: biome +
    `tsc --noEmit` clean, vitest 27 files / 338 tests passed; Playwright
    e2e **51 passed** across phone + tablet (smoke, phone-shell, prod,
    river specs) in ~2.1m. *(plan edits only — no code changes)*
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke)
- [ ] Task: Local container smoke check
  - [ ] `docker build` the image locally
  - [ ] Run the container and verify the app loads, SPA fallback works, and
        cache headers behave (short/no-cache for `sw.js`/manifest/
        `index.html`, immutable for hashed assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Merge the release branch to `main` and push
- [ ] Task: Tag `v0.4.0` on the release commit and push the tag
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.4.0` + `:latest`
  - [ ] Coolify webhook fired; production domain serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
