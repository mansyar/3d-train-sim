# Spec: Release v0.6.0

**Track ID:** `release-v0.6.0_20260903` · **Type:** Chore · **Branch:** `track/release-v0.6.0_20260903`

## Overview

Cut the sixth production release of Tiny Tracks, shipping everything that
landed since `v0.5.0` — most notably **Hills** (the three-piece hill run:
slope-up climbs, hill cruises the crest, slope-down descends, with gentle
auto-blend at mismatched joints and winter snow crowns), **Switches** (the
Blender-authored Y-junction with auto-alternating branches and visibly
flipping point blades), **Oops-Proof Building** (single-step session-only
↩️ undo for the last build/decorate mutation, with wobble-home + soft thunk
for invalid drops), and the **Tidy Toybox & Ride Flow** (five picture tabs —
Rails, Adventure, Nature, Town, Critters — chunky SVG icons, glowing ride
button, loop-close pop, build tools tucked away mid-ride). The release
pipeline exists and works (`v*` tag → gates → GHCR → Coolify webhook); this
track *executes* it for v0.6.0.

## Functional Requirements

1. **Changelog** — update `CHANGELOG.md` (Keep a Changelog style):
   - Move notes from `## [Unreleased]` verbatim into a dated
     `## [0.6.0] - 2026-09-03` section (hyphen style, matching v0.5.0).
   - Parent-readable bullets kept verbatim: tidier toybox + ride-button
     cheer, oops-proof take-back button, switches Y-junction, hills
     elevation run.
   - Refresh compare links and **keep them pointed at
     `mansyar/3d-train-sim`** (the v0.5.0 review fix); add the
     `v0.5.0...v0.6.0` link and re-point Unreleased to `v0.6.0...HEAD`;
     leave `## [Unreleased]` empty.
2. **Version bump** — `package.json` → `0.6.0` on the track branch, in
   sync with the eventual `v0.6.0` tag (runbook rule).
3. **Registry housekeeping** — none required: `conductor/tracks/` holds
   only this track and all completed tracks are archived.
4. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e
     suite pass (rerun at `--workers=2` if GPU-context flakes recur, per
     the v0.5.0 lesson).
   - `docker build` succeeds locally; the container serves the built app
     with working SPA fallback and expected cache headers (no-cache for
     `sw.js`/manifest/`index.html`, immutable for hashed assets).
5. **Tag & ship:**
   - Push the release branch, open PR **"Release v0.6.0"** to `main`,
     merge.
   - Tag `v0.6.0` on the release merge commit and push the tag.
   - Watch the Release workflow: gates green, image lands on
     `ghcr.io/mansyar/tiny-tracks:0.6.0` + `:latest`, Coolify webhook
     fires.

## Non-Functional Requirements

- No gameplay code touched; `src/` expected untouched (test-only deflake
  allowed if CI flakes, as in v0.5.0).
- No secrets in the repo; deploy credentials remain GitHub Actions
  secrets only.

## Acceptance Criteria

- [ ] `CHANGELOG.md` has a dated v0.6.0 entry, refreshed compare links
      (repo-correct), and an empty `## [Unreleased]`.
- [ ] `package.json` version is `0.6.0` and matches the pushed tag.
- [ ] Local gates + e2e pass before the tag is pushed.
- [ ] Local Docker container serves the built app correctly.
- [ ] Release workflow for `v0.6.0` is green end-to-end (gates → GHCR →
      Coolify webhook).
- [ ] All quality gates remain green.

## Out of Scope

- On-device family verification (stays informal, outside the track —
  "workflow green = shipped").
- Any changes to `release.yml`, the Dockerfile, or the deploy
  infrastructure.
- New features, fixes, or polish riding along with the release.
