# Spec: Release v0.9.0

## Overview

Cut and ship **v0.9.0** — a content release collecting everything merged
to `main` since v0.8.0: the six-locomotive fleet, the Hilltop Junction
starter, river life (barge + frog), and the Scenery Delight toys
(windmill, carousel, hot-air balloon). No feature code in this track; it
is version bump, changelog curation, gates, tag, and production
verification. The scene/UI decomposition refactor (in progress in a
sibling worktree) is **not** part of this release and lands later.

## Functional Requirements

1. **Version bump:** `package.json` `0.8.0 → 0.9.0` (in sync with the
   git tag; `__APP_VERSION__` flows from it into the parent-gate tray).
2. **Changelog curation (`CHANGELOG.md`, parent-voice per Keep a
   Changelog):**
   - Move the entire `[Unreleased]` pile into `## [0.9.0] - 2026-09-06`.
   - **Add a missing entry** for the Scenery Delight toys (merged
     2026-09-05, not yet in the changelog): the windmill, carousel, and
     hot-air balloon toys, winter snow caps, balloon wander.
   - **Fix a defect:** the river-life entry contains a duplicated
     sentence ("…and it hops with a soft ribbit (quiet when the meadow
     is muted)." appears twice).
   - Refresh the bottom compare links (`[Unreleased]: …v0.8.0…` → new
     `0.9.0` links).
3. **Local gates:** `pnpm exec biome check .` + `pnpm exec tsc --noEmit`
   + `CI=true pnpm test` + full Playwright e2e suite.
4. **Ship:** merge `track/release-v0.9.0_20260906` to `main`, tag
   `v0.9.0`, push both — `release.yml` runs gates → Docker build → GHCR
   push (`:0.9.0` + `:latest`) → Coolify deploy.
5. **Production verification** on a family device: cold load, build a
   loop, press ▶, hear the whistle; parent-gate tray shows **0.9.0**;
   six engines and the delight toys visible.

## Acceptance Criteria

- [ ] `package.json` version is `0.9.0` and matches the pushed tag
- [ ] `CHANGELOG.md` has a `[0.9.0] - 2026-09-06` section containing all
      four shipped features; no `[Unreleased]` content remains (or an
      empty `Unreleased` header stays); duplicated sentence removed;
      compare links refreshed
- [ ] All gates green locally and in the Release workflow's ubuntu e2e
      (release authority)
- [ ] GHCR image `tiny-tracks:0.9.0` published and Coolify deploy
      completed
- [ ] Production smoke passes on a family device, tray shows 0.9.0

## Out of Scope

- Scene/UI decomposition refactor (separate track, merges after this
  release)
- Any feature, dependency, or pipeline changes
- Registry/archive housekeeping beyond this track's own artifacts
