# Spec: Release v0.4.0

**Track ID:** `release-v0.4.0_20260831` · **Type:** Chore · **Branch:** `track/release-v0.4.0_20260831`

## Overview

Cut the fourth production release of Tiny Tracks, shipping everything that
landed since `v0.3.0` — most notably **River & Bridge** (meadow river with
seasonal ice, bridge pieces, the river duck, river babble ambience, save
migration) and **Performance Guardrails** (FPS probe, adaptive quality
tiers, `?perf=debug` overlay, water polish). The release pipeline exists
and works (tag `v*` → gates → GHCR → Coolify webhook); this track
*executes* it for v0.4.0 and tidies the Conductor registry by archiving
the completed v0.3.0 release track.

## Functional Requirements

1. **Changelog** — update `CHANGELOG.md` (Keep a Changelog style):
   - Move notes from `## [Unreleased]` into a dated `## [0.4.0]` section.
   - v0.4.0 entry summarizing the shipped tracks (river & bridges, ice and
     thaw, the duck, river babble, adaptive quality, perf debug overlay,
     water polish), written for a parent reader, not an engineer.
   - Refresh compare links; keep `## [Unreleased]` for future work.
2. **Version bump** — `package.json` → `0.4.0` on the track branch, in
   sync with the eventual `v0.4.0` tag (runbook rule).
3. **Registry housekeeping** — archive `release-v0.3.0_20260830`:
   - Move `conductor/tracks/release-v0.3.0_20260830/` to
     `conductor/archive/`.
   - Update `conductor/tracks.md` (status row points to the archive path;
     archive list mentions the track).
4. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e
     suite pass.
   - `docker build` succeeds locally; the container serves the built app
     with working SPA fallback and the expected cache headers (spot check
     `sw.js`/`index.html` vs hashed assets).
5. **Tag & ship:**
   - Merge the release track to `main`, push `main`, then tag `v0.4.0` on
     the release commit and push the tag.
   - Watch the Release workflow: gates pass, image lands on
     `ghcr.io/mansyar/tiny-tracks:0.4.0` + `:latest`, Coolify webhook
     fires.

## Non-Functional Requirements

- No gameplay code touched; `src/` expected untouched.
- No secrets in the repo; deploy credentials remain GitHub Actions secrets
  only.

## Acceptance Criteria

- [ ] `CHANGELOG.md` has a dated v0.4.0 entry, refreshed compare links,
      and an empty `## [Unreleased]`.
- [ ] `package.json` version is `0.4.0` and matches the pushed tag.
- [ ] `release-v0.3.0_20260830` lives under `conductor/archive/` and the
      registry reflects it.
- [ ] Local gates + e2e pass before the tag is pushed.
- [ ] Local Docker container serves the built app correctly.
- [ ] Release workflow for `v0.4.0` is green end-to-end (gates → GHCR →
      Coolify webhook).
- [ ] All quality gates remain green.

## Out of Scope

- On-device family verification (stays informal, outside the track —
  "workflow green = shipped").
- Any changes to `release.yml`, the Dockerfile, or the deploy
  infrastructure.
- New features, fixes, or polish riding along with the release.
