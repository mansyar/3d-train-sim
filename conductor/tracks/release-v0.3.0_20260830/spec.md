# Spec: Release v0.3.0

**Track ID:** `release-v0.3.0_20260830` · **Type:** Chore · **Branch:** `track/release-v0.3.0_20260830`

## Overview

Cut the third production release of Tiny Tracks, shipping everything that
landed since `v0.2.0` — most notably **Every Layout Rides** (multi-train
rides, camera cycling, per-train whistle, night headlight) and **Time of Day
& Weather** (sky cycle, weather ambience), plus the smaller polish tracks.
The release pipeline itself already exists and works (tag `v*` → gates →
GHCR → Coolify webhook); this track *executes* it for v0.3.0 and leaves
behind a durable `CHANGELOG.md` so future releases have a home for their
notes.

## Functional Requirements

1. **Changelog** — create `CHANGELOG.md` at the repo root, `Keep a
   Changelog`-style:
   - Seed entries for v0.1.0 and v0.2.0 reconstructed from git tags/log
     (brief, one-liners).
   - v0.3.0 entry summarizing the shipped tracks (multi-train rides, camera
     cycling, whistle, headlight, day/night & weather, and the smaller
     polish/fix items), written for a parent reader, not an engineer.
2. **Version bump** — `package.json` → `0.3.0` on the track branch, in sync
   with the eventual `v0.3.0` tag (runbook rule).
3. **Pre-tag verification (local):**
   - `pnpm check` (biome + typecheck + vitest) and the Playwright e2e suite
     pass.
   - `docker build` succeeds locally; the container serves the built app
     with working SPA fallback and the expected cache headers (spot check
     `sw.js`/`index.html` vs hashed assets).
4. **Tag & ship:**
   - Merge the release track to `main`, push `main`, then tag `v0.3.0` on
     the release commit and push the tag.
   - Watch the Release workflow: gates pass, image lands on
     `ghcr.io/mansyar/tiny-tracks:0.3.0` + `:latest`, Coolify webhook fires.
5. **Docs** — update the runbook in `tech-stack.md` to include the
   `CHANGELOG.md` step in the release flow.

## Non-Functional Requirements

- No gameplay code touched; `src/` expected untouched.
- No secrets in the repo; deploy credentials remain GitHub Actions secrets
  only.

## Acceptance Criteria

- [ ] `CHANGELOG.md` exists with v0.1.0, v0.2.0, and v0.3.0 entries.
- [ ] `package.json` version is `0.3.0` and matches the pushed tag.
- [ ] Local gates + e2e pass before the tag is pushed.
- [ ] Local Docker container serves the built app correctly.
- [ ] Release workflow for `v0.3.0` is green end-to-end (gates → GHCR →
      Coolify webhook).
- [ ] `tech-stack.md` runbook reflects the changelog step.
- [ ] All quality gates remain green.

## Out of Scope

- On-device family verification (stays informal, outside the track —
  "workflow green = shipped").
- Any changes to `release.yml`, the Dockerfile, or the deploy
  infrastructure.
- New features, fixes, or polish riding along with the release.
