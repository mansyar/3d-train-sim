# Plan: README & Contributor Onboarding Docs

Chore track — docs only, no logic-bearing code, so no TDD tasks;
verification is gates + content review per `workflow.md`. Branch
`track/readme-onboarding-docs_20260906` cut from `origin/main` @
`e4a02e5`.

## Phase 1 — README.md

- [ ] Task: Write top-level `README.md`
  - Acceptance: product pitch paragraph (parent-friendly), shipped-
    feature highlights, play/offline/privacy section, developer quick
    start (`pnpm install` / `pnpm dev` / `pnpm check`), pointers to
    `CONTRIBUTING.md` and `conductor/`; under ~120 lines; every command
    matches `package.json`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — CONTRIBUTING.md

- [ ] Task: Write top-level `CONTRIBUTING.md`
  - Acceptance: dev setup (Node ≥ 24, pnpm 11), quality gates
    (`pnpm check`, Playwright e2e), conductor track workflow summary
    with pointers to `conductor/workflow.md` and `conductor/tracks.md`,
    TDD policy one-liner, commit message format + `track/<track-id>`
    branching, Blender asset-recipe pointer, privacy bar. Under ~150
    lines; oriented, not duplicated.
- [ ] Task: Cross-link pass (one-line pointers from `conductor/index.md`
      and/or `e2e/README.md` where a docs map already exists)
  - Acceptance: new files are discoverable from existing docs; no other
    doc rewrites.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Verification & Wrap-up

- [ ] Task: Run `pnpm check` and eyeball both files rendered on GitHub
      (headings, links, tables intact)
  - Acceptance: gates green (docs-only change should be trivially
    green); links resolve in-repo.
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
