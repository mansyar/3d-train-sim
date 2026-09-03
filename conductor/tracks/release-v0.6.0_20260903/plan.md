# Plan: Release v0.6.0

Chore track — no logic-bearing code, so no TDD tasks; verification is
gates + smoke + checkpoints per `workflow.md`.

## Phase 1 - Changelog & Version Bump [checkpoint: 18a3969]

- [x] Task: Update `CHANGELOG.md` for v0.6.0 (c497578)
  - Acceptance: `## [Unreleased]` is empty; new dated `## [0.6.0] -
    2026-09-03` section holds the four Added bullets verbatim; compare
    links refreshed and repo-correct (`mansyar/3d-train-sim`).
  - Notes: Moved the Unreleased Added block (toybox flow, oops-proof,
    switches, hills) verbatim under the new dated heading; Unreleased
    left empty. Compare links: added `v0.5.0...v0.6.0`, re-pointed
    Unreleased to `v0.6.0...HEAD`, all on `mansyar/3d-train-sim`.
    Files: `CHANGELOG.md` only.
  - [ ] Move `## [Unreleased]` notes verbatim into `## [0.6.0] - 2026-09-03`
  - [ ] Parent-readable bullets kept verbatim: tidier toybox + ride-button
        cheer, oops-proof take-back button, switches Y-junction, hills
        elevation run
  - [ ] Refresh compare links (`v0.5.0...v0.6.0`, Unreleased →
        `v0.6.0...HEAD`); keep them on `mansyar/3d-train-sim`; leave
        `## [Unreleased]` empty
- [x] Task: Bump `package.json` version to `0.6.0` (63a06ec)
  - Acceptance: `package.json` version reads `0.6.0`, matching the
    eventual `v0.6.0` tag.
  - Notes: Single-line version bump; verified no other in-repo version
    references needed changing (remaining `0.5.0` strings are history,
    compare links, and archive docs). Files: `package.json` only.
- [x] Task: Phase Verification & Checkpoint (18a3969)
  - Verification Report (2026-09-03): automated `pnpm check` green —
    biome clean (after formatting-only fix to
    `e2e/ride-toybox-flow.spec.ts`, 18a3969), `tsc --noEmit` clean,
    508/508 vitest pass. Scope is docs/data only (no logic-bearing
    files), so no new unit tests required. Manual: user eyeballed the
    new `## [0.6.0]` section, compare links, and version bump —
    confirmed yes.

## Phase 2 - Local Pre-Tag Verification

- [~] Task: Run the full local gate suite
  - Acceptance: `pnpm check` green and the full Playwright e2e suite
    green (rerun at `--workers=2` if GPU-context flakes recur).
  - Progress: `pnpm check` green (biome clean after formatting-only
    e2e fix 18a3969, tsc clean, 508/508 vitest). E2e 73/77: the 2 boot
    timeouts are GPU flakes (pass at `--workers=2`); `phone-shell`
    fails deterministically — real tab-strip overflow, fixed below.
- [x] Task: Fit the drawer tab strip at 360px (release-blocker fix) (e89f775)
  - Acceptance: all five `.drawer-tab` buttons lie within the viewport
    at 360px wide, stay tappable (≥56px wide, 64px tall), no behavior
    change; `phone-shell` e2e green.
  - [x] Compact the tab strip on narrow screens (CSS media query,
    matching existing style).
  - Notes: Extended the existing `@media (max-width: 540px)` block in
    `src/style.css`: `.drawer-tabs` gap 12px→6px, tabs `flex: 1 1 0`
    with `min-width: 0` and tighter side padding — five even tabs of
    ~58×68px at 360px, 64px height kept. `phone-shell` passes on phone
    + tablet projects. Files: `src/style.css` (+12 lines) only.
  - [ ] `pnpm check` (biome + typecheck + vitest)
  - [ ] `pnpm exec playwright test` (e2e smoke; rerun at `--workers=2`
        if GPU-context flakes recur per the v0.5.0 lesson)
- [ ] Task: Local container smoke check
  - [ ] `docker build` the image locally
  - [ ] Run container; verify app loads, SPA fallback, cache headers
        (no-cache for `sw.js`/manifest/`index.html`, immutable for hashed
        assets)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Tag & Ship

- [ ] Task: Push branch, open PR "Release v0.6.0", merge to `main`
- [ ] Task: Tag `v0.6.0` on the release merge commit and push the tag
- [ ] Task: Watch the Release workflow to green
  - [ ] Gates pass in CI
  - [ ] Image published as `ghcr.io/mansyar/tiny-tracks:0.6.0` +
        `:latest`
  - [ ] Coolify webhook fired; production serves the new build
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
