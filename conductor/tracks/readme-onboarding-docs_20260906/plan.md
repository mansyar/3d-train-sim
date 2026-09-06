# Plan: README & Contributor Onboarding Docs

Chore track — docs only, no logic-bearing code, so no TDD tasks;
verification is gates + content review per `workflow.md`. Branch
`track/readme-onboarding-docs_20260906` cut from `origin/main` @
`e4a02e5`.

## Phase 1 — README.md [checkpoint: a273e28]

- [x] Task: Write top-level `README.md` (a273e28)
  - Acceptance: product pitch paragraph (parent-friendly), shipped-
    feature highlights, play/offline/privacy section, developer quick
    start (`pnpm install` / `pnpm dev` / `pnpm check`), pointers to
    `CONTRIBUTING.md` and `conductor/`; under ~120 lines; every command
    matches `package.json`.
  - Notes: 60-line README — pitch, six-loco + toybox + living-meadow
    highlights, PWA/offline/privacy section, dev quick start (`pnpm
    install`/`pnpm dev`/`pnpm check`), pointers to CONTRIBUTING and
    `conductor/`, assets note (Kenney CC0 + `scripts/blender-*.py`
    recipes). Files: `README.md` only.
- [x] Task: Phase Verification & Checkpoint (a273e28)
  - Verification Report (2026-09-06, consolidated): gates green — biome
    clean (130 files), `tsc --noEmit` clean, 676/676 vitest. No logic-
    bearing code, no new unit tests required. User confirmed yes.

## Phase 2 — CONTRIBUTING.md [checkpoint: 49e159b]

- [x] Task: Write top-level `CONTRIBUTING.md` (49e159b)
  - Acceptance: dev setup (Node ≥ 24, pnpm 11), quality gates
    (`pnpm check`, Playwright e2e), conductor track workflow summary
    with pointers to `conductor/workflow.md` and `conductor/tracks.md`,
    TDD policy one-liner, commit message format + `track/<track-id>`
    branching, Blender asset-recipe pointer, privacy bar. Under ~150
    lines; oriented, not duplicated.
  - Notes: ~85 lines covering setup, gates, track workflow summary,
    TDD policy, commit/branch conventions, Blender recipe pointer,
    privacy bar. Cross-link pass in the same commit: one-line pointers
    added to `conductor/index.md` and `e2e/README.md` — no rewrites.
    Files: `CONTRIBUTING.md`, `conductor/index.md`, `e2e/README.md`.
- [x] Task: Cross-link pass (one-line pointers from `conductor/index.md`
      and/or `e2e/README.md` where a docs map already exists) (49e159b)
  - Acceptance: new files are discoverable from existing docs; no other
    doc rewrites.
- [x] Task: Phase Verification & Checkpoint (49e159b)
  - Verification Report (2026-09-06, consolidated): see Phase 1 report.

## Phase 3 — Verification & Wrap-up [checkpoint: pending-pr]

- [x] Task: Run `pnpm check` and eyeball both files rendered on GitHub
      (headings, links, tables intact)
  - Acceptance: gates green (docs-only change should be trivially
    green); links resolve in-repo.
  - Notes: `pnpm check` green (biome 130 files, tsc clean, 676/676
    vitest). Worktree quirk: bare `biome check .` fails in this
    Freebuff worktree because the `!**/.freebuff` ignore in
    `biome.json` matches the worktree's own path segment —
    environmental, not caused by this change; scoping to `src e2e`
    verified clean. GitHub render eyeballed by user at checkpoint.
- [ ] Task: Push branch, open PR "README & Contributor Onboarding Docs",
      merge to `main`
  - Acceptance: CI green on the PR (docs-only commits may skip jobs per
    `tech-stack.md`); squash-merged.
- [ ] Task: Mark track done, archive under `conductor/archive/`, update
      `conductor/tracks.md` registry
  - Acceptance: `metadata.json` status → `done`; registry row moved to
    archive; track folder relocated per house convention.

## Notes

(task notes appended under their tasks as work completes)
