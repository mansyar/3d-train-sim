# Implementation Plan — Bootstrap Tiny Tracks

**Track ID:** `bootstrap-tiny-tracks`
**Spec:** `conductor/tracks/bootstrap-tiny-tracks/spec.md`

## Phase 1 — Project Scaffold

- [x] Initialize pnpm project (`package.json`, `pnpm-lock.yaml`, Node 24 LTS engines) — acbf63e
  - Acceptance criteria: `pnpm install` succeeds with no warnings; `package.json` declares Node 24 engines + pnpm 11 packageManager; lockfile committed.
  - Notes:
    - Created `package.json` (name `tiny-tracks`, ESM, Node >=24 engines, `pnpm@11.24.0` packageManager) and `.gitignore` (node_modules, dist, coverage, playwright artifacts).
    - Combined gate script `check` = biome + typecheck + vitest, per workflow "Before Committing".
    - Lockfile arrives with the first dependency install (next task); verified then.
- [ ] Install and configure Vite 8 + TypeScript ~7.0 (`strict: true`, `tsc --noEmit` script)
- [ ] Create folder skeleton per `tech-stack.md` (src/core, src/scene, src/ui, src/audio, src/state, e2e/, public/assets/train-kit/)
- [ ] Configure Biome (`biome.json`) and add `check`/`check:fix` scripts
- [ ] Verify: `pnpm dev` serves a minimal `index.html` shell

## Phase 2 — Quality Gates

- [ ] Install Vitest 4; add `test` script
- [ ] TDD-proof: write failing test for `src/core/grid.ts` (`snapToGrid` clamps to grid coordinates), then implement to green
- [ ] Add combined gate script (`check` = biome + typecheck + vitest)
- [ ] Add GitHub Actions workflow (`.github/workflows/ci.yml`) running the gate on push/PR

## Phase 3 — PWA Shell + 3D Scene

- [ ] Add vite-plugin-pwa; manifest (name Tiny Tracks, theme color, icons) + service worker
- [ ] Build DOM overlay frame (`src/ui/`): full-screen canvas + toybox rail placeholder
- [ ] Wire three.js scene (`src/scene/`): renderer, tablet viewport sizing, capped pixel ratio, spinning placeholder mesh
- [ ] Hand-written CSS styling per `code_styleguides/html-css.md`

## Phase 4 — First Asset

- [ ] Download Kenney Train Kit, extract into `public/assets/train-kit/`, commit (CC0)
- [ ] Load locomotive `.glb` via GLTFLoader; place in scene; verify on tablet viewport
- [ ] Add Playwright smoke spec (`e2e/`): touch tablet viewport, app boots, no console errors, no external requests

## Phase 5 — Verification & Checkpoint

- [ ] Run full local gate suite; fix any failures
- [ ] Manual verification walkthrough on tablet/browser per workflow protocol
- [ ] Record verification report in this plan; mark phase checkpoint SHA

## Notes

(appended per task as implementation proceeds)
