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

- [x] Add vite-plugin-pwa; manifest (name Tiny Tracks, theme color, icons) + service worker — ad8aa87
  - Acceptance criteria: `pnpm build` emits `manifest.webmanifest` + service worker; manifest carries Tiny Tracks identity (name, toy theme colors, standalone, any orientation); icons present (placeholder art OK, replacement tracked).
  - Notes: vite.config.ts wires `VitePWA({ registerType: 'autoUpdate' })`; manifest = standalone display, `any` orientation (tablets rotate), theme #F59E0B (toy amber) on cream background; 192/512 icons generated as placeholder art via `scripts/gen-icons.mjs` (replacement with real art tracked as a release TODO). Build verified: registerSW.js, sw.js, workbox emitted.
- [x] Build DOM overlay frame (`src/ui/`): full-screen canvas + toybox rail placeholder — verified live 2026-08-28
  - Acceptance criteria: app mounts a full-viewport canvas + bottom toybox rail with ≥64px chunky slots; SW registered via `virtual:pwa-register`; no console errors.
  - Notes: `src/ui/app.ts` mounts `#scene-canvas` + toybox rail with three chunky slots (72px min, 4px borders, 20px radius); `src/style.css` covers custom props, full-viewport canvas, rail backdrop; `src/main.ts` registers SW via `virtual:pwa-register`. Gate green (Biome ✓ + typecheck ✓ + 5/5 Vitest). Console-error assertion deferred to the Playwright smoke spec (Phase 4).
- [x] Wire three.js scene (`src/scene/`): renderer, tablet viewport sizing, capped pixel ratio, spinning placeholder mesh — ad3473d
  - Acceptance criteria: renderer wired to the overlay canvas; scene resizes with viewport (portrait/landscape); pixel ratio capped at 2; a placeholder mesh spins via a rAF loop; gate green.
  - Notes: `three ^0.185` + `@types/three` installed. Split into `init-scene.ts` (renderer/camera/resize/dispose), `lights.ts` (warm ambient + key light), `ground.ts` (play-mat plane), `placeholder-crate.ts` (spinning stand-in for Kenney models), `spin-loop.ts` (rAF with separate rafId/tickCount — fix 1/2: id collision). Full dispose chain. `prefers-reduced-motion` renders a single static frame (product guideline: gentle motion). Visual confirmation scheduled for the phase checkpoint.
- [x] Hand-written CSS styling per `code_styleguides/html-css.md` — 2f9e63b
  - Acceptance criteria: CSS follows the Google styleguide (class selectors, alphabetized declarations, single-quoted values); toybox rail respects tablet safe areas; no unit tests (non-logic).
  - Notes: Converted `#app`/`#scene-canvas` ID styling to `.app-root`/`.scene-canvas` classes; alphabetized declarations; single-quoted font stacks; added `env(safe-area-inset-bottom)` on the rail for home-indicator tablets. Biome auto-format applied once; gate green.

## Phase 3 — PWA Shell + 3D Scene [checkpoint: 2f9e63b]

> **Verification Report** (2026-08-28)
> - Automated: `pnpm check` exit 0 (Biome ✓ + typecheck ✓ + Vitest 5/5). No logic-bearing files changed since checkpoint 3f4b0b2 — `src/core/grid.ts` coverage unchanged (100%).
> - Manual: dev server live at localhost:5173 — scene renders (cream sky, green play-mat, warm lights), orange placeholder crate spins gently, toybox rail with three 72px slots; canvas resizes with viewport; pixel ratio capped at 2; `prefers-reduced-motion` renders a static frame.
> - User confirmation: **yes** (2026-08-28). Checkpoint SHA: 2f9e63b.

## Phase 4 — First Asset [checkpoint: 607ff6d]

- [x] Download Kenney Train Kit, extract into `public/assets/train-kit/`, commit (CC0) — a32625e
  - Acceptance criteria: kit files extracted into `public/assets/train-kit/`; CC0 license file included; committed to the repo (offline PWA requires bundled assets).
  - Acceptance notes: placeholder crate stays until the locomotive loads in the next task.
  - Notes: 103 GLB models (6.65 MB) + License.txt imported from the `GLB format` folder; FBX/OBJ duplicates and preview images excluded. Locomotive candidates: `train-locomotive-a/b/c.glb` (~151 KB each).
- [x] Load locomotive `.glb` via GLTFLoader; place in scene; verify on tablet viewport — 4a1cedd
  - Acceptance criteria: `train-locomotive-a.glb` renders in the scene (model loading glue, not logic-bearing — no unit tests); verified visually in the browser at tablet viewport.
  - Acceptance notes: loader lives in `src/scene/` (rendering glue).
  - Notes:
    - `src/scene/load-locomotive.ts` fetches `/assets/train-kit/train-locomotive-a.glb` (scale 1.5); `init-scene.ts` swaps the placeholder crate for the model once loaded (crate kept as fallback on load failure); `spin-loop.ts` now spins a dynamic target via a `getTarget()` callback.
    - Fixed mid-task regression: restored the `prefers-reduced-motion` static-frame guard lost in the refactor.
    - Found + fixed during browser verification: the GLBs reference a shared `Textures/colormap.png` externally — shipped `public/assets/train-kit/Textures/colormap.png` from the kit source (12.7 KB, CC0). The missing file had been silently answered by Vite's SPA fallback (HTTP 200 text/html), so GLTFLoader logged "Couldn't load texture".
    - Added `<link rel="icon" href="/pwa-192x192.png">` to index.html to clear the `/favicon.ico` 404 console error.
    - Visual verification (iPad Mini emulation, port 5175 — 5173/5174 are occupied by the unrelated `3d-marble-run` dev server): locomotive fully textured (green boiler, gray cabin, red trim), green play-mat, toybox rail with three slots; console 0 errors / 0 warnings. Screenshot: `.playwright-cli/locomotive-fixed.png`.
    - `.playwright-cli/` added to .gitignore (test artifacts).
- [x] Add Playwright smoke spec (`e2e/`): touch tablet viewport, app boots, no console errors, no external requests — 607ff6d
  - Acceptance criteria: `@playwright/test` installed; spec boots the app in a touch-emulated tablet viewport and asserts zero console errors and zero non-localhost requests; `pnpm exec playwright test` exits 0.
  - Notes:
    - Added `@playwright/test` (1.62.1) and `playwright.config.ts` with a single `tablet` project using the `iPad Mini` device profile (touch emulation, tablet-first product).
    - `e2e/smoke.spec.ts`: boots the app, asserts title "Tiny Tracks", `.scene-canvas` visible and three `.toy-slot` buttons present; collects console errors + pageerrors during a 1 s render/asset settle; asserts every request origin is the page origin (zero external requests — privacy gate).
    - webServer pinned to a dedicated port via `pnpm exec vite --port 5199 --strictPort` (pnpm swallows Playwright's auto-appended `--port`, which caused a 30 s webServer timeout on the first run); `use.baseURL` set for `page.goto('/')` (missing baseURL → "invalid URL" on the second run).
    - `vite.config.ts`: vitest `include` limited to `src/**/*.test.ts` so the e2e spec is not collected by the unit runner.
    - Result: `pnpm exec playwright test` → 1 passed (2.2 s), console clean, all requests localhost-only; full `pnpm check` gate green (18 files, tsc clean, 5/5 unit tests).

> **Verification Report (Phase 4)**
> - Automated: `pnpm check` exit 0 (Biome 18 files ✓ + typecheck ✓ + Vitest 5/5); `pnpm exec playwright test` exit 0 (tablet smoke: app boots, clean console, zero external requests). No logic-bearing files changed since checkpoint 2f9e63b — coverage obligations unchanged (`src/core/grid.ts` at 100%).
> - Manual: Kenney locomotive fully textured (green boiler, gray cabin, red trim, dark funnel) on the green play-mat at tablet viewport; placeholder crate correctly swapped out; toybox rail renders three chunky slots; touch behavior confirmed (no hover-dependent UI); `prefers-reduced-motion` renders a static single frame; console 0 errors / 0 warnings.
> - User confirmation: **yes** (2026-08-27). Checkpoint SHA: 607ff6d.

## Phase 5 — Verification & Checkpoint [checkpoint: 607ff6d]

- [x] Run full local gate suite; fix any failures
  - Notes:
    - `pnpm check` exit 0 (Biome 18 files ✓, tsc clean ✓, Vitest 5/5 ✓); `pnpm exec playwright test` exit 0 (tablet smoke 1 passed — clean console, zero external requests).
    - Pushed `f1ecc5e..ebdb4a7` to origin/main; CI run 33056547756 green (spec criterion: CI green on GitHub).
    - Non-blocking CI annotation: GitHub-hosted runners force `actions/checkout@v4` / `setup-node@v4` / `pnpm/action-setup@v4` onto Node 24. Upgrade action majors in a future chore (out of scope here).
- [x] Manual verification walkthrough on tablet/browser per workflow protocol
  - Notes:
    - Track-level walkthrough run against the production preview build (`pnpm build` → `pnpm preview`, served at localhost:4174): service worker `sw.js` active with ~114 precached entries; app installable as a standalone PWA ("Tiny Tracks", amber toy icon); with Network set to Offline the app still boots and the textured locomotive still renders (GLB + colormap precached); console 0 errors / 0 warnings.
    - Production build emits one non-blocking warning (three.js chunk > 500 kB minified). Bundle-size budget (<2 MB gzipped code, assets excluded) is a deploy-track concern; noted for the deployment track.
- [x] Record verification report in this plan; mark phase checkpoint SHA

> **Verification Report (Phase 5)**
> - Automated: full gate suite re-run exit 0 (`pnpm check`: Biome 18 files ✓ + typecheck ✓ + Vitest 5/5; `pnpm exec playwright test`: tablet smoke 1 passed). Pushed `f1ecc5e..ebdb4a7` to origin/main; CI run 33056547756 green.
> - Manual (production preview, localhost:4174): service worker active (~114 precached entries), app installable as standalone PWA, offline reload still boots with textured locomotive, console 0 errors / 0 warnings.
> - Spec acceptance criteria: locomotive visible at tablet viewport ✓ · installable PWA ✓ · local gates pass ✓ · Playwright smoke clean ✓ · CI green on GitHub ✓ · `src/core/grid.ts` test-first at 100% coverage ✓ · zero runtime network calls (smoke asserts localhost-only) ✓.
> - User confirmation: **yes** (2026-08-27). Checkpoint SHA: 607ff6d (no functional changes after Phase 4 checkpoint — Phase 5 was verification-only).

## Phase: Review Fixes

- [x] Task: Apply review suggestions — 2a96b9e

## Notes

(appended per task as implementation proceeds)
