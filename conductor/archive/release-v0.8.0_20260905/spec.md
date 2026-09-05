# Spec: Release v0.8.0

**Track ID:** `release-v0.8.0_20260905` · **Type:** Chore · **Branch:** `track/release-v0.8.0_20260905`

## Overview

Cut the eighth production release of Tiny Tracks, shipping everything that
landed since `v0.7.0` — most notably the **Railway Crossing Gate** (a
road-level crossing piece on the Rails tab; any train's approach swings the
little red-and-white gates shut with a blinking lantern and a soft CC0 bell,
the pass lifts them, snow cap in winter) and **Hills Phase 2** (the gentle
half-height bump run — up, cruise, down — plus the banked elevated corners
that climb, cruise high, and descend out of the bend, each crest earning one
soft celebratory pop, snow crowns in winter). The release pipeline exists
and works (`v*` tag → gates → GHCR → Coolify webhook); this track *executes*
it for v0.8.0.

## Functional Requirements

1. **Changelog** — update `CHANGELOG.md` (Keep a Changelog style):
   - Move the full `## [Unreleased]` Added block verbatim into a dated
     `## [0.8.0] - 2026-09-05` section (hyphen style, matching v0.6.0/v0.7.0).
   - Refresh compare links and keep them pointed at
     `mansyar/3d-train-sim`; add the `v0.7.0...v0.8.0` link and re-point
     Unreleased to `v0.8.0...HEAD`; leave `## [Unreleased]` empty.
2. **Version bump** — `package.json` → `0.8.0` on the track branch, in
   sync with the eventual `v0.8.0` tag (runbook rule).
3. **Registry housekeeping** — none required beyond registering this
   track itself: `conductor/tracks/` holds only this track and all
   completed tracks are archived.
4. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e
     suite pass (rerun at `--workers=2` if GPU-context flakes recur, per
     the v0.5.0/v0.6.0/v0.7.0 lessons; treat flakes as rerun-candidates,
     real failures as release blockers).
   - `docker build` succeeds locally; the container serves the built app
     per `nginx.conf` (SPA fallback, cache headers).
5. **Tag & ship** — merge to `main` via PR, tag `v0.8.0` on the merge
   commit, push the tag, watch the Release workflow to green (image
   `:0.8.0` + `:latest` on GHCR, Coolify webhook fired).

## Non-Functional Requirements

- No logic-bearing code changes on this track unless a release blocker
  surfaces in verification (then: fix on the branch, re-run gates).
- PWA precache weight sanity-checked against the 6MB cap at container
  smoke time (new crossing-gate GLB + six bump/corner GLBs expected to
  grow it modestly vs v0.7.0).

## Acceptance Criteria

1. `CHANGELOG.md` has an empty `## [Unreleased]` and a dated
   `## [0.8.0] - 2026-09-05` covering the crossing gate and the
   bumps/banked corners in parent-readable words.
2. `package.json` reads `0.8.0`; `v0.8.0` tag points at the release merge
   commit.
3. `pnpm check` green, full Playwright suite green, local container
   smoke green (all recorded as phase checkpoints in `plan.md`).
4. Release workflow green: gates pass, image published as
   `ghcr.io/mansyar/tiny-tracks:0.8.0` + `:latest`, Coolify webhook
   fired.

## Out of Scope

- New features, balance tweaks, or asset changes (separate tracks).
- On-device family-tablet confirmation beyond the user's manual check.
