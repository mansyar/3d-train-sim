# Spec: README & Contributor Onboarding Docs

**Track ID:** `readme-onboarding-docs_20260906` · **Type:** Chore ·
**Branch:** `track/readme-onboarding-docs_20260906`

## Overview

The repository ships no `README.md` at all — the GitHub landing page is
empty, and a new contributor's only entry points are conductor-internal
docs (`conductor/workflow.md`, `tech-stack.md`, `product.md`) and
`e2e/README.md`. Ten days and ~51 merged PRs in, the project has a real
story worth telling and a real workflow worth documenting. This chore
track adds the missing front door: a top-level `README.md` and a
`CONTRIBUTING.md` onboarding guide, written in the project's plain,
warm voice.

## Functional Requirements

1. **`README.md` (top level)** — the front door for both audiences:
   - What Tiny Tracks is: a web-based 3D toy train table for toddlers —
     lay the track, press the button, watch the train go. One short
     paragraph in parent-friendly words (echo `product.md`, not copy it).
   - Highlights list drawn from the shipped changelog: six locomotives,
     hills/tunnels/bridges/switches, river life, day-night & weather,
     cargo deliveries, starters gallery.
   - "Play it" section: installable PWA, works fully offline, nothing
     leaves the device (privacy first — no ads, no tracking, no accounts).
   - "For developers" section: stack one-liner (TypeScript · Three.js ·
     Vite · Howler · IndexedDB · PWA), quick start (`pnpm install` →
     `pnpm dev`), gate command (`pnpm check`), and a pointer to
     `CONTRIBUTING.md` + `conductor/` for the full workflow.
   - License/attribution note consistent with repo reality: Kenney
     Train Kit (CC0) and original Blender-authored assets via checked-in
     recipes (`scripts/blender-*.py`) — no attribution required.
2. **`CONTRIBUTING.md` (top level)** — onboarding for a new developer,
   oriented (not duplicated): point at the conductor docs as source of
   truth and summarize the shape of working here:
   - Dev setup: Node ≥ 24, pnpm 11, `pnpm install`, `pnpm dev`.
   - Quality gates: `pnpm check` (biome + `tsc --noEmit` + vitest) and
     `pnpm exec playwright test` for e2e smoke.
   - The conductor track workflow in miniature: tracks registered in
     `conductor/tracks.md`, spec → plan → phased execution per
     `conductor/workflow.md`, archived under `conductor/archive/` when
     done.
   - TDD policy one-liner: unit tests for logic-bearing code
     (`src/core/`, `src/state/`); smoke + manual verification for
     scene/UI glue.
   - Commit conventions (`feat|fix|docs|chore(scope): …`, per
     `workflow.md`) and branching (`track/<track-id>` off `main`).
   - Blender asset authoring pointer: original pieces are deterministic
     checked-in recipes (`scripts/blender-*.py`); see the rules in
     `conductor/tech-stack.md`.
   - Privacy bar: nothing leaves the device — no analytics, no network
     calls at runtime.
3. **Cross-links** — `conductor/index.md` (if it has a docs map) and
   `e2e/README.md` may gain one-line pointers to the new files; no other
   doc moves or rewrites.
4. **`CHANGELOG.md`** — no entry required (developer-facing docs, not
   parent-facing app changes); this track's summary lives in
   `conductor/tracks.md` and the track folder.

## Non-Functional Requirements

- Docs-only track: no app code, no dependency, no pipeline changes.
- Keep README < ~120 lines and CONTRIBUTING < ~150 lines — orient,
  don't duplicate; `conductor/` stays the deep source of truth.
- Voice: plain, warm, non-corporate; toddler-product warmth in the
  README, engineer-practical in CONTRIBUTING.
- All claims verified against the actual repo state (scripts, gates,
  folder names) — no aspirational docs.

## Acceptance Criteria

- [ ] `README.md` exists at repo root, renders correctly on GitHub,
      covers product pitch, play/offline/privacy notes, developer
      quick start, and pointers into `conductor/`
- [ ] `CONTRIBUTING.md` exists at repo root covering setup, gates,
      track workflow summary, TDD policy, commit/branch conventions,
      asset-recipe pointer, and the privacy bar
- [ ] Every command in both files matches the real `package.json`
      scripts and `conductor/workflow.md`
- [ ] `pnpm check` stays green (docs-only change; CI skips jobs on
      docs-only commits per `tech-stack.md`)
- [ ] No changes to app code, CI workflows, or pipeline files

## Out of Scope

- Rewriting or reorganizing `conductor/` docs
- A license file decision or third-party attribution changes
- Screenshots/GIFs for the README (a later polish track if wanted)
- Any changelog/release work (v0.9.0 is handled by its own track)
