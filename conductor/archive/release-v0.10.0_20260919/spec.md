# Spec: Release v0.10.0

**Track:** `release-v0.10.0_20260919` · **Type:** Chore
**Branch:** `track/release-v0.10.0_20260919` (cut from `main` @ `04538a3`)

## Overview

Cut and ship **v0.10.0** — a content release collecting everything merged
to `main` since v0.9.0: the singing music box, the three-way junction with
signal levers on every switch, the delight-toy polish pass, and the
spare-train park fix. Unlike prior releases, this one also performs the
accumulated **housekeeping**: reconciling the tracks registry, refreshing
the stale asset-recipe documentation, and correcting the README feature
list. No feature code; version bump, changelog curation, doc refresh,
gates, tag, deploy, and production verification.

## Functional Requirements

1. **Version bump:** `package.json` `0.9.0 → 0.10.0` (in sync with the
   git tag; `__APP_VERSION__` flows into the parent-gate tray). Grep for
   stale `0.9.0` references outside history/archives.
2. **Changelog curation (`CHANGELOG.md`, parent voice, Keep a
   Changelog):** move the entire `[Unreleased]` pile under
   `## [0.10.0] - 2026-09-19` verbatim (music box; three-way + levers;
   delight-toy polish + halved spin speeds; parked-train fix); refresh the
   compare links (`[Unreleased]` → `v0.10.0...HEAD`, add the `0.10.0`
   link); leave an empty `[Unreleased]` header.
3. **Registry reconciliation (`conductor/tracks.md`):** add the four
   archived tracks missing from the registry as done rows with valid
   archive links; correct the "active development tracks" header wording;
   verify every registry link resolves.
4. **Asset documentation refresh (`conductor/tech-stack.md`):** the scripts
   tree and authoring reference predate the latest recipes — add the
   missing recipes to the scripts tree (`blender-windmill.py`,
   `blender-carousel.py`, `blender-balloon.py`, `blender-frog.py`,
   `blender-crossing-gate.py`, `blender-music-box.py`,
   `blender-hills-phase2.py`) and extend the authoring reference with the
   newest assets + node contracts (`musicbox_figure`/`musicbox_snow_cap`,
   crossing-gate gates/lantern, delight-toy motion nodes).
5. **README accuracy:** add the three-way junction + signal levers to the
   toybox feature list; audit the rest of "What's on the table" for
   stale claims; parent voice throughout.
6. **Local gates:** `pnpm exec biome check .` + `pnpm exec tsc --noEmit` +
   `pnpm test` + full Playwright e2e suite (never concurrently with
   `docker build` — recorded lesson).
7. **Local container smoke:** `docker build tiny-tracks:0.10.0`; run the
   container; verify cache headers, SPA fallback, and precache weight
   sanity vs the 6 MB cap.
8. **Ship:** push branch, open PR, CI green, merge to `main`; tag `v0.10.0`
   on the merge commit and push — `release.yml` runs gates → Docker →
   GHCR (`:0.10.0` + `:latest`) → Coolify deploy.
9. **Production verification (family device):** cold load, build a loop,
   press ▶, hear the whistle; parent-gate tray shows **0.10.0**; music box
   chimes, the three-way routes all roads, levers swing.

## Non-Functional Requirements

- Docs-only housekeeping: no app-code changes (diff outside
  `CHANGELOG.md`, `package.json`, `conductor/`, `README.md` stays empty).
- No new dependencies; no runtime network calls; offline PWA unaffected.
- Changelog stays in parent voice; no developer jargon.
- No history rewrites: archived track folders and commits stay untouched.

## Acceptance Criteria

- [ ] `package.json` reads `0.10.0` and matches the pushed tag
- [ ] `CHANGELOG.md` has `[0.10.0] - 2026-09-19` with all shipped items;
      empty `[Unreleased]`; compare links refreshed
- [ ] `tracks.md` mentions all 56 archived tracks, zero broken links; the
      four orphans appear as done rows
- [ ] `tech-stack.md` scripts tree lists every checked-in `blender-*.py`
      recipe; authoring section documents the newest node contracts
- [ ] README toybox list includes the three-way junction + levers
- [ ] All gates green locally (biome + tsc + vitest + full Playwright)
- [ ] Local container smoke green (headers, SPA fallback, precache under cap)
- [ ] CI green on PR; merged; `v0.10.0` tag pushed; Release workflow green;
      GHCR `0.10.0` + `latest`; Coolify deploy fired
- [ ] Production smoke on a family device; tray shows 0.10.0

## Out of Scope

- Any feature or fix work (music box / switchyard / polish / park fix are
  already merged)
- Archive folder restructuring, track renumbering, historical changelog edits
- Pipeline or release-tooling changes
- Starting the next feature track (double-slip remains roadmap)
