# Spec: Release v0.7.0

**Track ID:** `release-v0.7.0_20260904` · **Type:** Chore · **Branch:** `track/release-v0.7.0_20260904`

## Overview

Cut the seventh production release of Tiny Tracks, shipping everything that
landed since `v0.6.0` — most notably **Starter Railway Magic** (first boot
lands on a rideable Cozy Oval; the parent gate gains an icon-only 3-preset
gallery — Cozy Oval, Station Village, River Crossing — applied as one
undoable mutation), the **Mirror Switch** (a left-hand Y-junction branching
west, with the same stem alternation and visible blade flips as the
right-hand switch), the **Wagon Workshop** (four curated per-train wagon
pairs — Classic, Coal, Tank, Container — behind an icon-only picker row,
persisting per locomotive across reloads), and the **Headlight Front** fix
(the night headlight now rides at the engine's nose instead of its tail).
The release pipeline exists and works (`v*` tag → gates → GHCR → Coolify
webhook); this track *executes* it for v0.7.0.

## Functional Requirements

1. **Changelog** — update `CHANGELOG.md` (Keep a Changelog style):
   - Backfill the missing **Starter Railway** entry into `## [Unreleased]`
     (it shipped to `main` but was never noted there), alongside the
     existing Mirror Switch and Wagon Workshop notes.
   - Move the full `## [Unreleased]` Added block verbatim into a dated
     `## [0.7.0] - 2026-09-04` section (hyphen style, matching v0.6.0).
   - Refresh compare links and keep them pointed at
     `mansyar/3d-train-sim`; add the `v0.6.0...v0.7.0` link and re-point
     Unreleased to `v0.7.0...HEAD`; leave `## [Unreleased]` empty.
2. **Version bump** — `package.json` → `0.7.0` on the track branch, in
   sync with the eventual `v0.7.0` tag (runbook rule).
3. **Registry housekeeping** — none required beyond registering this
   track itself: `conductor/tracks/` holds only this track and all
   completed tracks are archived.
4. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e
     suite pass (rerun at `--workers=2` if GPU-context flakes recur, per
     the v0.5.0/v0.6.0 lessons; the wagon-workshop review flagged
     environmental e2e noise — treat flakes as rerun-candidates, real
     failures as release blockers).
   - `docker build` succeeds locally; the container serves the built app
     per `nginx.conf` (SPA fallback, cache headers).
5. **Tag & ship** — merge to `main` via PR, tag `v0.7.0` on the merge
   commit, push the tag, watch the Release workflow to green (image
   `:0.7.0` + `:latest` on GHCR, Coolify webhook fired).

## Non-Functional Requirements

- No logic-bearing code changes on this track unless a release blocker
  surfaces in verification (then: fix on the branch, re-run gates).
- PWA precache weight sanity-checked against the 6MB cap at container
  smoke time (new wagon/switch GLBs expected to grow it modestly vs
  v0.6.0's ~9.03MB).

## Acceptance Criteria

1. `CHANGELOG.md` has an empty `## [Unreleased]` and a dated
   `## [0.7.0] - 2026-09-04` covering starter gallery, mirror switch,
   wagon workshop, and headlight fix in parent-readable words.
2. `package.json` reads `0.7.0`; `v0.7.0` tag points at the release merge
   commit.
3. `pnpm check` green, full Playwright suite green, local container
   smoke green (all recorded as phase checkpoints in `plan.md`).
4. Release workflow green: gates pass, image published as
   `ghcr.io/mansyar/tiny-tracks:0.7.0` + `:latest`, Coolify webhook
   fired.

## Out of Scope

- New features, balance tweaks, or asset changes (separate tracks).
- The wagon-workshop e2e-stability follow-up chore (candidate for its
  own track if the noise reproduces here).
- On-device family-tablet confirmation beyond the user's manual check.
