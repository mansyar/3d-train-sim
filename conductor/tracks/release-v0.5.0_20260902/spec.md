# Spec: Release v0.5.0

**Track ID:** `release-v0.5.0_20260902` · **Type:** Chore · **Branch:** `track/release-v0.5.0_20260902`

## Overview

Cut the fifth production release of Tiny Tracks, shipping everything that
landed since `v0.4.0` — most notably **Tunnels** (the grassy hill piece
with end-to-end merging, under-hill chug duck & whistle echo, winter snow
cap, night portal glow) and **Station Cargo Pickups** (wagons that load
crates at a station and deliver them in a confetti burst, with persistent
platform crates). The release pipeline exists and works (`v*` tag → gates
→ GHCR → Coolify webhook); this track *executes* it for v0.5.0.

## Functional Requirements

1. **Changelog** — update `CHANGELOG.md` (Keep a Changelog style):
   - Move notes from `## [Unreleased]` into a dated
     `## [0.5.0] — 2026-09-02` section.
   - Parent-readable bullets for: tunnels (ride-through hill, merging
     long tunnels), under-the-hill sounds, winter snow cap, night portal
     glow, cargo deliveries & persistent platform crates, station
     makeover.
   - Refresh compare links and **keep them pointed at
     `mansyar/3d-train-sim`** (the v0.4.0 review fix); add the
     `v0.4.0...v0.5.0` link and re-point Unreleased to `v0.5.0...HEAD`;
     leave `## [Unreleased]` empty.
2. **Version bump** — `package.json` → `0.5.0` on the track branch, in
   sync with the eventual `v0.5.0` tag (runbook rule).
3. **Registry housekeeping** — none required: `conductor/tracks/` is
   already empty and all completed tracks are archived (unlike v0.4.0,
   which archived v0.3.0's track).
4. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e
     suite pass.
   - `docker build` succeeds locally; the container serves the built app
     with working SPA fallback and expected cache headers (no-cache for
     `sw.js`/manifest/`index.html`, immutable for hashed assets).
5. **Tag & ship:**
   - Push the release branch, open PR **"Release v0.5.0"** to `main`,
     merge.
   - Tag `v0.5.0` on the release merge commit and push the tag.
   - Watch the Release workflow: gates green, image lands on
     `ghcr.io/mansyar/tiny-tracks:0.5.0` + `:latest`, Coolify webhook
     fires.

## Non-Functional Requirements

- No gameplay code touched; `src/` expected untouched.
- No secrets in the repo; deploy credentials remain GitHub Actions
  secrets only.

## Acceptance Criteria

- [ ] `CHANGELOG.md` has a dated v0.5.0 entry, refreshed compare links
      (repo-correct), and an empty `## [Unreleased]`.
- [ ] `package.json` version is `0.5.0` and matches the pushed tag.
- [ ] Local gates + e2e pass before the tag is pushed.
- [ ] Local Docker container serves the built app correctly.
- [ ] Release workflow for `v0.5.0` is green end-to-end (gates → GHCR →
      Coolify webhook).
- [ ] All quality gates remain green.

## Out of Scope

- On-device family verification (stays informal, outside the track —
  "workflow green = shipped").
- Any changes to `release.yml`, the Dockerfile, or the deploy
  infrastructure.
- New features, fixes, or polish riding along with the release.
