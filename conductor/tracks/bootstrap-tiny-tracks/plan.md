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
- [x] Install and configure Vite 8 + TypeScript ~7.0 (`strict: true`, `tsc --noEmit` script) — bdd93d5
  - Acceptance criteria: `vite` + `typescript` in devDependencies at pinned-latest versions; `tsc --noEmit` exits 0 on an empty TS entry; `strict: true` and `noUncheckedIndexedAccess` enabled.
  - Notes:
    - `tsconfig.json`: strict + `noUncheckedIndexedAccess`, `noEmit`, bundler resolution, includes `src/` and `e2e/`.
    - `index.html`: minimal mount point (`<div id="app">`), loads `src/main.ts`.
    - `src/main.ts`: placeholder shell content; replaced by DOM overlay in Phase 3.
    - Lockfile updated and committed (closes task 1.1's deferred criterion).
- [x] Create folder skeleton per `tech-stack.md` (src/core, src/scene, src/ui, src/audio, src/state, e2e/, public/assets/train-kit/) — 36dd3ed
  - Acceptance criteria: all directories exist and are tracked by git (`.gitkeep` placeholders until populated).
  - Notes: 7 directories created with `.gitkeep` placeholders; `src/core/` and `src/state/` are the logic-bearing zones per workflow definitions.
- [x] Configure Biome (`biome.json`) and add `check`/`check:fix` scripts — 6e47583
  - Acceptance criteria: `@biomejs/biome` installed at ~2.5.x; `biome.json` covers TS+JSON lint + format for `src/` and `e2e/`; `pnpm exec biome check .` exits 0; `check:fix` script present.
  - Notes:
    - Installed `@biomejs/biome 2.5.10` (registry-latest); `biome.json` with recommended lint rules, 2-space/100-col formatting, single quotes, organize-imports assist.
    - `check:fix` script added (`biome check . --write`); combined `check` gate already wired in package.json.
    - Initial run fixed formatting in existing files; gate exits 0. (Informational `biome migrate` hint left as-is — schema is valid.)
- [x] Verify: `pnpm dev` serves a minimal `index.html` shell — verified live 2026-08-28
  - Acceptance criteria: dev server boots without errors; HTTP GET on the served URL returns the index.html shell.
  - Notes: `pnpm dev` (Vite 8) booted clean; `Invoke-WebRequest http://localhost:5173/` returned the shell (200, mount markup present). No code changes — verification task.

## Phase 1 — Project Scaffold [checkpoint: 6e47583]

> **Verification Report** (2026-08-28)
> - Automated: `pnpm exec biome check .` clean; `pnpm exec tsc --noEmit` exit 0; unit tests n/a (no logic-bearing files this phase).
> - Manual: `pnpm dev` boots clean; http://localhost:5173 served the shell (200, mount markup present).
> - User confirmation: **yes** (2026-08-28). Checkpoint SHA: 6e47583.

## Phase 2 — Quality Gates

- [x] Install Vitest 4; add `test` script — verified 2026-08-28
  - Acceptance criteria: `vitest` in devDependencies at ^4.1; `pnpm test` invocable (exits 1 with "no tests found" until task 2.2 supplies the suite).
  - Notes: Installed `vitest 4.1.11` (registry-latest); `pnpm test` runs and exits 1 on the empty suite — exactly the Red state task 2.2 requires.
- [x] TDD-proof: write failing test for `src/core/grid.ts` (`snapToGrid` clamps to grid coordinates), then implement to green — verified 2026-08-28
  - Acceptance criteria: test written first and observed failing (module missing); implementation makes it green; coverage on `src/core/grid.ts` >80%.
  - Notes:
    - Red confirmed: `Cannot find module './grid'`. Green after implementing `snapToGrid(value, size)`.
    - Fix 1/2 during Green: IEEE-754 `-0` canonicalized to `+0` (contract asserts canonical zero; matters for future IndexedDB persistence).
    - Coverage run required adding `@vitest/coverage-v8 ^4.1.11` (dev dep). Suite: 5 passed. Biome + tsc clean.
- [x] Add combined gate script (`check` = biome + typecheck + vitest) — 1f5dadb
  - Acceptance criteria: `pnpm check` runs all three gates and exits 0 on Windows and Linux; cross-platform shell syntax documented.
  - Notes:
    - Root cause of gate failure: bash-only `CI=true` env prefix breaks under pnpm's Windows shell; prefix is redundant since the suite is `vitest run` (single-run by design).
    - Dated note added to workflow.md Development Commands with the Windows pwsh equivalent; script simplified.
    - Deviation protocol applied: documented in workflow.md before resuming.
- [x] Add GitHub Actions workflow (`.github/workflows/ci.yml`) running the gate on push/PR — 3f4b0b2
  - Acceptance criteria: workflow triggers on push/PR; runs install + full gate; pnpm version derived from `packageManager` field. (Actual GitHub-green verified once the repo is pushed — remote not yet configured.)
  - Notes: ubuntu-latest, pnpm/action-setup@v4 (reads `packageManager`), Node 24 + pnpm cache, `pnpm install --frozen-lockfile`, `pnpm check`.
  - Update (2026-08-27): public repo created via `gh` → https://github.com/mansyar/3d-train-sim ; first CI run on main **success in 26s** (33047605279) — deferred criterion closed. Workflow confirmed to trigger on both `push` (main/master) and all `pull_request` events.

## Phase 2 — Quality Gates [checkpoint: 3f4b0b2]

> **Verification Report** (2026-08-27)
> - Automated: `pnpm check` exit 0 (Biome ✓ + typecheck ✓ + Vitest ✓); `src/core/grid.ts` 100% statements (only logic-bearing file this phase).
> - Manual: coverage run verified (5 passing assertions, Red→Green witnessed live); CI green on GitHub after pushing (run 33047605279).
> - User confirmation: verified via directive "make a public repo using gh cli" — fulfilled: https://github.com/mansyar/3d-train-sim ; CI success. Checkpoint SHA: 3f4b0b2.

## Phase 3 — PWA Shell + 3D Scene

- [~] Add vite-plugin-pwa; manifest (name Tiny Tracks, theme color, icons) + service worker
  - Acceptance criteria: `pnpm build` emits `manifest.webmanifest` + service worker; manifest carries Tiny Tracks identity (name, toy theme colors, standalone, any orientation); icons present (placeholder art OK, replacement tracked).
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
